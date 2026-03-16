import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
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
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSetting } from "@/hooks/useSettings";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
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
import { useCalendarAppointments } from "@/lib/calendar-appointments";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import {
  buildDayGridTemplate,
  getDayWeights,
  normalizeWeekendColumnPercent,
} from "@/lib/calendar-layout";
import {
  compareAppointmentsByTourIndexThenTime,
  getAppointmentDurationDays,
  getAppointmentEndDate,
} from "@/lib/calendar-utils";
import { CalendarAppointmentCompactBar } from "./CalendarAppointmentCompactBar";
import type { CalendarNavCommand } from "@/pages/Home";

type CalendarMonthViewProps = {
  currentDate: Date;
  employeeFilterId?: number | null;
  navCommand?: CalendarNavCommand;
  onVisibleDateChange?: (date: Date) => void;
  onNewAppointment?: (date: string) => void;
  onOpenAppointment?: (appointmentId: number) => void;
};

type MonthRenderData = {
  monthStart: Date;
  weeks: Date[][];
};

type WeekLaneItem = {
  appointmentId: number;
  startIndex: number;
  endIndex: number;
};

const logPrefix = "[calendar-month]";
const MONTH_LANE_BAR_HORIZONTAL_INSET_PX = 4;

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
  const [availabilityConfirmOpen, setAvailabilityConfirmOpen] = useState(false);
  const [pendingAvailabilityDrop, setPendingAvailabilityDrop] = useState<{
    appointmentId: number;
    targetDate: string;
    targetEndDate: string | null;
    conflicts: Array<{ id: number; fullName: string; reason: "absence" | "exit_date" }>;
  } | null>(null);
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
    typeof monthScrollRangeSetting === "number" && Number.isInteger(monthScrollRangeSetting) && monthScrollRangeSetting >= 0
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

  const appointmentsById = useMemo(
    () => new Map(appointments.map((appointment) => [appointment.id, appointment] as const)),
    [appointments],
  );

  const getLaneItemPosition = (startIndex: number, endIndex: number) => {
    const startWeight = dayWeights.slice(0, startIndex).reduce((sum, weight) => sum + weight, 0);
    const spanWeight = dayWeights.slice(startIndex, endIndex + 1).reduce((sum, weight) => sum + weight, 0);
    return {
      left: `calc(${(startWeight / totalDayWeight) * 100}% + ${MONTH_LANE_BAR_HORIZONTAL_INSET_PX}px)`,
      width: `calc(${(spanWeight / totalDayWeight) * 100}% - ${MONTH_LANE_BAR_HORIZONTAL_INSET_PX * 2}px)`,
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

      const weeks: Date[][] = [];
      for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
      }

      return {
        monthStart,
        weeks,
      };
    });
  }, [appointments, monthStarts]);

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
    confirmAvailabilityAdjustments,
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
    confirmAvailabilityAdjustments: boolean;
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
        confirmAvailabilityAdjustments,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      if (error?.code === "VERSION_CONFLICT") {
        throw new Error("Termin wurde zwischenzeitlich geaendert. Bitte neu laden.");
      }
      if (error?.code === "VALIDATION_ERROR") {
        throw new Error(error?.message ?? "Termin kann nicht verschoben werden. Bitte neu laden.");
      }
      if (error?.code === "AVAILABILITY_CONFIRMATION_REQUIRED") {
        setPendingAvailabilityDrop({
          appointmentId,
          targetDate: startDate,
          targetEndDate: endDate,
          conflicts: Array.isArray(error?.availabilityConflicts) ? error.availabilityConflicts : [],
        });
        return false;
      }
      throw new Error(error?.message ?? "Termin konnte nicht verschoben werden");
    }

    await queryClient.invalidateQueries({
      queryKey: ["calendarAppointments"],
    });
    await refreshMonitoringWithNotification(toast);
    console.info(`${logPrefix} drop success`, { appointmentId });
    setPendingAvailabilityDrop(null);
    setAvailabilityConfirmOpen(false);
    return true;
  };

  const handleDrop = async (event: React.DragEvent, targetDate: Date) => {
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
      console.info(`${logPrefix} drop blocked: past target`, { appointmentId, targetDate: format(targetDate, "yyyy-MM-dd") });
      toast({
        title: "Verschieben nicht erlaubt",
        description: "Ein Termin kann nicht in die Vergangenheit verschoben werden.",
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
    });

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: appointment.version,
          projectId: appointment.projectId,
          customerId: appointment.customer.id,
          tourId: appointment.tourId ?? null,
          startDate: newStartDate,
          endDate: newEndDate,
          startTime: appointment.startTime ?? null,
          employeeIds: appointment.employees.map((employee) => employee.id),
          confirmAvailabilityAdjustments: false,
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
        if (error?.code === "AVAILABILITY_CONFIRMATION_REQUIRED") {
          setPendingAvailabilityDrop({
            appointmentId,
            targetDate: newStartDate,
            targetEndDate: newEndDate,
            conflicts: Array.isArray(error?.availabilityConflicts) ? error.availabilityConflicts : [],
          });
          setAvailabilityConfirmOpen(true);
          return;
        }
        throw new Error(error?.message ?? "Termin konnte nicht verschoben werden");
      }

      await queryClient.invalidateQueries({
        queryKey: ["calendarAppointments"],
      });
      await refreshMonitoringWithNotification(toast);
      console.info(`${logPrefix} drop success`, { appointmentId });
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
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-primary">{format(baseMonthStart, "MMMM yyyy", { locale: de })}</span>
        </div>
      </div>

      <AlertDialog
        open={availabilityConfirmOpen}
        onOpenChange={(open) => {
          setAvailabilityConfirmOpen(open);
          if (!open) {
            setPendingAvailabilityDrop(null);
          }
        }}
      >
        <AlertDialogContent data-testid="dialog-calendar-month-availability-conflicts">
          <AlertDialogHeader>
            <AlertDialogTitle>Verschiebung mit Personalaenderung bestaetigen?</AlertDialogTitle>
            <AlertDialogDescription>
              Am Zieldatum sind nicht alle aktuell zugewiesenen Mitarbeiter verfuegbar. Erst nach Ihrer ausdruecklichen
              Bestaetigung wird der Termin verschoben und die betroffenen Mitarbeiter werden entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 text-sm">
            {pendingAvailabilityDrop?.conflicts.map((employee) => (
              <div key={employee.id} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                <span className="font-medium">{employee.fullName}</span>
                <span className="ml-2 text-muted-foreground">
                  {employee.reason === "absence" ? "Abwesenheit" : "Austrittsdatum erreicht"}
                </span>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingAvailabilityDrop) return;
                const currentAppointment = appointmentsById.get(pendingAvailabilityDrop.appointmentId);
                if (!currentAppointment) return;
                void persistDropMutation({
                  appointmentId: pendingAvailabilityDrop.appointmentId,
                  version: currentAppointment.version,
                  projectId: currentAppointment.projectId,
                  customerId: currentAppointment.customer.id,
                  tourId: currentAppointment.tourId ?? null,
                  startDate: pendingAvailabilityDrop.targetDate,
                  endDate: pendingAvailabilityDrop.targetEndDate,
                  startTime: currentAppointment.startTime ?? null,
                  employeeIds: currentAppointment.employees.map((employee) => employee.id),
                  confirmAvailabilityAdjustments: true,
                }).catch((err: unknown) => {
                  console.error(`${logPrefix} drop confirm error`, err);
                  toast({
                    title: "Fehler beim Verschieben",
                    description: err instanceof Error ? err.message : "Unbekannter Fehler",
                    variant: "destructive",
                  });
                });
              }}
            >
              Trotzdem verschieben
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                className="w-full min-w-full h-full border-r border-border/30 last:border-r-0"
              >
                <div className="h-full flex flex-col">
                  <div className="grid border-b border-border/40 bg-muted/30" style={{ gridTemplateColumns: monthRowTemplate }}>
                    <div className="py-4 text-center text-sm font-semibold text-muted-foreground tracking-wider border-r border-border/30">
                      KW
                    </div>
                    {weekDays.map((day, dayIdx) => (
                      <div
                        key={`${monthKey}-${day}`}
                        className={`py-4 text-center text-sm font-semibold text-muted-foreground tracking-wider ${dayIdx >= 5 ? "bg-slate-200/70" : ""}`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div
                    className="flex-1 grid overflow-hidden"
                    style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
                  >
                    {weeks.map((week, weekIdx) => {
                      const weekStart = week[0];
                      const weekEnd = week[6];
                      const weekAppointments = appointments
                        .filter((appointment) => {
                          const start = parseISO(appointment.startDate);
                          const end = parseISO(getAppointmentEndDate(appointment));
                          return start <= weekEnd && end >= weekStart;
                        })
                        .sort(compareAppointmentsByTourIndexThenTime);

                      const laneGroups: WeekLaneItem[][] = [];
                      weekAppointments.forEach((appointment) => {
                        const startIndex = Math.max(0, differenceInCalendarDays(parseISO(appointment.startDate), weekStart));
                        const endIndex = Math.min(6, differenceInCalendarDays(parseISO(getAppointmentEndDate(appointment)), weekStart));

                        let laneIndex = laneGroups.findIndex((lane) =>
                          lane.every((item) => endIndex < item.startIndex || startIndex > item.endIndex),
                        );

                        if (laneIndex === -1) {
                          laneIndex = laneGroups.length;
                          laneGroups.push([]);
                        }

                        laneGroups[laneIndex].push({
                          appointmentId: appointment.id,
                          startIndex,
                          endIndex,
                        });
                      });

                      laneGroups.forEach((lane) => lane.sort((a, b) => a.startIndex - b.startIndex));

                      return (
                        <div
                          key={`${monthKey}-${weekIdx}`}
                          className="grid h-full min-h-0 relative"
                          style={{ gridTemplateColumns: monthRowTemplate }}
                        >
                          <div className="h-full min-h-0 flex items-center justify-center border-r border-b border-border/30 bg-muted/20 text-sm font-bold text-primary">
                            {getISOWeek(week[0])}
                          </div>
                          <div className="col-span-7 h-full min-h-0 relative grid" style={{ gridTemplateColumns: dayGridTemplate }}>
                            {week.map((day, dayIdx) => {
                              const isCurrentMonth = isSameMonth(day, monthStart);
                              const isTodayDate = isToday(day);
                              const isWeekend = dayIdx >= 5;
                              const dayKey = format(day, "yyyy-MM-dd");

                              return (
                                <div
                                  key={dayKey}
                                  className={`
                                    relative h-full min-h-0 border-r border-b border-border/30 p-1 min-h-[72px]
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
                                    className={`mb-2 flex items-center justify-between rounded-md px-1.5 py-1 ${
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
                                        flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                                        ${isTodayDate ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-foreground/70"}
                                      `}
                                    >
                                      {format(day, "d")}
                                    </span>
                                    {dayKey >= berlinToday ? (
                                      <button
                                        onClick={() => onNewAppointment?.(dayKey)}
                                        className="w-5 h-5 flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                        data-testid={`button-new-appointment-${dayKey}`}
                                      >
                                        <span className="text-sm font-bold">+</span>
                                      </button>
                                    ) : (
                                      <span className="w-5 h-5" aria-hidden="true" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            <div className="absolute inset-x-1 top-9 bottom-1 pointer-events-none">
                              {laneGroups.map((lane, laneIndex) => (
                                <div
                                  key={`${monthKey}-${weekIdx}-lane-${laneIndex}`}
                                  className="absolute inset-x-0"
                                  style={{ top: `${laneIndex * 26}px` }}
                                >
                                  {lane.map((item) => {
                                    const appointment = appointmentsById.get(item.appointmentId);
                                    if (!appointment) {
                                      return null;
                                    }

                                    const appointmentStart = parseISO(appointment.startDate);
                                    const appointmentEnd = parseISO(getAppointmentEndDate(appointment));
                                    const segmentStart = addDays(weekStart, item.startIndex);
                                    const segmentEnd = addDays(weekStart, item.endIndex);
                                    const position = getLaneItemPosition(item.startIndex, item.endIndex);
                                    const isLocked = appointment.isLocked && !isAdmin;
                                    const isHistoricalSource = appointment.startDate < berlinToday;
                                    const canDrag = !isLocked && !isHistoricalSource;

                                    return (
                                      <div
                                        key={`${monthKey}-${weekIdx}-${appointment.id}-${item.startIndex}-${item.endIndex}`}
                                        className="absolute pointer-events-auto"
                                        style={position}
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
                                  })}
                                </div>
                              ))}
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
