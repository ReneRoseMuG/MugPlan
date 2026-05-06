import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, addWeeks, differenceInCalendarDays, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek, subWeeks } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { MonthSheetGrid } from "@/components/MonthSheetGrid";
import { WeekGrid } from "@/components/WeekGrid";
import {
  getNextMonthWindowStart,
  getPreviousMonthWindowStart,
  MONTH_SHEET_WINDOW_WEEK_COUNT,
  normalizeMonthWindowStart,
  parseMonthWindowStart,
} from "@/components/calendar/monthSheetModel";
import { CalendarFilterPanel } from "@/components/ui/filter-panels/calendar-filter-panel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TourEmployeeCascadeDialog } from "@/components/TourEmployeeCascadeDialog";
import { parseIsoWeekInput, sanitizeIsoWeekInput } from "@/lib/isoWeekInput";
import { resolveKwJumpTarget } from "@/lib/kwJump";
import { getStoredUserRole, isReaderRole } from "@/lib/auth";
import { useSetting, useSettings } from "@/hooks/useSettings";
import type { MonitoringListResponse } from "@shared/routes";
import { buildMonitoringConflictMap } from "@/lib/monitoring-ui";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import {
  buildEmployeeIdsFromPreviewSelection,
  formatCalendarMoveDate,
  getCalendarMoveSelectionTitle,
  getDefaultPreviewSelection,
  isRegularCalendarMoveTarget,
  type AppointmentWeekEmployeePreviewResponse,
  type CalendarMoveRequest,
  type CalendarMoveSelection,
} from "@/lib/calendar-move";
import type { WeekViewRestoreRequest } from "@/pages/Home";

type CalendarWorkspaceView = "week" | "month" | "monthSheet";
type CalendarAbsenceMode = "planning" | "absences";

type PendingCalendarMove = {
  request: CalendarMoveRequest;
  targetEndDate: string | null;
  preview: AppointmentWeekEmployeePreviewResponse | null;
  selectedIds: number[];
  resolutionMode: "additive" | "replace";
};

type OpenAppointmentContext = {
  initialDate?: string;
  initialTourId?: number | null;
  appointmentId?: number;
  projectId?: number;
  returnView?: CalendarWorkspaceView;
  weekScrollLeft?: number | null;
  weekScrollTop?: number | null;
};

interface CalendarWorkspaceProps {
  mode: "global" | "contextual";
  activeView: CalendarWorkspaceView;
  currentDate: Date;
  monitoringItems?: MonitoringListResponse;
  employeeFilterId: number | null;
  onEmployeeFilterChange: (id: number | null) => void;
  onViewChange: (view: CalendarWorkspaceView) => void;
  onDateChange: (date: Date) => void;
  onOpenAppointmentForm: (ctx: OpenAppointmentContext) => void;
  onBack?: () => void;
  projectId?: number;
  hideMainNavigation?: boolean;
  restoreRequest?: WeekViewRestoreRequest | null;
  onRestoreApplied?: () => void;
}

const calendarPagingButtonClassName =
  "h-full w-7 border-amber-200 bg-amber-50 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";
const MONTH_WINDOW_URL_PARAM = "windowStart";
const MONTH_WINDOW_STORAGE_KEY = "calendar.month.windowStart";

function isMonthWindowView(activeView: CalendarWorkspaceView): boolean {
  return activeView === "month" || activeView === "monthSheet";
}

function formatMonthWindowStart(value: Date): string {
  return format(normalizeMonthWindowStart(value), "yyyy-MM-dd");
}

function readStoredMonthWindowStart(fallbackDate: Date): Date {
  if (typeof window === "undefined") {
    return normalizeMonthWindowStart(fallbackDate);
  }

  const urlValue = typeof window.location?.search === "string"
    ? new URLSearchParams(window.location.search).get(MONTH_WINDOW_URL_PARAM)
    : null;
  if (urlValue !== null) {
    return parseMonthWindowStart(urlValue, new Date());
  }

  const storedValue = window.localStorage?.getItem(MONTH_WINDOW_STORAGE_KEY);
  return parseMonthWindowStart(storedValue, fallbackDate);
}

