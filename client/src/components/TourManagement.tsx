import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Route } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { TourEditForm } from "@/components/TourEditForm";
import { BadgeInteractionProvider } from "@/components/ui/badge-interaction-provider";
import { defaultEntityColor } from "@/lib/colors";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
import { invalidateTagProjectionQueries } from "@/lib/tag-invalidation";
import { useToast } from "@/hooks/use-toast";
import { AppointmentCountBadge } from "@/components/ui/appointment-count-badge";
import { TourEmployeeCascadeDialog } from "@/components/TourEmployeeCascadeDialog";
import type { Tour, Employee } from "@shared/schema";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import type { AppointmentsListContext } from "@/components/AppointmentsListPage";

type CascadePreviewItem = {
  appointmentId: number;
  startDate: string;
  endDate: string | null;
  tourName: string | null;
  customerNumber: string | null;
  customerName: string | null;
  projectName: string | null;
  orderNumber: string | null;
  currentEmployees: Array<{ id: number; fullName: string }>;
  eligible: boolean;
  conflictReason: "EMPLOYEE_OVERLAP" | "ALREADY_ASSIGNED" | null;
};

type CascadeDialogState = {
  open: boolean;
  mode: "add" | "remove";
  tourId: number;
  employeeId: number;
  employeeName: string;
  previewItems: CascadePreviewItem[];
  selectedAppointmentIds: number[];
};

type CascadeExecuteResult = {
  updatedAppointmentCount: number;
  skipped: Array<{ appointmentId: number; reason: string }>;
};

interface TourManagementProps {
  onCancel?: () => void;
  userRole?: string;
  onOpenAppointment?: (appointmentId: number, context: AppointmentsListContext) => void;
  initialTourId?: number | null;
  onEditingChange?: (isEditing: boolean) => void;
}

function buildCascadeDialogState(params: Omit<CascadeDialogState, "selectedAppointmentIds" | "open">): CascadeDialogState {
  return {
    ...params,
    open: true,
    selectedAppointmentIds: [],
  };
}

