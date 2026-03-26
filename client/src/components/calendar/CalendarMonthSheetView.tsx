import { useMemo, useState } from "react";
import { addDays, format, isSameDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSetting } from "@/hooks/useSettings";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
import { useCalendarAppointments, type CalendarAppointment } from "@/lib/calendar-appointments";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { buildDayGridTemplate, getDayWeights, normalizeWeekendColumnPercent } from "@/lib/calendar-layout";
import {
  compareAppointmentsByTourIndexThenTime,
  getAppointmentDurationDays,
  getAppointmentEndDate,
} from "@/lib/calendar-utils";
import { CalendarAppointmentCompactBar } from "./CalendarAppointmentCompactBar";
import {
  buildMonthSlotBarsForDay,
  buildMonthTourSlots,
  buildMonthWeekRowLayout,
  MONTH_DAY_HEADER_HEIGHT_PX,
  MONTH_SLOT_BAR_GAP_PX,
  MONTH_SLOT_BAR_HEIGHT_PX,
  MONTH_SLOT_PADDING_BOTTOM_PX,
  MONTH_SLOT_SEPARATOR_HEIGHT_PX,
  type MonthWeekRowLayout,
} from "./monthLaneState";
import { buildMonthSheetMatrix, type MonthSheetMatrix } from "./monthSheetModel";
import type { Tour } from "@shared/schema";

type CalendarMonthSheetViewProps = {
  currentDate: Date;
  employeeFilterId?: number | null;
  onNewAppointment?: (date: string, options?: { scrollLeft?: number | null }) => void;
  onOpenAppointment?: (appointmentId: number, options?: { scrollLeft?: number | null }) => void;
};

type MonthSheetRenderWeek = {
  rowLayout: MonthWeekRowLayout;
  slotTopPxByTourId: Map<number | null, number>;
  weekAppointments: CalendarAppointment[];
};

const logPrefix = "[calendar-month-sheet]";
const MONTH_SHEET_BAR_HORIZONTAL_INSET_PX = 4;
const MONTH_SLOT_BACKGROUND_ALPHA = 0.14;

