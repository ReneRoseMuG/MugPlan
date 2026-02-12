import { useMemo, useState } from "react";
import {
  addDays,
  addWeeks,
  endOfWeek,
  format,
  getISOWeek,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSetting } from "@/hooks/useSettings";
import { useCalendarAppointments } from "@/lib/calendar-appointments";
import { buildDayGridTemplate, getDayWeights, normalizeWeekendColumnPercent } from "@/lib/calendar-layout";
import { getAppointmentDurationDays, getAppointmentEndDate, getAppointmentSortValue } from "@/lib/calendar-utils";
import { CalendarWeekAppointmentPanel } from "./CalendarWeekAppointmentPanel";
import { CalendarWeekTourLaneHeaderBar } from "./CalendarWeekTourLaneHeaderBar";
import type { CalendarNavCommand } from "@/pages/Home";
import type { Employee, Tour } from "@shared/schema";

type CalendarWeekViewProps = {
  currentDate: Date;
  employeeFilterId?: number | null;
  navCommand?: CalendarNavCommand;
  onVisibleDateChange?: (date: Date) => void;
  onNewAppointment?: (date: string, options?: { tourId?: number | null }) => void;
  onOpenAppointment?: (appointmentId: number) => void;
};

type WeekDayBucket = {
  dayIndex: number;
  dateKey: string;
  appointments: number[];
};

