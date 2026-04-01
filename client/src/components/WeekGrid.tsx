import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import type { CalendarNavCommand } from "@/pages/Home";

interface WeekGridProps {
  currentDate: Date;
  employeeFilterId?: number | null;
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
