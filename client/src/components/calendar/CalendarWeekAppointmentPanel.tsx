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
}: {
  appointment: CalendarAppointment;
  onDoubleClick?: () => void;
  isDragging?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  isLocked?: boolean;
  interactive?: boolean;
}) {
  const canDrag = interactive && Boolean(onDragStart);
  const interactiveClass = interactive
    ? (isLocked ? "cursor-not-allowed opacity-80" : "hover:shadow-md")
    : "";

  return (
    <div
      className={`rounded-lg border border-slate-200 p-2 shadow-sm transition ${interactiveClass} ${isDragging ? "opacity-50" : ""}`}
      onDoubleClick={interactive ? onDoubleClick : undefined}
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      aria-disabled={isLocked}
      data-testid={`week-appointment-panel-${appointment.id}`}
    >
      <div className="space-y-1.5">
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
    </div>
  );
}
