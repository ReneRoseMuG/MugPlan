import { useEffect, useMemo, useRef, useState } from "react";
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
import { useSetting, useSettings } from "@/hooks/useSettings";
import { useCalendarAppointments } from "@/lib/calendar-appointments";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { buildDayGridTemplate, getDayWeights, normalizeWeekendColumnPercent } from "@/lib/calendar-layout";
import { getAppointmentDurationDays, getAppointmentEndDate, getAppointmentSortValue } from "@/lib/calendar-utils";
import { storeWeeklyPreviewWidth } from "@/lib/preview-width";
import { CalendarWeekAppointmentPanel, DEFAULT_CONTINUATION_HEIGHT_PX } from "./CalendarWeekAppointmentPanel";
import { CalendarWeekTourLaneHeaderBar } from "./CalendarWeekTourLaneHeaderBar";
import { isLaneCollapsed, normalizeExpandedLaneId, resolveCollapsedLaneSelection } from "./weekLaneState";
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
  const appointmentHeightByIdRef = useRef<Map<number, number>>(new Map());
  const firstWeekdayHeaderRef = useRef<HTMLDivElement | null>(null);
  const pendingLaneCorrectionRef = useRef<string | null>(null);
  const [, setAppointmentHeightVersion] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setSetting } = useSettings();
  const userRole = useMemo(
    () => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER",
    [],
  );

  const weekendColumnPercentSetting = useSetting("calendarWeekendColumnPercent");
  const weekScrollRangeSetting = useSetting("calendarWeekScrollRange");
  const persistedIsCollapsed = useSetting("calendar.weekLanes.isCollapsed");
  const persistedExpandedLaneIdRaw = useSetting("calendar.weekLanes.expandedLaneId");
  const isAdmin = userRole === "ADMIN";
  const weekendColumnPercent = normalizeWeekendColumnPercent(weekendColumnPercentSetting);
  const extraWeekCount =
    typeof weekScrollRangeSetting === "number" && Number.isInteger(weekScrollRangeSetting) && weekScrollRangeSetting >= 0
      ? Math.min(weekScrollRangeSetting, 12)
      : 4;
  const isCollapsedMode = Boolean(persistedIsCollapsed);
  const persistedExpandedLaneId = normalizeExpandedLaneId(persistedExpandedLaneIdRaw ?? "");

  const dayGridTemplate = useMemo(
    () => buildDayGridTemplate(getDayWeights(weekendColumnPercent)),
    [weekendColumnPercent],
  );

  const baseWeekStart = startOfWeek(currentDate, { weekStartsOn: 1, locale: de });
  const baseWeekEnd = endOfWeek(baseWeekStart, { weekStartsOn: 1, locale: de });
  const scrollResetKey = format(baseWeekStart, "yyyy-MM-dd");
  const berlinToday = getBerlinTodayDateString();

  const weekStarts = useMemo(
    () => Array.from({ length: extraWeekCount + 1 }, (_, index) => addWeeks(baseWeekStart, index)),
    [baseWeekStart, extraWeekCount],
  );

  const stripFromDate = format(weekStarts[0], "yyyy-MM-dd");
  const stripToDate = format(endOfWeek(weekStarts[weekStarts.length - 1], { weekStartsOn: 1, locale: de }), "yyyy-MM-dd");

  useEffect(() => {
    const node = firstWeekdayHeaderRef.current;
    if (!node) return;

    const measure = () => {
      const widthPx = node.getBoundingClientRect().width;
      storeWeeklyPreviewWidth(widthPx);
    };

    const frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [scrollResetKey]);

  useEffect(() => {
    appointmentHeightByIdRef.current.clear();
    setAppointmentHeightVersion((prev) => prev + 1);
  }, [scrollResetKey]);

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

  const primaryWeekLaneKeys = useMemo(() => {
    if (weekStarts.length === 0) return [] as string[];
    const primaryWeekKey = format(weekStarts[0], "yyyy-MM-dd");
    const primaryWeekLanes = lanesByWeekStart.get(primaryWeekKey) ?? [];
    return primaryWeekLanes.map((lane) => lane.laneKey);
  }, [lanesByWeekStart, weekStarts]);

  const collapsedLaneSelection = useMemo(
    () => resolveCollapsedLaneSelection({
      laneKeys: primaryWeekLaneKeys,
      persistedExpandedLaneId,
    }),
    [persistedExpandedLaneId, primaryWeekLaneKeys],
  );

  const effectiveExpandedLaneId = isCollapsedMode ? collapsedLaneSelection.effectiveExpandedLaneId : null;

  const persistExpandedLaneId = async (laneId: string) => {
    await setSetting({
      key: "calendar.weekLanes.expandedLaneId",
      scopeType: "USER",
      value: laneId,
    });
  };

  const persistCollapsedMode = async (nextValue: boolean) => {
    await setSetting({
      key: "calendar.weekLanes.isCollapsed",
      scopeType: "USER",
      value: nextValue,
    });
  };

  useEffect(() => {
    if (!isCollapsedMode) {
      pendingLaneCorrectionRef.current = null;
      return;
    }
    if (!collapsedLaneSelection.requiresCorrection || !collapsedLaneSelection.effectiveExpandedLaneId) {
      pendingLaneCorrectionRef.current = null;
      return;
    }
    if (collapsedLaneSelection.effectiveExpandedLaneId === persistedExpandedLaneId) {
      pendingLaneCorrectionRef.current = null;
      return;
    }
    if (pendingLaneCorrectionRef.current === collapsedLaneSelection.effectiveExpandedLaneId) return;

    pendingLaneCorrectionRef.current = collapsedLaneSelection.effectiveExpandedLaneId;

    void persistExpandedLaneId(collapsedLaneSelection.effectiveExpandedLaneId).catch((error) => {
      console.error(`${logPrefix} failed to persist lane correction`, error);
      toast({
        title: "Lane-Zustand konnte nicht gespeichert werden",
        description: "Bitte erneut versuchen.",
        variant: "destructive",
      });
      pendingLaneCorrectionRef.current = null;
    });
  }, [collapsedLaneSelection, isCollapsedMode, persistedExpandedLaneId, toast]);

  const handleToggleCollapsedMode = async () => {
    if (!isCollapsedMode) {
      if (collapsedLaneSelection.effectiveExpandedLaneId) {
        await persistExpandedLaneId(collapsedLaneSelection.effectiveExpandedLaneId);
      }
      await persistCollapsedMode(true);
      return;
    }

    await persistCollapsedMode(false);
  };

  const handleLaneHeaderClick = async (laneKey: string) => {
    if (!isCollapsedMode) return;
    if (effectiveExpandedLaneId === laneKey) return;
    await persistExpandedLaneId(laneKey);
  };

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
        },
        body: JSON.stringify({
          version: appointment.version,
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
        if (error?.code === "VERSION_CONFLICT") {
          throw new Error("Termin wurde zwischenzeitlich geändert. Bitte neu laden.");
        }
        if (error?.code === "VALIDATION_ERROR") {
          throw new Error("Termin kann nicht verschoben werden. Bitte neu laden.");
        }
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

  const measureStartSegmentHeight = (appointmentId: number, node: HTMLDivElement | null) => {
    if (!node) return;
    const heightPx = Math.round(node.getBoundingClientRect().height);
    if (heightPx <= 0) return;
    if (appointmentHeightByIdRef.current.get(appointmentId) === heightPx) return;
    appointmentHeightByIdRef.current.set(appointmentId, heightPx);
    setAppointmentHeightVersion((prev) => prev + 1);
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
        <button
          type="button"
          className="rounded-md border border-border/60 bg-white px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted"
          data-testid="button-week-lanes-collapse-toggle"
          onClick={() => {
            void handleToggleCollapsedMode().catch((error) => {
              console.error(`${logPrefix} toggle collapsed mode failed`, error);
              toast({
                title: "Lane-Modus konnte nicht gespeichert werden",
                description: "Bitte erneut versuchen.",
                variant: "destructive",
              });
            });
          }}
        >
          {isCollapsedMode ? "Alle Lanes aufklappen" : "Touren kollabieren"}
        </button>
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
          {weekStarts.map((weekStart, weekIndex) => {
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
                        <div
                          key={dayKey}
                          ref={weekIndex === 0 && dayIdx === 0 ? firstWeekdayHeaderRef : undefined}
                          className="flex flex-col min-h-0 overflow-hidden"
                          data-testid={`week-day-header-${dayKey}`}
                        >
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
                    {weekLanes.map((tourLane) => {
                      const dayAppointmentCounts = tourLane.dayBuckets.map((bucket) => bucket.appointments.length);

                      return (
                      <div key={tourLane.laneKey} className="rounded-lg border border-border/40 bg-muted/10 p-2">
                        <div className="relative">
                          <CalendarWeekTourLaneHeaderBar
                            label={tourLane.label}
                            color={tourLane.color}
                            members={tourLane.members}
                            isExpanded={!isLaneCollapsed({
                              isCollapsedMode,
                              laneKey: tourLane.laneKey,
                              effectiveExpandedLaneId,
                            })}
                            interactive={isCollapsedMode}
                            onClick={() => {
                              void handleLaneHeaderClick(tourLane.laneKey).catch((error) => {
                                console.error(`${logPrefix} lane header click failed`, error);
                                toast({
                                  title: "Lane-Zustand konnte nicht gespeichert werden",
                                  description: "Bitte erneut versuchen.",
                                  variant: "destructive",
                                });
                              });
                            }}
                            testId={`week-tour-lane-header-${tourLane.laneKey}`}
                          />
                          <div
                            className="pointer-events-none absolute inset-0 grid"
                            style={{ gridTemplateColumns: dayGridTemplate }}
                          >
                            {tourLane.dayBuckets.map((dayBucket, dayIdx) => (
                              <div
                                key={`lane-add-${tourLane.laneKey}-${dayBucket.dateKey}`}
                                className="flex items-center justify-between gap-1 px-1"
                              >
                                {dayAppointmentCounts[dayIdx] > 0 ? (
                                  <span
                                    className="truncate text-[10px] font-semibold text-white/90"
                                    data-testid={`week-tour-lane-day-counter-${tourLane.laneKey}-${dayBucket.dateKey}`}
                                  >
                                    ({dayAppointmentCounts[dayIdx]}) Termine
                                  </span>
                                ) : (
                                  <span />
                                )}
                                {dayBucket.dateKey >= berlinToday ? (
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
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            isLaneCollapsed({
                              isCollapsedMode,
                              laneKey: tourLane.laneKey,
                              effectiveExpandedLaneId,
                            })
                              ? "max-h-0 opacity-0 mt-0"
                              : "max-h-[2200px] opacity-100 mt-1"
                          }`}
                        >
                          <div
                            className="grid min-h-[180px] divide-x divide-border/30 rounded-md border border-border/30"
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
                                    const continuationHeightPx = appointmentHeightByIdRef.current.get(appointment.id)
                                      ?? DEFAULT_CONTINUATION_HEIGHT_PX;
                                    const isHighlighted = hoveredAppointmentId === appointment.id;
                                    const isSegmentLocked = appointment.isLocked && !isAdmin;
                                    const canDragSegment = !isSegmentLocked;

                                    return (
                                      <CalendarWeekAppointmentPanel
                                        key={`${appointment.id}-${tourLane.laneKey}-${dayIdx}-${stackIndex}`}
                                        appointment={appointment}
                                        context="week-calendar"
                                        segment={isContinuationSegment ? "continuation" : "start"}
                                        continuationHeightPx={continuationHeightPx}
                                        containerRef={
                                          isContinuationSegment
                                            ? undefined
                                            : (node) => measureStartSegmentHeight(appointment.id, node)
                                        }
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
