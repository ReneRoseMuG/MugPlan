import type { CSSProperties, DragEvent } from "react";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { CALENDAR_NEUTRAL_COLOR } from "@/lib/calendar-utils";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { mergeUniqueTags } from "@/lib/tag-utils";
import { CalendarWeekAppointmentPanelCustomer } from "./CalendarWeekAppointmentPanelCustomer";
import { CalendarWeekAppointmentEmployeesHover } from "./CalendarWeekAppointmentEmployeesHover";
import { CalendarWeekAppointmentAttachmentsHover } from "./CalendarWeekAppointmentAttachmentsHover";
import { CalendarWeekAppointmentNotesHover } from "./CalendarWeekAppointmentNotesHover";
import { CalendarWeekAppointmentPanelProject } from "./CalendarWeekAppointmentPanelProject";
import { CalendarDays, CalendarRange, Clock3 } from "lucide-react";
import {
  getWeekAppointmentFooterStyle,
  WEEK_APPOINTMENT_CARD_FOOTER_SAFE_SPACE_PX,
} from "./weekAppointmentCardStyles";

export const WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX = WEEK_APPOINTMENT_CARD_FOOTER_SAFE_SPACE_PX;

type CalendarWeekSpanningTileProps = {
  appointment: CalendarAppointment;
  spanColumns: number;
  displayMode: "standard" | "compact" | "detail" | "split";
  visibleStartDate: string;
  visibleDayNumberStart: number;
  uniformHeightPx?: number | null;
  projectStatusAreaHeightPx?: number | null;
  projectStatusAreaRef?: React.Ref<HTMLDivElement>;
  containerRef?: React.Ref<HTMLDivElement>;
  style?: CSSProperties;
  isDragging?: boolean;
  isLocked?: boolean;
  highlighted?: boolean;
  isConflict?: boolean;
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
  visibleStartDate,
  visibleDayNumberStart,
  uniformHeightPx,
  projectStatusAreaHeightPx: _projectStatusAreaHeightPx,
  projectStatusAreaRef: _projectStatusAreaRef,
  containerRef,
  style,
  isDragging,
  isLocked,
  highlighted = false,
  isConflict = false,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onMouseEnter,
  onMouseLeave,
  testId,
}: CalendarWeekSpanningTileProps) {
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
  const mergedTags = mergeUniqueTags(
    appointment.appointmentTags,
    appointment.customerTags,
    appointment.projectTags,
  );
  const footerStyle = getWeekAppointmentFooterStyle(appointment.tourColor);

  const mainContentPanels = (
    <>
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
        enableFullDescriptionPreview
      />
    </>
  );

  const footerContentPanels = (
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
      <EntityTagFooterRow tags={mergedTags} testId={`week-spanning-tile-tags-${appointment.id}`} />
    </div>
  );

  const bodyContent = (
    <div className="flex h-full min-h-0 flex-col bg-white/90">
      <div className="relative min-h-0 flex-1 px-1 pt-1" data-testid={`week-spanning-tile-content-${appointment.id}`}>
        {isConflict ? (
          <div
            className="pointer-events-none absolute inset-0 rounded-sm bg-[repeating-linear-gradient(135deg,rgba(226,75,74,0.26)_0_10px,rgba(226,75,74,0.08)_10px_20px)] opacity-100 transition-opacity duration-200 group-hover/calendar-card:opacity-25"
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
            className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(226,75,74,0.26)_0_10px,rgba(226,75,74,0.08)_10px_20px)] opacity-100 transition-opacity duration-200 group-hover/calendar-card:opacity-25"
            data-testid={`week-spanning-tile-conflict-overlay-${appointment.id}`}
          />
        ) : null}
        {footerContentPanels}
      </div>
    </div>
  );

  return (
    <div
      className={`group/calendar-card relative grid min-w-0 overflow-hidden rounded-lg border shadow-sm transition ${highlightClass} ${interactiveClass} ${isDragging ? "opacity-50" : ""}`}
      style={{
        gridTemplateColumns: `repeat(${Math.max(1, spanColumns)}, minmax(0, 1fr))`,
        gridTemplateRows: "auto 1fr",
        borderColor: highlighted ? undefined : borderColor,
        boxShadow: uniformBorderShadow,
        ...(uniformHeightPx && uniformHeightPx > 0 ? { height: `${uniformHeightPx + WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX}px` } : {}),
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
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
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
          className="min-h-0 bg-white/90"
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
              className="min-h-0 bg-white/90"
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
          <div className="min-h-0" style={{ width: bodyColumnWidth }}>
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
            className="min-h-0"
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
  );
}
