import { HoverPreview } from "@/components/ui/hover-preview";
import { createAppointmentWeeklyPanelPreview } from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { CALENDAR_NEUTRAL_COLOR } from "@/lib/calendar-utils";
import { AlertTriangle, CalendarDays, Clock3 } from "lucide-react";

const MONTH_APPOINTMENT_PREVIEW_OPEN_DELAY_MS = 650;
const MONTH_APPOINTMENT_PREVIEW_CURSOR_OFFSET_X = 24;
const MONTH_APPOINTMENT_PREVIEW_CURSOR_OFFSET_Y = 20;
const MONTH_APPOINTMENT_PREVIEW_MAX_HEIGHT_PX = 520;
const MONTH_APPOINTMENT_PREVIEW_VIEWPORT_PADDING_PX = 20;

type CompactBarProps = {
  appointment: CalendarAppointment;
  isFirstDay: boolean;
  isLastDay: boolean;
  isConflict?: boolean;
  conflictColor?: string;
  hideOrderNumber?: boolean;
  showPopover?: boolean;
  isLocked?: boolean;
  isDragging?: boolean;
  isBlocked?: boolean;
  positionStyle?: React.CSSProperties;
  menuSlot?: React.ReactNode;
  onDoubleClick?: () => void;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
};

export function CalendarAppointmentCompactBar({
  appointment,
  isFirstDay,
  isLastDay,
  isConflict = false,
  conflictColor,
  hideOrderNumber: _hideOrderNumber = false,
  showPopover = isFirstDay,
  isLocked,
  isDragging,
  isBlocked = false,
  positionStyle,
  menuSlot,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: CompactBarProps) {
  const hasStartTime = Boolean(appointment.startTime && appointment.startTime.trim());
  const TimingIcon = hasStartTime ? Clock3 : CalendarDays;
  const customerNumber = appointment.customer.customerNumber?.trim() || "-";
  const customerName = appointment.customer.fullName?.trim() || "-";
  const postalCode = appointment.customer.postalCode?.trim() || "-";
  const rightContent = `PLZ: ${postalCode}`;

  const backgroundColor = appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR;
  const isCancelled = appointment.isCancelled;
  const textColor = (() => {
    if (!backgroundColor.startsWith("#")) return "#1a1a1a";
    const r = parseInt(backgroundColor.slice(1, 3), 16);
    const g = parseInt(backgroundColor.slice(3, 5), 16);
    const b = parseInt(backgroundColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? "#1a1a1a" : "#ffffff";
  })();

  const barBody = (
    <div
      className={`relative ${isDragging ? "opacity-50" : ""} ${isLocked ? "cursor-not-allowed opacity-80" : ""} ${isCancelled ? "saturate-50" : ""}`}
      style={positionStyle}
      onDoubleClick={onDoubleClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-disabled={isLocked}
      data-testid={`appointment-bar-${appointment.id}`}
    >
      {isConflict ? (
        <div
          className="pointer-events-none absolute -right-1 -top-1 z-20"
          data-testid={`appointment-bar-conflict-icon-${appointment.id}`}
        >
          <span
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-md ring-2 ring-white"
            style={{ backgroundColor: conflictColor }}
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            <span>Konflikt</span>
          </span>
        </div>
      ) : null}
      <div
        className={`h-6 flex items-center gap-1.5 px-2 text-[11px] font-semibold transition-all ${
          isLocked ? "cursor-not-allowed" : "cursor-pointer hover:brightness-95"
        }`}
        style={{
          backgroundColor,
          color: textColor,
          borderColor: "rgba(255,255,255,0.22)",
          borderStyle: "solid",
          borderWidth: "1px",
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 42%), linear-gradient(180deg, rgba(0,0,0,0) 58%, rgba(0,0,0,0.18) 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(0,0,0,0.14), 0 2px 6px rgba(15,23,42,0.2)",
          filter: isBlocked ? "saturate(0.38) brightness(0.82)" : undefined,
          opacity: isBlocked ? 0.86 : undefined,
          borderRadius: isFirstDay && isLastDay ? "4px" : isFirstDay ? "4px 0 0 4px" : isLastDay ? "0 4px 4px 0" : "0",
          width: "100%",
        }}
      >
        <span className="inline-flex items-center justify-center" title={hasStartTime ? "Termin mit Startzeit" : "Tagestermin"}>
          <TimingIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </span>
        <span className="inline-flex min-w-0 flex-1 items-center overflow-hidden text-[10px] text-left">
          <span className="min-w-0 truncate">{customerName}</span>
          <span className="shrink-0 text-[10px] opacity-90"> - {customerNumber}</span>
        </span>
        {isCancelled ? (
          <span className="inline-flex shrink-0 rounded bg-black/15 px-1 py-0.5 text-[9px] uppercase tracking-wide">
            Storniert
          </span>
        ) : null}
        <span className="ml-auto inline-flex min-w-0 max-w-[34%] items-center justify-end text-[10px] text-right">
          <span className="truncate">{rightContent}</span>
        </span>
        {menuSlot ? (
          <span
            className="shrink-0 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {menuSlot}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (!showPopover) {
    return barBody;
  }

  const preview = createAppointmentWeeklyPanelPreview(appointment);

  return (
    <HoverPreview
      preview={preview.content}
      mode="cursor"
      openDelay={Math.max(preview.options?.openDelayMs ?? 0, MONTH_APPOINTMENT_PREVIEW_OPEN_DELAY_MS)}
      maxWidth={preview.options?.maxWidth}
      maxHeight={preview.options?.maxHeight ?? MONTH_APPOINTMENT_PREVIEW_MAX_HEIGHT_PX}
      cursorOffsetX={MONTH_APPOINTMENT_PREVIEW_CURSOR_OFFSET_X}
      cursorOffsetY={MONTH_APPOINTMENT_PREVIEW_CURSOR_OFFSET_Y}
      viewportPadding={MONTH_APPOINTMENT_PREVIEW_VIEWPORT_PADDING_PX}
      className="z-[9999] overflow-y-auto"
    >
      {barBody}
    </HoverPreview>
  );
}
