import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfWeek,
  endOfMonth,
  endOfYear,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { de } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCalendarAppointments } from "@/lib/calendar-appointments";
import {
  getAppointmentEndDate,
  getAppointmentSortValue,
} from "@/lib/calendar-utils";
import { CalendarAppointmentCompactBar } from "./CalendarAppointmentCompactBar";

type CalendarYearViewProps = {
  currentDate: Date;
  employeeFilterId?: number | null;
  onNewAppointment?: (date: string) => void;
  onOpenAppointment?: (appointmentId: number) => void;
};

const logPrefix = "[calendar-year]";

export function CalendarYearView({
  currentDate,
  employeeFilterId,
  onNewAppointment,
  onOpenAppointment,
}: CalendarYearViewProps) {
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userRole = useMemo(
    () => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER",
    [],
  );
  const isAdmin = userRole === "ADMIN";

  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const fromDate = format(yearStart, "yyyy-MM-dd");
  const toDate = format(yearEnd, "yyyy-MM-dd");

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

  const months = useMemo(() => {
    const list: Date[] = [];
    for (let i = 0; i < 12; i += 1) {
      list.push(startOfMonth(addMonths(yearStart, i)));
    }
    return list;
  }, [yearStart]);

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

    const durationDays = differenceInCalendarDays(
      parseISO(getAppointmentEndDate(appointment)),
      parseISO(appointment.startDate),
    );
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
    <div className="year-grid h-full overflow-y-auto">
      {months.map((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1, locale: de });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1, locale: de });
        const days: Date[] = [];
        let cursor = calendarStart;
        while (cursor <= calendarEnd) {
          days.push(cursor);
          cursor = addDays(cursor, 1);
        }

        return (
          <div key={month.toString()} className="mini-month rounded-lg p-3 bg-white">
            <h4 className="font-bold text-center mb-2 uppercase text-xs tracking-widest text-primary">
              {format(month, "MMMM", { locale: de })}
            </h4>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isTodayDate = isToday(day);
                const dayKey = format(day, "yyyy-MM-dd");
                const dayAppointments = appointments
                  .filter((appointment) => {
                    const start = parseISO(appointment.startDate);
                    const end = parseISO(getAppointmentEndDate(appointment));
                    return start <= day && end >= day;
                  })
                  .sort((a, b) => getAppointmentSortValue(a).localeCompare(getAppointmentSortValue(b)));

                const visibleAppointments = dayAppointments.slice(0, 2);
                const hiddenCount = dayAppointments.length - visibleAppointments.length;

                return (
                  <div
                    key={dayKey}
                    className={`border border-border/30 rounded-sm p-0.5 min-h-[34px] ${!isCurrentMonth ? "bg-muted/10" : "bg-white"}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, day)}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onNewAppointment?.(dayKey)}
                        className="w-4 h-4 flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 rounded"
                        data-testid={`button-new-appointment-year-${dayKey}`}
                      >
                        <span className="text-[10px] font-bold">+</span>
                      </button>
                      <span
                        className={`text-[10px] font-semibold ${isTodayDate ? "text-primary" : "text-slate-500"}`}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {visibleAppointments.map((appointment) => (
                        <CalendarAppointmentCompactBar
                          key={`${appointment.id}-${dayKey}`}
                          appointment={appointment}
                          dayIndex={0}
                          totalDaysInRow={1}
                          isFirstDay={true}
                          isLastDay={true}
                          spanDays={1}
                          isLocked={appointment.isLocked && !isAdmin}
                          isDragging={draggedAppointmentId === appointment.id}
                          onDoubleClick={() => handleAppointmentClick(appointment.id)}
                          onDragStart={
                            appointment.isLocked && !isAdmin ? undefined : (event) => handleDragStart(event, appointment.id)
                          }
                          onDragEnd={handleDragEnd}
                        />
                      ))}
                      {hiddenCount > 0 && (
                        <div className="text-[10px] text-slate-400">+{hiddenCount}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