function persistMonthWindowStart(value: Date) {
  if (typeof window === "undefined") {
    return;
  }

  const dateKey = formatMonthWindowStart(value);
  window.localStorage?.setItem(MONTH_WINDOW_STORAGE_KEY, dateKey);

  if (typeof window.location?.href !== "string" || typeof window.history?.replaceState !== "function") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set(MONTH_WINDOW_URL_PARAM, dateKey);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function buildWeekNavigationRestoreRequest(
  activeView: CalendarWorkspaceView,
  viewport: { scrollLeft: number; scrollTop: number } | null,
): WeekViewRestoreRequest | null {
  if (activeView !== "week" || !viewport) {
    return null;
  }
  return {
    scrollLeft: viewport.scrollLeft,
    scrollTop: viewport.scrollTop,
  };
}

export function CalendarMoveSelectionCard({
  selection,
  onClear,
}: {
  selection: CalendarMoveSelection;
  onClear: () => void;
}) {
  const title = getCalendarMoveSelectionTitle(selection);
  return (
    <div
      className="flex flex-shrink-0 items-center justify-between gap-4 border-b-2 border-amber-500 bg-amber-100 px-6 py-3 text-amber-950 shadow-sm"
      data-testid="calendar-move-selection-card"
    >
      <div className="min-w-0">
        <div className="text-sm font-bold">Termin zum Verschieben selektiert</div>
        <div className="truncate text-sm">
          {title} - {formatCalendarMoveDate(selection.startDate)}
          {selection.tourName ? ` - ${selection.tourName}` : ""}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 border-amber-500 bg-white text-amber-950 hover:bg-amber-50"
        onClick={onClear}
        data-testid="button-clear-calendar-move-selection"
      >
        Aufheben
      </Button>
    </div>
  );
}

export function CalendarWorkspace({
  mode,
  activeView,
  currentDate,
  monitoringItems,
  employeeFilterId,
  onEmployeeFilterChange,
  onViewChange,
  onDateChange,
  onOpenAppointmentForm,
  onBack,
  projectId,
  hideMainNavigation = false,
  restoreRequest,
  onRestoreApplied,
}: CalendarWorkspaceProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setSetting } = useSettings();
  const isKwJumpEnabled = activeView === "week" || activeView === "month" || activeView === "monthSheet";
  const [conflictHighlightActive, setConflictHighlightActive] = useState(false);
  const [jumpBackDate, setJumpBackDate] = useState<Date | null>(null);
  const [localWeekRestoreRequest, setLocalWeekRestoreRequest] = useState<WeekViewRestoreRequest | null>(null);
  const [calendarAbsenceMode, setCalendarAbsenceMode] = useState<CalendarAbsenceMode>("planning");
  const [footerAction, setFooterAction] = useState<ReactNode | null>(null);
  const [selectedMoveAppointment, setSelectedMoveAppointment] = useState<CalendarMoveSelection | null>(null);
  const [pendingCalendarMove, setPendingCalendarMove] = useState<PendingCalendarMove | null>(null);
  const [isCalendarMoveSubmitting, setIsCalendarMoveSubmitting] = useState(false);
  const [kwInputValue, setKwInputValue] = useState(() =>
    isKwJumpEnabled ? String(getISOWeek(currentDate)) : "",
  );
  const [kwJumpError, setKwJumpError] = useState(false);
  const latestWeekViewportRef = useRef<{ scrollLeft: number; scrollTop: number } | null>(null);
  const monthWindowRestoreAppliedRef = useRef(false);
  const weekLanesCollapsedSetting = useSetting("calendar.weekLanes.isCollapsed");
  const weekTileBodyModeSetting = useSetting("calendar.weekTileBodyMode");
  const userRole = getStoredUserRole();
  const isReaderCalendarReadOnly = isReaderRole(userRole);
  const conflictAppointmentMap = useMemo(
    () => buildMonitoringConflictMap(monitoringItems),
    [monitoringItems],
  );
  const conflictAppointmentCount = conflictAppointmentMap.size;

  useEffect(() => {
    if (conflictAppointmentCount === 0 && conflictHighlightActive) {
      setConflictHighlightActive(false);
    }
  }, [conflictAppointmentCount, conflictHighlightActive]);

  useEffect(() => {
    setJumpBackDate(null);
    setLocalWeekRestoreRequest(null);
    setKwJumpError(false);
    if (mode !== "global" || !isMonthWindowView(activeView)) {
      monthWindowRestoreAppliedRef.current = false;
    }
    if (!isKwJumpEnabled) {
      setKwInputValue("");
    }
  }, [activeView, isKwJumpEnabled, mode]);

  useEffect(() => {
    if (mode !== "global" || !isMonthWindowView(activeView) || monthWindowRestoreAppliedRef.current) {
      return;
    }

    monthWindowRestoreAppliedRef.current = true;
    const restoredWindowStart = readStoredMonthWindowStart(currentDate);
    if (restoredWindowStart.getTime() !== normalizeMonthWindowStart(currentDate).getTime()) {
      onDateChange(restoredWindowStart);
      return;
    }

    persistMonthWindowStart(restoredWindowStart);
  }, [activeView, currentDate, mode, onDateChange]);

  useEffect(() => {
    if (mode !== "global" || !isMonthWindowView(activeView) || !monthWindowRestoreAppliedRef.current) {
      return;
    }
    persistMonthWindowStart(currentDate);
  }, [activeView, currentDate, mode]);

  useEffect(() => {
    if (!isKwJumpEnabled) {
      setKwInputValue("");
      return;
    }
    setKwInputValue(String(getISOWeek(currentDate)));
  }, [currentDate, isKwJumpEnabled]);

  const rememberWeekViewportForNextNavigation = () => {
    const nextRestoreRequest = buildWeekNavigationRestoreRequest(activeView, latestWeekViewportRef.current);
    if (!nextRestoreRequest) return;
    setLocalWeekRestoreRequest(nextRestoreRequest);
  };

  const submitKwJump = (valueOverride?: string) => {
    const trimmedValue = sanitizeIsoWeekInput(valueOverride ?? kwInputValue);
    if (trimmedValue.length === 0) {
      setKwJumpError(false);
      return;
    }

    const parsedKw = parseIsoWeekInput(trimmedValue);
    if (!parsedKw) {
      setKwJumpError(true);
      return;
    }

    const targetDate = resolveKwJumpTarget(parsedKw, currentDate);
    if (targetDate) {
      const currentWeekStart = startOfISOWeek(currentDate);
      if (targetDate.getTime() === currentWeekStart.getTime()) {
        setKwInputValue(String(parsedKw));
        setKwJumpError(false);
        return;
      }
      rememberWeekViewportForNextNavigation();
      setJumpBackDate(isMonthWindowView(activeView) ? normalizeMonthWindowStart(currentDate) : currentDate);
      onDateChange(isMonthWindowView(activeView) ? normalizeMonthWindowStart(targetDate) : targetDate);
      setKwInputValue(String(parsedKw));
      setKwJumpError(false);
      return;
    }

    setKwJumpError(true);
  };

  const persistWeekLanesCollapsed = (collapsed: boolean) => {
    void setSetting({
      key: "calendar.weekLanes.isCollapsed",
      scopeType: "USER",
      value: collapsed,
    }).catch((error) => {
      console.error("[calendar-workspace] week lanes collapsed persist failed", error);
      toast({
        title: "Tourenansicht konnte nicht gespeichert werden",
        description: "Bitte erneut versuchen.",
        variant: "destructive",
      });
    });
  };

  const next = () => {
    setJumpBackDate(null);
    setKwJumpError(false);
    if (isMonthWindowView(activeView)) {
      onDateChange(getNextMonthWindowStart(currentDate));
      return;
    }
    rememberWeekViewportForNextNavigation();
    onDateChange(addWeeks(currentDate, 1));
  };

  const prev = () => {
    setJumpBackDate(null);
    setKwJumpError(false);
    if (isMonthWindowView(activeView)) {
      onDateChange(getPreviousMonthWindowStart(currentDate));
      return;
    }
    rememberWeekViewportForNextNavigation();
    onDateChange(subWeeks(currentDate, 1));
  };

  const nextWeekWindow = () => {
    setJumpBackDate(null);
    setKwJumpError(false);
    onDateChange(addWeeks(normalizeMonthWindowStart(currentDate), 1));
  };

  const prevWeekWindow = () => {
    setJumpBackDate(null);
    setKwJumpError(false);
    onDateChange(subWeeks(normalizeMonthWindowStart(currentDate), 1));
  };

  const buildTargetEndDate = (appointment: CalendarMoveSelection, targetStartDate: string) => {
    if (!appointment.endDate) return null;
    const durationDays = differenceInCalendarDays(parseISO(appointment.endDate), parseISO(appointment.startDate));
    return durationDays > 0 ? format(addDays(parseISO(targetStartDate), durationDays), "yyyy-MM-dd") : null;
  };

  const buildMoveErrorMessage = (payload: { code?: string; message?: string } | null, fallback: string) => {
    if (payload?.code === "VERSION_CONFLICT") return "Termin wurde zwischenzeitlich geändert. Bitte neu laden.";
    if (payload?.code === "PAST_APPOINTMENT_READONLY" || payload?.code === "PAST_WEEK_READONLY") return "Termin ist gesperrt.";
    if (payload?.code === "CANCELLED_APPOINTMENT_READONLY") return "Stornierte Termine können nicht verschoben werden.";
    if (payload?.code === "EMPLOYEE_OVERLAP_CONFLICT") return payload.message ?? "Mitarbeiterüberschneidung beim Verschieben.";
    if (payload?.code === "BUSINESS_CONFLICT" || payload?.code === "VALIDATION_ERROR") return payload.message ?? fallback;
    return payload?.message ?? fallback;
  };

  const fetchCalendarMovePreview = async (
    request: CalendarMoveRequest,
    targetEndDate: string | null,
  ): Promise<AppointmentWeekEmployeePreviewResponse> => {
    const response = await fetch(`/api/appointments/${request.appointment.id}/tour-change-preview`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newTourId: request.targetTourId,
        newStartDate: request.targetStartDate,
        newEndDate: targetEndDate,
        newStartTime: request.appointment.startTime,
        currentEmployeeIds: request.appointment.employeeIds,
      }),
    });
    const payload = await response.json().catch(() => null) as (AppointmentWeekEmployeePreviewResponse & { code?: string; message?: string }) | null;
    if (!response.ok) {
      throw new Error(buildMoveErrorMessage(payload, "Mitarbeitervorschau konnte nicht geladen werden."));
    }
    return payload as AppointmentWeekEmployeePreviewResponse;
  };

  const executeCalendarMove = async (
    request: CalendarMoveRequest,
    targetEndDate: string | null,
    employeeIds: number[],
  ) => {
    setIsCalendarMoveSubmitting(true);
    try {
      const response = await fetch(`/api/appointments/${request.appointment.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: request.appointment.version,
          projectId: request.appointment.projectId,
          customerId: request.appointment.customerId,
          tourId: request.targetTourId,
          startDate: request.targetStartDate,
          endDate: targetEndDate,
          startTime: request.appointment.startTime,
          employeeIds,
        }),
      });
      const payload = await response.json().catch(() => null) as { code?: string; message?: string } | null;
      if (!response.ok) {
        throw new Error(buildMoveErrorMessage(payload, "Termin konnte nicht verschoben werden."));
      }

      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarBlockedTourWeeks"] });
      await refreshMonitoringWithNotification(toast);
      setPendingCalendarMove(null);
      setSelectedMoveAppointment((current) => current?.id === request.appointment.id ? null : current);
      toast({ title: "Termin verschoben" });
    } catch (error) {
      toast({
        title: "Verschieben fehlgeschlagen",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
    } finally {
      setIsCalendarMoveSubmitting(false);
    }
  };

  const requestCalendarMove = async (request: CalendarMoveRequest) => {
    if (isReaderCalendarReadOnly) {
      toast({ title: "Keine Berechtigung", description: "Leser dürfen Termine nicht verschieben.", variant: "destructive" });
      return;
    }
    if (!isRegularCalendarMoveTarget(request.targetTourId, request.targetTourName)) {
      toast({
        title: "Ziel nicht erlaubt",
        description: "Termine können nur in reguläre Touren eingefügt oder verschoben werden.",
        variant: "destructive",
      });
      return;
    }
    if (request.appointment.isCancelled) {
      toast({ title: "Termin ist storniert", description: "Stornierte Termine können nicht verschoben werden.", variant: "destructive" });
      return;
    }
    if (request.appointment.isLocked && userRole !== "ADMIN") {
      toast({ title: "Termin ist gesperrt", description: "Nur Admins dürfen gesperrte Termine ändern.", variant: "destructive" });
      return;
    }

    const today = getBerlinTodayDateString();
    if (userRole !== "ADMIN" && (request.appointment.startDate < today || request.targetStartDate < today)) {
      toast({
        title: "Verschieben nicht erlaubt",
        description: "Vergangene Termine können nicht durch Disponenten verschoben werden.",
        variant: "destructive",
      });
      return;
    }

    const targetEndDate = buildTargetEndDate(request.appointment, request.targetStartDate);
    const sameTarget = request.appointment.startDate === request.targetStartDate
      && (request.appointment.endDate ?? null) === targetEndDate
      && request.appointment.tourId === request.targetTourId;
    if (sameTarget) {
      toast({ title: "Keine Änderung", description: "Der Termin liegt bereits auf diesem Ziel." });
      return;
    }

    const sourceWeekKey = `${getISOWeekYear(parseISO(request.appointment.startDate))}-${getISOWeek(parseISO(request.appointment.startDate))}`;
    const targetWeekKey = `${getISOWeekYear(parseISO(request.targetStartDate))}-${getISOWeek(parseISO(request.targetStartDate))}`;
    const needsPreview = request.appointment.tourId !== request.targetTourId || sourceWeekKey !== targetWeekKey;

    try {
      if (needsPreview) {
        const preview = await fetchCalendarMovePreview(request, targetEndDate);
        setPendingCalendarMove({
          request,
          targetEndDate,
          preview,
          selectedIds: getDefaultPreviewSelection(preview),
          resolutionMode: "additive",
        });
        return;
      }

      if (request.mode === "insert") {
        setPendingCalendarMove({
          request,
          targetEndDate,
          preview: null,
          selectedIds: [],
          resolutionMode: "additive",
        });
        return;
      }

      await executeCalendarMove(request, targetEndDate, request.appointment.employeeIds);
    } catch (error) {
      toast({
        title: "Verschieben nicht möglich",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
    }
  };

  const confirmPendingCalendarMove = async () => {
    if (!pendingCalendarMove) return;
    const employeeIds = pendingCalendarMove.preview
      ? buildEmployeeIdsFromPreviewSelection(
          pendingCalendarMove.preview,
          pendingCalendarMove.selectedIds,
          pendingCalendarMove.resolutionMode,
        )
      : pendingCalendarMove.request.appointment.employeeIds;
    await executeCalendarMove(pendingCalendarMove.request, pendingCalendarMove.targetEndDate, employeeIds);
  };

  const handleSelectMoveAppointment = (appointment: CalendarMoveSelection) => {
    if (isReaderCalendarReadOnly) return;
    setSelectedMoveAppointment(appointment);
  };

  const handleCalendarContextMenu = (event: MouseEvent) => {
    if (!selectedMoveAppointment) return;
    event.preventDefault();
    setSelectedMoveAppointment(null);
  };

  const calendarAbsenceModeToggle = (
    <div className="inline-flex rounded-md border border-border bg-background p-0.5" data-testid="calendar-absence-mode-toggle">
      <button
        type="button"
        onClick={() => setCalendarAbsenceMode("planning")}
        className={`px-3 py-1.5 text-sm font-medium ${calendarAbsenceMode === "planning" ? "rounded bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        data-testid="button-calendar-planning-mode"
      >
        Terminplanung
      </button>
      <button
        type="button"
        onClick={() => setCalendarAbsenceMode("absences")}
        className={`px-3 py-1.5 text-sm font-medium ${calendarAbsenceMode === "absences" ? "rounded bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        data-testid="button-calendar-absence-mode"
      >
        Abwesenheiten
      </button>
    </div>
  );

  const renderContent = () => {
    if (activeView === "week") {
      return (
        <WeekGrid
          currentDate={currentDate}
          employeeFilterId={employeeFilterId}
          readOnly={isReaderCalendarReadOnly}
          weekTileBodyMode={weekTileBodyModeSetting ?? "semiexpanded"}
          weekLanesCollapsed={Boolean(weekLanesCollapsedSetting)}
          onWeekLanesCollapsedChange={persistWeekLanesCollapsed}
          conflictHighlightActive={conflictHighlightActive}
          conflictAppointmentMap={conflictAppointmentMap}
          onNewAppointment={isReaderCalendarReadOnly ? undefined : (date, options) => {
            onOpenAppointmentForm({
              initialDate: date,
              initialTourId: options?.tourId ?? null,
              projectId,
              returnView: "week",
              weekScrollLeft: options?.scrollLeft ?? null,
              weekScrollTop: options?.scrollTop ?? null,
            });
          }}
          onOpenAppointment={(appointmentId, options) => {
            onOpenAppointmentForm({
              appointmentId,
              returnView: "week",
              weekScrollLeft: options?.scrollLeft ?? null,
              weekScrollTop: options?.scrollTop ?? null,
            });
          }}
          selectedMoveAppointment={selectedMoveAppointment}
          onSelectMoveAppointment={isReaderCalendarReadOnly ? undefined : handleSelectMoveAppointment}
          onRequestMoveAppointment={isReaderCalendarReadOnly ? undefined : requestCalendarMove}
          restoreRequest={restoreRequest ?? localWeekRestoreRequest}
          onRestoreApplied={() => {
            setLocalWeekRestoreRequest(null);
            onRestoreApplied?.();
          }}
          onViewportChange={(viewport) => {
            latestWeekViewportRef.current = viewport;
          }}
          onFooterActionChange={setFooterAction}
        />
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <MonthSheetGrid
            currentDate={currentDate}
            employeeFilterId={employeeFilterId}
            visibleWeekCount={MONTH_SHEET_WINDOW_WEEK_COUNT}
            showMonthHeader
            headerAction={calendarAbsenceModeToggle}
            onPreviousWeek={prevWeekWindow}
            onNextWeek={nextWeekWindow}
            readOnly={isReaderCalendarReadOnly || calendarAbsenceMode === "absences"}
            absenceVisibility={calendarAbsenceMode}
            conflictHighlightActive={conflictHighlightActive}
            conflictAppointmentMap={conflictAppointmentMap}
            onNewAppointment={isReaderCalendarReadOnly || calendarAbsenceMode === "absences" ? undefined : (date) => {
              onOpenAppointmentForm({
                initialDate: date,
                projectId,
                returnView: activeView,
              });
            }}
            onOpenAppointment={(appointmentId) => {
              onOpenAppointmentForm({
                appointmentId,
                returnView: activeView,
              });
            }}
            selectedMoveAppointment={selectedMoveAppointment}
            onSelectMoveAppointment={isReaderCalendarReadOnly || calendarAbsenceMode === "absences" ? undefined : handleSelectMoveAppointment}
            onRequestMoveAppointment={isReaderCalendarReadOnly || calendarAbsenceMode === "absences" ? undefined : requestCalendarMove}
            onFooterActionChange={setFooterAction}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-white overflow-hidden flex flex-col" onContextMenu={handleCalendarContextMenu}>
      {mode === "contextual" ? (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-accent"
              data-testid="button-calendar-context-back"
            >
              Zurück
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onViewChange("week")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                activeView === "week"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-accent"
              }`}
              data-testid="button-calendar-context-week"
            >
              Woche
            </button>
            <button
              type="button"
              onClick={() => onViewChange("month")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                activeView === "month"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-accent"
              }`}
              data-testid="button-calendar-context-month"
            >
              Monat
            </button>
          </div>
        </div>
      ) : null}

      {selectedMoveAppointment ? (
        <CalendarMoveSelectionCard
          selection={selectedMoveAppointment}
          onClear={() => setSelectedMoveAppointment(null)}
        />
      ) : null}

      <div className="flex-1 min-h-0 grid grid-cols-[28px_minmax(0,1fr)_28px]">
        <button
          onClick={prev}
          className={`${calendarPagingButtonClassName} inline-flex items-center justify-center border-r`}
          data-testid="button-prev"
          aria-label="Zurück"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="min-w-0 h-full overflow-hidden">{renderContent()}</div>
        <button
          onClick={next}
          className={`${calendarPagingButtonClassName} inline-flex items-center justify-center border-l`}
          data-testid="button-next"
          aria-label="Vor"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {hideMainNavigation ? null : (
        <div className="flex-shrink-0 border-t border-border px-6 py-2 bg-card">
          <CalendarFilterPanel
            employeeId={employeeFilterId}
            onEmployeeIdChange={onEmployeeFilterChange}
            showWeekDisplayMode={activeView === "week"}
            weekLanesCollapsed={Boolean(weekLanesCollapsedSetting)}
            onWeekLanesCollapsedChange={persistWeekLanesCollapsed}
            conflictHighlightActive={conflictHighlightActive}
            conflictAppointmentCount={conflictAppointmentCount}
            onConflictHighlightChange={setConflictHighlightActive}
            showKwJump={isKwJumpEnabled}
            kwJumpValue={kwInputValue}
            kwJumpError={kwJumpError}
            onKwJumpChange={(value) => {
              setKwInputValue(sanitizeIsoWeekInput(value));
              setKwJumpError(false);
            }}
            onKwJumpSubmit={() => submitKwJump()}
            onKwJumpValueCommit={(value) => {
              setKwInputValue(value);
              setKwJumpError(false);
              submitKwJump(value);
            }}
            showKwJumpBack={jumpBackDate !== null}
            onKwJumpBack={() => {
              if (!jumpBackDate) return;
              rememberWeekViewportForNextNavigation();
              setKwInputValue(String(getISOWeek(jumpBackDate)));
              onDateChange(isMonthWindowView(activeView) ? normalizeMonthWindowStart(jumpBackDate) : jumpBackDate);
              setJumpBackDate(null);
              setKwJumpError(false);
            }}
            footerAction={footerAction}
          />
        </div>
      )}
      {pendingCalendarMove?.preview ? (
        <TourEmployeeCascadeDialog
          variant="appointment"
          open
          title="Termin verschieben"
          description="Wählen Sie aus, welche Mitarbeiter aus der Ziel-Tour-KW in den Termin übernommen werden."
          previewItems={pendingCalendarMove.preview.items}
          selectedIds={pendingCalendarMove.selectedIds}
          resolutionMode={pendingCalendarMove.resolutionMode}
          showResolutionMode
          isSubmitting={isCalendarMoveSubmitting}
          confirmLabel="Termin verschieben"
          onSelectedIdsChange={(selectedIds) => {
            setPendingCalendarMove((current) => current ? { ...current, selectedIds } : current);
          }}
          onResolutionModeChange={(resolutionMode) => {
            setPendingCalendarMove((current) => current ? { ...current, resolutionMode } : current);
          }}
          onConfirm={() => {
            void confirmPendingCalendarMove();
          }}
          onClose={() => {
            if (!isCalendarMoveSubmitting) setPendingCalendarMove(null);
          }}
        />
      ) : null}
      <AlertDialog
        open={pendingCalendarMove !== null && pendingCalendarMove.preview === null}
        onOpenChange={(open) => {
          if (!open && !isCalendarMoveSubmitting) setPendingCalendarMove(null);
        }}
      >
        <AlertDialogContent data-testid="dialog-calendar-move-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Termin verschieben?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCalendarMove ? (
                <>
                  Der markierte Termin wird nach {pendingCalendarMove.request.targetTourName ?? "Ziel-Tour"} am{" "}
                  {formatCalendarMoveDate(pendingCalendarMove.request.targetStartDate)} verschoben.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCalendarMoveSubmitting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCalendarMoveSubmitting}
              onClick={(event) => {
                event.preventDefault();
                void confirmPendingCalendarMove();
              }}
              data-testid="button-calendar-move-confirm"
            >
              {isCalendarMoveSubmitting ? "Verschieben..." : "Verschieben"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
