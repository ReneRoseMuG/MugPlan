import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import type { ReactNode } from "react";
import type { CalendarNavCommand, WeekViewRestoreRequest } from "@/pages/Home";
import type { MonitoringConflictMeta } from "@/lib/monitoring-ui";

interface WeekGridProps {
  currentDate: Date;
  employeeFilterId?: number | null;
  readOnly?: boolean;
  weekTileBodyMode?: "collapsed" | "semiexpanded" | "expanded";
  weekLanesCollapsed?: boolean;
  onWeekLanesCollapsedChange?: (collapsed: boolean) => void;
  conflictHighlightActive?: boolean;
  conflictAppointmentMap?: Map<number, MonitoringConflictMeta>;
  navCommand?: CalendarNavCommand;
  onVisibleDateChange?: (date: Date) => void;
  onNewAppointment?: (date: string, options?: { tourId?: number | null; scrollLeft?: number | null; scrollTop?: number | null }) => void;
  onOpenAppointment?: (appointmentId: number, options?: { scrollLeft?: number | null; scrollTop?: number | null }) => void;
  restoreRequest?: WeekViewRestoreRequest | null;
  onRestoreApplied?: () => void;
  onViewportChange?: (viewport: { scrollLeft: number; scrollTop: number }) => void;
  onFooterActionChange?: (action: ReactNode | null) => void;
}

export function WeekGrid({
  currentDate,
  employeeFilterId,
  readOnly = false,
  weekTileBodyMode,
  weekLanesCollapsed,
  onWeekLanesCollapsedChange,
  conflictHighlightActive = false,
  conflictAppointmentMap = new Map<number, MonitoringConflictMeta>(),
  navCommand,
  onVisibleDateChange,
  onNewAppointment,
  onOpenAppointment,
  restoreRequest,
  onRestoreApplied,
  onViewportChange,
  onFooterActionChange,
}: WeekGridProps) {
  return (
    <div className="h-full" data-testid="calendar-week-view">
      <CalendarWeekView
        currentDate={currentDate}
        employeeFilterId={employeeFilterId}
        readOnly={readOnly}
        weekTileBodyMode={weekTileBodyMode}
        weekLanesCollapsed={weekLanesCollapsed}
        onWeekLanesCollapsedChange={onWeekLanesCollapsedChange}
        conflictHighlightActive={conflictHighlightActive}
        conflictAppointmentMap={conflictAppointmentMap}
        navCommand={navCommand}
        onVisibleDateChange={onVisibleDateChange}
        onNewAppointment={onNewAppointment}
        onOpenAppointment={onOpenAppointment}
        restoreRequest={restoreRequest}
        onRestoreApplied={onRestoreApplied}
        onViewportChange={onViewportChange}
        onFooterActionChange={onFooterActionChange}
      />
    </div>
  );
}
