import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { CALENDAR_NEUTRAL_COLOR } from "@/lib/calendar-utils";
import { CalendarAppointmentDetails } from "./CalendarAppointmentDetails";

export function CalendarWeekAppointmentPanel({
  appointment,
  onClick,
  isDragging,
  onDragStart,
  onDragEnd,
  isLocked,
}: {
  appointment: CalendarAppointment;
  onClick?: () => void;
  isDragging?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  isLocked?: boolean;
}) {
  const backgroundColor = appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR;

  return (
    <div
      className={`rounded-lg border border-slate-200 p-3 shadow-sm transition ${
        isLocked ? "cursor-not-allowed opacity-80" : "hover:shadow-md"
      } ${isDragging ? "opacity-50" : ""}`}
      style={{ borderLeftColor: backgroundColor, borderLeftWidth: "4px" }}
      onClick={onClick}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-disabled={isLocked}
      data-testid={`week-appointment-panel-${appointment.id}`}
    >
      <CalendarAppointmentDetails appointment={appointment} variant="panel" />
    </div>
  );
}
