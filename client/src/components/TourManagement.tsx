import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Route } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { TourEditForm } from "@/components/TourEditForm";
import { TourWeekForm } from "@/components/TourWeekForm";
import { TourWeekPlanningView } from "@/components/TourWeekPlanningView";
import { BadgeInteractionProvider } from "@/components/ui/badge-interaction-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultEntityColor } from "@/lib/colors";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
import { invalidateTagProjectionQueries } from "@/lib/tag-invalidation";
import { useToast } from "@/hooks/use-toast";
import { useSetting, useSettings } from "@/hooks/useSettings";
import { AppointmentCountBadge } from "@/components/ui/appointment-count-badge";
import { TourEmployeeCascadeDialog } from "@/components/TourEmployeeCascadeDialog";
import { ConfirmDialogBase, type DialogBaseStep } from "@/components/ui/dialog-base";
import type { TourWeekCardData } from "@/components/TourWeekCard";
import type { Tour } from "@shared/schema";
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

type WeekDialogOperation = {
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
  executionStatus?: "pending" | "success" | "error";
  executionMessage?: string;
};

type WeekDialogState = {
  open: boolean;
  mode: "add" | "remove";
  activeIndex: number;
  phase: "preview" | "executing" | "partial_error";
  operations: WeekDialogOperation[];
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

function normalizeEmployeeIds(employeeIds: number[]): number[] {
  return Array.from(new Set(employeeIds.filter((employeeId) => Number.isInteger(employeeId) && employeeId > 0)));
}

function buildWeekDialogOperation(params: Omit<WeekDialogOperation, "selectedIds" | "executionStatus" | "executionMessage">): WeekDialogOperation {
  return {
    ...params,
    selectedIds: params.previewItems.filter((item) => item.selectable).map((item) => item.appointmentId),
    executionStatus: "pending",
  };
}

export function TourManagement({ onCancel, userRole, onOpenAppointment, initialTourId = null, onEditingChange }: TourManagementProps) {
  const { toast } = useToast();
  const { setSetting } = useSettings();
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTourWeek, setActiveTourWeek] = useState<TourWeekCardData | null>(null);
  const [weekDialogState, setWeekDialogState] = useState<WeekDialogState | null>(null);
  const [pendingBlockWeek, setPendingBlockWeek] = useState<{ tourId: number; isoYear: number; isoWeek: number } | null>(null);
  const [activeOverviewTab, setActiveOverviewTab] = useState<"tours" | "weekPlanning">("tours");
  const effectiveUserRole = (userRole ?? window.localStorage.getItem("userRole") ?? "").toUpperCase();
  const isAdmin = effectiveUserRole === "ADMIN";
  const canMutateTours =
    effectiveUserRole === "ADMIN"
    || effectiveUserRole === "DISPATCHER"
    || effectiveUserRole === "DISPONENT";
  const inlineNotesSetting = useSetting("calendar.weekInlineNotes.visible");
  const showInlineNotes = Boolean(inlineNotesSetting);
  const weekLanesCollapsedSetting = useSetting("tourWeekPlanning.weekLanes.isCollapsed");
  const areWeekLanesCollapsed = Boolean(weekLanesCollapsedSetting);

  const setInlineNotesVisible = (visible: boolean) => {
    void setSetting({
      key: "calendar.weekInlineNotes.visible",
      scopeType: "USER",
      value: visible,
    }).catch(() => {
      toast({
        title: "Notizen-Anzeige konnte nicht gespeichert werden",
        description: "Bitte erneut versuchen.",
        variant: "destructive",
      });
    });
  };

  const setWeekLanesCollapsed = (collapsed: boolean) => {
    void setSetting({
      key: "tourWeekPlanning.weekLanes.isCollapsed",
      scopeType: "USER",
      value: collapsed,
    }).catch(() => {
      toast({
        title: "Tourenansicht konnte nicht gespeichert werden",
        description: "Bitte erneut versuchen.",
        variant: "destructive",
      });
    });
  };

  const { data: tours = [], isLoading: toursLoading } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const isLoading = toursLoading;
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
            || (key[0].startsWith("/api/tours/") && key[0].endsWith("/week-employees/available"))
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
          title: "Speichern nicht möglich",
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      if (code === "BUSINESS_CONFLICT") {
        toast({
          title: "Speichern nicht möglich",
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
    operations: WeekDialogOperation[],
  ) => {
    setWeekDialogState({
      open: true,
      mode,
      activeIndex: 0,
      phase: "preview",
      operations,
    });
  };

  const openAddCascadeDialog = (
    preview: {
      isoYear: number;
      isoWeek: number;
      employee: { employeeId: number; fullName: string };
      items: WeekPreviewItem[];
    },
    options?: { tourId?: number },
  ) => {
    const targetTourId = options?.tourId ?? editingTour?.id;
    if (!targetTourId) return;
    openCascadeDialog("add", [
      buildWeekDialogOperation({
        mode: "add",
        tourId: targetTourId,
        isoYear: preview.isoYear,
        isoWeek: preview.isoWeek,
        weekLabel: buildWeekLabel(preview.isoYear, preview.isoWeek),
        employeeId: preview.employee.employeeId,
        employeeName: preview.employee.fullName,
        previewItems: preview.items,
      }),
    ]);
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
        title: mode === "add" ? "Mitarbeiter konnte nicht hinzugefügt werden" : "Mitarbeiter konnte nicht abgezogen werden",
        description: "Die Wochenplanung ist blockiert und kann aktuell nicht geaendert werden.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: mode === "add" ? "Mitarbeiter konnte nicht hinzugefügt werden" : "Mitarbeiter konnte nicht abgezogen werden",
      description: "Bitte versuchen Sie es erneut.",
      variant: "destructive",
    });
  };

  const handleStartAddWeekEmployee = async (params: { tourId?: number; isoYear: number; isoWeek: number; employeeId: number }) => {
    const targetTourId = params.tourId ?? editingTour?.id;
    if (!targetTourId) return;
    try {
      const preview = await previewAddCascadeMutation.mutateAsync({
        tourId: targetTourId,
        isoYear: params.isoYear,
        isoWeek: params.isoWeek,
        employeeId: params.employeeId,
      });
      openAddCascadeDialog(preview, { tourId: targetTourId });
    } catch (error) {
      handleCascadePreviewError(error, "hinzufuegen");
    }
  };

  const handleStartAddWeekEmployees = async (
    params: { tourId?: number; isoYear: number; isoWeek: number; employeeIds: number[] },
  ) => {
    const targetTourId = params.tourId ?? editingTour?.id;
    if (!targetTourId) return;

    const normalizedEmployeeIds = normalizeEmployeeIds(params.employeeIds);
    if (normalizedEmployeeIds.length === 0) return;

    try {
      const operations: WeekDialogOperation[] = [];
      for (const employeeId of normalizedEmployeeIds) {
        const preview = await previewAddCascadeMutation.mutateAsync({
          tourId: targetTourId,
          isoYear: params.isoYear,
          isoWeek: params.isoWeek,
          employeeId,
        });
        operations.push(buildWeekDialogOperation({
          mode: "add",
          tourId: targetTourId,
          isoYear: preview.isoYear,
          isoWeek: preview.isoWeek,
          weekLabel: buildWeekLabel(preview.isoYear, preview.isoWeek),
          employeeId: preview.employee.employeeId,
          employeeName: preview.employee.fullName,
          previewItems: preview.items,
        }));
      }
      openCascadeDialog("add", operations);
    } catch (error) {
      handleCascadePreviewError(error, "hinzufuegen");
    }
  };

  const handleStartRemoveWeekEmployee = async (assignment: TourWeekEmployeeMember & { tourId?: number; isoYear: number; isoWeek: number }) => {
    const targetTourId = assignment.tourId ?? editingTour?.id;
    if (!targetTourId) return;
    try {
      const preview = await previewRemoveCascadeMutation.mutateAsync({
        tourId: targetTourId,
        assignmentId: assignment.assignmentId,
      });
      openCascadeDialog("remove", [
        buildWeekDialogOperation({
          mode: "remove",
          tourId: targetTourId,
          isoYear: preview.isoYear,
          isoWeek: preview.isoWeek,
          assignmentId: preview.assignmentId,
          weekLabel: buildWeekLabel(preview.isoYear, preview.isoWeek),
          employeeId: preview.employee.employeeId,
          employeeName: preview.employee.fullName,
          previewItems: preview.items,
        }),
      ]);
    } catch (error) {
      handleCascadePreviewError(error, "abziehen");
    }
  };

  const handleOpenCreate = () => {
    if (!canMutateTours) return;
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
          title: "Anlegen nicht möglich",
          description: "Vergangene Wochen können nicht mehr angelegt werden.",
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

  const handleBlockWeek = async (params: { tourId?: number; isoYear: number; isoWeek: number }) => {
    const targetTourId = params.tourId ?? editingTour?.id;
    if (!targetTourId) return;
    setPendingBlockWeek({ tourId: targetTourId, isoYear: params.isoYear, isoWeek: params.isoWeek });
  };

  const executeBlockWeek = async (params: { tourId: number; isoYear: number; isoWeek: number }) => {
    try {
      await blockWeekMutation.mutateAsync({
        tourId: params.tourId,
        isoYear: params.isoYear,
        isoWeek: params.isoWeek,
      });
      setPendingBlockWeek(null);
      toast({
        title: "Wochenplanung blockiert",
      });
    } catch (error) {
      const code = extractApiCode(error);
      if (code === "PAST_WEEK_READONLY") {
        toast({
          title: "Blockieren nicht möglich",
          description: "Vergangene Wochen können nicht mehr blockiert werden.",
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

  const handleUnblockWeek = async (params: { tourId?: number; isoYear: number; isoWeek: number }) => {
    const targetTourId = params.tourId ?? editingTour?.id;
    if (!targetTourId) return;
    try {
      await unblockWeekMutation.mutateAsync({
        tourId: targetTourId,
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
          title: "Freigeben nicht möglich",
          description: "Vergangene Wochen können nicht mehr freigegeben werden.",
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
    setActiveTourWeek(null);
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
    if (weekDialogState.phase === "preview" && weekDialogState.activeIndex < weekDialogState.operations.length - 1) {
      setWeekDialogState((current) => current ? { ...current, activeIndex: current.activeIndex + 1 } : current);
      return;
    }

    try {
      setWeekDialogState((current) => current ? { ...current, phase: "executing" } : current);
      let totalUpdatedAppointmentCount = 0;
      let totalSkippedCount = 0;

      for (let index = 0; index < weekDialogState.operations.length; index += 1) {
        const operation = weekDialogState.operations[index];
        if (operation.executionStatus === "success") continue;

        try {
          let result: WeekExecuteResult;
          if (operation.mode === "add") {
            result = await executeAddCascadeMutation.mutateAsync({
              tourId: operation.tourId,
              isoYear: operation.isoYear,
              isoWeek: operation.isoWeek,
              employeeId: operation.employeeId,
              selectedIds: operation.selectedIds,
            });
          } else {
            if (!operation.assignmentId) {
              throw new Error("Die zu löschende Wochenzuordnung fehlt.");
            }
            result = await executeRemoveCascadeMutation.mutateAsync({
              tourId: operation.tourId,
              assignmentId: operation.assignmentId,
              isoYear: operation.isoYear,
              isoWeek: operation.isoWeek,
              selectedIds: operation.selectedIds,
            });
          }

          totalUpdatedAppointmentCount += result.updatedAppointmentCount;
          totalSkippedCount += result.skipped.length;
          setWeekDialogState((current) => {
            if (!current) return current;
            return {
              ...current,
              activeIndex: Math.min(index + 1, current.operations.length - 1),
              operations: current.operations.map((entry, entryIndex) =>
                entryIndex === index
                  ? {
                      ...entry,
                      executionStatus: "success",
                      executionMessage: `${result.updatedAppointmentCount} Termine aktualisiert`,
                    }
                  : entry,
              ),
            };
          });
        } catch (error) {
          setWeekDialogState((current) => {
            if (!current) return current;
            return {
              ...current,
              phase: "partial_error",
              activeIndex: index,
              operations: current.operations.map((entry, entryIndex) =>
                entryIndex === index
                  ? {
                      ...entry,
                      executionStatus: "error",
                      executionMessage: error instanceof Error ? error.message : "Ausführung fehlgeschlagen.",
                    }
                  : entry,
              ),
            };
          });
          handleExecuteCascadeError(error, operation.mode);
          return;
        }
      }

      const skippedMessage = totalSkippedCount > 0
        ? ` ${totalSkippedCount} Termine wurden wegen Konflikten übersprungen.`
        : "";
      toast({
        title: weekDialogState.mode === "add" ? "Wochenplanung gespeichert" : "Wochenplanung aktualisiert",
        description: `${totalUpdatedAppointmentCount} Termine wurden aktualisiert.${skippedMessage}`,
      });

      setWeekDialogState(null);
    } catch (error) {
      handleExecuteCascadeError(error, weekDialogState.mode);
    }
  };

  const activeWeekDialogOperation = weekDialogState?.operations[weekDialogState.activeIndex] ?? null;
  const weekDialogSteps: DialogBaseStep[] = weekDialogState
    ? weekDialogState.operations.map((operation, index) => {
        let state: DialogBaseStep["state"] = index === weekDialogState.activeIndex ? "active" : "pending";
        if (operation.executionStatus === "success") state = "complete";
        if (operation.executionStatus === "error") state = "error";
        if (weekDialogState.phase === "preview" && index < weekDialogState.activeIndex) state = "complete";
        return {
          id: `${operation.mode}-${operation.employeeId}-${index}`,
          title: operation.employeeName,
          state,
        };
      })
    : [];
  const weekDialogConfirmLabel = weekDialogState
    ? weekDialogState.phase === "partial_error"
      ? "Offene Schritte erneut ausführen"
      : weekDialogState.activeIndex < weekDialogState.operations.length - 1
        ? "Weiter"
        : "Auswahl ausführen"
    : "Bestätigen";
  const weekDialogExecutionMessage = weekDialogState?.phase === "partial_error"
    ? "Ein Schritt konnte nicht ausgeführt werden. Bereits erfolgreiche Schritte werden beim erneuten Ausführen übersprungen."
    : weekDialogState?.phase === "executing"
      ? "Die bestätigten Entscheidungen werden seriell ausgeführt."
      : null;
  const blockWeekConfirmDialog = (
    <ConfirmDialogBase
      open={pendingBlockWeek !== null}
      onOpenChange={(open) => {
        if (!open && !blockWeekMutation.isPending) setPendingBlockWeek(null);
      }}
      icon={<Route />}
      title="Wochenplanung blockieren?"
      description={pendingBlockWeek
        ? `${buildWeekLabel(pendingBlockWeek.isoYear, pendingBlockWeek.isoWeek)} wird blockiert. Danach sind Ressourcenänderungen in dieser Tour-KW gesperrt, bis sie wieder freigegeben wird.`
        : undefined}
      confirmLabel="Blockieren"
      pendingLabel="Blockieren..."
      isPending={blockWeekMutation.isPending}
      onConfirm={() => {
        if (!pendingBlockWeek) return;
        void executeBlockWeek(pendingBlockWeek);
      }}
      testId="dialog-tour-week-block-confirm"
    />
  );

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
          readOnly={!canMutateTours}
          onSubmit={handleSubmitTour}
          onCreateWeek={activeTour ? handleCreateWeek : undefined}
          onBlockWeek={activeTour ? handleBlockWeek : undefined}
          onUnblockWeek={activeTour ? handleUnblockWeek : undefined}
          onAddWeekEmployee={activeTour ? handleStartAddWeekEmployee : undefined}
          onAddWeekEmployees={activeTour ? handleStartAddWeekEmployees : undefined}
          onApplyWeekEmployees={activeTour ? handleStartAddWeekEmployees : undefined}
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
          onOpenTourWeek={(week) => setActiveTourWeek(week)}
        />
        {activeTourWeek && activeTour ? (
          <TourWeekForm
            week={activeTourWeek}
            scope="tour"
            readOnly={!canMutateTours}
            onClose={() => setActiveTourWeek(null)}
            onOpenAppointment={onOpenAppointment}
            onAddWeekEmployees={({ employeeIds, isoYear, isoWeek }) =>
              handleStartAddWeekEmployees({ isoYear, isoWeek, employeeIds })
            }
            onRemoveWeekEmployee={(assignment) =>
              handleStartRemoveWeekEmployee({
                assignmentId: assignment.assignmentId,
                employeeId: assignment.employeeId,
                fullName: assignment.fullName,
                isoYear: assignment.isoYear,
                isoWeek: assignment.isoWeek,
              })
            }
            onBlockWeek={({ isoYear, isoWeek }) => handleBlockWeek({ isoYear, isoWeek })}
            onUnblockWeek={({ isoYear, isoWeek }) => handleUnblockWeek({ isoYear, isoWeek })}
            isMutatingMembers={isMutatingMembers}
            isMutatingWeeks={isMutatingWeeks}
          />
        ) : null}
        {blockWeekConfirmDialog}
        {weekDialogState && activeWeekDialogOperation ? (
          <TourEmployeeCascadeDialog
            variant="week"
            open={weekDialogState.open}
            employeeId={activeWeekDialogOperation.employeeId}
            title={weekDialogState.mode === "add" ? "Mitarbeiter in Wochenplanung aufnehmen" : "Mitarbeiter aus Wochenplanung entfernen"}
            description={
              weekDialogState.mode === "add"
                ? `${activeWeekDialogOperation.employeeName} wird für ${activeWeekDialogOperation.weekLabel} eingeplant.`
                : `${activeWeekDialogOperation.employeeName} wird für ${activeWeekDialogOperation.weekLabel} aus der Planung entfernt.`
            }
            weekLabel={activeWeekDialogOperation.weekLabel}
            previewItems={activeWeekDialogOperation.previewItems}
            selectedIds={activeWeekDialogOperation.selectedIds}
            steps={weekDialogSteps}
            executionMessage={weekDialogExecutionMessage}
            confirmLabel={weekDialogConfirmLabel}
            summary={`${weekDialogState.operations.length} Entscheidungsschritt${weekDialogState.operations.length === 1 ? "" : "e"} in dieser Ressourcenplanung.`}
            isSubmitting={weekDialogState.phase === "executing" || executeAddCascadeMutation.isPending || executeRemoveCascadeMutation.isPending}
            onSelectedIdsChange={(selectedIds) => {
              setWeekDialogState((current) => current ? {
                ...current,
                operations: current.operations.map((operation, index) =>
                  index === current.activeIndex ? { ...operation, selectedIds } : operation,
                ),
              } : current);
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
              {canMutateTours && activeOverviewTab === "tours" ? (
                <Button
                  variant="outline"
                  onClick={handleOpenCreate}
                  disabled={createMutation.isPending}
                  data-testid="button-new-tour"
                >
                  Tour anlegen
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
            <Tabs
              value={activeOverviewTab}
              onValueChange={(value) => setActiveOverviewTab(value as "tours" | "weekPlanning")}
              className="flex h-full min-h-0 flex-col"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
                <TabsList className="flex flex-1" data-testid="tabs-tour-overview">
                  <TabsTrigger className="flex-1" value="tours" data-testid="tab-tour-overview-list">Touren</TabsTrigger>
                  <TabsTrigger className="flex-1" value="weekPlanning" data-testid="tab-tour-overview-week-planning">Wochenplanung</TabsTrigger>
                </TabsList>
                {activeOverviewTab === "weekPlanning" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Touren</span>
                      <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5" role="group" aria-label="Touren einklappen">
                        <button
                          type="button"
                          onClick={() => setWeekLanesCollapsed(false)}
                          aria-pressed={!areWeekLanesCollapsed}
                          data-testid="toggle-tour-week-planning-lanes-expanded"
                          className={`rounded px-2 py-1 text-[10px] font-semibold leading-none transition-all ${
                            !areWeekLanesCollapsed ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Aufgeklappt
                        </button>
                        <button
                          type="button"
                          onClick={() => setWeekLanesCollapsed(true)}
                          aria-pressed={areWeekLanesCollapsed}
                          data-testid="toggle-tour-week-planning-lanes-collapsed"
                          className={`rounded px-2 py-1 text-[10px] font-semibold leading-none transition-all ${
                            areWeekLanesCollapsed ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Zugeklappt
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notizen</span>
                      <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5" role="group" aria-label="Notizen anzeigen">
                        <button
                          type="button"
                          onClick={() => setInlineNotesVisible(true)}
                          aria-pressed={showInlineNotes}
                          data-testid="switch-tour-week-planning-inline-notes"
                          className={`rounded px-2 py-1 text-[10px] font-semibold leading-none transition-all ${
                            showInlineNotes ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Ja
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineNotesVisible(false)}
                          aria-pressed={!showInlineNotes}
                          data-testid="toggle-tour-week-planning-inline-notes-no"
                          className={`rounded px-2 py-1 text-[10px] font-semibold leading-none transition-all ${
                            !showInlineNotes ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Nein
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              <TabsContent value="tours" className="min-h-0 flex-1 overflow-auto">
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
              </TabsContent>
              <TabsContent value="weekPlanning" className="h-full min-h-0 flex-1 overflow-hidden">
                <TourWeekPlanningView
                  readOnly={!canMutateTours}
                  showInlineNotes={showInlineNotes}
                  weekLanesCollapsed={areWeekLanesCollapsed}
                  isMutatingMembers={isMutatingMembers}
                  isMutatingWeeks={isMutatingWeeks}
                  onAddWeekEmployee={handleStartAddWeekEmployee}
                  onAddWeekEmployees={handleStartAddWeekEmployees}
                  onApplyWeekEmployees={handleStartAddWeekEmployees}
                  onRemoveWeekEmployee={handleStartRemoveWeekEmployee}
                  onBlockWeek={handleBlockWeek}
                  onUnblockWeek={handleUnblockWeek}
                  onOpenTourWeek={(week) => setActiveTourWeek(week)}
                />
              </TabsContent>
            </Tabs>
          )}
        />
      </BadgeInteractionProvider>
      {activeTourWeek ? (
        <TourWeekForm
          week={activeTourWeek}
          scope="tour"
          readOnly={!canMutateTours}
          onClose={() => setActiveTourWeek(null)}
          onOpenAppointment={onOpenAppointment}
          onAddWeekEmployees={({ employeeIds, isoYear, isoWeek }) =>
            handleStartAddWeekEmployees({ tourId: activeTourWeek.tourId, isoYear, isoWeek, employeeIds })
          }
          onRemoveWeekEmployee={(assignment) =>
            handleStartRemoveWeekEmployee({
              assignmentId: assignment.assignmentId,
              employeeId: assignment.employeeId,
              fullName: assignment.fullName,
              tourId: activeTourWeek.tourId,
              isoYear: assignment.isoYear,
              isoWeek: assignment.isoWeek,
            })
          }
          onBlockWeek={({ isoYear, isoWeek }) => handleBlockWeek({ tourId: activeTourWeek.tourId, isoYear, isoWeek })}
          onUnblockWeek={({ isoYear, isoWeek }) => handleUnblockWeek({ tourId: activeTourWeek.tourId, isoYear, isoWeek })}
          isMutatingMembers={isMutatingMembers}
          isMutatingWeeks={isMutatingWeeks}
        />
      ) : null}
      {blockWeekConfirmDialog}
      {weekDialogState && activeWeekDialogOperation ? (
        <TourEmployeeCascadeDialog
          variant="week"
          open={weekDialogState.open}
          employeeId={activeWeekDialogOperation.employeeId}
          title={weekDialogState.mode === "add" ? "Mitarbeiter in Wochenplanung aufnehmen" : "Mitarbeiter aus Wochenplanung entfernen"}
          description={
            weekDialogState.mode === "add"
              ? `${activeWeekDialogOperation.employeeName} wird für ${activeWeekDialogOperation.weekLabel} eingeplant.`
              : `${activeWeekDialogOperation.employeeName} wird für ${activeWeekDialogOperation.weekLabel} aus der Planung entfernt.`
          }
          weekLabel={activeWeekDialogOperation.weekLabel}
          previewItems={activeWeekDialogOperation.previewItems}
          selectedIds={activeWeekDialogOperation.selectedIds}
          steps={weekDialogSteps}
          executionMessage={weekDialogExecutionMessage}
          confirmLabel={weekDialogConfirmLabel}
          summary={`${weekDialogState.operations.length} Entscheidungsschritt${weekDialogState.operations.length === 1 ? "" : "e"} in dieser Ressourcenplanung.`}
          isSubmitting={weekDialogState.phase === "executing" || executeAddCascadeMutation.isPending || executeRemoveCascadeMutation.isPending}
          onSelectedIdsChange={(selectedIds) => {
            setWeekDialogState((current) => current ? {
              ...current,
              operations: current.operations.map((operation, index) =>
                index === current.activeIndex ? { ...operation, selectedIds } : operation,
              ),
            } : current);
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
