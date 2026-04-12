import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Ban, ParkingCircle, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  isReservedVacantTagName,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
  RESERVED_VACANT_TAG_COLOR,
} from "@shared/appointmentCancellation";
import { useToast } from "@/hooks/use-toast";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { CALENDAR_NEUTRAL_COLOR, CALENDAR_UNASSIGNED_TOUR_COLOR } from "@/lib/calendar-utils";
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
import { CalendarWeekAppointmentTagPicker } from "./CalendarWeekAppointmentTagPicker";
import { toAlphaColor } from "@/lib/monitoring-ui";

export const MIN_WEEK_CARD_HEIGHT_PX = 240;
export const DEFAULT_CONTINUATION_HEIGHT_PX = MIN_WEEK_CARD_HEIGHT_PX;
export const WEEK_CARD_FOOTER_SAFE_SPACE_PX = WEEK_APPOINTMENT_CARD_FOOTER_SAFE_SPACE_PX;

export function CalendarWeekAppointmentPanel({
  appointment,
  weekTileBodyMode = "semiexpanded",
  onDoubleClick,
  isDragging,
  onDragStart,
  onDragEnd,
  isLocked,
  interactive = true,
  highlighted = false,
  isConflict = false,
  conflictColor,
  onMouseEnter,
  onMouseLeave,
  segment = "start",
  context = "default",
  continuationHeightPx,
  uniformHeightPx,
  projectStatusAreaHeightPx: _projectStatusAreaHeightPx,
  projectStatusAreaRef: _projectStatusAreaRef,
  showPreviewTourNameLine = false,
  showTagActions = false,
  canEditTags = false,
  containerRef,
  testId,
}: {
  appointment: CalendarAppointment;
  weekTileBodyMode?: "collapsed" | "semiexpanded" | "expanded";
  onDoubleClick?: () => void;
  isDragging?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  isLocked?: boolean;
  interactive?: boolean;
  highlighted?: boolean;
  isConflict?: boolean;
  conflictColor?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  segment?: "start" | "continuation";
  context?: "default" | "week-calendar";
  continuationHeightPx?: number | null;
  uniformHeightPx?: number | null;
  projectStatusAreaHeightPx?: number | null;
  projectStatusAreaRef?: React.Ref<HTMLDivElement>;
  showPreviewTourNameLine?: boolean;
  showTagActions?: boolean;
  canEditTags?: boolean;
  containerRef?: React.Ref<HTMLDivElement>;
  testId?: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [parkConfirmOpen, setParkConfirmOpen] = useState(false);

  const isParked = appointment.appointmentTags.some((t) => isReservedVacantTagName(t.name));

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/appointments/${appointment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: appointment.version }),
      });
      if (!res.ok) throw new Error("Stornieren fehlgeschlagen");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
      toast({ title: "Termin storniert" });
    },
    onError: () => {
      toast({ title: "Stornieren nicht möglich", variant: "destructive" });
    },
  });

  const parkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/appointments/${appointment.id}/park`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: appointment.version }),
      });
      if (!res.ok) throw new Error("Parken fehlgeschlagen");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
      toast({ title: "Termin geparkt" });
    },
    onError: () => {
      toast({ title: "Parken nicht möglich", variant: "destructive" });
    },
  });

  const menuSlot = interactive ? (
    <span
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-white/20 transition-opacity focus:outline-none"
            aria-label="Terminaktionen"
            data-testid={`week-appointment-menu-trigger-${appointment.id}`}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {onDoubleClick && (
            <DropdownMenuItem
              onClick={onDoubleClick}
              className="gap-2 text-xs cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              Termin öffnen
            </DropdownMenuItem>
          )}
          {!appointment.isCancelled && (
            <DropdownMenuItem
              onClick={() => setCancelConfirmOpen(true)}
              className="gap-2 text-xs cursor-pointer"
              style={{ color: RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR }}
            >
              <Ban className="h-3.5 w-3.5 shrink-0" />
              Stornieren
            </DropdownMenuItem>
          )}
          {!appointment.isCancelled && !isParked && (
            <DropdownMenuItem
              onClick={() => setParkConfirmOpen(true)}
              className="gap-2 text-xs cursor-pointer"
              style={{ color: RESERVED_VACANT_TAG_COLOR }}
            >
              <ParkingCircle className="h-3.5 w-3.5 shrink-0" />
              Parken
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  ) : undefined;

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
  const isCollapsedBodyMode = weekTileBodyMode === "collapsed";
  const showCustomerPanel = true;
  const customerMode = weekTileBodyMode === "expanded" ? "expanded" : "collapsed";
  const projectCollapsed = weekTileBodyMode === "collapsed";
  const mergedTags = mergeUniqueTags(
    appointment.appointmentTags,
    appointment.customerTags,
    appointment.projectTags,
  );
  const footerStyle = getWeekAppointmentFooterStyle(appointment.tourColor);
  const conflictOverlayStyle = conflictColor
    ? {
        backgroundImage: `repeating-linear-gradient(135deg, ${toAlphaColor(conflictColor, 0.26)} 0 10px, ${toAlphaColor(conflictColor, 0.08)} 10px 20px)`,
      }
    : undefined;
  const footerTopRow = context === "week-calendar" ? (
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
  );
  const footerTagRow = (
    <div className="mt-auto">
      <CalendarWeekAppointmentTagPicker
        appointmentId={appointment.id}
        tags={mergedTags}
        appointmentTags={appointment.appointmentTags}
        projectTags={appointment.projectTags}
        canEdit={showTagActions && canEditTags}
        testId={`week-appointment-tags-${appointment.id}`}
      />
    </div>
  );

  const resolvedPanelStyle = isContinuation
    ? { height: `${resolvedContinuationHeightPx}px` }
    : !isCollapsedBodyMode && uniformHeightPx && uniformHeightPx > 0
      ? { height: `${uniformHeightPx + WEEK_CARD_FOOTER_SAFE_SPACE_PX}px` }
      : undefined;

  return (
  <>
    <div
      className={`group/calendar-card relative overflow-hidden rounded-lg border shadow-sm transition ${highlightClass} ${interactiveClass} ${isDragging ? "opacity-50" : ""}`}
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
        <div className={`flex min-h-0 flex-col ${isCollapsedBodyMode ? "" : "h-full"}`}>
          <div className={showPreviewTourNameLine ? "space-y-0" : undefined}>
            <CalendarWeekAppointmentPanelHeader
              customerNumber={appointment.customer.customerNumber}
              postalCode={appointment.customer.postalCode}
              color={appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR}
              startDate={appointment.startDate}
              endDate={appointment.endDate}
              startTime={appointment.startTime}
              connectedToNextRow={showPreviewTourNameLine}
              menuSlot={menuSlot}
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
              <div className={`relative min-h-0 px-1 pt-1 ${isCollapsedBodyMode ? "" : "flex-1"}`} data-testid={`week-appointment-content-${appointment.id}`}>
                {isConflict ? (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-sm opacity-100 transition-opacity duration-200 group-hover/calendar-card:opacity-25"
                    style={conflictOverlayStyle}
                    data-testid={`week-appointment-conflict-overlay-${appointment.id}`}
                  />
                ) : null}
                <div className="min-h-0 space-y-1 overflow-hidden">
                  {showCustomerPanel ? (
                    <CalendarWeekAppointmentPanelCustomer
                      mode={customerMode}
                      fullName={appointment.customer.fullName ?? ""}
                      customerNumber={appointment.customer.customerNumber}
                      phone={appointment.customer.phone}
                      email={appointment.customer.email}
                      addressLine1={appointment.customer.addressLine1}
                      postalCode={appointment.customer.postalCode}
                      city={appointment.customer.city}
                      country={appointment.customer.country}
                    />
                  ) : null}
                  <CalendarWeekAppointmentPanelProject
                    projectName={resolvedProjectName}
                    projectOrderNumber={appointment.projectOrderNumber}
                    projectArticleItems={appointment.projectArticleItems}
                    projectDescription={appointment.projectDescription}
                    collapsed={projectCollapsed}
                    enableFullDescriptionPreview={context === "week-calendar"}
                  />
                </div>
              </div>
              <div
                className="relative mt-auto shrink-0 border-t px-1 py-2"
                style={footerStyle}
                data-testid={`week-appointment-footer-${appointment.id}`}
              >
                {isConflict ? (
                  <div
                    className="pointer-events-none absolute inset-0 opacity-100 transition-opacity duration-200 group-hover/calendar-card:opacity-25"
                    style={conflictOverlayStyle}
                    data-testid={`week-appointment-conflict-overlay-${appointment.id}`}
                  />
                ) : null}
                <div className="flex min-h-full flex-col gap-1">
                  {footerTopRow}
                  {footerTagRow}
                </div>
              </div>
            </>
          ) : (
            <div
              className="relative mt-auto shrink-0 border-t px-1 py-2"
              style={footerStyle}
              data-testid={`week-appointment-footer-${appointment.id}`}
            >
              {isConflict ? (
                <div
                  className="pointer-events-none absolute inset-0 opacity-100 transition-opacity duration-200 group-hover/calendar-card:opacity-25"
                  style={conflictOverlayStyle}
                  data-testid={`week-appointment-conflict-overlay-${appointment.id}`}
                />
              ) : null}
              <div className="flex min-h-full flex-col gap-1">
                {footerTopRow}
                {footerTagRow}
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

    <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Termin stornieren?</AlertDialogTitle>
          <AlertDialogDescription>
            Der Termin wird als storniert markiert. Zugewiesene Mitarbeiter werden entfernt. Stornierte Termine sind nur noch lesbar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelMutation.isPending}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            style={{
              backgroundColor: RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
              borderColor: RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
            }}
          >
            {cancelMutation.isPending ? "Stornieren…" : "Stornieren"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={parkConfirmOpen} onOpenChange={setParkConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Termin parken?</AlertDialogTitle>
          <AlertDialogDescription>
            Der Termin wird in die Parkplatz-Tour verschoben und als geparkt markiert. Zugewiesene Mitarbeiter werden entfernt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={parkMutation.isPending}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => parkMutation.mutate()}
            disabled={parkMutation.isPending}
            style={{
              backgroundColor: RESERVED_VACANT_TAG_COLOR,
              borderColor: RESERVED_VACANT_TAG_COLOR,
            }}
          >
            {parkMutation.isPending ? "Parken…" : "Parken"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
