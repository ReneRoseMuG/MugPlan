import { useEffect, useMemo, useState } from "react";
import {
  addDays,
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
import { useCalendarAppointments } from "@/lib/calendar-appointments";
import {
  buildDayGridTemplate,
  getDayWeights,
  normalizeWeekendColumnPercent,
  sumWeights,
} from "@/lib/calendar-layout";
import {
  getAppointmentDurationDays,
  getAppointmentEndDate,
  getAppointmentSortValue,
} from "@/lib/calendar-utils";
import { CalendarAppointmentCompactBar } from "./CalendarAppointmentCompactBar";

type CalendarMonthViewProps = {
  currentDate: Date;
  employeeFilterId?: number | null;
  onNewAppointment?: (date: string) => void;
  onOpenAppointment?: (appointmentId: number) => void;
};

type WeekLaneItem = {
  appointmentId: number;
  startIndex: number;
  endIndex: number;
};

const logPrefix = "[calendar-month]";

export function CalendarMonthView({
  currentDate,
  employeeFilterId,
  onNewAppointment,
  onOpenAppointment,
}: CalendarMonthViewProps) {
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
  const totalDayWeight = useMemo(() => sumWeights(dayWeights, 0, dayWeights.length), [dayWeights]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1, locale: de });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1, locale: de });

  const fromDate = format(startDate, "yyyy-MM-dd");
  const toDate = format(endDate, "yyyy-MM-dd");

  const { data: appointments = [] } = useCalendarAppointments({
    fromDate,
    toDate,
    employeeId: employeeFilterId ?? undefined,
    userRole,
  });

  useEffect(() => {
    console.info(`${logPrefix} render`, {
      fromDate,
      toDate,
      employeeId: employeeFilterId ?? null,
      count: appointments.length,
    });
  }, [appointments.length, employeeFilterId, fromDate, toDate]);

  const weeks = useMemo(() => {
    const days = [];
    let current = startDate;
    while (current <= endDate) {
      days.push(current);
      current = addDays(current, 1);
    }
    const chunks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      chunks.push(days.slice(i, i + 7));
    }
    return chunks;
  }, [startDate, endDate]);

  const weekLanes = useMemo(() => {
    return weeks.map((week) => {
      const weekStart = week[0];
      const weekEnd = week[6];
      const weekAppointments = appointments
        .filter((appointment) => {
          const start = parseISO(appointment.startDate);
          const end = parseISO(getAppointmentEndDate(appointment));
          return start <= weekEnd && end >= weekStart;
        })
        .sort((a, b) => getAppointmentSortValue(a).localeCompare(getAppointmentSortValue(b)));

      const lanes: WeekLaneItem[][] = [];

      weekAppointments.forEach((appointment) => {
        const startIndex = Math.max(0, differenceInCalendarDays(parseISO(appointment.startDate), weekStart));
        const endIndex = Math.min(6, differenceInCalendarDays(parseISO(getAppointmentEndDate(appointment)), weekStart));

        let laneIndex = lanes.findIndex((lane) =>
          lane.every((item) => endIndex < item.startIndex || startIndex > item.endIndex),
        );

        if (laneIndex === -1) {
          laneIndex = lanes.length;
          lanes.push([]);
        }

        lanes[laneIndex].push({
          appointmentId: appointment.id,
          startIndex,
          endIndex,
        });
      });

      lanes.forEach((lane) => lane.sort((a, b) => a.startIndex - b.startIndex));

      return lanes;
    });
  }, [appointments, weeks]);

  const handleAppointmentClick = (appointmentId: number) => {
    const appointment = appointments.find((item) => item.id === appointmentId);
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

    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentStart = parseISO(appointment.startDate);

    if (appointmentStart < today) {
      console.info(`${logPrefix} drop blocked: past source`, { appointmentId, startDate: appointment.startDate });
      toast({
        title: "Verschieben nicht erlaubt",
        description: "Vergangene Termine kÃ¶nnen nicht per Drag & Drop verschoben werden.",
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

      await queryClient.invalidateQueries({
        queryKey: ["calendarAppointments"],
      });
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
  const getLaneItemPosition = (startIndex: number, endIndex: number) => {
    const clampedStart = Math.max(0, Math.min(6, startIndex));
    const clampedEndExclusive = Math.max(clampedStart + 1, Math.min(7, endIndex + 1));
    const leftPercent = (sumWeights(dayWeights, 0, clampedStart) / totalDayWeight) * 100;
    const widthPercent = (sumWeights(dayWeights, clampedStart, clampedEndExclusive) / totalDayWeight) * 100;

    return { leftPercent, widthPercent };
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden">
      <div className="grid border-b border-border/40 bg-muted/30" style={{ gridTemplateColumns: monthRowTemplate }}>
        <div className="py-4 text-center text-sm font-semibold text-muted-foreground font-display uppercase tracking-wider border-r border-border/30">
          KW
        </div>
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-4 text-center text-sm font-semibold text-muted-foreground font-display uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        {weeks.map((week, weekIdx) => {
          const laneGroups = weekLanes[weekIdx] ?? [];
          return (
            <div key={weekIdx} className="grid" style={{ gridTemplateColumns: monthRowTemplate }}>
              <div className="flex items-center justify-center border-r border-b border-border/30 bg-muted/20 text-sm font-bold text-primary">
                {getISOWeek(week[0])}
              </div>
              {week.map((day, dayIdx) => {
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isTodayDate = isToday(day);
                const dayKey = format(day, "yyyy-MM-dd");

                return (
                  <div
                    key={day.toString()}
                    className={`
                      relative border-r border-b border-border/30 p-1 min-h-[72px]
                      transition-colors duration-200
                      ${!isCurrentMonth ? "bg-muted/10 text-muted-foreground/40" : "bg-white text-foreground hover:bg-slate-50"}
                      ${dayIdx === 6 ? "border-r-0" : ""}
                    `}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, day)}
                    data-testid={`calendar-day-${dayKey}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <button
                        onClick={() => onNewAppointment?.(dayKey)}
                        className="w-5 h-5 flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        data-testid={`button-new-appointment-${dayKey}`}
                      >
                        <span className="text-sm font-bold">+</span>
                      </button>
                      <span
                        className={`
                          flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                          ${isTodayDate ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-foreground/70"}
                        `}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="border-r border-b border-border/30 bg-muted/20" />
              <div className="col-span-7 border-b border-border/30 bg-white px-1 py-1">
                <div className="space-y-0.5">
                  {laneGroups.length === 0 && <div className="h-6" style={{ backgroundColor: "transparent" }} />}
                  {laneGroups.map((lane, laneIndex) => (
                    <div key={`${weekIdx}-${laneIndex}`} className="relative h-6">
                      {lane.map((laneItem) => {
                        const appointment = appointments.find((item) => item.id === laneItem.appointmentId);
                        if (!appointment) return null;

                        const { leftPercent, widthPercent } = getLaneItemPosition(
                          laneItem.startIndex,
                          laneItem.endIndex,
                        );
                        const weekStartDay = week[laneItem.startIndex];
                        const weekEndDay = week[laneItem.endIndex];
                        if (!weekStartDay || !weekEndDay) return null;

                        return (
                          <CalendarAppointmentCompactBar
                            key={`${appointment.id}-${weekIdx}-${laneIndex}`}
                            appointment={appointment}
                            isFirstDay={isSameDay(weekStartDay, parseISO(appointment.startDate))}
                            isLastDay={isSameDay(weekEndDay, parseISO(getAppointmentEndDate(appointment)))}
                            showPopover={true}
                            positionStyle={{
                              position: "absolute",
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              top: 0,
                              zIndex: draggedAppointmentId === appointment.id ? 30 : 10,
                            }}
                            isLocked={appointment.isLocked && !isAdmin}
                            isDragging={draggedAppointmentId === appointment.id}
                            onDoubleClick={() => handleAppointmentClick(appointment.id)}
                            onDragStart={
                              appointment.isLocked && !isAdmin
                                ? undefined
                                : (event) => handleDragStart(event, appointment.id)
                            }
                            onDragEnd={handleDragEnd}
                          />
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
  );
}
