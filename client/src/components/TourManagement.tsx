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

type WeekPreviewItem = {
  appointmentId: number;
  startDate: string;
  endDate: string | null;
  customerName: string | null;
  projectName: string | null;
  status: "will_add" | "conflict" | "already_assigned" | "will_remove" | "understaffed" | "keep";
  selectable: boolean;
  conflictReason: string | null;
  isUnderstaffed?: boolean;
};

type TourWeekEmployeeMember = {
  assignmentId: number;
  employeeId: number;
  fullName: string;
};

type TourWeekMutationResponse = {
  id: number;
  tourId: number;
  isoYear: number;
  isoWeek: number;
  weekStartDate: string;
  weekEndDate: string;
  isLocked: boolean;
  isBlocked: boolean;
};

type TourWeekStatusMutationResponse = {
  week: TourWeekMutationResponse;
  affectedAppointmentCount: number;
};

type WeekDialogState = {
  open: boolean;
  mode: "add" | "remove";
  tourId: number;
  isoYear: number;
  isoWeek: number;
  assignmentId?: number;
  weekLabel: string;
  employeeId: number;
  employeeName: string;
  previewItems: WeekPreviewItem[];
  selectedIds: number[];
};

type WeekExecuteResult = {
  assignmentId?: number;
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

function buildWeekLabel(isoYear: number, isoWeek: number): string {
  return `KW ${String(isoWeek).padStart(2, "0")} / ${isoYear}`;
}

function buildWeekDialogState(params: Omit<WeekDialogState, "selectedIds" | "open" | "mode"> & { mode: "add" | "remove" }): WeekDialogState {
  return {
    ...params,
    open: true,
    selectedIds: params.previewItems.filter((item) => item.selectable).map((item) => item.appointmentId),
  };
}

export function TourManagement({ onCancel, userRole, onOpenAppointment, initialTourId = null, onEditingChange }: TourManagementProps) {
  const { toast } = useToast();
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [weekDialogState, setWeekDialogState] = useState<WeekDialogState | null>(null);
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
          key[0] === "calendarAppointments"
          || key[0] === "calendarWeekLaneEmployeePreviews"
          || key[0] === "calendarBlockedTourWeeks"
          || key[0] === "/api/calendar/appointments"
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
          && (
            (key[0].startsWith("/api/tours/") && key[0].endsWith("/employees/active"))
            || (key[0].startsWith("/api/tours/") && key[0].endsWith("/week-employees"))
          );
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
      invalidateAppointmentViews();
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

  const createWeekMutation = useMutation({
    mutationFn: async ({ tourId, isoYear, isoWeek }: { tourId: number; isoYear: number; isoWeek: number }) => {
      const response = await apiRequest("POST", `/api/tours/${tourId}/weeks`, { isoYear, isoWeek });
      return response.json() as Promise<TourWeekMutationResponse>;
    },
    onSuccess: async () => {
      await refreshCascadeDependentViews();
    },
  });

  const blockWeekMutation = useMutation({
    mutationFn: async ({ tourId, isoYear, isoWeek }: { tourId: number; isoYear: number; isoWeek: number }) => {
      const response = await apiRequest("POST", `/api/tours/${tourId}/weeks/${isoYear}/${isoWeek}/block`);
      return response.json() as Promise<TourWeekStatusMutationResponse>;
    },
    onSuccess: async () => {
      await refreshCascadeDependentViews();
      await refreshMonitoringWithNotification(toast);
    },
  });

  const unblockWeekMutation = useMutation({
    mutationFn: async ({ tourId, isoYear, isoWeek }: { tourId: number; isoYear: number; isoWeek: number }) => {
      const response = await apiRequest("POST", `/api/tours/${tourId}/weeks/${isoYear}/${isoWeek}/unblock`);
      return response.json() as Promise<TourWeekStatusMutationResponse>;
    },
    onSuccess: async () => {
      await refreshCascadeDependentViews();
      await refreshMonitoringWithNotification(toast);
    },
  });

  const previewAddCascadeMutation = useMutation({
    mutationFn: async ({ tourId, isoYear, isoWeek, employeeId }: { tourId: number; isoYear: number; isoWeek: number; employeeId: number }) => {
      const response = await apiRequest("POST", `/api/tours/${tourId}/week-employees/add/preview`, { isoYear, isoWeek, employeeId });
      return response.json() as Promise<{
        isoYear: number;
        isoWeek: number;
        weekStartDate: string;
        weekEndDate: string;
        employee: { employeeId: number; fullName: string };
        items: WeekPreviewItem[];
      }>;
    },
  });

  const previewRemoveCascadeMutation = useMutation({
    mutationFn: async ({ tourId, assignmentId }: { tourId: number; assignmentId: number }) => {
      const response = await apiRequest("POST", `/api/tours/${tourId}/week-employees/remove/preview`, { assignmentId });
      return response.json() as Promise<{
        assignmentId: number;
        isoYear: number;
        isoWeek: number;
        weekStartDate: string;
        weekEndDate: string;
        employee: { assignmentId: number; employeeId: number; fullName: string };
        items: WeekPreviewItem[];
      }>;
    },
  });

  const executeAddCascadeMutation = useMutation({
    mutationFn: async (params: { tourId: number; isoYear: number; isoWeek: number; employeeId: number; selectedIds: number[] }) => {
      const response = await apiRequest("POST", `/api/tours/${params.tourId}/week-employees/add`, {
        isoYear: params.isoYear,
        isoWeek: params.isoWeek,
        employeeId: params.employeeId,
        selectedAppointmentIds: params.selectedIds,
      });
      return response.json() as Promise<WeekExecuteResult>;
    },
    onSuccess: async () => {
      await refreshCascadeDependentViews();
      void refreshMonitoringWithNotification(toast);
    },
  });

  const executeRemoveCascadeMutation = useMutation({
    mutationFn: async (params: { tourId: number; assignmentId: number; isoYear: number; isoWeek: number; selectedIds: number[] }) => {
      const response = await apiRequest("DELETE", `/api/tours/${params.tourId}/week-employees/${params.assignmentId}`, {
        isoYear: params.isoYear,
        isoWeek: params.isoWeek,
        selectedAppointmentIds: params.selectedIds,
      });
      return response.json() as Promise<WeekExecuteResult>;
    },
    onSuccess: async () => {
      await refreshCascadeDependentViews();
      void refreshMonitoringWithNotification(toast);
    },
  });

  const openCascadeDialog = (
    mode: "add" | "remove",
    dialogState: Omit<WeekDialogState, "selectedIds" | "open" | "mode">,
  ) => {
    setWeekDialogState(buildWeekDialogState({
      ...dialogState,
      mode,
    }));
  };

  const handleCascadePreviewError = (error: unknown, action: "hinzufuegen" | "abziehen") => {
    const code = extractApiCode(error);
    if (error instanceof Error && error.message.includes("Wochenplanung ist blockiert")) {
      toast({
        title: `Mitarbeiter nicht ${action}`,
        description: "Die Wochenplanung ist blockiert und kann aktuell nicht geaendert werden.",
        variant: "destructive",
      });
      return;
    }
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
    if (_error instanceof Error && _error.message.includes("Wochenplanung ist blockiert")) {
      toast({
        title: mode === "add" ? "Mitarbeiter konnte nicht hinzugefuegt werden" : "Mitarbeiter konnte nicht abgezogen werden",
        description: "Die Wochenplanung ist blockiert und kann aktuell nicht geaendert werden.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: mode === "add" ? "Mitarbeiter konnte nicht hinzugefuegt werden" : "Mitarbeiter konnte nicht abgezogen werden",
      description: "Bitte versuchen Sie es erneut.",
      variant: "destructive",
    });
  };

  const handleStartAddWeekEmployee = async (params: { isoYear: number; isoWeek: number; employeeId: number }) => {
    if (!editingTour) return;
    try {
      const preview = await previewAddCascadeMutation.mutateAsync({
        tourId: editingTour.id,
        isoYear: params.isoYear,
        isoWeek: params.isoWeek,
        employeeId: params.employeeId,
      });
      openCascadeDialog("add", {
        tourId: editingTour.id,
        isoYear: preview.isoYear,
        isoWeek: preview.isoWeek,
        weekLabel: buildWeekLabel(preview.isoYear, preview.isoWeek),
        employeeId: preview.employee.employeeId,
        employeeName: preview.employee.fullName,
        previewItems: preview.items,
      });
    } catch (error) {
      handleCascadePreviewError(error, "hinzufuegen");
    }
  };

  const handleStartRemoveWeekEmployee = async (assignment: TourWeekEmployeeMember & { isoYear: number; isoWeek: number }) => {
    if (!editingTour) return;
    try {
      const preview = await previewRemoveCascadeMutation.mutateAsync({
        tourId: editingTour.id,
        assignmentId: assignment.assignmentId,
      });
      openCascadeDialog("remove", {
        tourId: editingTour.id,
        isoYear: preview.isoYear,
        isoWeek: preview.isoWeek,
        assignmentId: preview.assignmentId,
        weekLabel: buildWeekLabel(preview.isoYear, preview.isoWeek),
        employeeId: preview.employee.employeeId,
        employeeName: preview.employee.fullName,
        previewItems: preview.items,
      });
    } catch (error) {
      handleCascadePreviewError(error, "abziehen");
    }
  };

  const handleOpenCreate = () => {
    setEditingTour(null);
    setIsCreating(true);
  };

  const handleCreateWeek = async (params: { isoYear: number; isoWeek: number }) => {
    if (!editingTour) return;
    try {
      const week = await createWeekMutation.mutateAsync({
        tourId: editingTour.id,
        isoYear: params.isoYear,
        isoWeek: params.isoWeek,
      });
      toast({
        title: "Wochenplanung angelegt",
        description: `KW ${String(week.isoWeek).padStart(2, "0")} / ${week.isoYear} wurde angelegt.`,
      });
    } catch (error) {
      const code = extractApiCode(error);
      if (code === "PAST_WEEK_READONLY") {
        toast({
          title: "Anlegen nicht moeglich",
          description: "Laufende und vergangene Wochen koennen nicht mehr angelegt werden.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Wochenplanung konnte nicht angelegt werden",
        description: "Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    }
  };

  const handleBlockWeek = async (params: { isoYear: number; isoWeek: number }) => {
    if (!editingTour) return;
    try {
      const result = await blockWeekMutation.mutateAsync({
        tourId: editingTour.id,
        isoYear: params.isoYear,
        isoWeek: params.isoWeek,
      });
      toast({
        title: "Wochenplanung blockiert",
      });
    } catch (error) {
      const code = extractApiCode(error);
      if (code === "PAST_WEEK_READONLY") {
        toast({
          title: "Blockieren nicht moeglich",
          description: "Laufende und vergangene Wochen koennen nicht mehr blockiert werden.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Wochenplanung konnte nicht blockiert werden",
        description: "Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    }
  };

  const handleUnblockWeek = async (params: { isoYear: number; isoWeek: number }) => {
    if (!editingTour) return;
    try {
      const result = await unblockWeekMutation.mutateAsync({
        tourId: editingTour.id,
        isoYear: params.isoYear,
        isoWeek: params.isoWeek,
      });
      toast({
        title: "Wochenplanung freigegeben",
      });
    } catch (error) {
      const code = extractApiCode(error);
      if (code === "PAST_WEEK_READONLY") {
        toast({
          title: "Freigeben nicht moeglich",
          description: "Laufende und vergangene Wochen koennen nicht mehr freigegeben werden.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Wochenplanung konnte nicht freigegeben werden",
        description: "Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    }
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
    setWeekDialogState(null);
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
    await deleteMutation.mutateAsync({ id: currentTour.id, version: currentTour.version });
    handleCloseDialog();
  };

  const handleConfirmCascade = async () => {
    if (!weekDialogState) return;
    try {
      let result: WeekExecuteResult;
      if (weekDialogState.mode === "add") {
        result = await executeAddCascadeMutation.mutateAsync({
          tourId: weekDialogState.tourId,
          isoYear: weekDialogState.isoYear,
          isoWeek: weekDialogState.isoWeek,
          employeeId: weekDialogState.employeeId,
          selectedIds: weekDialogState.selectedIds,
        });
      } else {
        if (!weekDialogState.assignmentId) {
          toast({
            title: "Wochenplanung konnte nicht gespeichert werden",
            description: "Die zu loeschende Wochenzuordnung fehlt.",
            variant: "destructive",
          });
          return;
        }
        result = await executeRemoveCascadeMutation.mutateAsync({
          tourId: weekDialogState.tourId,
          assignmentId: weekDialogState.assignmentId,
          isoYear: weekDialogState.isoYear,
          isoWeek: weekDialogState.isoWeek,
          selectedIds: weekDialogState.selectedIds,
        });
      }
      const skippedMessage = result.skipped.length > 0
        ? ` ${result.skipped.length} Termine wurden wegen Konflikten uebersprungen.`
        : "";
      toast({
        title: weekDialogState.mode === "add" ? "Wochenplanung gespeichert" : "Wochenplanung aktualisiert",
        description: `${result.updatedAppointmentCount} Termine wurden aktualisiert.${skippedMessage}`,
      });
      setWeekDialogState(null);
    } catch (error) {
      handleExecuteCascadeError(error, weekDialogState.mode);
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
  const isMutatingWeeks = createWeekMutation.isPending
    || blockWeekMutation.isPending
    || unblockWeekMutation.isPending;

  if (activeTour || isCreating) {
    return (
      <>
        <TourEditForm
          tour={activeTour}
          allEmployees={employees}
          onSubmit={handleSubmitTour}
          onCreateWeek={activeTour ? handleCreateWeek : undefined}
          onBlockWeek={activeTour ? handleBlockWeek : undefined}
          onUnblockWeek={activeTour ? handleUnblockWeek : undefined}
          onAddWeekEmployee={activeTour ? handleStartAddWeekEmployee : undefined}
          onRemoveWeekEmployee={activeTour ? handleStartRemoveWeekEmployee : undefined}
          onDelete={handleDeleteFromDialog}
          canDelete={isAdmin}
          isDeleting={deleteMutation.isPending}
          isSaving={createMutation.isPending || updateMutation.isPending}
          isMutatingMembers={isMutatingMembers}
          isMutatingWeeks={isMutatingWeeks}
          isCreate={isCreating}
          defaultName={getNextTourName()}
          defaultColor={defaultEntityColor}
          onCancel={handleCloseDialog}
          onOpenAppointment={onOpenAppointment}
        />
        {weekDialogState ? (
          <TourEmployeeCascadeDialog
            variant="week"
            open={weekDialogState.open}
            title={weekDialogState.mode === "add" ? "Mitarbeiter in Wochenplanung aufnehmen" : "Mitarbeiter aus Wochenplanung entfernen"}
            description={
              weekDialogState.mode === "add"
                ? `${weekDialogState.employeeName} wird fuer ${weekDialogState.weekLabel} eingeplant.`
                : `${weekDialogState.employeeName} wird fuer ${weekDialogState.weekLabel} aus der Planung entfernt.`
            }
            weekLabel={weekDialogState.weekLabel}
            previewItems={weekDialogState.previewItems}
            selectedIds={weekDialogState.selectedIds}
            isSubmitting={executeAddCascadeMutation.isPending || executeRemoveCascadeMutation.isPending}
            onSelectedIdsChange={(selectedIds) => {
              setWeekDialogState((current) => current ? { ...current, selectedIds } : current);
            }}
            onConfirm={() => {
              void handleConfirmCascade();
            }}
            onClose={() => setWeekDialogState(null)}
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
