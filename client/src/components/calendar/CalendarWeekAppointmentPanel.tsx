import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { CALENDAR_NEUTRAL_COLOR, CALENDAR_UNASSIGNED_TOUR_COLOR } from "@/lib/calendar-utils";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { mergeUniqueTags } from "@/lib/tag-utils";
import { CalendarWeekAppointmentPanelCustomer } from "./CalendarWeekAppointmentPanelCustomer";
import { CalendarWeekAppointmentEmployeesHover } from "./CalendarWeekAppointmentEmployeesHover";
import { CalendarWeekAppointmentAttachmentsHover } from "./CalendarWeekAppointmentAttachmentsHover";
import { CalendarWeekAppointmentNotesHover } from "./CalendarWeekAppointmentNotesHover";
import { CalendarWeekAppointmentPanelEmployee } from "./CalendarWeekAppointmentPanelEmployee";
import { CalendarWeekAppointmentPanelHeader } from "./CalendarWeekAppointmentPanelHeader";
import { CalendarWeekAppointmentPanelProject } from "./CalendarWeekAppointmentPanelProject";
import {
  getWeekAppointmentFooterStyle,
  WEEK_APPOINTMENT_CARD_FOOTER_SAFE_SPACE_PX,
} from "./weekAppointmentCardStyles";

export const MIN_WEEK_CARD_HEIGHT_PX = 240;
export const DEFAULT_CONTINUATION_HEIGHT_PX = MIN_WEEK_CARD_HEIGHT_PX;
export const WEEK_CARD_FOOTER_SAFE_SPACE_PX = WEEK_APPOINTMENT_CARD_FOOTER_SAFE_SPACE_PX;

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
  projectStatusAreaHeightPx: _projectStatusAreaHeightPx,
  projectStatusAreaRef: _projectStatusAreaRef,
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
  projectStatusAreaHeightPx?: number | null;
  projectStatusAreaRef?: React.Ref<HTMLDivElement>;
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
  const borderColor = appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR;
  const highlightClass = highlighted ? "shadow-md ring-1 ring-primary/30" : "";
  const resolvedProjectName = appointment.projectName;
  const resolvedTourName = appointment.tourName?.trim() || "Ohne Tour";
  const resolvedTourColor = appointment.tourName?.trim()
    ? (appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR)
    : CALENDAR_UNASSIGNED_TOUR_COLOR;
  const mergedTags = mergeUniqueTags(
    appointment.appointmentTags,
    appointment.customerTags,
    appointment.projectTags,
  );
  const footerStyle = getWeekAppointmentFooterStyle(appointment.tourColor);

  const resolvedPanelStyle = isContinuation
    ? { height: `${resolvedContinuationHeightPx}px` }
    : uniformHeightPx && uniformHeightPx > 0
      ? { height: `${uniformHeightPx + WEEK_CARD_FOOTER_SAFE_SPACE_PX}px` }
      : undefined;

  return (
    <div
      className={`relative overflow-hidden rounded-lg border shadow-sm transition ${highlightClass} ${interactiveClass} ${isDragging ? "opacity-50" : ""}`}
      ref={containerRef}
      onDoubleClick={interactive ? onDoubleClick : undefined}
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-disabled={isLocked}
      data-testid={testId ?? `week-appointment-panel-${appointment.id}`}
      style={{
        borderColor: highlighted ? undefined : borderColor,
        ...resolvedPanelStyle,
      }}
    >
      {!isContinuation && (
        <div className="flex h-full min-h-0 flex-col">
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
              <div className="min-h-0 flex-1 px-1 pt-1" data-testid={`week-appointment-content-${appointment.id}`}>
                <div className="min-h-0 space-y-1 overflow-hidden">
                  <CalendarWeekAppointmentPanelCustomer
                    fullName={appointment.customer.fullName ?? ""}
                    customerNumber={appointment.customer.customerNumber}
                    phone={appointment.customer.phone}
                    email={appointment.customer.email}
                    addressLine1={appointment.customer.addressLine1}
                    postalCode={appointment.customer.postalCode}
                    city={appointment.customer.city}
                  />
                  <CalendarWeekAppointmentPanelProject
                    projectName={resolvedProjectName}
                    projectOrderNumber={appointment.projectOrderNumber}
                    projectArticleItems={appointment.projectArticleItems}
                    projectDescription={appointment.projectDescription}
                    enableFullDescriptionPreview={context === "week-calendar"}
                  />
                </div>
              </div>
              <div
                className="mt-auto shrink-0 border-t px-1 py-2"
                style={footerStyle}
                data-testid={`week-appointment-footer-${appointment.id}`}
              >
                <div className="space-y-1">
                  {context === "week-calendar" ? (
                    <div className="flex w-full flex-nowrap items-center gap-1 overflow-visible">
                      <CalendarWeekAppointmentEmployeesHover employees={appointment.employees} />
                      <CalendarWeekAppointmentNotesHover
                        appointmentId={appointment.id}
                        customerId={appointment.customer.id}
                        projectId={appointment.projectId}
                        customerNotesCount={appointment.customerNotesCount ?? 0}
                        projectNotesCount={appointment.projectNotesCount ?? 0}
                        appointmentNotesCount={appointment.appointmentNotesCount ?? 0}
                      />
                      <CalendarWeekAppointmentAttachmentsHover
                        appointmentId={appointment.id}
                        totalAttachmentsCount={appointment.totalAttachmentsCount ?? 0}
                      />
                    </div>
                  ) : (
                    <CalendarWeekAppointmentPanelEmployee employees={appointment.employees} />
                  )}
                  <EntityTagFooterRow tags={mergedTags} testId={`week-appointment-tags-${appointment.id}`} />
                </div>
              </div>
            </>
          ) : (
            <div
              className="mt-auto shrink-0 border-t px-1 py-2"
              style={footerStyle}
              data-testid={`week-appointment-footer-${appointment.id}`}
            >
              <div className="space-y-1">
                <div className="flex w-full flex-nowrap items-center gap-1 overflow-visible">
                  <CalendarWeekAppointmentEmployeesHover employees={appointment.employees} />
                  <CalendarWeekAppointmentNotesHover
                    appointmentId={appointment.id}
                    customerId={appointment.customer.id}
                    projectId={appointment.projectId}
                    customerNotesCount={appointment.customerNotesCount ?? 0}
                    projectNotesCount={appointment.projectNotesCount ?? 0}
                    appointmentNotesCount={appointment.appointmentNotesCount ?? 0}
                  />
                  <CalendarWeekAppointmentAttachmentsHover
                    appointmentId={appointment.id}
                    totalAttachmentsCount={appointment.totalAttachmentsCount ?? 0}
                  />
                </div>
                <EntityTagFooterRow tags={mergedTags} testId={`week-appointment-tags-${appointment.id}`} />
              </div>
            </div>
          )}
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