function toTransparentTourColor(color: string | null | undefined, alpha: number): string {
  if (typeof color !== "string") {
    return "transparent";
  }

  const normalized = color.trim();
  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return "transparent";
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function CalendarMonthSheetView({
  currentDate,
  employeeFilterId,
  onNewAppointment,
  onOpenAppointment,
}: CalendarMonthSheetViewProps) {
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userRole = useMemo(
    () => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER",
    [],
  );
  const weekendColumnPercentSetting = useSetting("calendarWeekendColumnPercent");
  const isAdmin = userRole === "ADMIN";
  const weekendColumnPercent = normalizeWeekendColumnPercent(weekendColumnPercentSetting);
  const dayWeights = useMemo(() => getDayWeights(weekendColumnPercent), [weekendColumnPercent]);
  const dayGridTemplate = useMemo(() => buildDayGridTemplate(dayWeights), [dayWeights]);
  const monthRowTemplate = useMemo(() => `50px ${dayGridTemplate}`, [dayGridTemplate]);
  const totalDayWeight = useMemo(() => dayWeights.reduce((sum, weight) => sum + weight, 0), [dayWeights]);
  const berlinToday = getBerlinTodayDateString();

  const month = useMemo(
    () => buildMonthSheetMatrix(currentDate.getFullYear(), currentDate.getMonth() + 1),
    [currentDate],
  );
  const stripFromDate = format(month.visibleStart, "yyyy-MM-dd");
  const stripToDate = format(month.visibleEnd, "yyyy-MM-dd");

  const { data: appointments = [] } = useCalendarAppointments({
    fromDate: stripFromDate,
    toDate: stripToDate,
    employeeId: employeeFilterId ?? undefined,
    detail: "full",
    userRole,
  });
  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const appointmentsById = useMemo(
    () => new Map(appointments.map((appointment) => [appointment.id, appointment] as const)),
    [appointments],
  );
  const tourSlots = useMemo(() => buildMonthTourSlots(tours), [tours]);

  const getCurrentScrollLeft = () => null;

  const getSlotBarPosition = (startIndex: number, endIndex: number) => {
    const startWeight = dayWeights.slice(0, startIndex).reduce((sum, weight) => sum + weight, 0);
    const spanWeight = dayWeights.slice(startIndex, endIndex + 1).reduce((sum, weight) => sum + weight, 0);
    return {
      left: `calc(${(startWeight / totalDayWeight) * 100}% + ${MONTH_SHEET_BAR_HORIZONTAL_INSET_PX}px)`,
      width: `calc(${(spanWeight / totalDayWeight) * 100}% - ${MONTH_SHEET_BAR_HORIZONTAL_INSET_PX * 2}px)`,
    };
  };

  const weekData = useMemo(() => {
    const nextWeekData = new Map<string, MonthSheetRenderWeek>();

    month.weeks.forEach((week) => {
      const weekAppointments = appointments
        .filter((appointment) => {
          const start = parseISO(appointment.startDate);
          const end = parseISO(getAppointmentEndDate(appointment));
          return start <= week.weekEnd && end >= week.weekStart;
        })
        .sort(compareAppointmentsByTourIndexThenTime);
      const weekDays = week.days.map((day) => day.date);
      const rowLayout = buildMonthWeekRowLayout(weekDays, tourSlots, weekAppointments);

      let currentTopPx = MONTH_DAY_HEADER_HEIGHT_PX;
      const slotTopPxByTourId = new Map<number | null, number>();
      for (const slot of rowLayout.slots) {
        slotTopPxByTourId.set(slot.tourId, currentTopPx);
        const subRows = rowLayout.subRowCountByTourId.get(slot.tourId) ?? 1;
        currentTopPx +=
          MONTH_SLOT_SEPARATOR_HEIGHT_PX +
          subRows * MONTH_SLOT_BAR_HEIGHT_PX +
          (subRows - 1) * MONTH_SLOT_BAR_GAP_PX +
          MONTH_SLOT_PADDING_BOTTOM_PX;
      }

      nextWeekData.set(format(week.weekStart, "yyyy-MM-dd"), {
        rowLayout,
        slotTopPxByTourId,
        weekAppointments,
      });
    });

    return nextWeekData;
  }, [appointments, month, tourSlots]);

  const handleAppointmentClick = (appointmentId: number) => {
    const appointment = appointmentsById.get(appointmentId);
    if (!appointment) return;
    console.info(`${logPrefix} open appointment`, { appointmentId, scrollLeft: getCurrentScrollLeft() });
    onOpenAppointment?.(appointmentId, { scrollLeft: getCurrentScrollLeft() });
  };

  const handleDragStart = (event: React.DragEvent, appointmentId: number) => {
    setDraggedAppointmentId(appointmentId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(appointmentId));
    console.info(`${logPrefix} drag start`, { appointmentId });
  };

  const handleDragEnd = () => {
    if (draggedAppointmentId) {
      console.info(`${logPrefix} drag end`, { appointmentId: draggedAppointmentId });
    }
    setDraggedAppointmentId(null);
  };

  const persistDropMutation = async ({
    appointmentId,
    version,
    projectId,
    customerId,
    tourId,
    startDate,
    endDate,
    startTime,
    employeeIds,
  }: {
    appointmentId: number;
    version: number;
    projectId: number | null;
    customerId: number;
    tourId: number | null;
    startDate: string;
    endDate: string | null;
    startTime: string | null;
    employeeIds: number[];
  }) => {
    const response = await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version,
        projectId,
        customerId,
        tourId,
        startDate,
        endDate,
        startTime,
        employeeIds,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      if (error?.code === "VERSION_CONFLICT") {
        throw new Error("Termin wurde zwischenzeitlich geändert. Bitte neu laden.");
      }
      if (error?.code === "VALIDATION_ERROR") {
        throw new Error(error?.message ?? "Termin kann nicht verschoben werden. Bitte neu laden.");
      }
      throw new Error(error?.message ?? "Termin konnte nicht verschoben werden");
    }

    await queryClient.invalidateQueries({
      queryKey: ["calendarAppointments"],
    });
    await refreshMonitoringWithNotification(toast);
    console.info(`${logPrefix} drop success`, { appointmentId });
    return true;
  };

  const handleDrop = async (event: React.DragEvent, targetDate: Date, targetTourId?: number | null) => {
    event.preventDefault();
    const appointmentId = Number(event.dataTransfer.getData("text/plain"));
    if (!appointmentId) return;

    const appointment = appointmentsById.get(appointmentId);
    if (!appointment) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentStart = parseISO(appointment.startDate);

    if (appointmentStart < today) {
      toast({
        title: "Verschieben nicht erlaubt",
        description: "Vergangene Termine können nicht per Drag & Drop verschoben werden.",
        variant: "destructive",
      });
      setDraggedAppointmentId(null);
      return;
    }

    if (targetDate < today) {
      toast({
        title: "Verschieben nicht erlaubt",
        description: "Ein Termin kann nicht in die Vergangenheit verschoben werden.",
        variant: "destructive",
      });
      setDraggedAppointmentId(null);
      return;
    }

    if (appointment.isCancelled) {
      toast({
        title: "Termin ist storniert",
        description: "Stornierte Termine können nicht verschoben werden.",
        variant: "destructive",
      });
      setDraggedAppointmentId(null);
      return;
    }

    if (appointment.isLocked && !isAdmin) {
      toast({
        title: "Termin ist gesperrt",
        description: "Nur Admins dürfen vergangene Termine ändern.",
        variant: "destructive",
      });
      return;
    }

    const durationDays = getAppointmentDurationDays(appointment);
    const newStartDate = format(targetDate, "yyyy-MM-dd");
    const newEndDate = durationDays > 0 ? format(addDays(targetDate, durationDays), "yyyy-MM-dd") : null;

    try {
      await persistDropMutation({
        appointmentId,
        version: appointment.version,
        projectId: appointment.projectId,
        customerId: appointment.customer.id,
        tourId: targetTourId !== undefined ? targetTourId : appointment.tourId ?? null,
        startDate: newStartDate,
        endDate: newEndDate,
        startTime: appointment.startTime ?? null,
        employeeIds: appointment.employees.map((employee) => employee.id),
      });
    } catch (err) {
      console.error(`${logPrefix} drop error`, err);
      toast({
        title: "Fehler beim Verschieben",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setDraggedAppointmentId(null);
    }
  };

  const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-white shadow-sm">
      <div
        className="flex-1 min-h-0"
        data-testid="month-sheet-container"
      >
        <MonthSheetSection
          month={month}
          weekData={weekData}
          monthRowTemplate={monthRowTemplate}
          dayGridTemplate={dayGridTemplate}
          appointmentsById={appointmentsById}
          berlinToday={berlinToday}
          isAdmin={isAdmin}
          draggedAppointmentId={draggedAppointmentId}
          getSlotBarPosition={getSlotBarPosition}
          onDrop={handleDrop}
          onNewAppointment={(dateKey) => onNewAppointment?.(dateKey, { scrollLeft: getCurrentScrollLeft() })}
          onAppointmentClick={handleAppointmentClick}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          weekDays={weekDays}
        />
      </div>
    </div>
  );
}

function MonthSheetSection({
  month,
  weekData,
  monthRowTemplate,
  dayGridTemplate,
  appointmentsById,
  berlinToday,
  isAdmin,
  draggedAppointmentId,
  getSlotBarPosition,
  onDrop,
  onNewAppointment,
  onAppointmentClick,
  onDragStart,
  onDragEnd,
  weekDays,
}: {
  month: MonthSheetMatrix;
  weekData: Map<string, MonthSheetRenderWeek>;
  monthRowTemplate: string;
  dayGridTemplate: string;
  appointmentsById: Map<number, CalendarAppointment>;
  berlinToday: string;
  isAdmin: boolean;
  draggedAppointmentId: number | null;
  getSlotBarPosition: (startIndex: number, endIndex: number) => { left: string; width: string };
  onDrop: (event: React.DragEvent, targetDate: Date, targetTourId?: number | null) => Promise<void>;
  onNewAppointment: (dateKey: string) => void;
  onAppointmentClick: (appointmentId: number) => void;
  onDragStart: (event: React.DragEvent, appointmentId: number) => void;
  onDragEnd: () => void;
  weekDays: string[];
}) {
  return (
    <section
      className="h-full min-w-full w-full border-r border-border/30 last:border-r-0"
      data-testid={`month-sheet-${month.monthKey}`}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-border/40 bg-muted/20 px-6 py-3">
          <span className="text-sm font-semibold tracking-wide text-primary" data-testid={`month-sheet-title-${month.monthKey}`}>
            {format(month.monthStart, "MMMM yyyy", { locale: de })}
          </span>
        </div>

        <div className="grid border-b border-border/40 bg-muted/30" style={{ gridTemplateColumns: monthRowTemplate }}>
          <div className="border-r border-border/30 py-4 text-center text-sm font-semibold tracking-wider text-muted-foreground">
            KW
          </div>
          {weekDays.map((day, dayIdx) => (
            <div
              key={`${month.monthKey}-${day}`}
              className={`py-4 text-center text-sm font-semibold tracking-wider text-muted-foreground ${dayIdx >= 5 ? "bg-slate-200/70" : ""}`}
            >
              {day}
            </div>
          ))}
        </div>

        <div
          className="flex-1 grid overflow-y-auto overflow-x-hidden"
          data-testid={`month-sheet-weeks-scroll-${month.monthKey}`}
          style={{
            gridTemplateRows: month.weeks
              .map((week) => `${(weekData.get(format(week.weekStart, "yyyy-MM-dd"))?.rowLayout.rowHeightPx ?? MONTH_DAY_HEADER_HEIGHT_PX)}px`)
              .join(" "),
          }}
        >
          {month.weeks.map((week, weekIdx) => {
            const weekKey = format(week.weekStart, "yyyy-MM-dd");
            const renderData = weekData.get(weekKey);
            if (!renderData) {
              return null;
            }

            return (
              <div
                key={`${month.monthKey}-${weekIdx}`}
                className="relative grid h-full min-h-0"
                style={{ gridTemplateColumns: monthRowTemplate }}
              >
                <div
                  className="flex h-full min-h-0 items-center justify-center border-r border-b border-border/30 bg-muted/20 text-sm font-bold text-primary"
                  data-testid={`month-sheet-week-number-${month.monthKey}-${weekKey}`}
                >
                  {week.weekNumber}
                </div>
                <div className="relative col-span-7 grid h-full min-h-0" style={{ gridTemplateColumns: dayGridTemplate }}>
                  {week.days.map((day, dayIdx) => {
                    const isWeekend = dayIdx >= 5;
                    const dayCellClassName = !day.isCurrentMonth
                      ? isWeekend
                        ? "bg-slate-300/15 text-muted-foreground/30"
                        : "bg-slate-200/20 text-muted-foreground/30"
                      : isWeekend
                        ? "bg-slate-200/40 text-foreground hover:bg-slate-200/60"
                        : "bg-white text-foreground hover:bg-slate-50";
                    const dayHeaderClassName = day.isToday
                      ? "bg-primary/10"
                      : day.isCurrentMonth
                        ? isWeekend
                          ? "bg-slate-300/35"
                          : "bg-slate-100/90"
                        : isWeekend
                          ? "bg-slate-300/10"
                          : "bg-slate-200/20";
                    const dayNumberClassName = day.isToday
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : day.isCurrentMonth
                        ? "text-foreground/70"
                        : "text-muted-foreground/45";
                    const newAppointmentButtonClassName = day.isCurrentMonth
                      ? "flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-primary/10 hover:text-primary"
                      : "flex h-5 w-5 items-center justify-center rounded text-muted-foreground/25 transition-colors hover:bg-muted/20 hover:text-muted-foreground/40";

                    return (
                      <div
                        key={day.dateKey}
                        className={`
                          relative h-full min-h-0 border-r border-b border-border/30 px-1
                          transition-colors duration-200
                          ${dayCellClassName}
                          ${dayIdx === 6 ? "border-r-0" : ""}
                        `}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          void onDrop(event, day.date);
                        }}
                        data-testid={`month-sheet-day-${day.dateKey}`}
                        data-month-scope={day.isCurrentMonth ? "current" : "adjacent"}
                      >
                        <div
                          style={{ height: `${MONTH_DAY_HEADER_HEIGHT_PX}px` }}
                          className={`flex items-center justify-between rounded-md px-1.5 ${dayHeaderClassName}`}
                        >
                          <span
                            className={`
                              flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                              ${dayNumberClassName}
                            `}
                          >
                            {format(day.date, "d")}
                          </span>
                          {day.dateKey >= berlinToday ? (
                            <button
                              onClick={() => onNewAppointment(day.dateKey)}
                              className={newAppointmentButtonClassName}
                              data-testid={`button-new-appointment-month-sheet-${day.dateKey}`}
                            >
                              <span className="text-sm font-bold">+</span>
                            </button>
                          ) : (
                            <span className="h-5 w-5" aria-hidden="true" />
                          )}
                        </div>

                        <div className="flex w-full flex-col">
                          {renderData.rowLayout.slots.map((slot) => {
                            const subRows = renderData.rowLayout.subRowCountByTourId.get(slot.tourId) ?? 1;
                            const slotHeightPx =
                              MONTH_SLOT_SEPARATOR_HEIGHT_PX +
                              subRows * MONTH_SLOT_BAR_HEIGHT_PX +
                              (subRows - 1) * MONTH_SLOT_BAR_GAP_PX +
                              MONTH_SLOT_PADDING_BOTTOM_PX;

                            return (
                              <div
                                key={slot.tourId ?? "unassigned"}
                                style={{
                                  height: `${slotHeightPx}px`,
                                  backgroundColor: toTransparentTourColor(
                                    slot.color,
                                    day.isCurrentMonth ? MONTH_SLOT_BACKGROUND_ALPHA : MONTH_SLOT_BACKGROUND_ALPHA * 0.35,
                                  ),
                                }}
                                className="relative w-full"
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => {
                                  event.stopPropagation();
                                  void onDrop(event, day.date, slot.tourId);
                                }}
                              >
                                <div style={{ height: `${MONTH_SLOT_SEPARATOR_HEIGHT_PX}px` }} className="w-full" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="pointer-events-none absolute inset-x-1 bottom-0 top-0">
                    {renderData.rowLayout.slots.map((slot) => {
                      const slotTopPx = renderData.slotTopPxByTourId.get(slot.tourId);
                      if (typeof slotTopPx !== "number") {
                        return null;
                      }

                      const bars = week.days.flatMap((_, dayIdx) =>
                        buildMonthSlotBarsForDay(
                          dayIdx,
                          slot,
                          week.days.map((day) => day.date),
                          renderData.weekAppointments,
                        ).filter((bar) => bar.startDayIndex === dayIdx),
                      );

                      return bars.map((bar) => {
                        const appointment = appointmentsById.get(bar.appointmentId);
                        if (!appointment) {
                          return null;
                        }

                        const appointmentStart = parseISO(appointment.startDate);
                        const appointmentEnd = parseISO(getAppointmentEndDate(appointment));
                        const segmentStart = addDays(week.weekStart, bar.startDayIndex);
                        const segmentEnd = addDays(week.weekStart, bar.endDayIndex);
                        const topPx =
                          slotTopPx +
                          MONTH_SLOT_SEPARATOR_HEIGHT_PX +
                          bar.subRowIndex * (MONTH_SLOT_BAR_HEIGHT_PX + MONTH_SLOT_BAR_GAP_PX);
                        const position = getSlotBarPosition(bar.startDayIndex, bar.endDayIndex);
                        const isLocked = appointment.isCancelled || (appointment.isLocked && !isAdmin);
                        const isHistoricalSource = appointment.startDate < berlinToday;
                        const canDrag = !isLocked && !isHistoricalSource;

                        return (
                          <div
                            key={`${month.monthKey}-${weekKey}-${slot.tourId ?? "unassigned"}-${appointment.id}-${bar.startDayIndex}-${bar.endDayIndex}`}
                            className="pointer-events-auto absolute px-0.5"
                            style={{
                              ...position,
                              top: `${topPx}px`,
                              height: `${MONTH_SLOT_BAR_HEIGHT_PX}px`,
                            }}
                          >
                            <CalendarAppointmentCompactBar
                              appointment={appointment}
                              isFirstDay={isSameDay(segmentStart, appointmentStart)}
                              isLastDay={isSameDay(segmentEnd, appointmentEnd)}
                              hideOrderNumber={true}
                              showPopover={true}
                              isLocked={isLocked}
                              isDragging={draggedAppointmentId === appointment.id}
                              onDoubleClick={() => onAppointmentClick(appointment.id)}
                              onDragStart={canDrag ? (event) => onDragStart(event, appointment.id) : undefined}
                              onDragEnd={canDrag ? onDragEnd : undefined}
                            />
                          </div>
                        );
                      });
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
