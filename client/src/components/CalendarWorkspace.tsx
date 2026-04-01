import { useEffect, useMemo, useState } from "react";
import { addMonths, addWeeks, format, startOfISOWeek, subMonths, subWeeks } from "date-fns";
import { MonthSheetGrid } from "@/components/MonthSheetGrid";
import { WeekGrid } from "@/components/WeekGrid";
import { CalendarTourPrintPreviewDialog } from "@/components/calendar/CalendarTourPrintPreviewDialog";
import { CalendarFilterPanel } from "@/components/ui/filter-panels/calendar-filter-panel";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { resolveKwJumpTarget } from "@/lib/kwJump";
import { normalizeTourPrintWeekCount } from "@/lib/tour-print-preview";
import { useSetting } from "@/hooks/useSettings";
import type { MonitoringListResponse } from "@shared/routes";

type CalendarWorkspaceView = "week" | "month" | "monthSheet";

type OpenAppointmentContext = {
  initialDate?: string;
  initialTourId?: number | null;
  appointmentId?: number;
  projectId?: number;
  returnView?: CalendarWorkspaceView;
  weekScrollLeft?: number | null;
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
  restoreScrollLeft?: number | null;
  onScrollRestoreApplied?: () => void;
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
  restoreScrollLeft,
  onScrollRestoreApplied,
}: CalendarWorkspaceProps) {
  const [selectedPrintTourId, setSelectedPrintTourId] = useState<number | null>(null);
  const [printWeekCount, setPrintWeekCount] = useState(1);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printStartNextWeek, setPrintStartNextWeek] = useState(false);
  const [conflictHighlightActive, setConflictHighlightActive] = useState(false);
  const [jumpBackDate, setJumpBackDate] = useState<Date | null>(null);
  const [kwInputValue, setKwInputValue] = useState("");
  const [kwJumpError, setKwJumpError] = useState(false);
  const weekendColumnPercentSetting = useSetting("calendarWeekendColumnPercent");
  const conflictAppointmentIds = useMemo(
    () => new Set((monitoringItems ?? []).map((item) => item.appointmentId)),
    [monitoringItems],
  );
  const conflictAppointmentCount = conflictAppointmentIds.size;
  const printFromDate = format(
    addWeeks(startOfISOWeek(new Date(getBerlinTodayDateString())), printStartNextWeek ? 1 : 0),
    "yyyy-MM-dd",
  );

  useEffect(() => {
    if (conflictAppointmentCount === 0 && conflictHighlightActive) {
      setConflictHighlightActive(false);
    }
  }, [conflictAppointmentCount, conflictHighlightActive]);

  useEffect(() => {
    if (activeView !== "week") {
      setJumpBackDate(null);
      setKwInputValue("");
      setKwJumpError(false);
    }
  }, [activeView]);

  const submitKwJump = () => {
    const trimmedValue = kwInputValue.trim();
    if (trimmedValue.length === 0) {
      setKwJumpError(false);
      return;
    }

    const parsedKw = Number(trimmedValue);
    const targetDate = resolveKwJumpTarget(parsedKw, currentDate);
    if (targetDate) {
      setJumpBackDate(currentDate);
      onDateChange(targetDate);
      setKwInputValue("");
      setKwJumpError(false);
      return;
    }

    const isOutOfRange = Number.isInteger(parsedKw) && parsedKw >= 1 && parsedKw <= 53;
    setKwJumpError(isOutOfRange);
  };

  const next = () => {
    setJumpBackDate(null);
    setKwJumpError(false);
    if (activeView === "month" || activeView === "monthSheet") {
      onDateChange(addMonths(currentDate, 1));
      return;
    }
    onDateChange(addWeeks(currentDate, 1));
  };

  const prev = () => {
    setJumpBackDate(null);
    setKwJumpError(false);
    if (activeView === "month" || activeView === "monthSheet") {
      onDateChange(subMonths(currentDate, 1));
      return;
    }
    onDateChange(subWeeks(currentDate, 1));
  };

  const renderContent = () => {
    if (activeView === "week") {
      return (
        <WeekGrid
          currentDate={currentDate}
          employeeFilterId={employeeFilterId}
          conflictHighlightActive={conflictHighlightActive}
          conflictAppointmentIds={conflictAppointmentIds}
          onNewAppointment={(date, options) => {
            onOpenAppointmentForm({
              initialDate: date,
              initialTourId: options?.tourId ?? null,
              projectId,
              returnView: "week",
              weekScrollLeft: options?.scrollLeft ?? null,
            });
          }}
          onOpenAppointment={(appointmentId) => {
            onOpenAppointmentForm({
              appointmentId,
              returnView: "week",
            });
          }}
          restoreScrollLeft={restoreScrollLeft}
          onScrollRestoreApplied={onScrollRestoreApplied}
        />
      );
    }

    return (
      <MonthSheetGrid
        currentDate={currentDate}
        employeeFilterId={employeeFilterId}
        conflictHighlightActive={conflictHighlightActive}
        conflictAppointmentIds={conflictAppointmentIds}
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
              Zurueck
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
          aria-label="Zurueck"
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
        <div className="flex-shrink-0 border-t border-border px-6 py-4 bg-card">
          <CalendarFilterPanel
            employeeId={employeeFilterId}
            onEmployeeIdChange={onEmployeeFilterChange}
            showWeekDisplayMode={activeView === "week"}
            selectedPrintTourId={selectedPrintTourId}
            onSelectedPrintTourIdChange={setSelectedPrintTourId}
            printWeekCount={printWeekCount}
            onPrintWeekCountChange={(value) => setPrintWeekCount(normalizeTourPrintWeekCount(value))}
            onOpenPrintPreview={() => setIsPrintPreviewOpen(true)}
            printStartNextWeek={printStartNextWeek}
            onPrintStartNextWeekChange={setPrintStartNextWeek}
            conflictHighlightActive={conflictHighlightActive}
            conflictAppointmentCount={conflictAppointmentCount}
            onConflictHighlightChange={setConflictHighlightActive}
            showKwJump={activeView === "week"}
            kwJumpValue={kwInputValue}
            kwJumpError={kwJumpError}
            onKwJumpChange={(value) => {
              setKwInputValue(value);
              setKwJumpError(false);
            }}
            onKwJumpSubmit={submitKwJump}
            showKwJumpBack={jumpBackDate !== null}
            onKwJumpBack={() => {
              if (!jumpBackDate) return;
              onDateChange(jumpBackDate);
              setJumpBackDate(null);
              setKwJumpError(false);
            }}
          />
        </div>
      )}

      <CalendarTourPrintPreviewDialog
        open={isPrintPreviewOpen}
        onOpenChange={setIsPrintPreviewOpen}
        tourId={selectedPrintTourId}
        weekCount={printWeekCount}
        fromDate={printFromDate}
        weekendColumnPercent={typeof weekendColumnPercentSetting === "number" ? weekendColumnPercentSetting : 33}
      />
    </div>
  );
}
