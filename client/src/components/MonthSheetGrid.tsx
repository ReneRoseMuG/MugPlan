import { CalendarMonthSheetView } from "@/components/calendar/CalendarMonthSheetView";

interface MonthSheetGridProps {
  currentDate: Date;
  employeeFilterId?: number | null;
  conflictHighlightActive?: boolean;
  conflictAppointmentIds?: Set<number>;
  onNewAppointment?: (date: string, options?: { scrollLeft?: number | null }) => void;
  onOpenAppointment?: (appointmentId: number, options?: { scrollLeft?: number | null }) => void;
}

export function MonthSheetGrid({
  currentDate,
  employeeFilterId,
  conflictHighlightActive = false,
  conflictAppointmentIds = new Set<number>(),
  onNewAppointment,
  onOpenAppointment,
}: MonthSheetGridProps) {
  return (
    <CalendarMonthSheetView
      currentDate={currentDate}
      employeeFilterId={employeeFilterId}
      conflictHighlightActive={conflictHighlightActive}
      conflictAppointmentIds={conflictAppointmentIds}
      onNewAppointment={onNewAppointment}
      onOpenAppointment={onOpenAppointment}
    />
  );
}
