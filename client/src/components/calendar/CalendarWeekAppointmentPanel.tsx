import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { CALENDAR_NEUTRAL_COLOR, CALENDAR_UNASSIGNED_TOUR_COLOR } from "@/lib/calendar-utils";
import { ProjectStatusInfoBadge } from "@/components/ui/project-status-info-badge";
import { CalendarWeekAppointmentPanelCustomer } from "./CalendarWeekAppointmentPanelCustomer";
import { CalendarWeekAppointmentEmployeesHover } from "./CalendarWeekAppointmentEmployeesHover";
import { CalendarWeekAppointmentNotesHover } from "./CalendarWeekAppointmentNotesHover";
import { CalendarWeekAppointmentPanelEmployee } from "./CalendarWeekAppointmentPanelEmployee";
import { CalendarWeekAppointmentPanelHeader } from "./CalendarWeekAppointmentPanelHeader";
import { CalendarWeekAppointmentPanelProject } from "./CalendarWeekAppointmentPanelProject";

export const DEFAULT_CONTINUATION_HEIGHT_PX = 180;

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
  context = "default",
  continuationHeightPx,
  uniformHeightPx,
  showPreviewTourNameLine = false,
  containerRef,
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
  context?: "default" | "week-calendar";
  continuationHeightPx?: number | null;
  uniformHeightPx?: number | null;
  showPreviewTourNameLine?: boolean;
  containerRef?: React.Ref<HTMLDivElement>;
  testId?: string;
}) {
  const isContinuation = segment === "continuation";
  const resolvedContinuationHeightPx = continuationHeightPx ?? DEFAULT_CONTINUATION_HEIGHT_PX;
  const isCompact = appointment.displayMode === "compact";
  const canDrag = interactive && Boolean(onDragStart);
  const interactiveClass = interactive
    ? (isLocked ? "cursor-not-allowed opacity-80" : "hover:shadow-md")
    : "";
  const highlightClass = highlighted ? "border-primary shadow-md ring-1 ring-primary/30" : "border-slate-200";
  const resolvedProjectName = appointment.projectName;
  const resolvedTourName = appointment.tourName?.trim() || "Ohne Tour";
  const resolvedTourColor = appointment.tourName?.trim()
    ? (appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR)
    : CALENDAR_UNASSIGNED_TOUR_COLOR;

  const resolvedPanelStyle = isContinuation
    ? { height: `${resolvedContinuationHeightPx}px` }
    : uniformHeightPx && uniformHeightPx > 0
      ? { height: `${uniformHeightPx}px` }
      : undefined;

  return (
    <div
      className={`relative overflow-hidden rounded-lg border p-2 shadow-sm transition ${highlightClass} ${interactiveClass} ${isDragging ? "opacity-50" : ""}`}
      ref={containerRef}
      onDoubleClick={interactive ? onDoubleClick : undefined}
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-disabled={isLocked}
      data-testid={testId ?? `week-appointment-panel-${appointment.id}`}
      style={resolvedPanelStyle}
    >
      {!isContinuation && (
        <div className="space-y-1.5">
          <div className={showPreviewTourNameLine ? "space-y-0" : undefined}>
            <CalendarWeekAppointmentPanelHeader
              customerNumber={appointment.customer.customerNumber}
              postalCode={appointment.customer.postalCode}
              color={appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR}
              startDate={appointment.startDate}
              endDate={appointment.endDate}
              startTime={appointment.startTime}
              connectedToNextRow={showPreviewTourNameLine}
            />
            {showPreviewTourNameLine && (
              <div
                className="rounded-b-md rounded-t-none border border-t-0 px-2 py-1 text-[10px] font-semibold tracking-wide"
                style={{
                  backgroundColor: resolvedTourColor,
                  color: "#ffffff",
                  borderColor: "rgba(255,255,255,0.22)",
                }}
                data-testid={`week-appointment-tour-name-${appointment.id}`}
              >
                <span className="block truncate">{resolvedTourName}</span>
              </div>
            )}
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
                enableFullDescriptionPreview={context === "week-calendar"}
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
              {context === "week-calendar" ? (
                <>
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
              ) : (
                <CalendarWeekAppointmentPanelEmployee employees={appointment.employees} />
              )}
            </>
          ) : null}
        </div>
      )}
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
