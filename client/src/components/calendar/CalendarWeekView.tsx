import { useMemo, useState } from "react";
import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  endOfWeek,
  format,
  getISOWeek,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSetting } from "@/hooks/useSettings";
import { useCalendarAppointments } from "@/lib/calendar-appointments";
import { buildDayGridTemplate, getDayWeights, normalizeWeekendColumnPercent } from "@/lib/calendar-layout";
import { getAppointmentDurationDays, getAppointmentEndDate, getAppointmentSortValue } from "@/lib/calendar-utils";
import { CalendarWeekAppointmentPanel } from "./CalendarWeekAppointmentPanel";
import type { CalendarNavCommand } from "@/pages/Home";

type CalendarWeekViewProps = {
  currentDate: Date;
  employeeFilterId?: number | null;
  navCommand?: CalendarNavCommand;
  onVisibleDateChange?: (date: Date) => void;
  onNewAppointment?: (date: string) => void;
  onOpenAppointment?: (appointmentId: number) => void;
};

type WeekLaneItem = {
  appointmentId: number;
  startIndex: number;
  endIndex: number;
};

const logPrefix = "[calendar-week]";

export function CalendarWeekView({
  currentDate,
  employeeFilterId,
  navCommand: _navCommand,
  onVisibleDateChange: _onVisibleDateChange,
  onNewAppointment,
  onOpenAppointment,
}: CalendarWeekViewProps) {
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
  const weekScrollRangeSetting = useSetting("calendarWeekScrollRange");
  const isAdmin = userRole === "ADMIN";
  const weekendColumnPercent = normalizeWeekendColumnPercent(weekendColumnPercentSetting);
  const extraWeekCount =
    typeof weekScrollRangeSetting === "number" && Number.isInteger(weekScrollRangeSetting) && weekScrollRangeSetting >= 0
      ? Math.min(weekScrollRangeSetting, 12)
      : 4;

  const dayGridTemplate = useMemo(
    () => buildDayGridTemplate(getDayWeights(weekendColumnPercent)),
    [weekendColumnPercent],
  );

  const baseWeekStart = startOfWeek(currentDate, { weekStartsOn: 1, locale: de });
  const baseWeekEnd = endOfWeek(baseWeekStart, { weekStartsOn: 1, locale: de });
  const scrollResetKey = format(baseWeekStart, "yyyy-MM-dd");

  const weekStarts = useMemo(
    () => Array.from({ length: extraWeekCount + 1 }, (_, index) => addWeeks(baseWeekStart, index)),
    [baseWeekStart, extraWeekCount],
  );

  const stripFromDate = format(weekStarts[0], "yyyy-MM-dd");
  const stripToDate = format(endOfWeek(weekStarts[weekStarts.length - 1], { weekStartsOn: 1, locale: de }), "yyyy-MM-dd");

  const { data: appointments = [] } = useCalendarAppointments({
    fromDate: stripFromDate,
    toDate: stripToDate,
    employeeId: employeeFilterId ?? undefined,
    userRole,
  });

  const appointmentsById = useMemo(
    () => new Map(appointments.map((appointment) => [appointment.id, appointment] as const)),
    [appointments],
  );

  const lanesByWeekStart = useMemo(() => {
    const map = new Map<string, WeekLaneItem[][]>();

    weekStarts.forEach((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1, locale: de });
      const weekAppointments = appointments
        .filter((appointment) => {
          const start = parseISO(appointment.startDate);
          const end = parseISO(getAppointmentEndDate(appointment));
          return start <= weekEnd && end >= weekStart;
        })
        .sort((a, b) => getAppointmentSortValue(a).localeCompare(getAppointmentSortValue(b)));

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
      map.set(format(weekStart, "yyyy-MM-dd"), laneGroups);
    });

    return map;
  }, [appointments, weekStarts]);

  const handleAppointmentClick = (appointmentId: number) => {
    const appointment = appointmentsById.get(appointmentId);
    if (!appointment) return;
    if (appointment.isLocked && !isAdmin) {
      console.info(`${logPrefix} open blocked`, { appointmentId });
      toast({
        title: "Termin ist gesperrt",
        description: "Nur Admins dürfen vergangene Termine ändern.",
        variant: "destructive",
      });
      return;
    }
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
          "x-user-role": userRole,
        },
        body: JSON.stringify({
          projectId: appointment.projectId,
          tourId: appointment.tourId ?? null,
          startDate: newStartDate,
          endDate: newEndDate,
          startTime: appointment.startTime ?? null,
          employeeIds: appointment.employees.map((employee) => employee.id),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Termin konnte nicht verschoben werden");
      }

      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
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

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-primary">KW {getISOWeek(baseWeekStart)}</span>
          <span className="text-sm text-muted-foreground">
            {format(baseWeekStart, "d. MMMM", { locale: de })} - {format(baseWeekEnd, "d. MMMM yyyy", { locale: de })}
          </span>
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
          {weekStarts.map((weekStart) => {
            const weekKey = format(weekStart, "yyyy-MM-dd");
            const weekLanes = lanesByWeekStart.get(weekKey) ?? [];
            const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

            return (
              <section
                key={weekKey}
                className="w-full min-w-full h-full border-r border-border/30 last:border-r-0"
              >
                <div className="h-full grid divide-x divide-border/30" style={{ gridTemplateColumns: dayGridTemplate }}>
                  {days.map((day, dayIdx) => {
                    const isTodayDate = isToday(day);
                    const isWeekend = dayIdx >= 5;
                    const dayKey = format(day, "yyyy-MM-dd");

                    return (
                      <div
                        key={dayKey}
                        className="flex flex-col min-h-0 overflow-hidden"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDrop(event, day)}
                        data-testid={`week-day-${dayKey}`}
                      >
                        <div
                          className={`
                            px-3 py-3 border-b border-border/30 text-center
                            ${isTodayDate ? "bg-primary/10" : isWeekend ? "bg-slate-200/70" : "bg-muted/20"}
                          `}
                        >
                          <div className="text-xs font-bold uppercase text-muted-foreground mb-1">
                            {format(day, "EEEE", { locale: de })}
                          </div>
                          <div
                            className={`
                              inline-flex items-center justify-center w-10 h-10 rounded-full text-xl font-extrabold
                              ${isTodayDate ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-foreground"}
                            `}
                          >
                            {format(day, "d")}
                          </div>
                        </div>

                        <div className={`flex-1 p-2 space-y-2 overflow-hidden ${isWeekend ? "bg-slate-200/40" : ""}`}>
                          <div className="flex justify-end mb-2">
                            <button
                              onClick={() => onNewAppointment?.(dayKey)}
                              className="w-6 h-6 flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                              data-testid={`button-new-appointment-week-${dayKey}`}
                            >
                              <span className="text-lg font-bold">+</span>
                            </button>
                          </div>

                          {weekLanes.map((lane, laneIndex) => {
                            const laneItem = lane.find((item) => dayIdx >= item.startIndex && dayIdx <= item.endIndex);
                            if (!laneItem) {
                              return null;
                            }
                            const appointment = appointmentsById.get(laneItem.appointmentId);
                            if (!appointment) {
                              return null;
                            }

                            return (
                              <CalendarWeekAppointmentPanel
                                key={`${appointment.id}-${laneIndex}-${dayIdx}`}
                                appointment={appointment}
                                isDragging={draggedAppointmentId === appointment.id}
                                isLocked={appointment.isLocked && !isAdmin}
                                onDoubleClick={() => handleAppointmentClick(appointment.id)}
                                onDragStart={
                                  appointment.isLocked && !isAdmin ? undefined : (event) => handleDragStart(event, appointment.id)
                                }
                                onDragEnd={handleDragEnd}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

