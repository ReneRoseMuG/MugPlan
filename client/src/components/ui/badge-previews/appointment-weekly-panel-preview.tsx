import type { InfoBadgePreview } from "@/components/ui/info-badge";
import { CalendarWeekAppointmentPanel } from "@/components/calendar/CalendarWeekAppointmentPanel";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

type AppointmentWeeklyPanelPreviewProps = {
  appointment: CalendarAppointment;
};

export const appointmentWeeklyPanelPreviewOptions = {
  openDelayMs: 380,
  side: "right" as const,
  align: "start" as const,
  maxWidth: 420,
  maxHeight: 360,
};

export function AppointmentWeeklyPanelPreview({ appointment }: AppointmentWeeklyPanelPreviewProps) {
  return <CalendarWeekAppointmentPanel appointment={appointment} interactive={false} />;
}

export function createAppointmentWeeklyPanelPreview(appointment: CalendarAppointment): InfoBadgePreview {
  return {
    content: <AppointmentWeeklyPanelPreview appointment={appointment} />,
    options: appointmentWeeklyPanelPreviewOptions,
  };
}