export function TourManagement({ onCancel, userRole, onOpenAppointment, initialTourId = null, onEditingChange }: TourManagementProps) {
  const { toast } = useToast();
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [cascadeDialogState, setCascadeDialogState] = useState<CascadeDialogState | null>(null);
  const effectiveUserRole = (userRole ?? window.localStorage.getItem("userRole") ?? "").toUpperCase();
  const isAdmin = effectiveUserRole === "ADMIN";
  const canMutateTours = effectiveUserRole === "ADMIN" || effectiveUserRole === "DISPONENT";

  const { data: tours = [], isLoading: toursLoading } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: !!editingTour,
  });

  const isLoading = toursLoading || (!!editingTour && employeesLoading);
  const today = getBerlinTodayDateString();

  const { data: appointmentCountsByTourId = new Map<number, number>() } = useQuery({
    queryKey: ["tour-management-appointments-count", today, tours.map((tour) => tour.id).join("-")],
    enabled: tours.length > 0,
    queryFn: async () => {
      const responses = await Promise.all(
        tours.map(async (tour) => {
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

  const invalidateEmployees = () => {
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === "/api/employees";
      },
    });
  };

  const invalidateAppointmentViews = () => {
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && (
          key[0] === "/api/calendar/appointments"
          || key[0] === "/api/appointments/list"
          || key[0] === "tour-management-appointments-count"
        );
      },
    });
  };

  const refreshCascadeDependentViews = async () => {
    invalidateEmployees();
    invalidateAppointmentViews();
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key)
          && typeof key[0] === "string"
          && key[0].startsWith("/api/tours/")
          && key[0].endsWith("/employees/active");
      },
    });
    await invalidateTagProjectionQueries();
    await queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
  };

  const createMutation = useMutation({
    mutationFn: async ({ color }: { color: string }) => apiRequest("POST", "/api/tours", { color }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      return response;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, color, version }: { id: number; name: string; color: string; version: number }) =>
      apiRequest("PATCH", `/api/tours/${id}`, { name, color, version }),
    onSuccess: async (response) => {
      const updatedTour = await response.json() as Tour;
      queryClient.setQueryData<Tour[]>(["/api/tours"], (current = []) =>
        current.map((tour) => (tour.id === updatedTour.id ? updatedTour : tour)),
      );
      setEditingTour((current) => {
        if (!current || current.id !== updatedTour.id) {
          return current;
        }
        return {
          ...current,
          ...updatedTour,
        };
      });
      void queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Speichern nicht moeglich",
          description: "Datensatz wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      if (code === "BUSINESS_CONFLICT") {
        toast({
          title: "Speichern nicht moeglich",
          description: "Tourname ist bereits vergeben.",
          variant: "destructive",
        });
      }
    },
  });

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
          title: "Loeschen nicht moeglich",
          description: "Datensatz wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      if (code === "BUSINESS_CONFLICT") {
        toast({
          title: "Loeschen nicht moeglich",
          description: "Tour kann nicht geloescht werden, solange Termine zugeordnet sind.",
          variant: "destructive",
        });
      }
    },
  });

  const previewAddCascadeMutation = useMutation({
    mutationFn: async ({ tourId, employeeId }: { tourId: number; employeeId: number }) => {
      const response = await apiRequest("POST", `/api/tours/${tourId}/employees/cascade-add/preview`, { employeeId });
      return response.json() as Promise<CascadePreviewItem[]>;
    },
  });

  const previewRemoveCascadeMutation = useMutation({
    mutationFn: async ({ tourId, employeeId }: { tourId: number; employeeId: number }) => {
      const response = await apiRequest("POST", `/api/tours/${tourId}/employees/cascade-remove/preview`, { employeeId });
      return response.json() as Promise<CascadePreviewItem[]>;
    },
  });

  const executeAddCascadeMutation = useMutation({
    mutationFn: async (params: { tourId: number; employeeId: number; selectedAppointmentIds: number[] }) => {
      const response = await apiRequest("POST", `/api/tours/${params.tourId}/employees/cascade-add`, {
        employeeId: params.employeeId,
        selectedAppointmentIds: params.selectedAppointmentIds,
      });
      return response.json() as Promise<CascadeExecuteResult>;
    },
    onSuccess: async () => {
      await refreshCascadeDependentViews();
      void refreshMonitoringWithNotification(toast);
    },
  });

  const executeRemoveCascadeMutation = useMutation({
    mutationFn: async (params: { tourId: number; employeeId: number; selectedAppointmentIds: number[] }) => {
      const response = await apiRequest("POST", `/api/tours/${params.tourId}/employees/cascade-remove`, {
        employeeId: params.employeeId,
        selectedAppointmentIds: params.selectedAppointmentIds,
      });
      return response.json() as Promise<CascadeExecuteResult>;
    },
    onSuccess: async () => {
      await refreshCascadeDependentViews();
      void refreshMonitoringWithNotification(toast);
    },
  });

  const openCascadeDialog = (
    mode: "add" | "remove",
    tourId: number,
    employee: Employee,
    previewItems: CascadePreviewItem[],
  ) => {
    setCascadeDialogState(buildCascadeDialogState({
      mode,
      tourId,
      employeeId: employee.id,
      employeeName: employee.fullName,
      previewItems,
    }));
  };

  const handleCascadePreviewError = (error: unknown, action: "hinzufuegen" | "abziehen") => {
    const code = extractApiCode(error);
    if (code === "BUSINESS_CONFLICT") {
      toast({
        title: `Mitarbeiter nicht ${action}`,
        description: "Der Mitarbeiterzustand passt nicht mehr zur aktuellen Tour. Bitte neu laden.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Vorschau konnte nicht geladen werden",
      description: "Bitte versuchen Sie es erneut.",
      variant: "destructive",
    });
  };

  const handleExecuteCascadeError = (_error: unknown, mode: "add" | "remove") => {
    toast({
      title: mode === "add" ? "Mitarbeiter konnte nicht hinzugefuegt werden" : "Mitarbeiter konnte nicht abgezogen werden",
      description: "Bitte versuchen Sie es erneut.",
      variant: "destructive",
    });
  };

  const handleStartAddMember = async (employeeId: number) => {
    if (!editingTour) return;
    const employee = employees.find((entry) => entry.id === employeeId);
    if (!employee) return;
    try {
      const previewItems = await previewAddCascadeMutation.mutateAsync({ tourId: editingTour.id, employeeId });
      openCascadeDialog("add", editingTour.id, employee, previewItems);
    } catch (error) {
      handleCascadePreviewError(error, "hinzufuegen");
    }
  };

  const handleStartRemoveMember = async (employee: Employee) => {
    if (!editingTour) return;
    try {
      const previewItems = await previewRemoveCascadeMutation.mutateAsync({ tourId: editingTour.id, employeeId: employee.id });
      openCascadeDialog("remove", editingTour.id, employee, previewItems);
    } catch (error) {
      handleCascadePreviewError(error, "abziehen");
    }
  };

  const handleOpenCreate = () => {
    setEditingTour(null);
    setIsCreating(true);
  };

  const handleSubmitTour = async (tourId: number | null, _employeeIds: number[], name: string, color: string) => {
    if (tourId === null) {
      const response = await createMutation.mutateAsync({ color });
      await response.json();
      handleCloseDialog();
      return;
    }

    const tour = tours.find((entry) => entry.id === tourId);
    if (!tour || !Number.isInteger(tour.version) || tour.version < 1) {
      throw new Error('422: {"code":"VALIDATION_ERROR","message":"Missing tour version"}');
    }
    await updateMutation.mutateAsync({ id: tourId, name, color, version: tour.version });
    handleCloseDialog();
  };

  const handleCloseDialog = () => {
    setEditingTour(null);
    setIsCreating(false);
    setCascadeDialogState(null);
  };

  const handleOpenEdit = (tour: Tour) => {
    setEditingTour(tour);
    setIsCreating(false);
  };

  const handleOpenEditById = (tourId: number | string) => {
    const target = tours.find((tour) => String(tour.id) === String(tourId));
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
    if (!window.confirm(`Wollen Sie die Tour ${currentTour.name} wirklich loeschen?`)) {
      return;
    }
    await deleteMutation.mutateAsync({ id: currentTour.id, version: currentTour.version });
    handleCloseDialog();
  };

  const handleConfirmCascade = async () => {
    if (!cascadeDialogState) return;
    try {
      let result: CascadeExecuteResult;
      if (cascadeDialogState.mode === "add") {
        result = await executeAddCascadeMutation.mutateAsync({
          tourId: cascadeDialogState.tourId,
          employeeId: cascadeDialogState.employeeId,
          selectedAppointmentIds: cascadeDialogState.selectedAppointmentIds,
        });
      } else {
        result = await executeRemoveCascadeMutation.mutateAsync({
          tourId: cascadeDialogState.tourId,
          employeeId: cascadeDialogState.employeeId,
          selectedAppointmentIds: cascadeDialogState.selectedAppointmentIds,
        });
      }
      const skippedMessage = result.skipped.length > 0
        ? ` ${result.skipped.length} Termine wurden wegen Konflikten uebersprungen.`
        : "";
      toast({
        title: cascadeDialogState.mode === "add" ? "Kaskade abgeschlossen" : "Abzug abgeschlossen",
        description: `${result.updatedAppointmentCount} Termine wurden aktualisiert.${skippedMessage}`,
      });
      setCascadeDialogState(null);
    } catch (error) {
      handleExecuteCascadeError(error, cascadeDialogState.mode);
    }
  };

  const activeTour = editingTour
    ? (tours.find((tour) => tour.id === editingTour.id) ?? editingTour)
    : null;

  useEffect(() => {
    if (isCreating) return;
    if (editingTour) return;
    if (typeof initialTourId !== "number") return;
    const initialTour = tours.find((tour) => tour.id === initialTourId);
    if (!initialTour) return;
    setEditingTour(initialTour);
  }, [initialTourId, isCreating, editingTour, tours]);

  useEffect(() => {
    onEditingChange?.(!!editingTour || isCreating);
  }, [editingTour, isCreating, onEditingChange]);

  const isMutatingMembers = previewAddCascadeMutation.isPending
    || previewRemoveCascadeMutation.isPending
    || executeAddCascadeMutation.isPending
    || executeRemoveCascadeMutation.isPending;

  if (activeTour || isCreating) {
    return (
      <>
        <TourEditForm
          tour={activeTour}
          allEmployees={employees}
          onSubmit={handleSubmitTour}
          onAddMember={activeTour ? handleStartAddMember : undefined}
          onRemoveMember={activeTour ? handleStartRemoveMember : undefined}
          onDelete={handleDeleteFromDialog}
          canDelete={isAdmin}
          isDeleting={deleteMutation.isPending}
          isSaving={createMutation.isPending || updateMutation.isPending}
          isMutatingMembers={isMutatingMembers}
          isCreate={isCreating}
          defaultName={getNextTourName()}
          defaultColor={defaultEntityColor}
          onCancel={handleCloseDialog}
          onOpenAppointment={onOpenAppointment}
        />
        {cascadeDialogState ? (
          <TourEmployeeCascadeDialog
            open={cascadeDialogState.open}
            mode={cascadeDialogState.mode}
            employeeName={cascadeDialogState.employeeName}
            previewItems={cascadeDialogState.previewItems}
            selectedAppointmentIds={cascadeDialogState.selectedAppointmentIds}
            isSubmitting={executeAddCascadeMutation.isPending || executeRemoveCascadeMutation.isPending}
            onSelectedAppointmentIdsChange={(selectedAppointmentIds) => {
              setCascadeDialogState((current) => current ? { ...current, selectedAppointmentIds } : current);
            }}
            onConfirm={() => {
              void handleConfirmCascade();
            }}
            onClose={() => setCascadeDialogState(null)}
          />
        ) : null}
      </>
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
                  Schliessen
                </Button>
              ) : null}
            </div>
          )}
          contentSlot={(
            <BoardView
              gridTestId="list-tours"
              gridCols="3"
              isEmpty={tours.length === 0}
              emptyState={(
                <p className="col-span-full py-8 text-center text-sm text-slate-400">
                  Keine Touren vorhanden
                </p>
              )}
            >
              {tours.map((tour) => (
                <ColoredEntityCard
                  key={tour.id}
                  title={tour.name}
                  icon={<Route className="w-4 h-4" />}
                  borderColor={tour.color}
                  testId={`card-tour-${tour.id}`}
                  onDoubleClick={() => handleOpenEdit(tour)}
                  footer={(
                    <div className="flex w-full">
                      <AppointmentCountBadge
                        count={appointmentCountsByTourId.get(tour.id) ?? 0}
                        label="Termine"
                        testId={`text-tour-appointment-count-${tour.id}`}
                        fullWidth
                      />
                    </div>
                  )}
                  footerVisibility="visible"
                >
                  <div className="min-h-2" />
                </ColoredEntityCard>
              ))}
            </BoardView>
          )}
        />
      </BadgeInteractionProvider>
    </>
  );
}
