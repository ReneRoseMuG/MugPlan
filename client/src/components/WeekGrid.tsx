import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";

interface WeekGridProps {
  currentDate: Date;
  employeeFilterId?: number | null;
  onNewAppointment?: (date: string) => void;
  onOpenAppointment?: (appointmentId: number) => void;
}

export function WeekGrid({ currentDate, employeeFilterId, onNewAppointment, onOpenAppointment }: WeekGridProps) {
  return (
    <CalendarWeekView
      currentDate={currentDate}
      employeeFilterId={employeeFilterId}
      onNewAppointment={onNewAppointment}
      onOpenAppointment={onOpenAppointment}
    />
  );
}
