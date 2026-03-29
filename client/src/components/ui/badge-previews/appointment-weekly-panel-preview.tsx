import type { InfoBadgePreview } from "@/components/ui/info-badge";
import { CalendarWeekAppointmentPanel } from "@/components/calendar/CalendarWeekAppointmentPanel";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { resolveWeeklyPreviewWidthPx } from "@/lib/preview-width";

type AppointmentWeeklyPanelPreviewProps = {
  appointment: CalendarAppointment;
  widthPx: number;
};

export type AppointmentWeeklyPanelPreviewSizeProfile = "default" | "sidebarTable";

const SIDEBAR_TABLE_MIN_PREVIEW_WIDTH_PX = 320;

export const appointmentWeeklyPanelPreviewOptions = {
  openDelayMs: 380,
  side: "right" as const,
  align: "start" as const,
  maxWidth: 240,
  maxHeight: null,
  scrollY: "visible" as const,
};

export function resolveAppointmentWeeklyPanelPreviewWidthPx(
  sizeProfile: AppointmentWeeklyPanelPreviewSizeProfile,
): number {
  const measuredWidthPx = resolveWeeklyPreviewWidthPx();
  if (sizeProfile === "sidebarTable") {
    return Math.max(measuredWidthPx, SIDEBAR_TABLE_MIN_PREVIEW_WIDTH_PX);
  }
  return measuredWidthPx;
}

export function AppointmentWeeklyPanelPreview({ appointment, widthPx }: AppointmentWeeklyPanelPreviewProps) {
  return (
    <div className="rounded-lg bg-white" style={{ width: widthPx }}>
      <CalendarWeekAppointmentPanel
        appointment={appointment}
        interactive={false}
        context="week-calendar"
      />
    </div>
  );
}

export function createAppointmentWeeklyPanelPreview(
  appointment: CalendarAppointment,
  options?: { sizeProfile?: AppointmentWeeklyPanelPreviewSizeProfile },
): InfoBadgePreview {
  const sizeProfile = options?.sizeProfile ?? "default";
  const previewWidthPx = resolveAppointmentWeeklyPanelPreviewWidthPx(sizeProfile);

  return {
    content: <AppointmentWeeklyPanelPreview appointment={appointment} widthPx={previewWidthPx} />,
    options: {
      ...appointmentWeeklyPanelPreviewOptions,
      maxWidth: previewWidthPx,
    },
  };
}
