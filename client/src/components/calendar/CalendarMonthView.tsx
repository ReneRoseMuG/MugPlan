import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
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
import type { CalendarNavCommand } from "@/pages/Home";
import type { Tour } from "@shared/schema";

type CalendarMonthViewProps = {
  currentDate: Date;
  employeeFilterId?: number | null;
  navCommand?: CalendarNavCommand;
  onVisibleDateChange?: (date: Date) => void;
  onNewAppointment?: (date: string) => void;
  onOpenAppointment?: (appointmentId: number) => void;
};

type MonthRenderWeek = {
  days: Date[];
  weekAppointments: CalendarAppointment[];
  rowLayout: MonthWeekRowLayout;
  slotTopPxByTourId: Map<number | null, number>;
};

type MonthRenderData = {
  monthStart: Date;
  weeks: MonthRenderWeek[];
};

const logPrefix = "[calendar-month]";
const MONTH_SLOT_BAR_HORIZONTAL_INSET_PX = 4;
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

export function CalendarMonthView({
  currentDate,
  employeeFilterId,
  navCommand: _navCommand,
  onVisibleDateChange: _onVisibleDateChange,
  onNewAppointment,
  onOpenAppointment,
}: CalendarMonthViewProps) {
  // FIX-RULE:
  // Navigation/Sync-Signale werden absichtlich nicht verarbeitet.
  // Zeitraumwechsel darf nur explizit über Home-Buttons und currentDate erfolgen.
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userRole = useMemo(
    () => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER",
    [],
  );
  const weekendColumnPercentSetting = useSetting("calendarWeekendColumnPercent");
  const monthScrollRangeSetting = useSetting("calendarMonthScrollRange");
  const isAdmin = userRole === "ADMIN";
  const weekendColumnPercent = normalizeWeekendColumnPercent(weekendColumnPercentSetting);
  const extraMonthCount =
    typeof monthScrollRangeSetting === "number" &&
    Number.isInteger(monthScrollRangeSetting) &&
    monthScrollRangeSetting >= 0
      ? Math.min(monthScrollRangeSetting, 12)
      : 3;

  const dayWeights = useMemo(() => getDayWeights(weekendColumnPercent), [weekendColumnPercent]);
  const dayGridTemplate = useMemo(() => buildDayGridTemplate(dayWeights), [dayWeights]);
  const monthRowTemplate = useMemo(() => `50px ${dayGridTemplate}`, [dayGridTemplate]);
  const totalDayWeight = useMemo(() => dayWeights.reduce((sum, weight) => sum + weight, 0), [dayWeights]);
  const berlinToday = getBerlinTodayDateString();

  const baseMonthStart = startOfMonth(currentDate);
  const scrollResetKey = format(baseMonthStart, "yyyy-MM-dd");
  const monthStarts = useMemo(
    () => Array.from({ length: extraMonthCount + 1 }, (_, index) => startOfMonth(addMonths(baseMonthStart, index))),
    [baseMonthStart, extraMonthCount],
  );

  const stripFromDate = format(startOfWeek(monthStarts[0], { weekStartsOn: 1, locale: de }), "yyyy-MM-dd");
  const stripToDate = format(
    endOfWeek(endOfMonth(monthStarts[monthStarts.length - 1]), { weekStartsOn: 1, locale: de }),
    "yyyy-MM-dd",
  );

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

  const getSlotBarPosition = (startIndex: number, endIndex: number) => {
    const startWeight = dayWeights.slice(0, startIndex).reduce((sum, weight) => sum + weight, 0);
    const spanWeight = dayWeights.slice(startIndex, endIndex + 1).reduce((sum, weight) => sum + weight, 0);
    return {
      left: `calc(${(startWeight / totalDayWeight) * 100}% + ${MONTH_SLOT_BAR_HORIZONTAL_INSET_PX}px)`,
      width: `calc(${(spanWeight / totalDayWeight) * 100}% - ${MONTH_SLOT_BAR_HORIZONTAL_INSET_PX * 2}px)`,
    };
  };

  const months = useMemo<MonthRenderData[]>(() => {
    return monthStarts.map((monthStart) => {
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1, locale: de });
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 1, locale: de });

      const days: Date[] = [];
      let cursor = startDate;
      while (cursor <= endDate) {
        days.push(cursor);
        cursor = addDays(cursor, 1);
      }

      const weeks: MonthRenderWeek[] = [];
      for (let dayIndex = 0; dayIndex < days.length; dayIndex += 7) {
        const weekDays = days.slice(dayIndex, dayIndex + 7);
        const weekStart = weekDays[0];
        const weekEnd = weekDays[6];
        const weekAppointments = appointments
          .filter((appointment) => {
            const start = parseISO(appointment.startDate);
            const end = parseISO(getAppointmentEndDate(appointment));
            return start <= weekEnd && end >= weekStart;
          })
          .sort(compareAppointmentsByTourIndexThenTime);
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

        weeks.push({
          days: weekDays,
          weekAppointments,
          rowLayout,
          slotTopPxByTourId,
        });
      }

      return {
        monthStart,
        weeks,
      };
    });
  }, [appointments, monthStarts, tourSlots]);

  const handleAppointmentClick = (appointmentId: number) => {
    const appointment = appointmentsById.get(appointmentId);
    if (!appointment) return;
    console.info(`${logPrefix} open appointment`, { appointmentId });
    onOpenAppointment?.(appointmentId);
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
      console.info(`${logPrefix} drop blocked: past source`, { appointmentId, startDate: appointment.startDate });
      toast({
        title: "Verschieben nicht erlaubt",
        description: "Vergangene Termine können nicht per Drag & Drop verschoben werden.",
        variant: "destructive",
      });
      setDraggedAppointmentId(null);
      return;
    }

    if (targetDate < today) {
      console.info(`${logPrefix} drop blocked: past target`, {
        appointmentId,
        targetDate: format(targetDate, "yyyy-MM-dd"),
      });
      toast({
        title: "Verschieben nicht erlaubt",
        description: "Ein Termin kann nicht in die Vergangenheit verschoben werden.",
        variant: "destructive",
      });
      setDraggedAppointmentId(null);
      return;
    }

    if (appointment.isCancelled) {
      console.info(`${logPrefix} drop blocked: cancelled appointment`, { appointmentId });
      toast({
        title: "Termin ist storniert",
        description: "Stornierte Termine können nicht verschoben werden.",
        variant: "destructive",
      });
      setDraggedAppointmentId(null);
      return;
    }

    if (appointment.isLocked && !isAdmin) {
      console.info(`${logPrefix} drop blocked`, { appointmentId });
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

    console.info(`${logPrefix} drop`, {
      appointmentId,
      fromDate: appointment.startDate,
      toDate: newStartDate,
      durationDays,
      targetTourId: targetTourId ?? null,
    });

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
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-primary">{format(baseMonthStart, "MMMM yyyy", { locale: de })}</span>
        </div>
      </div>

      {/* FIX-RULE:
       * Scroll ist bewusst passiv.
       * Keine State-Änderungen, keine Navigation, keine Layout-Korrektur erlaubt.
       * Jede Kopplung von Scroll und Datum ist hier ausdrücklich verboten.
       */}
      {/* FIX-RULE:
       * Navigation (Vor/Zurück) ändert currentDate in Home.
       * Der key setzt den Scrollcontainer deterministisch neu auf den linken Rand (0),
       * ohne Scrollwerte zu lesen oder zu speichern.
       */}
      <div key={scrollResetKey} className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full">
          {months.map(({ monthStart, weeks }) => {
            const monthKey = format(monthStart, "yyyy-MM-dd");
            return (
              <section
                key={monthKey}
                className="h-full min-w-full w-full border-r border-border/30 last:border-r-0"
              >
                <div className="flex h-full flex-col">
                  <div className="grid border-b border-border/40 bg-muted/30" style={{ gridTemplateColumns: monthRowTemplate }}>
                    <div className="border-r border-border/30 py-4 text-center text-sm font-semibold tracking-wider text-muted-foreground">
                      KW
                    </div>
                    {weekDays.map((day, dayIdx) => (
                      <div
                        key={`${monthKey}-${day}`}
                        className={`py-4 text-center text-sm font-semibold tracking-wider text-muted-foreground ${dayIdx >= 5 ? "bg-slate-200/70" : ""}`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div
                    className="flex-1 grid overflow-hidden"
                    style={{
                      gridTemplateRows: weeks.map((week) => `${week.rowLayout.rowHeightPx}px`).join(" "),
                    }}
                  >
                    {weeks.map(({ days, weekAppointments, rowLayout, slotTopPxByTourId }, weekIdx) => {
                      const weekStart = days[0];

                      return (
                        <div
                          key={`${monthKey}-${weekIdx}`}
                          className="relative grid h-full min-h-0"
                          style={{ gridTemplateColumns: monthRowTemplate }}
                        >
                          <div className="flex h-full min-h-0 items-center justify-center border-r border-b border-border/30 bg-muted/20 text-sm font-bold text-primary">
                            {getISOWeek(weekStart)}
                          </div>
                          <div className="relative col-span-7 grid h-full min-h-0" style={{ gridTemplateColumns: dayGridTemplate }}>
                            {days.map((day, dayIdx) => {
                              const isCurrentMonth = isSameMonth(day, monthStart);
                              const isTodayDate = isToday(day);
                              const isWeekend = dayIdx >= 5;
                              const dayKey = format(day, "yyyy-MM-dd");

                              return (
                                <div
                                  key={dayKey}
                                  className={`
                                    relative h-full min-h-0 border-r border-b border-border/30 px-1
                                    transition-colors duration-200
                                    ${!isCurrentMonth ? (isWeekend ? "bg-slate-300/30 text-muted-foreground/40" : "bg-muted/10 text-muted-foreground/40") : isWeekend ? "bg-slate-200/40 text-foreground hover:bg-slate-200/60" : "bg-white text-foreground hover:bg-slate-50"}
                                    ${dayIdx === 6 ? "border-r-0" : ""}
                                  `}
                                  onDragOver={(event) => event.preventDefault()}
                                  onDrop={(event) => {
                                    void handleDrop(event, day);
                                  }}
                                  data-testid={`calendar-day-${dayKey}`}
                                >
                                  <div
                                    style={{ height: `${MONTH_DAY_HEADER_HEIGHT_PX}px` }}
                                    className={`flex items-center justify-between rounded-md px-1.5 ${
                                      isTodayDate
                                        ? "bg-primary/10"
                                        : isCurrentMonth
                                          ? isWeekend
                                            ? "bg-slate-300/35"
                                            : "bg-slate-100/90"
                                          : isWeekend
                                            ? "bg-slate-300/20"
                                            : "bg-muted/30"
                                    }`}
                                  >
                                    <span
                                      className={`
                                        flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                                        ${isTodayDate ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-foreground/70"}
                                      `}
                                    >
                                      {format(day, "d")}
                                    </span>
                                    {dayKey >= berlinToday ? (
                                      <button
                                        onClick={() => onNewAppointment?.(dayKey)}
                                        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-primary/10 hover:text-primary"
                                        data-testid={`button-new-appointment-${dayKey}`}
                                      >
                                        <span className="text-sm font-bold">+</span>
                                      </button>
                                    ) : (
                                      <span className="h-5 w-5" aria-hidden="true" />
                                    )}
                                  </div>

                                  <div className="flex w-full flex-col">
                                    {rowLayout.slots.map((slot) => {
                                      const subRows = rowLayout.subRowCountByTourId.get(slot.tourId) ?? 1;
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
                                            backgroundColor: toTransparentTourColor(slot.color, MONTH_SLOT_BACKGROUND_ALPHA),
                                          }}
                                          className="relative w-full"
                                          onDragOver={(event) => event.preventDefault()}
                                          onDrop={(event) => {
                                            event.stopPropagation();
                                            void handleDrop(event, day, slot.tourId);
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
                              {rowLayout.slots.map((slot) => {
                                const slotTopPx = slotTopPxByTourId.get(slot.tourId);
                                if (typeof slotTopPx !== "number") {
                                  return null;
                                }

                                const bars = days.flatMap((_, dayIdx) =>
                                  buildMonthSlotBarsForDay(dayIdx, slot, days, weekAppointments).filter(
                                    (bar) => bar.startDayIndex === dayIdx,
                                  ),
                                );

                                return bars.map((bar) => {
                                  const appointment = appointmentsById.get(bar.appointmentId);
                                  if (!appointment) {
                                    return null;
                                  }

                                  const appointmentStart = parseISO(appointment.startDate);
                                  const appointmentEnd = parseISO(getAppointmentEndDate(appointment));
                                  const segmentStart = addDays(weekStart, bar.startDayIndex);
                                  const segmentEnd = addDays(weekStart, bar.endDayIndex);
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
                                      key={`${monthKey}-${weekIdx}-${slot.tourId ?? "unassigned"}-${appointment.id}-${bar.startDayIndex}-${bar.endDayIndex}`}
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
                                        onDoubleClick={() => handleAppointmentClick(appointment.id)}
                                        onDragStart={canDrag ? (event) => handleDragStart(event, appointment.id) : undefined}
                                        onDragEnd={canDrag ? handleDragEnd : undefined}
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
          })}
        </div>
      </div>
    </div>
  );
}
