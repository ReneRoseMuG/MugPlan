import { useState } from "react";
import { addMonths, addWeeks, subMonths, subWeeks } from "date-fns";
import { MonthSheetGrid } from "@/components/MonthSheetGrid";
import { WeekGrid } from "@/components/WeekGrid";
import { CalendarTourPrintPreviewDialog } from "@/components/calendar/CalendarTourPrintPreviewDialog";
import { CalendarFilterPanel } from "@/components/ui/filter-panels/calendar-filter-panel";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { normalizeTourPrintWeekCount } from "@/lib/tour-print-preview";
import { useSetting } from "@/hooks/useSettings";

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
  const weekendColumnPercentSetting = useSetting("calendarWeekendColumnPercent");
  const printFromDate = getBerlinTodayDateString();

  const next = () => {
    if (activeView === "month" || activeView === "monthSheet") {
      onDateChange(addMonths(currentDate, 1));
      return;
    }
    onDateChange(addWeeks(currentDate, 1));
  };

  const prev = () => {
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
