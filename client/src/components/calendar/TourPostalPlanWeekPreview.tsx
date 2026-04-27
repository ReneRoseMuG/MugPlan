import { addDays, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { buildDayGridTemplate, DEFAULT_WEEKEND_COLUMN_PERCENT, getDayWeights } from "@/lib/calendar-layout";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { getWeekAppointmentGridSpan, getWeekAppointmentGridStartColumn } from "@/lib/calendar-utils";
import { CalendarWeekAppointmentPanel } from "./CalendarWeekAppointmentPanel";
import { CalendarWeekSpanningTile } from "./CalendarWeekSpanningTile";
import { CalendarWeekTourLaneHeaderBar } from "./CalendarWeekTourLaneHeaderBar";
import { buildWeekLaneRenderData } from "./CalendarWeekView";

type TourPostalPlanWeekPreviewProps = {
  weekStartDate: string;
  weekEndDate?: string;
  isoWeek?: number;
  isoYear?: number;
  tourId: number;
  tourName: string;
  tourColor: string | null;
  appointments: CalendarAppointment[];
  onCreateAppointment: (params: { date: string; tourId: number }) => void;
  onOpenAppointment?: (appointmentId: number) => void;
};

type PreviewLane = {
  laneKey: string;
  label: string;
  color: string | null;
  tourId: number;
  dayBuckets: Array<{
    dayIndex: number;
    dateKey: string;
    appointments: number[];
  }>;
};

function buildPreviewDays(weekStartDate: string) {
  const weekStart = parseISO(weekStartDate);
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function TourPostalPlanWeekPreview({
  weekStartDate,
  weekEndDate,
  isoWeek,
  isoYear,
  tourId,
  tourName,
  tourColor,
  appointments,
  onCreateAppointment,
  onOpenAppointment,
}: TourPostalPlanWeekPreviewProps) {
  const days = buildPreviewDays(weekStartDate);
  const resolvedWeekEndDate = weekEndDate ?? format(days[6], "yyyy-MM-dd");
  const resolvedIsoWeek = isoWeek ?? Number(format(days[0], "II"));
  const resolvedIsoYear = isoYear ?? Number(format(days[0], "RRRR"));
  const appointmentsById = new Map(appointments.map((appointment) => [appointment.id, appointment]));
  const lane: PreviewLane = {
    laneKey: `tour-postal-plan-lane-${weekStartDate}-${tourId}`,
    label: tourName,
    color: tourColor,
    tourId,
    dayBuckets: days.map((day, dayIndex) => {
      const dateKey = format(day, "yyyy-MM-dd");
      const appointmentIds = appointments
        .filter((appointment) => {
          const appointmentEndDate = appointment.endDate ?? appointment.startDate;
          return dateKey >= appointment.startDate && dateKey <= appointmentEndDate;
        })
        .map((appointment) => appointment.id);

      return {
        dayIndex,
        dateKey,
        appointments: appointmentIds,
      };
    }),
  };
  const laneRenderData = buildWeekLaneRenderData(lane, appointmentsById);
  const weekDayGridTemplate = buildDayGridTemplate(getDayWeights(DEFAULT_WEEKEND_COLUMN_PERCENT));
  const tileRowCount = laneRenderData.tileRowCount;
  const needsDayCellRow = laneRenderData.needsDayCellRow;
  const laneGridRowCount = Math.max(1, tileRowCount + (needsDayCellRow ? 1 : 0));
  const laneGridTemplateRows = tileRowCount + (needsDayCellRow ? 1 : 0) > 0
    ? [
        ...Array.from({ length: tileRowCount }, () => "auto"),
        ...(needsDayCellRow ? ["auto"] : []),
      ].join(" ")
    : "auto";

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      data-testid={`tour-postal-plan-week-preview-${weekStartDate}-tour-${tourId}`}
    >
      <div className="mb-3">
        <div
          className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
          data-testid={`tour-postal-plan-week-header-${weekStartDate}-tour-${tourId}`}
        >
          <div className="text-sm font-semibold text-slate-900" data-testid={`tour-postal-plan-week-label-${weekStartDate}-tour-${tourId}`}>
            KW {resolvedIsoWeek} · {resolvedIsoYear}
          </div>
          <div className="text-xs text-slate-500" data-testid={`tour-postal-plan-week-range-${weekStartDate}-tour-${tourId}`}>
            {format(parseISO(weekStartDate), "dd.MM.yy", { locale: de })} bis {format(parseISO(resolvedWeekEndDate), "dd.MM.yy", { locale: de })}
          </div>
        </div>
      </div>

      <div className="grid rounded-md border border-slate-200/80 bg-white" style={{ gridTemplateColumns: weekDayGridTemplate }}>
        {days.map((day) => (
          <div
            key={`${weekStartDate}-${tourId}-${format(day, "yyyy-MM-dd")}`}
            className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center"
            data-testid={`tour-postal-plan-weekday-${format(day, "yyyy-MM-dd")}-tour-${tourId}`}
          >
            <div className="text-[11px] font-semibold text-slate-600">{format(day, "EEEE", { locale: de })}</div>
            <div className="text-xs font-semibold text-slate-900">{format(day, "dd.MM.yy", { locale: de })}</div>
          </div>
        ))}
      </div>

      <div className="relative mt-2">
        <CalendarWeekTourLaneHeaderBar
          label={tourName}
          color={tourColor}
          reduced
          testId={`tour-postal-plan-lane-header-${weekStartDate}-tour-${tourId}`}
        />
        <div
          className="pointer-events-none absolute inset-0 grid"
          style={{ gridTemplateColumns: weekDayGridTemplate }}
          aria-hidden
        >
          {lane.dayBuckets.map((dayBucket, dayIdx) => (
            <div
              key={`tour-postal-plan-header-divider-${tourId}-${dayBucket.dateKey}`}
              className={dayIdx === 0 ? "" : "border-l border-white/20"}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: weekDayGridTemplate }}>
          {lane.dayBuckets.map((dayBucket) => (
            <div
              key={`tour-postal-plan-header-action-${tourId}-${dayBucket.dateKey}`}
              className="pointer-events-auto relative flex h-full items-center justify-end px-1"
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCreateAppointment({ date: dayBucket.dateKey, tourId });
                }}
                className="pointer-events-auto h-4 w-4 rounded text-[11px] font-bold leading-none text-white hover:bg-white/15"
                data-testid={`button-tour-postal-plan-create-${dayBucket.dateKey}-tour-${tourId}`}
                title={`Neuer Termin am ${dayBucket.dateKey}`}
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>

      <div
        className="relative mt-1 grid divide-x divide-border/30 overflow-hidden rounded-md border border-border/30"
        style={{
          gridTemplateColumns: weekDayGridTemplate,
          gridTemplateRows: laneGridTemplateRows,
        }}
      >
        {days.map((_, dayIdx) => {
          const isWeekend = dayIdx >= 5;
          return (
            <div
              key={`tour-postal-plan-column-background-${tourId}-${dayIdx}`}
              className={isWeekend ? "bg-slate-200/45" : "bg-white/80"}
              style={{
                gridColumn: dayIdx + 1,
                gridRow: `1 / span ${laneGridRowCount}`,
              }}
              aria-hidden
            />
          );
        })}

        {laneRenderData.spanningAppointments.map(({ appointmentId, rowIndex }) => {
          const appointment = appointmentsById.get(appointmentId);
          if (!appointment) return null;

          const startColumn = getWeekAppointmentGridStartColumn(appointment, days);
          const columnSpan = getWeekAppointmentGridSpan(appointment, days);
          const visibleStartDate = format(days[Math.max(0, startColumn - 1)], "yyyy-MM-dd");
          const visibleDayNumberStart =
            Math.max(
              0,
              Math.round((parseISO(visibleStartDate).getTime() - parseISO(appointment.startDate).getTime()) / 86400000),
            ) + 1;

          return (
            <CalendarWeekSpanningTile
              key={`tour-postal-plan-spanning-${appointment.id}`}
              appointment={appointment}
              spanColumns={columnSpan}
              weekTileBodyMode="collapsed"
              visibleStartDate={visibleStartDate}
              visibleDayNumberStart={visibleDayNumberStart}
              style={{
                gridColumn: `${startColumn} / span ${columnSpan}`,
                gridRow: rowIndex + 1,
                margin: "0.35rem",
                zIndex: 10,
                alignSelf: "start",
              }}
              onDoubleClick={onOpenAppointment ? () => onOpenAppointment(appointment.id) : undefined}
              testId={`tour-postal-plan-spanning-tile-${appointment.id}`}
            />
          );
        })}

        {laneRenderData.singleDayGridItems.map(({ appointmentId, gridColumn, gridRow }) => {
          const appointment = appointmentsById.get(appointmentId);
          if (!appointment) return null;

          return (
            <div
              key={`tour-postal-plan-single-day-${appointment.id}`}
              style={{
                gridColumn,
                gridRow,
                padding: "0.35rem",
                zIndex: 10,
                alignSelf: "start",
              }}
            >
              <CalendarWeekAppointmentPanel
                appointment={appointment}
                weekTileBodyMode="collapsed"
                context="week-calendar"
                testId={`tour-postal-plan-appointment-panel-${appointment.id}`}
                onDoubleClick={onOpenAppointment ? () => onOpenAppointment(appointment.id) : undefined}
              />
            </div>
          );
        })}

        {needsDayCellRow ? lane.dayBuckets.map((dayBucket, dayIdx) => (
          <div
            key={`tour-postal-plan-overflow-${tourId}-${dayBucket.dateKey}`}
            className="space-y-1 p-1.5"
            style={{ gridColumn: dayIdx + 1, gridRow: tileRowCount + 1, zIndex: 10 }}
          >
            {laneRenderData.singleDayOverflowByBucket[dayIdx].map((appointmentId, stackIndex) => {
              const appointment = appointmentsById.get(appointmentId);
              if (!appointment) return null;

              return (
                <CalendarWeekAppointmentPanel
                  key={`tour-postal-plan-overflow-appointment-${appointment.id}-${stackIndex}`}
                  appointment={appointment}
                  weekTileBodyMode="collapsed"
                  context="week-calendar"
                  testId={`tour-postal-plan-overflow-panel-${appointment.id}`}
                  onDoubleClick={onOpenAppointment ? () => onOpenAppointment(appointment.id) : undefined}
                />
              );
            })}
          </div>
        )) : null}
      </div>
    </section>
  );
}
