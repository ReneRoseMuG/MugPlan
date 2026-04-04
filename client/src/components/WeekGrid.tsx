import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import type { CalendarNavCommand } from "@/pages/Home";

interface WeekGridProps {
  currentDate: Date;
  employeeFilterId?: number | null;
  weekAppointmentDisplayMode?: "standard" | "compact" | "detail" | "split";
  weekLanesCollapsed?: boolean;
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
  weekLanesCollapsed,
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
    <CalendarWeekView
      currentDate={currentDate}
      employeeFilterId={employeeFilterId}
      weekAppointmentDisplayMode={weekAppointmentDisplayMode}
      weekLanesCollapsed={weekLanesCollapsed}
      conflictHighlightActive={conflictHighlightActive}
      conflictAppointmentIds={conflictAppointmentIds}
      navCommand={navCommand}
      onVisibleDateChange={onVisibleDateChange}
      onNewAppointment={onNewAppointment}
      onOpenAppointment={onOpenAppointment}
      restoreScrollLeft={restoreScrollLeft}
      onScrollRestoreApplied={onScrollRestoreApplied}
    />
  );
}
