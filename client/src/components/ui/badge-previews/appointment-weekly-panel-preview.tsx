import type { InfoBadgePreview } from "@/components/ui/info-badge";
import { CalendarWeekAppointmentPanel } from "@/components/calendar/CalendarWeekAppointmentPanel";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { resolveWeeklyPreviewWidthPx } from "@/lib/preview-width";

type AppointmentWeeklyPanelPreviewProps = {
  appointment: CalendarAppointment;
};

export const appointmentWeeklyPanelPreviewOptions = {
  openDelayMs: 380,
  side: "right" as const,
  align: "start" as const,
  maxWidth: 240,
  maxHeight: null,
  scrollY: "visible" as const,
};

export function AppointmentWeeklyPanelPreview({ appointment }: AppointmentWeeklyPanelPreviewProps) {
  const previewWidthPx = resolveWeeklyPreviewWidthPx();

  return (
    <div className="rounded-lg bg-white" style={{ width: previewWidthPx }}>
      <CalendarWeekAppointmentPanel appointment={appointment} interactive={false} context="week-calendar" />
    </div>
  );
}

export function createAppointmentWeeklyPanelPreview(appointment: CalendarAppointment): InfoBadgePreview {
  const previewWidthPx = resolveWeeklyPreviewWidthPx();

  return {
    content: <AppointmentWeeklyPanelPreview appointment={appointment} />,
    options: {
      ...appointmentWeeklyPanelPreviewOptions,
      maxWidth: previewWidthPx,
    },
  };
}
