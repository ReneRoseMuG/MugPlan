import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { CalendarWeekAppointmentPanelCustomer } from "./CalendarWeekAppointmentPanelCustomer";
import { CalendarWeekAppointmentPanelEmployee } from "./CalendarWeekAppointmentPanelEmployee";
import { CalendarWeekAppointmentPanelHeader } from "./CalendarWeekAppointmentPanelHeader";
import { CalendarWeekAppointmentPanelProject } from "./CalendarWeekAppointmentPanelProject";

export function CalendarWeekAppointmentPanel({
  appointment,
  onDoubleClick,
  isDragging,
  onDragStart,
  onDragEnd,
  isLocked,
  interactive = true,
  highlighted = false,
  onMouseEnter,
  onMouseLeave,
  segment = "start",
  testId,
}: {
  appointment: CalendarAppointment;
  onDoubleClick?: () => void;
  isDragging?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  isLocked?: boolean;
  interactive?: boolean;
  highlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  segment?: "start" | "continuation";
  testId?: string;
}) {
  const isContinuation = segment === "continuation";
  const canDrag = interactive && Boolean(onDragStart);
  const interactiveClass = interactive
    ? (isLocked ? "cursor-not-allowed opacity-80" : "hover:shadow-md")
    : "";
  const highlightClass = highlighted ? "border-primary shadow-md ring-1 ring-primary/30" : "border-slate-200";

  return (
    <div
      className={`relative overflow-hidden rounded-lg border p-2 shadow-sm transition ${highlightClass} ${interactiveClass} ${isDragging ? "opacity-50" : ""}`}
      onDoubleClick={interactive ? onDoubleClick : undefined}
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-disabled={isLocked}
      data-testid={testId ?? `week-appointment-panel-${appointment.id}`}
    >
      <div className={`space-y-1.5 ${isContinuation ? "opacity-0 select-none" : ""}`}>
        <CalendarWeekAppointmentPanelHeader
          customerNumber={appointment.customer.customerNumber}
          postalCode={appointment.customer.postalCode}
        />
        <CalendarWeekAppointmentPanelCustomer
          fullName={appointment.customer.fullName}
          addressLine1={appointment.customer.addressLine1}
          addressLine2={appointment.customer.addressLine2}
          postalCode={appointment.customer.postalCode}
          city={appointment.customer.city}
        />
        <CalendarWeekAppointmentPanelProject
          projectName={appointment.projectName}
          projectDescription={appointment.projectDescription}
          projectStatuses={appointment.projectStatuses}
        />
        <CalendarWeekAppointmentPanelEmployee employees={appointment.employees} />
      </div>
      {isContinuation && (
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(148,163,184,0.15) 0 8px, rgba(148,163,184,0.06) 8px 16px)",
          }}
          aria-hidden
        />
      )}
    </div>
  );
}