type WeekTourLane = {
  laneKey: string;
  label: string;
  color: string | null;
  tourId: number | null;
  members: { id: number; fullName: string }[];
  dayBuckets: WeekDayBucket[];
  isCollapsed: boolean;
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
  const [hoveredAppointmentId, setHoveredAppointmentId] = useState<number | null>(null);
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
    detail: "full",
    userRole,
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "active" }],
    queryFn: () => fetch("/api/employees?scope=active").then((response) => response.json()),
  });

  const appointmentsById = useMemo(
    () => new Map(appointments.map((appointment) => [appointment.id, appointment] as const)),
    [appointments],
  );

  const membersByTourId = useMemo(() => {
    const map = new Map<number, { id: number; fullName: string }[]>();
    for (const employee of employees) {
      if (!employee.tourId) continue;
      const current = map.get(employee.tourId) ?? [];
      current.push({ id: employee.id, fullName: employee.fullName });
      map.set(employee.tourId, current);
    }
    map.forEach((members) => {
      members.sort((a, b) => a.fullName.localeCompare(b.fullName, "de", { sensitivity: "base" }));
    });
    return map;
  }, [employees]);

  const unassignedMembers = useMemo(
    () => employees
      .filter((employee) => !employee.tourId)
      .map((employee) => ({ id: employee.id, fullName: employee.fullName }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "de", { sensitivity: "base" })),
    [employees],
  );

  const lanesByWeekStart = useMemo(() => {
    const map = new Map<string, WeekTourLane[]>();

    weekStarts.forEach((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1, locale: de });
      const weekAppointments = appointments
        .filter((appointment) => {
          const start = parseISO(appointment.startDate);
          const end = parseISO(getAppointmentEndDate(appointment));
          return start <= weekEnd && end >= weekStart;
        })
        .sort((a, b) => getAppointmentSortValue(a).localeCompare(getAppointmentSortValue(b)));

      const initialLanes: WeekTourLane[] = tours
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }))
        .map((tour) => ({
          laneKey: `tour-${tour.id}`,
          label: tour.name,
          color: tour.color,
          tourId: tour.id,
          members: membersByTourId.get(tour.id) ?? [],
          dayBuckets: Array.from({ length: 7 }, (_, dayIndex) => ({
            dayIndex,
            dateKey: format(addDays(weekStart, dayIndex), "yyyy-MM-dd"),
            appointments: [],
          })),
          isCollapsed: false,
        }));

      const unassignedLane: WeekTourLane = {
        laneKey: "tour-unassigned",
        label: "Ohne Tour",
        color: "#64748b",
        tourId: null,
        members: unassignedMembers,
        dayBuckets: Array.from({ length: 7 }, (_, dayIndex) => ({
          dayIndex,
          dateKey: format(addDays(weekStart, dayIndex), "yyyy-MM-dd"),
          appointments: [],
        })),
        isCollapsed: false,
      };

      const lanes = [...initialLanes, unassignedLane];
      const laneByKey = new Map(lanes.map((lane) => [lane.laneKey, lane] as const));

      for (const appointment of weekAppointments) {
        const appointmentStart = parseISO(appointment.startDate);
        const appointmentEnd = parseISO(getAppointmentEndDate(appointment));
        const laneKey = appointment.tourId ? `tour-${appointment.tourId}` : "tour-unassigned";
        const lane = laneByKey.get(laneKey);
        if (!lane) continue;

        for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
          const dayDate = addDays(weekStart, dayIndex);
          if (dayDate >= appointmentStart && dayDate <= appointmentEnd) {
            lane.dayBuckets[dayIndex].appointments.push(appointment.id);
          }
        }
      }

      for (const lane of lanes) {
        for (const dayBucket of lane.dayBuckets) {
          dayBucket.appointments.sort((aId, bId) => {
            const aAppointment = appointmentsById.get(aId);
            const bAppointment = appointmentsById.get(bId);
            if (!aAppointment || !bAppointment) return 0;
            return getAppointmentSortValue(aAppointment).localeCompare(getAppointmentSortValue(bAppointment));
          });
        }
      }

      map.set(format(weekStart, "yyyy-MM-dd"), lanes);
    });

    return map;
  }, [appointments, appointmentsById, membersByTourId, tours, unassignedMembers, weekStarts]);

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
                <div className="h-full flex flex-col">
                  <div className="grid divide-x divide-border/30 border-b border-border/30" style={{ gridTemplateColumns: dayGridTemplate }}>
                    {days.map((day, dayIdx) => {
                      const isTodayDate = isToday(day);
                      const isWeekend = dayIdx >= 5;
                      const dayKey = format(day, "yyyy-MM-dd");

                      return (
                        <div key={dayKey} className="flex flex-col min-h-0 overflow-hidden" data-testid={`week-day-header-${dayKey}`}>
                          <div
                            className={`
                              px-2 py-1.5 text-center
                              ${isTodayDate ? "bg-primary/10" : isWeekend ? "bg-slate-200/70" : "bg-muted/20"}
                            `}
                          >
                            <div className="text-[10px] font-bold uppercase text-muted-foreground">
                              {format(day, "EEEE", { locale: de })}
                            </div>
                            <div
                              className={`
                                mt-0.5 inline-flex items-center justify-center min-w-6 h-6 rounded-full px-1 text-sm font-bold
                                ${isTodayDate ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-foreground"}
                              `}
                            >
                              {format(day, "d")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-3">
                    {weekLanes.map((tourLane) => (
                      <div key={tourLane.laneKey} className="rounded-lg border border-border/40 bg-muted/10 p-2">
                        <div className="relative">
                          <CalendarWeekTourLaneHeaderBar
                            label={tourLane.label}
                            color={tourLane.color}
                            members={tourLane.members}
                            testId={`week-tour-lane-header-${tourLane.laneKey}`}
                          />
                          <div
                            className="pointer-events-none absolute inset-0 grid"
                            style={{ gridTemplateColumns: dayGridTemplate }}
                          >
                            {tourLane.dayBuckets.map((dayBucket) => (
                              <div key={`lane-add-${tourLane.laneKey}-${dayBucket.dateKey}`} className="flex items-center justify-end px-1">
                                <button
                                  onClick={() => {
                                    console.info(`${logPrefix} new appointment click`, {
                                      date: dayBucket.dateKey,
                                      tourId: tourLane.tourId,
                                      laneKey: tourLane.laneKey,
                                    });
                                    onNewAppointment?.(dayBucket.dateKey, { tourId: tourLane.tourId });
                                  }}
                                  className="pointer-events-auto h-4 w-4 rounded text-[11px] font-bold leading-none text-white/85 hover:bg-white/15 hover:text-white"
                                  data-testid={`button-new-appointment-week-${dayBucket.dateKey}-lane-${tourLane.laneKey}`}
                                  title={`Neuer Termin am ${dayBucket.dateKey}`}
                                >
                                  +
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        {!tourLane.isCollapsed && (
                          <div
                            className="mt-1 grid min-h-[180px] divide-x divide-border/30 rounded-md border border-border/30"
                            style={{ gridTemplateColumns: dayGridTemplate }}
                          >
                            {tourLane.dayBuckets.map((dayBucket, dayIdx) => {
                              const day = days[dayIdx];
                              const isWeekend = dayIdx >= 5;

                              return (
                                <div
                                  key={`${tourLane.laneKey}-${dayBucket.dateKey}`}
                                  className={`h-full p-2 space-y-2 ${isWeekend ? "bg-slate-200/30" : "bg-white/70"}`}
                                  onDragOver={(event) => event.preventDefault()}
                                  onDrop={(event) => {
                                    void handleDrop(event, day);
                                  }}
                                  data-testid={`week-day-${dayBucket.dateKey}-lane-${tourLane.laneKey}`}
                                >
                                  {dayBucket.appointments.map((appointmentId, stackIndex) => {
                                    const appointment = appointmentsById.get(appointmentId);
                                    if (!appointment) return null;

                                    const appointmentStart = parseISO(appointment.startDate);
                                    const isContinuationSegment = appointmentStart < day;
                                    const isHighlighted = hoveredAppointmentId === appointment.id;
                                    const isSegmentLocked = appointment.isLocked && !isAdmin;
                                    const canDragSegment = !isSegmentLocked;

                                    return (
                                      <CalendarWeekAppointmentPanel
                                        key={`${appointment.id}-${tourLane.laneKey}-${dayIdx}-${stackIndex}`}
                                        appointment={appointment}
                                        segment={isContinuationSegment ? "continuation" : "start"}
                                        isDragging={draggedAppointmentId === appointment.id}
                                        isLocked={isSegmentLocked}
                                        highlighted={isHighlighted}
                                        onDoubleClick={() => handleAppointmentClick(appointment.id)}
                                        onDragStart={canDragSegment ? (event) => handleDragStart(event, appointment.id) : undefined}
                                        onDragEnd={canDragSegment ? handleDragEnd : undefined}
                                        onMouseEnter={() => setHoveredAppointmentId(appointment.id)}
                                        onMouseLeave={() =>
                                          setHoveredAppointmentId((prev) => (prev === appointment.id ? null : prev))
                                        }
                                        testId={
                                          isContinuationSegment
                                            ? `week-appointment-continuation-${appointment.id}-${dayIdx}`
                                            : undefined
                                        }
                                      />
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
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
