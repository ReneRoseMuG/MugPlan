import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import type { CalendarNavCommand } from "@/pages/Home";

interface WeekGridProps {
  currentDate: Date;
  employeeFilterId?: number | null;
  navCommand?: CalendarNavCommand;
  onVisibleDateChange?: (date: Date) => void;
  onNewAppointment?: (date: string) => void;
  onOpenAppointment?: (appointmentId: number) => void;
}

export function WeekGrid({ currentDate, employeeFilterId, navCommand, onVisibleDateChange, onNewAppointment, onOpenAppointment }: WeekGridProps) {
  return (
    <CalendarWeekView
      currentDate={currentDate}
      employeeFilterId={employeeFilterId}
      navCommand={navCommand}
      onVisibleDateChange={onVisibleDateChange}
      onNewAppointment={onNewAppointment}
      onOpenAppointment={onOpenAppointment}
    />
  );
}
