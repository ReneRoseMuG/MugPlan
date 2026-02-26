import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Route } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { TourEditForm } from "@/components/TourEditForm";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { MembersSectionHeader } from "@/components/ui/members-section-header";
import { BadgeInteractionProvider } from "@/components/ui/badge-interaction-provider";
import { defaultEntityColor } from "@/lib/colors";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { useToast } from "@/hooks/use-toast";
import type { Tour, Employee } from "@shared/schema";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

interface TourWithMembers extends Tour {
  members: Employee[];
}

interface TourManagementProps {
  onCancel?: () => void;
  userRole?: string;
}

export function TourManagement({ onCancel, userRole }: TourManagementProps) {
  const { toast } = useToast();
  const [editingTour, setEditingTour] = useState<TourWithMembers | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const effectiveUserRole = (userRole ?? window.localStorage.getItem("userRole") ?? "").toUpperCase();
  const isAdmin = effectiveUserRole === "ADMIN";
  const canMutateTours = effectiveUserRole === "ADMIN" || effectiveUserRole === "DISPATCHER";

  const { data: tours = [], isLoading: toursLoading } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const isLoading = toursLoading || employeesLoading;
  const today = getBerlinTodayDateString();

  const toursWithMembers: TourWithMembers[] = tours.map((tour) => ({
    ...tour,
    members: employees.filter((employee) => employee.tourId === tour.id),
  }));

  const { data: appointmentCountsByTourId = new Map<number, number>() } = useQuery({
    queryKey: ["tour-management-appointments-count", today, toursWithMembers.map((tour) => tour.id).join("-")],
    enabled: toursWithMembers.length > 0,
    queryFn: async () => {
      const responses = await Promise.all(
        toursWithMembers.map(async (tour) => {
          const response = await fetch(`/api/tours/${tour.id}/current-appointments?fromDate=${today}`, {
            credentials: "include",
          });
          if (!response.ok) throw new Error("Termine konnten nicht geladen werden");
          const payload = (await response.json()) as CalendarAppointment[];
          return [tour.id, payload.length] as const;
        }),
      );
      return new Map<number, number>(responses);
    },
  });

  const getNextTourName = () => {
    const usedNumbers = new Set(
      tours
      .map((tour) => {
        const match = tour.name.match(/^Tour (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
        .filter((value) => value > 0),
    );

    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) {
      nextNumber += 1;
    }
    return `Tour ${nextNumber}`;
  };

  const extractApiCode = (error: unknown): string | null => {
    if (!(error instanceof Error)) return null;
    const match = error.message.match(/"code"\s*:\s*"([A-Z_]+)"/);
    return match?.[1] ?? null;
  };

  const createMutation = useMutation({
    mutationFn: async ({ color }: { color: string }) => apiRequest("POST", "/api/tours", { color }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      return response;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, color, version }: { id: number; color: string; version: number }) =>
      apiRequest("PATCH", `/api/tours/${id}`, { color, version }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Speichern nicht möglich",
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
      }
    },
  });

  const invalidateEmployees = () => {
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === "/api/employees";
      },
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async ({ id, version }: { id: number; version: number }) =>
      apiRequest("DELETE", `/api/tours/${id}`, { version }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      invalidateEmployees();
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Löschen nicht möglich",
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      if (code === "BUSINESS_CONFLICT") {
        toast({
          title: "Löschen nicht möglich",
          description: "Tour kann nicht gelöscht werden, solange Termine zugeordnet sind.",
          variant: "destructive",
        });
      }
    },
  });

  const assignMembersMutation = useMutation({
    mutationFn: async ({ tourId, employeeIds }: { tourId: number; employeeIds: number[] }) => {
      const items = employeeIds.map((employeeId) => {
        const employee = employees.find((entry) => entry.id === employeeId);
        if (!employee || !Number.isInteger(employee.version) || employee.version < 1) {
          throw new Error('422: {"code":"VALIDATION_ERROR","message":"Missing employee version"}');
        }
        return { employeeId, version: employee.version };
      });
      return apiRequest("POST", `/api/tours/${tourId}/employees`, { items });
    },
    onSuccess: () => {
      invalidateEmployees();
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Zuweisung nicht möglich",
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
      }
    },
  });

  const handleOpenCreate = () => {
    setEditingTour(null);
    setIsCreating(true);
  };

  const handleSubmitTour = async (tourId: number | null, employeeIds: number[], color: string) => {
    if (tourId === null) {
      const response = await createMutation.mutateAsync({ color });
      const newTour = await response.json();
      await assignMembersMutation.mutateAsync({ tourId: newTour.id, employeeIds });
    } else {
      const tour = tours.find((entry) => entry.id === tourId);
      if (!tour || !Number.isInteger(tour.version) || tour.version < 1) {
        throw new Error('422: {"code":"VALIDATION_ERROR","message":"Missing tour version"}');
      }
      await updateMutation.mutateAsync({ id: tourId, color, version: tour.version });
      await assignMembersMutation.mutateAsync({ tourId, employeeIds });
    }
  };

  const handleCloseDialog = () => {
    setEditingTour(null);
    setIsCreating(false);
  };

  const handleOpenEdit = (tour: TourWithMembers) => {
    setEditingTour(tour);
  };

  const handleOpenEditById = (tourId: number | string) => {
    const target = toursWithMembers.find((tour) => String(tour.id) === String(tourId));
    if (!target) return;
    setEditingTour(target);
    setIsCreating(false);
  };

  const handleDeleteFromDialog = async () => {
    if (!editingTour || !isAdmin) return;
    const currentTour = tours.find((entry) => entry.id === editingTour.id);
    if (!currentTour || !Number.isInteger(currentTour.version) || currentTour.version < 1) {
      throw new Error('422: {"code":"VALIDATION_ERROR","message":"Missing tour version"}');
    }
    if (!window.confirm(`Wollen Sie die Tour ${currentTour.name} wirklich löschen?`)) {
      return;
    }
    await deleteMutation.mutateAsync({ id: currentTour.id, version: currentTour.version });
    handleCloseDialog();
  };

  const activeTour = editingTour
    ? (toursWithMembers.find((tour) => tour.id === editingTour.id) ?? editingTour)
    : null;

  if (activeTour || isCreating) {
    return (
      <TourEditForm
        tour={activeTour}
        allEmployees={employees}
        onSubmit={handleSubmitTour}
        onDelete={handleDeleteFromDialog}
        canDelete={isAdmin}
        isDeleting={deleteMutation.isPending}
        isSaving={createMutation.isPending || updateMutation.isPending || assignMembersMutation.isPending}
        isCreate={isCreating}
        defaultName={getNextTourName()}
        defaultColor={defaultEntityColor}
        onCancel={handleCloseDialog}
      />
    );
  }

  return (
    <>
      <BadgeInteractionProvider value={{ openTourEdit: handleOpenEditById }}>
        <ListLayout
          title="Touren"
          icon={<Route className="w-5 h-5" />}
          helpKey="tours"
          isLoading={isLoading}
          onClose={onCancel}
          closeTestId="button-close-tours"
          footerSlot={(
            <div className="flex items-center justify-between">
              {canMutateTours ? (
                <Button
                  variant="outline"
                  onClick={handleOpenCreate}
                  disabled={createMutation.isPending}
                  data-testid="button-new-tour"
                >
                  Neue Tour
                </Button>
              ) : null}
              {onCancel ? (
                <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-tours">
                  Schließen
                </Button>
              ) : null}
            </div>
          )}
          contentSlot={(
            <BoardView
              gridTestId="list-tours"
              gridCols="3"
              isEmpty={toursWithMembers.length === 0}
              emptyState={(
                <p className="text-sm text-slate-400 text-center py-8 col-span-full">
                  Keine Touren vorhanden
                </p>
              )}
            >
              {toursWithMembers.map((tour) => (
                <ColoredEntityCard
                  key={tour.id}
                  title={tour.name}
                  icon={<Route className="w-4 h-4" />}
                  borderColor={tour.color}
                  testId={`card-tour-${tour.id}`}
                  onDoubleClick={() => handleOpenEdit(tour)}
                  footer={<span data-testid={`text-tour-appointment-count-${tour.id}`}>({appointmentCountsByTourId.get(tour.id) ?? 0}) Termine</span>}
                  footerVisibility="visible"
                >
                  <MembersSectionHeader className="px-0 py-1 mb-1 border-b border-border" />
                  <div className="space-y-2">
                    {tour.members.map((member) => (
                      <EmployeeInfoBadge
                        key={member.id}
                        id={member.id}
                        firstName={member.firstName}
                        lastName={member.lastName}
                        action="none"
                        showPreview={false}
                        size="sm"
                        fullWidth
                        testId={`text-tour-member-${member.id}`}
                      />
                    ))}
                    {tour.members.length === 0 && (
                      <div className="text-sm text-slate-400 italic">
                        Keine Mitarbeiter zugewiesen
                      </div>
                    )}
                  </div>
                </ColoredEntityCard>
              ))}
            </BoardView>
          )}
        />
      </BadgeInteractionProvider>
    </>
  );
}
