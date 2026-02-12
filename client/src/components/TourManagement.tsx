import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Route, Pencil } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { TourEditDialog } from "@/components/ui/tour-edit-dialog";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { BadgeInteractionProvider } from "@/components/ui/badge-interaction-provider";
import { defaultEntityColor } from "@/lib/colors";
import type { Tour, Employee } from "@shared/schema";

interface TourWithMembers extends Tour {
  members: Employee[];
}

interface TourManagementProps {
  onCancel?: () => void;
}

export function TourManagement({ onCancel }: TourManagementProps) {
  const [editingTour, setEditingTour] = useState<TourWithMembers | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: tours = [], isLoading: toursLoading } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const isLoading = toursLoading || employeesLoading;

  const toursWithMembers: TourWithMembers[] = tours.map((tour) => ({
    ...tour,
    members: employees.filter((employee) => employee.tourId === tour.id),
  }));

  const getNextTourName = () => {
    const existingNumbers = tours
      .map((tour) => {
        const match = tour.name.match(/^Tour (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((value) => value > 0);
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    return `Tour ${maxNumber + 1}`;
  };

  const createMutation = useMutation({
    mutationFn: async ({ color }: { color: string }) => apiRequest("POST", "/api/tours", { color }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      return response;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, color }: { id: number; color: string }) => apiRequest("PATCH", `/api/tours/${id}`, { color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
    },
  });

  const invalidateEmployees = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === "/api/employees";
      },
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/tours/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      invalidateEmployees();
    },
  });

  const assignMembersMutation = useMutation({
    mutationFn: async ({ tourId, employeeIds }: { tourId: number; employeeIds: number[] }) => {
      return apiRequest("POST", `/api/tours/${tourId}/employees`, { employeeIds });
    },
    onSuccess: () => {
      invalidateEmployees();
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
      await updateMutation.mutateAsync({ id: tourId, color });
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

  const handleDelete = (tour: TourWithMembers) => {
    if (window.confirm(`Wollen Sie die Tour ${tour.name} wirklich löschen?`)) {
      deleteMutation.mutate(tour.id);
    }
  };

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
              <Button
                variant="outline"
                onClick={handleOpenCreate}
                disabled={createMutation.isPending}
                data-testid="button-new-tour"
              >
                Neue Tour
              </Button>
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
                  onDelete={() => handleDelete(tour)}
                  isDeleting={deleteMutation.isPending}
                  testId={`card-tour-${tour.id}`}
                  onDoubleClick={() => handleOpenEdit(tour)}
                  footer={
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenEdit(tour);
                      }}
                      data-testid={`button-edit-tour-members-${tour.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  }
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                    Mitarbeiter
                  </div>
                  <div className="space-y-2">
                    {tour.members.map((member) => (
                      <EmployeeInfoBadge
                        key={member.id}
                        id={member.id}
                        firstName={member.firstName}
                        lastName={member.lastName}
                        action="none"
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

      <TourEditDialog
        open={!!editingTour || isCreating}
        onOpenChange={(open) => !open && handleCloseDialog()}
        tour={editingTour ? (toursWithMembers.find((tour) => tour.id === editingTour.id) || editingTour) : null}
        allEmployees={employees}
        onSubmit={handleSubmitTour}
        isSaving={createMutation.isPending || updateMutation.isPending || assignMembersMutation.isPending}
        isCreate={isCreating}
        defaultName={getNextTourName()}
        defaultColor={defaultEntityColor}
      />
    </>
  );
}
