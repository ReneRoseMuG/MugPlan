import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import type { CalendarNavCommand } from "@/pages/Home";

interface WeekGridProps {
  currentDate: Date;
  employeeFilterId?: number | null;
  weekAppointmentDisplayMode?: "standard" | "compact" | "detail" | "split";
  weekTileBodyMode?: "collapsed" | "semiexpanded" | "expanded";
  weekLanesCollapsed?: boolean;
  onWeekLanesCollapsedChange?: (collapsed: boolean) => void;
  conflictHighlightActive?: boolean;
  conflictAppointmentIds?: Set<number>;
  navCommand?: CalendarNavCommand;
  onVisibleDateChange?: (date: Date) => void;
  onNewAppointment?: (date: string, options?: { tourId?: number | null; scrollLeft?: number | null }) => void;
  onOpenAppointment?: (appointmentId: number) => void;
  restoreScrollLeft?: number | null;
  onScrollRestoreApplied?: () => void;
}

export function WeekGrid({
  currentDate,
  employeeFilterId,
  weekAppointmentDisplayMode,
  weekTileBodyMode,
  weekLanesCollapsed,
  onWeekLanesCollapsedChange,
  conflictHighlightActive = false,
  conflictAppointmentIds = new Set<number>(),
  navCommand,
  onVisibleDateChange,
  onNewAppointment,
  onOpenAppointment,
  restoreScrollLeft,
  onScrollRestoreApplied,
}: WeekGridProps) {
  return (
    <div className="h-full" data-testid="calendar-week-view">
      <CalendarWeekView
        currentDate={currentDate}
        employeeFilterId={employeeFilterId}
        weekAppointmentDisplayMode={weekAppointmentDisplayMode}
        weekTileBodyMode={weekTileBodyMode}
        weekLanesCollapsed={weekLanesCollapsed}
        onWeekLanesCollapsedChange={onWeekLanesCollapsedChange}
        conflictHighlightActive={conflictHighlightActive}
        conflictAppointmentIds={conflictAppointmentIds}
        navCommand={navCommand}
        onVisibleDateChange={onVisibleDateChange}
        onNewAppointment={onNewAppointment}
        onOpenAppointment={onOpenAppointment}
        restoreScrollLeft={restoreScrollLeft}
        onScrollRestoreApplied={onScrollRestoreApplied}
      />
    </div>
  );
}
