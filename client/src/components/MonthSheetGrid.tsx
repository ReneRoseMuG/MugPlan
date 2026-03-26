import { CalendarMonthSheetView } from "@/components/calendar/CalendarMonthSheetView";

interface MonthSheetGridProps {
  currentDate: Date;
  employeeFilterId?: number | null;
  onNewAppointment?: (date: string, options?: { scrollLeft?: number | null }) => void;
  onOpenAppointment?: (appointmentId: number, options?: { scrollLeft?: number | null }) => void;
}

export function MonthSheetGrid({
  currentDate,
  employeeFilterId,
  onNewAppointment,
  onOpenAppointment,
}: MonthSheetGridProps) {
  return (
    <CalendarMonthSheetView
      currentDate={currentDate}
      employeeFilterId={employeeFilterId}
      onNewAppointment={onNewAppointment}
      onOpenAppointment={onOpenAppointment}
    />
  );
}
