import { useEffect, useMemo, useRef, useState } from "react";
import { addMonths, addWeeks, getISOWeek, startOfISOWeek, subMonths, subWeeks } from "date-fns";
import { MonthSheetGrid } from "@/components/MonthSheetGrid";
import { WeekGrid } from "@/components/WeekGrid";
import { CalendarFilterPanel } from "@/components/ui/filter-panels/calendar-filter-panel";
import { useToast } from "@/hooks/use-toast";
import { parseIsoWeekInput, sanitizeIsoWeekInput } from "@/lib/isoWeekInput";
import { resolveKwJumpTarget } from "@/lib/kwJump";
import { useSetting, useSettings } from "@/hooks/useSettings";
import type { MonitoringListResponse } from "@shared/routes";
import { buildMonitoringConflictMap } from "@/lib/monitoring-ui";
import type { WeekViewRestoreRequest } from "@/pages/Home";

type CalendarWorkspaceView = "week" | "month" | "monthSheet";

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
  const [conflictHighlightActive, setConflictHighlightActive] = useState(false);
  const [jumpBackDate, setJumpBackDate] = useState<Date | null>(null);
  const [localWeekRestoreRequest, setLocalWeekRestoreRequest] = useState<WeekViewRestoreRequest | null>(null);
  const [kwInputValue, setKwInputValue] = useState(() =>
    activeView === "week" ? String(getISOWeek(currentDate)) : "",
  );
  const [kwJumpError, setKwJumpError] = useState(false);
  const latestWeekViewportRef = useRef<{ scrollLeft: number; scrollTop: number } | null>(null);
  const weekLanesCollapsedSetting = useSetting("calendar.weekLanes.isCollapsed");
  const weekTileBodyModeSetting = useSetting("calendar.weekTileBodyMode");
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
    if (activeView !== "week") {
      setJumpBackDate(null);
      setLocalWeekRestoreRequest(null);
      setKwInputValue("");
      setKwJumpError(false);
      return;
    }
    setKwInputValue(String(getISOWeek(currentDate)));
  }, [activeView, currentDate]);

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
          weekAppointmentDisplayMode="detail"
          weekTileBodyMode={weekTileBodyModeSetting ?? "semiexpanded"}
          weekLanesCollapsed={Boolean(weekLanesCollapsedSetting)}
          onWeekLanesCollapsedChange={persistWeekLanesCollapsed}
          conflictHighlightActive={conflictHighlightActive}
          conflictAppointmentMap={conflictAppointmentMap}
          onNewAppointment={(date, options) => {
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
        />
      );
    }

    return (
      <MonthSheetGrid
        currentDate={currentDate}
        employeeFilterId={employeeFilterId}
        conflictHighlightActive={conflictHighlightActive}
        conflictAppointmentMap={conflictAppointmentMap}
        onNewAppointment={(date) => {
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
      />
    );
  };

  return (
    <div className="h-full bg-white rounded-lg overflow-hidden border-2 border-foreground flex flex-col">
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
          className="h-full w-7 text-sm font-semibold text-primary/70 hover:text-primary"
          data-testid="button-prev"
          aria-label="Zurück"
        >
          {"<"}
        </button>
        <div className="min-w-0 h-full overflow-hidden">{renderContent()}</div>
        <button
          onClick={next}
          className="h-full w-7 text-sm font-semibold text-primary/70 hover:text-primary"
          data-testid="button-next"
          aria-label="Vor"
        >
          {">"}
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
            showKwJump={activeView === "week"}
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
          />
        </div>
      )}
    </div>
  );
}

