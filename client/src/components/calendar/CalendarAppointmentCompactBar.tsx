import { useRef, useState } from "react";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { CALENDAR_NEUTRAL_COLOR, getAppointmentEndDate, getAppointmentTimeLabel } from "@/lib/calendar-utils";
import { CalendarAppointmentPopover } from "./CalendarAppointmentPopover";

type CompactBarProps = {
  appointment: CalendarAppointment;
  dayIndex: number;
  totalDaysInRow: number;
  isFirstDay: boolean;
  isLastDay: boolean;
  spanDays: number;
  showPopover?: boolean;
  isLocked?: boolean;
  isDragging?: boolean;
  onClick?: () => void;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
};

const logPrefix = "[calendar-compact-bar]";

export function CalendarAppointmentCompactBar({
  appointment,
  dayIndex,
  totalDaysInRow,
  isFirstDay,
  isLastDay,
  spanDays,
  showPopover = isFirstDay,
  isLocked,
  isDragging,
  onClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: CompactBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const barRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startTimeLabel = getAppointmentTimeLabel(appointment);
  const endDate = getAppointmentEndDate(appointment);
  const isMultiDay = appointment.startDate !== endDate;

  const handleMouseEnter = () => {
    if (barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.right + 10,
        y: rect.top,
      });
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
      console.info(`${logPrefix} popover open`, { appointmentId: appointment.id });
    }, 400);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  const backgroundColor = appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR;
  const widthPercent = Math.min(spanDays, totalDaysInRow - dayIndex) * 100;
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
      ref={barRef}
      className={`relative ${isDragging ? "opacity-50" : ""} ${isLocked ? "cursor-not-allowed opacity-80" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
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
          width: spanDays > 1 ? `calc(${widthPercent}% + ${(spanDays - 1) * 2}px)` : "100%",
          marginRight: spanDays > 1 ? `-${(spanDays - 1) * 100}%` : "0",
          position: spanDays > 1 ? "relative" : "static",
          zIndex: spanDays > 1 ? 10 : 1,
        }}
      >
        <span className="truncate max-w-[35%]">#{appointment.customer.customerNumber}</span>
        <span className="truncate max-w-[25%]">{appointment.customer.postalCode ?? "PLZ?"}</span>
        <span className="truncate flex-1">{appointment.projectName}</span>
        {!isMultiDay && startTimeLabel && (
          <span className="ml-auto text-[10px] font-bold">{startTimeLabel}</span>
        )}
      </div>

      {showTooltip && showPopover && (
        <CalendarAppointmentPopover appointment={appointment} position={tooltipPosition} />
      )}
    </div>
  );
}
