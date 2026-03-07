import type { CSSProperties, DragEvent } from "react";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { CALENDAR_NEUTRAL_COLOR, CALENDAR_UNASSIGNED_TOUR_COLOR } from "@/lib/calendar-utils";
import { ProjectStatusInfoBadge } from "@/components/ui/project-status-info-badge";
import { CalendarWeekAppointmentPanelCustomer } from "./CalendarWeekAppointmentPanelCustomer";
import { CalendarWeekAppointmentEmployeesHover } from "./CalendarWeekAppointmentEmployeesHover";
import { CalendarWeekAppointmentNotesHover } from "./CalendarWeekAppointmentNotesHover";
import { CalendarWeekAppointmentPanelHeader } from "./CalendarWeekAppointmentPanelHeader";
import { CalendarWeekAppointmentPanelProject } from "./CalendarWeekAppointmentPanelProject";

type CalendarWeekSpanningTileProps = {
  appointment: CalendarAppointment;
  style?: CSSProperties;
  isDragging?: boolean;
  isLocked?: boolean;
  highlighted?: boolean;
  onDoubleClick?: () => void;
  onDragStart?: (event: DragEvent) => void;
  onDragEnd?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  testId?: string;
};

export function CalendarWeekSpanningTile({
  appointment,
  style,
  isDragging,
  isLocked,
  highlighted = false,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onMouseEnter,
  onMouseLeave,
  testId,
}: CalendarWeekSpanningTileProps) {
  const isCompact = appointment.displayMode === "compact";
  const canDrag = Boolean(onDragStart);
  const interactiveClass = isLocked ? "cursor-not-allowed opacity-80" : "hover:shadow-md";
  const highlightClass = highlighted ? "border-primary shadow-md ring-1 ring-primary/30" : "border-slate-200";
  const resolvedProjectName = appointment.projectName;
  const resolvedTourName = appointment.tourName?.trim() || "Ohne Tour";
  const resolvedTourColor = appointment.tourName?.trim()
    ? (appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR)
    : CALENDAR_UNASSIGNED_TOUR_COLOR;

  return (
    <div
      className={`relative flex min-w-0 overflow-hidden rounded-lg border shadow-sm transition ${highlightClass} ${interactiveClass} ${isDragging ? "opacity-50" : ""}`}
      style={style}
      onDoubleClick={onDoubleClick}
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-disabled={isLocked}
      data-testid={testId ?? `week-spanning-tile-${appointment.id}`}
    >
      <div className="min-w-0 flex-1 space-y-1.5 bg-white/95 p-2">
        <div className="space-y-0">
          <CalendarWeekAppointmentPanelHeader
            customerNumber={appointment.customer.customerNumber}
            postalCode={appointment.customer.postalCode}
            color={appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR}
            startDate={appointment.startDate}
            endDate={appointment.endDate}
            startTime={appointment.startTime}
            connectedToNextRow
          />
          <div
            className="rounded-b-md rounded-t-none border border-t-0 px-2 py-1 text-[10px] font-semibold tracking-wide"
            style={{
              backgroundColor: resolvedTourColor,
              color: "#ffffff",
              borderColor: "rgba(255,255,255,0.22)",
            }}
            data-testid={`week-spanning-tile-tour-name-${appointment.id}`}
          >
            <span className="block truncate">{resolvedTourName}</span>
          </div>
        </div>
        {!isCompact ? (
          <>
            <CalendarWeekAppointmentPanelCustomer
              fullName={appointment.customer.fullName ?? ""}
              customerNumber={appointment.customer.customerNumber}
              addressLine1={appointment.customer.addressLine1}
              addressLine2={appointment.customer.addressLine2}
              postalCode={appointment.customer.postalCode}
              city={appointment.customer.city}
            />
            <CalendarWeekAppointmentPanelProject
              projectName={resolvedProjectName}
              projectOrderNumber={appointment.projectOrderNumber}
              projectDescription={appointment.projectDescription}
              enableFullDescriptionPreview
            />
            {appointment.projectStatuses.length > 0 ? (
              <div className="rounded-md border border-slate-200/90 px-2 py-1.5">
                <div className="mb-1 text-[10px] font-semibold text-slate-500">Projekt Status</div>
                <div className="flex flex-wrap gap-1">
                  {appointment.projectStatuses.map((status) => (
                    <ProjectStatusInfoBadge
                      key={status.id}
                      status={status}
                      size="sm"
                      testId={`week-project-status-${status.id}`}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <CalendarWeekAppointmentEmployeesHover employees={appointment.employees} />
            <CalendarWeekAppointmentNotesHover
              appointmentId={appointment.id}
              customerId={appointment.customer.id}
              projectId={appointment.projectId}
              customerNotesCount={appointment.customerNotesCount ?? 0}
              projectNotesCount={appointment.projectNotesCount ?? 0}
              appointmentNotesCount={appointment.appointmentNotesCount ?? 0}
            />
          </>
        ) : null}
      </div>
      <div
        className="shrink-0 basis-1/3 border-l border-slate-200/90"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(148,163,184,0.20) 0 8px, rgba(148,163,184,0.07) 8px 16px)",
        }}
        aria-hidden
      />
    </div>
  );
}
