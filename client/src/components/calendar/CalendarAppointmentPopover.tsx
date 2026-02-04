import { createPortal } from "react-dom";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { CalendarAppointmentDetails } from "./CalendarAppointmentDetails";

export function CalendarAppointmentPopover({
  appointment,
  position,
}: {
  appointment: CalendarAppointment;
  position: { x: number; y: number };
}) {
  const tooltipWidth = 360;
  const tooltipHeight = 320;

  const fitsRight = position.x + tooltipWidth < window.innerWidth - 10;
  const fitsBottom = position.y + tooltipHeight < window.innerHeight - 10;

  const left = fitsRight ? position.x : Math.max(10, position.x - tooltipWidth - 20);
  const top = fitsBottom ? position.y : Math.max(10, position.y - tooltipHeight);

  return createPortal(
    <div
      className="fixed z-[9999] w-[360px] bg-white rounded-lg shadow-xl border border-slate-200 p-4 pointer-events-none"
      style={{ top, left }}
      data-testid={`appointment-popover-${appointment.id}`}
    >
      <CalendarAppointmentDetails appointment={appointment} variant="popover" />
    </div>,
    document.body,
  );
}
