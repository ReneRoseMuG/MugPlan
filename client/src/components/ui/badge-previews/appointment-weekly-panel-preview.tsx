import type { InfoBadgePreview } from "@/components/ui/info-badge";
import { CalendarWeekAppointmentPanel } from "@/components/calendar/CalendarWeekAppointmentPanel";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { resolveWeeklyPreviewWidthPx } from "@/lib/preview-width";

type AppointmentWeeklyPanelPreviewProps = {
  appointment: CalendarAppointment;
  widthPx: number;
  maxHeightPx?: number | null;
};

export type AppointmentWeeklyPanelPreviewSizeProfile = "default" | "sidebarTable";

const SIDEBAR_TABLE_MIN_PREVIEW_WIDTH_PX = 320;
const SIDEBAR_TABLE_MAX_PREVIEW_HEIGHT_PX = 360;

export const appointmentWeeklyPanelPreviewOptions = {
  openDelayMs: 380,
  mode: "cursor" as const,
  side: "right" as const,
  align: "start" as const,
  maxWidth: 240,
  maxHeight: null,
  scrollY: "visible" as const,
  cursorOffsetX: 18,
  cursorOffsetY: 18,
  viewportPadding: 12,
};

function resolveAppointmentWeeklyPanelPreviewOptions(
  sizeProfile: AppointmentWeeklyPanelPreviewSizeProfile,
  previewWidthPx: number,
) {
  if (sizeProfile === "sidebarTable") {
    return {
      ...appointmentWeeklyPanelPreviewOptions,
      maxWidth: previewWidthPx,
      maxHeight: SIDEBAR_TABLE_MAX_PREVIEW_HEIGHT_PX,
      scrollY: "auto" as const,
    };
  }

  return {
    ...appointmentWeeklyPanelPreviewOptions,
    maxWidth: previewWidthPx,
  };
}

export function resolveAppointmentWeeklyPanelPreviewWidthPx(
  sizeProfile: AppointmentWeeklyPanelPreviewSizeProfile,
): number {
  const measuredWidthPx = resolveWeeklyPreviewWidthPx();
  if (sizeProfile === "sidebarTable") {
    return Math.max(measuredWidthPx, SIDEBAR_TABLE_MIN_PREVIEW_WIDTH_PX);
  }
  return measuredWidthPx;
}

export function AppointmentWeeklyPanelPreview({
  appointment,
  widthPx,
  maxHeightPx = null,
}: AppointmentWeeklyPanelPreviewProps) {
  return (
    <div className="rounded-lg bg-white" style={{ width: widthPx }}>
      <CalendarWeekAppointmentPanel
        appointment={appointment}
        weekTileBodyMode="expanded"
        interactive={false}
        context="week-calendar"
        maxHeightPx={maxHeightPx}
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
  const previewMaxHeightPx = sizeProfile === "sidebarTable" ? SIDEBAR_TABLE_MAX_PREVIEW_HEIGHT_PX : null;

  return {
    content: (
      <AppointmentWeeklyPanelPreview
        appointment={appointment}
        widthPx={previewWidthPx}
        maxHeightPx={previewMaxHeightPx}
      />
    ),
    options: resolveAppointmentWeeklyPanelPreviewOptions(sizeProfile, previewWidthPx),
  };
}
