import { useEffect, useMemo, useRef, useState } from "react";
import { addMonths, addWeeks, getISOWeek, startOfISOWeek, subMonths, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { MonthSheetGrid } from "@/components/MonthSheetGrid";
import { WeekGrid } from "@/components/WeekGrid";
import { CalendarFilterPanel } from "@/components/ui/filter-panels/calendar-filter-panel";
import { useToast } from "@/hooks/use-toast";
import { parseIsoWeekInput, sanitizeIsoWeekInput } from "@/lib/isoWeekInput";
import { resolveKwJumpTarget } from "@/lib/kwJump";
import { getStoredUserRole, isReaderRole } from "@/lib/auth";
import { useSetting, useSettings } from "@/hooks/useSettings";
import type { MonitoringListResponse } from "@shared/routes";
import { buildMonitoringConflictMap } from "@/lib/monitoring-ui";
import type { WeekViewRestoreRequest } from "@/pages/Home";

type CalendarWorkspaceView = "week" | "month" | "monthSheet";
type CalendarAbsenceMode = "planning" | "absences";

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
  const { setSetting } = useSettings();
  const isKwJumpEnabled = activeView === "week" || activeView === "month" || activeView === "monthSheet";
  const [conflictHighlightActive, setConflictHighlightActive] = useState(false);
  const [jumpBackDate, setJumpBackDate] = useState<Date | null>(null);
  const [localWeekRestoreRequest, setLocalWeekRestoreRequest] = useState<WeekViewRestoreRequest | null>(null);
  const [calendarAbsenceMode, setCalendarAbsenceMode] = useState<CalendarAbsenceMode>("planning");
  const [footerAction, setFooterAction] = useState<ReactNode | null>(null);
  const [kwInputValue, setKwInputValue] = useState(() =>
    isKwJumpEnabled ? String(getISOWeek(currentDate)) : "",
  );
  const [kwJumpError, setKwJumpError] = useState(false);
  const latestWeekViewportRef = useRef<{ scrollLeft: number; scrollTop: number } | null>(null);
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
    if (!isKwJumpEnabled) {
      setKwInputValue("");
    }
  }, [activeView, isKwJumpEnabled]);

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
      setJumpBackDate(currentDate);
      onDateChange(targetDate);
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
    if (activeView === "month" || activeView === "monthSheet") {
      onDateChange(addMonths(currentDate, 1));
      return;
    }
    rememberWeekViewportForNextNavigation();
    onDateChange(addWeeks(currentDate, 1));
  };

  const prev = () => {
    setJumpBackDate(null);
    setKwJumpError(false);
    if (activeView === "month" || activeView === "monthSheet") {
      onDateChange(subMonths(currentDate, 1));
      return;
    }
    rememberWeekViewportForNextNavigation();
    onDateChange(subWeeks(currentDate, 1));
  };

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
        <div className="flex items-center justify-end border-b border-border/40 bg-card px-3 py-2">
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
        </div>
        <div className="min-h-0 flex-1">
          <MonthSheetGrid
            currentDate={currentDate}
            employeeFilterId={employeeFilterId}
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
            onFooterActionChange={setFooterAction}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-white overflow-hidden flex flex-col">
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
              onDateChange(jumpBackDate);
              setJumpBackDate(null);
              setKwJumpError(false);
            }}
            footerAction={footerAction}
          />
        </div>
      )}
    </div>
  );
}
