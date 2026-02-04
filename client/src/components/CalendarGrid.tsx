import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";

interface CalendarGridProps {
  currentDate: Date;
  employeeFilterId?: number | null;
  onNewAppointment?: (date: string) => void;
  onOpenAppointment?: (appointmentId: number) => void;
}

export function CalendarGrid({ currentDate, employeeFilterId, onNewAppointment, onOpenAppointment }: CalendarGridProps) {
  return (
    <CalendarMonthView
      currentDate={currentDate}
      employeeFilterId={employeeFilterId}
      onNewAppointment={onNewAppointment}
      onOpenAppointment={onOpenAppointment}
    />
  );
}
