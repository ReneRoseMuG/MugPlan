import { useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CalendarRange, Clock3, MoreVertical, Ban, ParkingCircle, ExternalLink } from "lucide-react";
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
import { CALENDAR_NEUTRAL_COLOR } from "@/lib/calendar-utils";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
import { mergeUniqueTags } from "@/lib/tag-utils";
import { CalendarWeekAppointmentPanelCustomer } from "./CalendarWeekAppointmentPanelCustomer";
import { CalendarWeekAppointmentEmployeesHover } from "./CalendarWeekAppointmentEmployeesHover";
import { CalendarWeekAppointmentAttachmentsHover } from "./CalendarWeekAppointmentAttachmentsHover";
import { CalendarWeekAppointmentNotesHover } from "./CalendarWeekAppointmentNotesHover";
import { CalendarWeekAppointmentPanelProject } from "./CalendarWeekAppointmentPanelProject";
import { CalendarWeekAppointmentTagPicker } from "./CalendarWeekAppointmentTagPicker";
import {
  getWeekAppointmentFooterStyle,
  WEEK_APPOINTMENT_CARD_FOOTER_SAFE_SPACE_PX,
} from "./weekAppointmentCardStyles";
import { toAlphaColor } from "@/lib/monitoring-ui";

export const WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX = WEEK_APPOINTMENT_CARD_FOOTER_SAFE_SPACE_PX;

type CalendarWeekSpanningTileProps = {
  appointment: CalendarAppointment;
  spanColumns: number;
  displayMode: "standard" | "compact" | "detail" | "split";
  weekTileBodyMode?: "collapsed" | "semiexpanded" | "expanded";
  visibleStartDate: string;
  visibleDayNumberStart: number;
  uniformHeightPx?: number | null;
  projectStatusAreaHeightPx?: number | null;
  projectStatusAreaRef?: React.Ref<HTMLDivElement>;
  showTagActions?: boolean;
  canEditTags?: boolean;
  containerRef?: React.Ref<HTMLDivElement>;
  style?: CSSProperties;
  isDragging?: boolean;
  isLocked?: boolean;
  highlighted?: boolean;
  isConflict?: boolean;
  conflictColor?: string;
  onDoubleClick?: () => void;
  onDragStart?: (event: DragEvent) => void;
  onDragEnd?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  testId?: string;
};

