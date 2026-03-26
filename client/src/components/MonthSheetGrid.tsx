import { CalendarMonthSheetView } from "@/components/calendar/CalendarMonthSheetView";

interface MonthSheetGridProps {
  currentDate: Date;
  employeeFilterId?: number | null;
  onNewAppointment?: (date: string, options?: { scrollLeft?: number | null }) => void;
  onOpenAppointment?: (appointmentId: number, options?: { scrollLeft?: number | null }) => void;
  restoreScrollLeft?: number | null;
  onScrollRestoreApplied?: () => void;
}

export function MonthSheetGrid({
  currentDate,
  employeeFilterId,
  onNewAppointment,
  onOpenAppointment,
  restoreScrollLeft,
  onScrollRestoreApplied,
}: MonthSheetGridProps) {
  return (
    <CalendarMonthSheetView
      currentDate={currentDate}
      employeeFilterId={employeeFilterId}
      onNewAppointment={onNewAppointment}
      onOpenAppointment={onOpenAppointment}
      restoreScrollLeft={restoreScrollLeft}
      onScrollRestoreApplied={onScrollRestoreApplied}
    />
  );
}
