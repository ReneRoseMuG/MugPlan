import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import type { CalendarNavCommand } from "@/pages/Home";

interface CalendarGridProps {
  currentDate: Date;
  employeeFilterId?: number | null;
  navCommand?: CalendarNavCommand;
  onVisibleDateChange?: (date: Date) => void;
  onNewAppointment?: (date: string) => void;
  onOpenAppointment?: (appointmentId: number) => void;
}

export function CalendarGrid({ currentDate, employeeFilterId, navCommand, onVisibleDateChange, onNewAppointment, onOpenAppointment }: CalendarGridProps) {
  return (
    <CalendarMonthView
      currentDate={currentDate}
      employeeFilterId={employeeFilterId}
      navCommand={navCommand}
      onVisibleDateChange={onVisibleDateChange}
      onNewAppointment={onNewAppointment}
      onOpenAppointment={onOpenAppointment}
    />
  );
}