export function CalendarWeekSpanningTile({
  appointment,
  spanColumns,
  displayMode,
  weekTileBodyMode = "semiexpanded",
  visibleStartDate,
  visibleDayNumberStart,
  uniformHeightPx,
  projectStatusAreaHeightPx: _projectStatusAreaHeightPx,
  projectStatusAreaRef: _projectStatusAreaRef,
  showTagActions = false,
  canEditTags = false,
  containerRef,
  style,
  isDragging,
  isLocked,
  highlighted = false,
  isConflict = false,
  conflictColor,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onMouseEnter,
  onMouseLeave,
  testId,
}: CalendarWeekSpanningTileProps) {
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
      await refreshMonitoringWithNotification(toast);
      toast({ title: "Termin geparkt" });
    },
    onError: () => {
      toast({ title: "Parken nicht möglich", variant: "destructive" });
    },
  });

  const menuSlot = (
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
            data-testid={`week-spanning-tile-menu-trigger-${appointment.id}`}
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
  );

  const canDrag = Boolean(onDragStart);
  const interactiveClass = isLocked ? "cursor-not-allowed opacity-80" : "hover:shadow-md";
  const borderColor = appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR;
  const highlightClass = highlighted ? "shadow-md ring-1 ring-primary/30" : "";
  const uniformBorderShadow = highlighted ? undefined : `inset 0 0 0 1px ${borderColor}`;
  const resolvedProjectName = appointment.projectName;
  const effectiveDisplayMode = displayMode;
  const isCenteredMode = effectiveDisplayMode === "compact";
  const isFilledMode = effectiveDisplayMode === "detail";
  const isSplitMode = effectiveDisplayMode === "split";
  const visibleColumns = Math.max(1, spanColumns);
  const bodyColumnWidth = `calc(100% / ${visibleColumns})`;
  const headerDays = Array.from({ length: visibleColumns }, (_, dayOffset) => {
    const dayDate = new Date(`${visibleStartDate}T00:00:00`);
    dayDate.setDate(dayDate.getDate() + dayOffset);
    return {
      key: `${visibleStartDate}-${dayOffset}`,
      formattedDate: Number.isNaN(dayDate.getTime())
        ? visibleStartDate
        : new Intl.DateTimeFormat("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          }).format(dayDate),
      dayLabel: `Tag ${visibleDayNumberStart + dayOffset}`,
      isFirst: dayOffset === 0,
      isLast: dayOffset === visibleColumns - 1,
    };
  });
  const hasStartTime = Boolean(appointment.startTime?.trim());
  const TimingIcon = visibleColumns > 1 ? CalendarRange : hasStartTime ? Clock3 : CalendarDays;
  const resolvedStartTime = appointment.startTime?.trim().slice(0, 5) || null;
  const resolvedCustomerNumber = appointment.customer.customerNumber.trim() || "-";
  const resolvedPostalCode = appointment.customer.postalCode?.trim() || "-";
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

  const mainContentPanels = (
    <>
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
        enableFullDescriptionPreview
      />
    </>
  );

  const footerContentPanels = (
    <div className="flex min-h-full flex-col gap-1">
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
      <div className="mt-auto">
        <CalendarWeekAppointmentTagPicker
          appointmentId={appointment.id}
          tags={mergedTags}
          appointmentTags={appointment.appointmentTags}
          projectTags={appointment.projectTags}
          canEdit={showTagActions && canEditTags}
          testId={`week-spanning-tile-tags-${appointment.id}`}
        />
      </div>
    </div>
  );

  const bodyContent = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`relative min-h-0 px-1 pt-1 ${isCollapsedBodyMode ? "" : "flex-1"}`} data-testid={`week-spanning-tile-content-${appointment.id}`}>
        {isConflict ? (
          <div
            className="pointer-events-none absolute inset-0 rounded-sm opacity-100 transition-opacity duration-200 group-hover/calendar-card:opacity-25"
            style={conflictOverlayStyle}
            data-testid={`week-spanning-tile-conflict-overlay-${appointment.id}`}
          />
        ) : null}
        <div className="min-h-0 space-y-1 overflow-hidden">
          {mainContentPanels}
        </div>
      </div>
      <div
        className="relative mt-auto shrink-0 border-t px-1 py-2"
        style={footerStyle}
        data-testid={`week-spanning-tile-footer-${appointment.id}`}
      >
        {isConflict ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-100 transition-opacity duration-200 group-hover/calendar-card:opacity-25"
            style={conflictOverlayStyle}
            data-testid={`week-spanning-tile-conflict-overlay-${appointment.id}`}
          />
        ) : null}
        {footerContentPanels}
      </div>
    </div>
  );

  return (
  <>
    <div
      className={`group/calendar-card relative grid min-w-0 overflow-hidden rounded-lg border shadow-sm transition ${highlightClass} ${interactiveClass} ${isDragging ? "opacity-50" : ""}`}
      style={{
        gridTemplateColumns: `repeat(${Math.max(1, spanColumns)}, minmax(0, 1fr))`,
        gridTemplateRows: "auto 1fr",
        borderColor: highlighted ? undefined : borderColor,
        boxShadow: uniformBorderShadow,
        ...(!isCollapsedBodyMode && uniformHeightPx && uniformHeightPx > 0 ? { height: `${uniformHeightPx + WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX}px` } : {}),
        ...style,
      }}
      onDoubleClick={onDoubleClick}
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      ref={containerRef}
      aria-disabled={isLocked}
      data-testid={testId ?? `week-spanning-tile-${appointment.id}`}
    >
      <div
        className="grid rounded-b-none border-b border-white/15 text-[10px] font-semibold tracking-wide"
        style={{
          gridColumn: `1 / span ${visibleColumns}`,
          gridRow: 1,
          gridTemplateColumns: `repeat(${visibleColumns}, minmax(0, 1fr))`,
          backgroundColor: appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR,
          color: "#ffffff",
          borderColor: "rgba(255,255,255,0.18)",
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 42%), linear-gradient(180deg, rgba(0,0,0,0) 58%, rgba(0,0,0,0.18) 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(0,0,0,0.14), 0 2px 6px rgba(15,23,42,0.2)",
        }}
        data-testid={`week-spanning-tile-header-${appointment.id}`}
      >
        {headerDays.map((headerDay) => (
          <div
            key={headerDay.key}
            className="min-w-0 px-2 py-1"
            style={{
              borderLeft: headerDay.isFirst ? undefined : "1px solid rgba(255,255,255,0.16)",
            }}
          >
            <div className={`grid items-center gap-1 ${headerDay.isLast ? "grid-cols-[auto_1fr_auto_auto]" : "grid-cols-[auto_1fr_auto]"}`}>
              {headerDay.isFirst ? (
                <>
                  <span
                    className="inline-flex items-center justify-center"
                    title={visibleColumns > 1 ? "Mehrtagestermin" : hasStartTime ? "Termin mit Startzeit" : "Tagestermin"}
                  >
                    <TimingIcon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="truncate text-center">{[resolvedStartTime, headerDay.formattedDate].filter(Boolean).join(" | ")}</span>
                </>
              ) : (
                <>
                  <span />
                  <span className="truncate text-center">{headerDay.formattedDate}</span>
                </>
              )}
              <span className="shrink-0 text-right justify-self-end">{headerDay.dayLabel}</span>
              {headerDay.isLast && (
                <span className="shrink-0 flex items-center justify-center">{menuSlot}</span>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-white/20 pt-1">
              {headerDay.isFirst ? <span className="truncate">K: {resolvedCustomerNumber}</span> : <span />}
              {headerDay.isLast ? <span className="truncate text-right">PLZ: {resolvedPostalCode}</span> : <span />}
            </div>
          </div>
        ))}
      </div>
      {isFilledMode ? (
        <div
          className="flex min-h-0 h-full flex-col bg-white/90"
          style={{ gridColumn: `1 / span ${visibleColumns}`, gridRow: 2 }}
          data-testid={`week-spanning-tile-body-filled-${appointment.id}`}
        >
          {bodyContent}
        </div>
      ) : isSplitMode ? (
        <>
          {headerDays.map((headerDay, dayIndex) => (
            <div
              key={`week-spanning-tile-body-split-${appointment.id}-${headerDay.key}`}
              className="flex min-h-0 h-full flex-col bg-white/90"
              style={{
                gridColumn: `${dayIndex + 1} / span 1`,
                gridRow: 2,
                borderLeft: headerDay.isFirst ? undefined : "1px solid rgba(226,232,240,0.9)",
              }}
              data-testid={`week-spanning-tile-body-split-${appointment.id}-${dayIndex}`}
            >
              {bodyContent}
            </div>
          ))}
        </>
      ) : isCenteredMode ? (
        <div
          className="flex min-h-0 items-stretch"
          style={{ gridColumn: `1 / span ${visibleColumns}`, gridRow: 2 }}
          data-testid={`week-spanning-tile-body-centered-${appointment.id}`}
        >
          <div
            className="min-w-0 flex-1"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(148,163,184,0.20) 0 8px, rgba(148,163,184,0.07) 8px 16px)",
              backgroundColor: "rgba(241,245,249,0.45)",
            }}
            aria-hidden
          />
          <div className="flex min-h-0 h-full flex-col" style={{ width: bodyColumnWidth }}>
            {bodyContent}
          </div>
          <div
            className="min-w-0 flex-1 border-l border-slate-200/60"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(148,163,184,0.20) 0 8px, rgba(148,163,184,0.07) 8px 16px)",
              backgroundColor: "rgba(241,245,249,0.45)",
            }}
            aria-hidden
          />
        </div>
      ) : (
        <>
          <div
            className="flex min-h-0 h-full flex-col bg-white/90"
            style={{ gridColumn: "1 / span 1", gridRow: 2 }}
            data-testid={`week-spanning-tile-body-standard-${appointment.id}`}
          >
            {bodyContent}
          </div>
          <div
            className="border-l border-slate-200/60"
            style={{
              gridColumn: `${Math.min(2, spanColumns)} / span ${Math.max(1, spanColumns - 1)}`,
              gridRow: 2,
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(148,163,184,0.20) 0 8px, rgba(148,163,184,0.07) 8px 16px)",
              backgroundColor: "rgba(241,245,249,0.45)",
            }}
            aria-hidden
          />
        </>
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
