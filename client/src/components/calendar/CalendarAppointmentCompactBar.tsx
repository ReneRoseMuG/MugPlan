import { useRef, useState } from "react";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { CALENDAR_NEUTRAL_COLOR, getAppointmentEndDate } from "@/lib/calendar-utils";
import { CalendarAppointmentPopover } from "./CalendarAppointmentPopover";

type CompactBarProps = {
  appointment: CalendarAppointment;
  isFirstDay: boolean;
  isLastDay: boolean;
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

const logPrefix = "[calendar-compact-bar]";

export function CalendarAppointmentCompactBar({
  appointment,
  isFirstDay,
  isLastDay,
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
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const endDate = getAppointmentEndDate(appointment);
  const isMultiDay = appointment.startDate !== endDate;
  const customerNumber = appointment.customer.customerNumber?.trim() || "-";
  const customerName = appointment.customer.fullName?.trim() || "";
  const postalCode = appointment.customer.postalCode?.trim() || "-";
  const leftContent = isMultiDay && customerName
    ? `K: ${customerNumber} - Name: ${customerName}`
    : `K: ${customerNumber}`;
  const rightContent = `PLZ: ${postalCode}`;

  const updateTooltipPositionFromMouse = (event: React.MouseEvent) => {
    setTooltipPosition({
      x: event.clientX + 12,
      y: event.clientY + 10,
    });
  };

  const handleMouseEnter = (event: React.MouseEvent) => {
    updateTooltipPositionFromMouse(event);
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
      console.info(`${logPrefix} popover open`, { appointmentId: appointment.id });
    }, 400);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    updateTooltipPositionFromMouse(event);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  const backgroundColor = appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR;
  const textColor = (() => {
    if (!backgroundColor.startsWith("#")) return "#1a1a1a";
    const r = parseInt(backgroundColor.slice(1, 3), 16);
    const g = parseInt(backgroundColor.slice(3, 5), 16);
    const b = parseInt(backgroundColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? "#1a1a1a" : "#ffffff";
  })();

  return (
    <div
      className={`relative ${isDragging ? "opacity-50" : ""} ${isLocked ? "cursor-not-allowed opacity-80" : ""}`}
      style={positionStyle}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
          borderRadius: isFirstDay && isLastDay ? "4px" : isFirstDay ? "4px 0 0 4px" : isLastDay ? "0 4px 4px 0" : "0",
          width: "100%",
        }}
      >
        <span className="inline-flex min-w-0 max-w-[75%] items-center text-[10px]">
          <span className="truncate">{leftContent}</span>
        </span>
        <span className="ml-auto inline-flex min-w-0 max-w-[35%] items-center justify-end text-[10px] text-right">
          <span className="truncate">{rightContent}</span>
        </span>
      </div>

      {showTooltip && showPopover && (
        <CalendarAppointmentPopover appointment={appointment} position={tooltipPosition} />
      )}
    </div>
  );
}
