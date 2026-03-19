import { HoverPreview } from "@/components/ui/hover-preview";
import { createAppointmentWeeklyPanelPreview } from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { CALENDAR_NEUTRAL_COLOR, getAppointmentEndDate } from "@/lib/calendar-utils";
import { CalendarDays, Clock3 } from "lucide-react";

type CompactBarProps = {
  appointment: CalendarAppointment;
  isFirstDay: boolean;
  isLastDay: boolean;
  hideOrderNumber?: boolean;
  showPopover?: boolean;
  isLocked?: boolean;
  isDragging?: boolean;
  positionStyle?: React.CSSProperties;
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
  hideOrderNumber = false,
  showPopover = isFirstDay,
  isLocked,
  isDragging,
  positionStyle,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: CompactBarProps) {
  const endDate = getAppointmentEndDate(appointment);
  const isMultiDay = appointment.startDate !== endDate;
  const hasStartTime = Boolean(appointment.startTime && appointment.startTime.trim());
  const TimingIcon = hasStartTime ? Clock3 : CalendarDays;
  const customerNumber = appointment.customer.customerNumber?.trim() || "-";
  const customerName = appointment.customer.fullName?.trim() || "-";
  const orderNumber = appointment.projectOrderNumber?.trim() || "-";
  const postalCode = appointment.customer.postalCode?.trim() || "-";
  const leftContent = isMultiDay
    ? hideOrderNumber
      ? `K: ${customerNumber} - Name: ${customerName}`
      : `K: ${customerNumber} - ${orderNumber} - Name: ${customerName}`
    : `K: ${customerNumber}`;
  const middleContent = hideOrderNumber ? null : orderNumber;
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
          borderRadius: isFirstDay && isLastDay ? "4px" : isFirstDay ? "4px 0 0 4px" : isLastDay ? "0 4px 4px 0" : "0",
          width: "100%",
        }}
      >
        <span className="inline-flex items-center justify-center" title={hasStartTime ? "Termin mit Startzeit" : "Tagestermin"}>
          <TimingIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </span>
        <span className={`inline-flex min-w-0 items-center text-[10px] ${isMultiDay ? "max-w-[72%]" : "max-w-[38%]"}`}>
          <span className="truncate">{leftContent}</span>
        </span>
        {isCancelled ? (
          <span className="inline-flex shrink-0 rounded bg-black/15 px-1 py-0.5 text-[9px] uppercase tracking-wide">
            Storniert
          </span>
        ) : null}
        {!isMultiDay && middleContent && (
          <span className="inline-flex min-w-0 max-w-[27%] items-center justify-center text-[10px] text-center">
            <span className="truncate">{middleContent}</span>
          </span>
        )}
        <span className="ml-auto inline-flex min-w-0 max-w-[34%] items-center justify-end text-[10px] text-right">
          <span className="truncate">{rightContent}</span>
        </span>
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
      openDelay={preview.options?.openDelayMs}
      maxWidth={preview.options?.maxWidth}
      maxHeight={preview.options?.maxHeight}
      cursorOffsetX={12}
      cursorOffsetY={10}
      className="z-[9999]"
    >
      {barBody}
    </HoverPreview>
  );
}
