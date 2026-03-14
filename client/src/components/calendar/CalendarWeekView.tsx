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
import { useCalendarAppointments, type CalendarAppointment } from "@/lib/calendar-appointments";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { buildDayGridTemplate, getDayWeights, normalizeWeekendColumnPercent } from "@/lib/calendar-layout";
import {
  CALENDAR_UNASSIGNED_TOUR_COLOR,
  getAppointmentDurationDays,
  getAppointmentEndDate,
  getAppointmentStackPriority,
  getAppointmentSortValue,
  getWeekAppointmentGridSpan,
  getWeekAppointmentGridStartColumn,
} from "@/lib/calendar-utils";
import { storeWeeklyPreviewWidth } from "@/lib/preview-width";
import {
  CalendarWeekAppointmentPanel,
  DEFAULT_CONTINUATION_HEIGHT_PX,
  MIN_WEEK_CARD_HEIGHT_PX,
  WEEK_CARD_FOOTER_SAFE_SPACE_PX,
} from "./CalendarWeekAppointmentPanel";
import { CalendarWeekSpanningTile, WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX } from "./CalendarWeekSpanningTile";
import { CalendarWeekTourLaneHeaderBar } from "./CalendarWeekTourLaneHeaderBar";
import { isLaneCollapsed, normalizeExpandedLaneId, resolveCollapsedLaneSelection } from "./weekLaneState";
import type { CalendarNavCommand } from "@/pages/Home";
import type { Employee, Tour } from "@shared/schema";

type CalendarWeekViewProps = {
  currentDate: Date;
  employeeFilterId?: number | null;
  navCommand?: CalendarNavCommand;
  onVisibleDateChange?: (date: Date) => void;
  onNewAppointment?: (date: string, options?: { tourId?: number | null; scrollLeft?: number | null }) => void;
  onOpenAppointment?: (appointmentId: number) => void;
  restoreScrollLeft?: number | null;
  onScrollRestoreApplied?: () => void;
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

type WeekLaneRenderData = {
  spanningAppointments: { appointmentId: number; rowIndex: number }[];
  singleDayGridItems: {
    appointmentId: number;
    gridColumn: number;
    gridRow: number;
  }[];
  singleDayOverflowByBucket: number[][];
  tileRowCount: number;
  needsDayCellRow: boolean;
};

const logPrefix = "[calendar-week]";

const compareAppointmentsForWeekLane = (a: CalendarAppointment, b: CalendarAppointment) => {
  const priorityCompare = getAppointmentStackPriority(a) - getAppointmentStackPriority(b);
  if (priorityCompare !== 0) return priorityCompare;
  return getAppointmentSortValue(a).localeCompare(getAppointmentSortValue(b));
};

export function buildWeekLaneRenderData(
  tourLane: WeekTourLane,
  appointmentsById: Map<number, CalendarAppointment>,
): WeekLaneRenderData {
  const distinctAppointments = tourLane.dayBuckets
    .flatMap((bucket) => bucket.appointments)
    .filter((appointmentId, index, appointmentIds) => appointmentIds.indexOf(appointmentId) === index)
    .map((appointmentId) => appointmentsById.get(appointmentId))
    .filter((appointment): appointment is CalendarAppointment => Boolean(appointment))
    .sort(compareAppointmentsForWeekLane);

  const spanningAppointments = distinctAppointments
    .filter((appointment) => getAppointmentDurationDays(appointment) > 0)
    .map((appointment, rowIndex) => ({
      appointmentId: appointment.id,
      rowIndex,
    }));

  const hasSingleDayAppointments = distinctAppointments.some((appointment) => getAppointmentDurationDays(appointment) === 0);
  const tileRowCount = spanningAppointments.length > 0 ? spanningAppointments.length : hasSingleDayAppointments ? 1 : 0;
  const occupiedCells = new Set<string>();

  for (const { appointmentId, rowIndex } of spanningAppointments) {
    for (const dayBucket of tourLane.dayBuckets) {
      if (dayBucket.appointments.includes(appointmentId)) {
        occupiedCells.add(`${rowIndex}-${dayBucket.dayIndex}`);
      }
    }
  }

  const singleDayGridItems: WeekLaneRenderData["singleDayGridItems"] = [];
  const singleDayOverflowByBucket = tourLane.dayBuckets.map((bucket) =>
    bucket.appointments
      .map((appointmentId) => appointmentsById.get(appointmentId))
      .filter((appointment): appointment is CalendarAppointment => Boolean(appointment))
      .filter((appointment) => getAppointmentDurationDays(appointment) === 0)
      .sort(compareAppointmentsForWeekLane)
      .reduce<number[]>((overflow, appointment) => {
        for (let rowIndex = 0; rowIndex < tileRowCount; rowIndex += 1) {
          const cellKey = `${rowIndex}-${bucket.dayIndex}`;
          if (occupiedCells.has(cellKey)) continue;
          occupiedCells.add(cellKey);
          singleDayGridItems.push({
            appointmentId: appointment.id,
            gridColumn: bucket.dayIndex + 1,
            gridRow: rowIndex + 1,
          });
          return overflow;
        }

        overflow.push(appointment.id);
        return overflow;
      }, []),
  );

  const needsDayCellRow = singleDayOverflowByBucket.some((appointmentIds) => appointmentIds.length > 0);

  return {
    spanningAppointments,
    singleDayGridItems,
    singleDayOverflowByBucket,
    tileRowCount,
    needsDayCellRow,
  };
}

export function CalendarWeekView({
  currentDate,
  employeeFilterId,
  navCommand: _navCommand,
  onVisibleDateChange: _onVisibleDateChange,
  onNewAppointment,
  onOpenAppointment,
  restoreScrollLeft,
  onScrollRestoreApplied,
}: CalendarWeekViewProps) {
  // FIX-RULE:
  // Navigation/Sync-Signale werden absichtlich nicht verarbeitet.
  // Zeitraumwechsel darf nur explizit über Home-Buttons und currentDate erfolgen.
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<number | null>(null);
  const [hoveredAppointmentId, setHoveredAppointmentId] = useState<number | null>(null);
  const [availabilityConfirmOpen, setAvailabilityConfirmOpen] = useState(false);
  const [pendingAvailabilityDrop, setPendingAvailabilityDrop] = useState<{
    appointmentId: number;
    targetDate: string;
    targetEndDate: string | null;
    conflicts: Array<{ id: number; fullName: string; reason: "absence" | "exit_date" }>;
  } | null>(null);
  const laneHeightByKeyRef = useRef<Map<string, number>>(new Map());
  const projectStatusHeightByWeekRef = useRef<Map<string, number>>(new Map());
  const firstWeekdayHeaderRef = useRef<HTMLDivElement | null>(null);
  const horizontalScrollContainerRef = useRef<HTMLDivElement | null>(null);
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
  const weekAppointmentDisplayMode = useSetting("calendar.weekAppointmentDisplayMode");
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
    if (typeof restoreScrollLeft !== "number" || !Number.isFinite(restoreScrollLeft)) return;
    const node = horizontalScrollContainerRef.current;
    if (!node) return;

    const frame = window.requestAnimationFrame(() => {
      node.scrollLeft = Math.max(0, restoreScrollLeft);
      onScrollRestoreApplied?.();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [onScrollRestoreApplied, restoreScrollLeft, scrollResetKey]);

  const { data: appointments = [] } = useCalendarAppointments({
    fromDate: stripFromDate,
    toDate: stripToDate,
    employeeId: employeeFilterId ?? undefined,
    detail: "full",
    userRole,
  });

  useEffect(() => {
    laneHeightByKeyRef.current.clear();
    projectStatusHeightByWeekRef.current.clear();
    setAppointmentHeightVersion((prev) => prev + 1);
  }, [appointments, scrollResetKey]);

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "active" }],
    queryFn: async () => {
      const response = await fetch("/api/employees?scope=active", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Mitarbeiter konnten nicht geladen werden");
      }
      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload)) {
        return [];
      }
      return payload as Employee[];
    },
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
        color: CALENDAR_UNASSIGNED_TOUR_COLOR,
        tourId: null,
        members: [],
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
  }, [appointments, appointmentsById, membersByTourId, tours, weekStarts]);

  const getLaneRenderData = (tourLane: WeekTourLane): WeekLaneRenderData =>
    buildWeekLaneRenderData(tourLane, appointmentsById);

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

    await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
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

    const runDropMutation = async (confirmAvailabilityAdjustments: boolean) => {
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
          confirmAvailabilityAdjustments,
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
          return false;
        }
        throw new Error(error?.message ?? "Termin konnte nicht verschoben werden");
      }

      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      console.info(`${logPrefix} drop success`, { appointmentId });
      return true;
    };

    try {
      const updated = await runDropMutation(false);
      if (updated === false) {
        setAvailabilityConfirmOpen(true);
      }
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

  const measureLaneCardHeight = (laneHeightKey: string, node: HTMLDivElement | null, footerSafeSpacePx = 0) => {
    if (!node) return;
    const heightPx = Math.max(0, Math.round(node.getBoundingClientRect().height) - footerSafeSpacePx);
    if (heightPx <= 0) return;
    const currentLaneHeightPx = laneHeightByKeyRef.current.get(laneHeightKey) ?? 0;
    if (heightPx <= currentLaneHeightPx) return;
    laneHeightByKeyRef.current.set(laneHeightKey, heightPx);
    setAppointmentHeightVersion((prev) => prev + 1);
  };

  const measureProjectStatusHeight = (weekKey: string, node: HTMLDivElement | null) => {
    if (!node) return;
    const heightPx = Math.round(node.getBoundingClientRect().height);
    if (heightPx <= 0) return;
    const currentWeekHeightPx = projectStatusHeightByWeekRef.current.get(weekKey) ?? 0;
    if (heightPx <= currentWeekHeightPx) return;
    projectStatusHeightByWeekRef.current.set(weekKey, heightPx);
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
          {isCollapsedMode ? "Alle Touren aufklappen" : "Touren zuklappen"}
        </button>
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
        <AlertDialogContent data-testid="dialog-calendar-week-availability-conflicts">
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
      <div key={scrollResetKey} ref={horizontalScrollContainerRef} className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full">
          {weekStarts.map((weekStart, weekIndex) => {
            const weekKey = format(weekStart, "yyyy-MM-dd");
            const weekLanes = lanesByWeekStart.get(weekKey) ?? [];
            const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
            const dayHeaderBadges = Array.from({ length: 7 }, (_, dayIdx) =>
              weekLanes
                  .map((lane) => ({
                    laneKey: lane.laneKey,
                    tourId: lane.tourId,
                    color: lane.color ?? CALENDAR_UNASSIGNED_TOUR_COLOR,
                    count: lane.dayBuckets[dayIdx]?.appointments.length ?? 0,
                  }))
                .filter((entry) => entry.count > 0)
                .sort((a, b) => {
                  if (a.tourId === null && b.tourId === null) return 0;
                  if (a.tourId === null) return 1;
                  if (b.tourId === null) return -1;
                  return a.tourId - b.tourId;
                }),
            );

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
                            <div className="text-[10px] font-bold text-muted-foreground">
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
                            <div
                              className="mt-1 h-5 flex items-center justify-center gap-1 overflow-hidden px-1"
                              data-testid={`week-day-tour-badges-${dayKey}`}
                            >
                              {dayHeaderBadges[dayIdx].map((badge) => (
                                <span
                                  key={`week-day-tour-badge-${dayKey}-${badge.laneKey}`}
                                  className="inline-flex h-4 min-w-4 items-center justify-center rounded-md border px-1 text-[10px] font-bold leading-none text-white"
                                  style={{
                                    backgroundColor: badge.color,
                                    borderColor: "rgba(255,255,255,0.42)",
                                  }}
                                  data-testid={`week-day-tour-badge-${dayKey}-${badge.laneKey}`}
                                >
                                  {badge.count}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3">
                    {weekLanes.map((tourLane) => {
                      const laneHeightKey = `${weekKey}:${tourLane.laneKey}`;
                      const dayAppointmentCounts = tourLane.dayBuckets.map((bucket) => bucket.appointments.length);
                      const laneRenderData = getLaneRenderData(tourLane);
                      const laneUniformHeightPx = laneHeightByKeyRef.current.get(laneHeightKey) ?? null;
                      const projectStatusAreaHeightPx = projectStatusHeightByWeekRef.current.get(weekKey) ?? null;
                      const tileRowCount = laneRenderData.tileRowCount;
                      const needsDayCellRow = laneRenderData.needsDayCellRow;
                      const laneGridTemplateRows = [
                        ...Array.from({ length: tileRowCount }, () => `minmax(${MIN_WEEK_CARD_HEIGHT_PX}px, auto)`),
                        ...(needsDayCellRow ? [`minmax(${MIN_WEEK_CARD_HEIGHT_PX}px, auto)`] : []),
                      ].join(" ");
                      const totalLaneRowCount = tileRowCount + (needsDayCellRow ? 1 : 0);
                      const hasLaneContent = totalLaneRowCount > 0;

                      return (
                      <div key={tourLane.laneKey} className="rounded-lg border border-border/40 bg-muted/10">
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
                                className="relative flex items-center justify-end gap-1 px-1"
                              >
                                {dayAppointmentCounts[dayIdx] > 0 ? (
                                  <span
                                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 truncate text-center text-[10px] font-semibold"
                                    style={{ color: "#ffffff" }}
                                    data-testid={`week-tour-lane-day-counter-${tourLane.laneKey}-${dayBucket.dateKey}`}
                                  >
                                    {dayAppointmentCounts[dayIdx]} {dayAppointmentCounts[dayIdx] === 1 ? "Termin" : "Termine"}
                                  </span>
                                ) : (
                                  <span />
                                )}
                                {dayBucket.dateKey >= berlinToday ? (
                                  <button
                                    onClick={() => {
                                      const scrollLeft = horizontalScrollContainerRef.current?.scrollLeft ?? null;
                                      console.info(`${logPrefix} new appointment click`, {
                                        date: dayBucket.dateKey,
                                        tourId: tourLane.tourId,
                                        laneKey: tourLane.laneKey,
                                        scrollLeft,
                                      });
                                      onNewAppointment?.(dayBucket.dateKey, { tourId: tourLane.tourId, scrollLeft });
                                    }}
                                    className="pointer-events-auto h-4 w-4 rounded text-[11px] font-bold leading-none hover:bg-white/15"
                                    style={{ color: "#ffffff" }}
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
                            className={`relative grid divide-x divide-border/30 rounded-md border border-border/30 overflow-hidden ${
                              hasLaneContent ? "min-h-[240px]" : ""
                            }`}
                            style={{
                              gridTemplateColumns: dayGridTemplate,
                              ...(hasLaneContent ? { gridTemplateRows: laneGridTemplateRows } : {}),
                            }}
                          >
                            {hasLaneContent ? days.map((_, dayIdx) => {
                              const isWeekend = dayIdx >= 5;
                              return (
                                <div
                                  key={`week-lane-column-background-${tourLane.laneKey}-${dayIdx}`}
                                    className={isWeekend ? "bg-slate-200/45" : "bg-white/80"}
                                  style={{
                                    gridColumn: dayIdx + 1,
                                    gridRow: `1 / span ${totalLaneRowCount}`,
                                  }}
                                  aria-hidden
                                />
                              );
                            }) : null}
                            {hasLaneContent && draggedAppointmentId !== null ? (
                              <div
                                className="absolute inset-0 grid z-20"
                                style={{ gridTemplateColumns: dayGridTemplate }}
                              >
                                {days.map((day) => (
                                  <div
                                    key={`week-day-drop-overlay-${tourLane.laneKey}-${format(day, "yyyy-MM-dd")}`}
                                    className="h-full"
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => {
                                      void handleDrop(event, day);
                                    }}
                                    data-testid={`week-day-drop-overlay-${format(day, "yyyy-MM-dd")}-lane-${tourLane.laneKey}`}
                                  />
                                ))}
                              </div>
                            ) : null}
                            {hasLaneContent ? laneRenderData.spanningAppointments.map(({ appointmentId, rowIndex }) => {
                              const appointment = appointmentsById.get(appointmentId);
                              if (!appointment) return null;

                              const startColumn = getWeekAppointmentGridStartColumn(appointment, days);
                              const columnSpan = getWeekAppointmentGridSpan(appointment, days);
                              const visibleStartDate = format(days[Math.max(0, startColumn - 1)], "yyyy-MM-dd");
                              const visibleDayNumberStart =
                                Math.max(
                                  0,
                                  Math.round(
                                    (parseISO(visibleStartDate).getTime() - parseISO(appointment.startDate).getTime()) / 86400000,
                                  ),
                                ) + 1;
                              const isHighlighted = hoveredAppointmentId === appointment.id;
                              const isSegmentLocked = appointment.isLocked && !isAdmin;
                              const isHistoricalSource = appointment.startDate < berlinToday;
                              const canDragSegment = !isSegmentLocked && !isHistoricalSource;

                              return (
                                <CalendarWeekSpanningTile
                                  key={`week-spanning-tile-${appointment.id}`}
                                  appointment={appointment}
                                  spanColumns={columnSpan}
                                  displayMode={weekAppointmentDisplayMode ?? "standard"}
                                  visibleStartDate={visibleStartDate}
                                  visibleDayNumberStart={visibleDayNumberStart}
                                  uniformHeightPx={laneUniformHeightPx}
                                  projectStatusAreaHeightPx={projectStatusAreaHeightPx}
                                  style={{
                                    gridColumn: `${startColumn} / span ${columnSpan}`,
                                    gridRow: rowIndex + 1,
                                    margin: "0.5rem",
                                    zIndex: 10,
                                  }}
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
                                  projectStatusAreaRef={(node) => measureProjectStatusHeight(weekKey, node)}
                                  containerRef={(node) =>
                                    measureLaneCardHeight(laneHeightKey, node, WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX)}
                                  testId={`week-spanning-tile-${appointment.id}`}
                                />
                              );
                            }) : null}
                            {hasLaneContent ? laneRenderData.singleDayGridItems.map(({ appointmentId, gridColumn, gridRow }) => {
                              const appointment = appointmentsById.get(appointmentId);
                              if (!appointment) return null;

                              const isHighlighted = hoveredAppointmentId === appointment.id;
                              const isSegmentLocked = appointment.isLocked && !isAdmin;
                              const isHistoricalSource = appointment.startDate < berlinToday;
                              const canDragSegment = !isSegmentLocked && !isHistoricalSource;

                              return (
                                <div
                                  key={`week-single-grid-item-${appointment.id}`}
                                  style={{ gridColumn, gridRow, padding: "0.5rem", zIndex: 10 }}
                                >
                                  <CalendarWeekAppointmentPanel
                                    appointment={appointment}
                                    context="week-calendar"
                                    segment="start"
                                    continuationHeightPx={DEFAULT_CONTINUATION_HEIGHT_PX}
                                    uniformHeightPx={laneUniformHeightPx}
                                    projectStatusAreaHeightPx={projectStatusAreaHeightPx}
                                    projectStatusAreaRef={(node) => measureProjectStatusHeight(weekKey, node)}
                                    containerRef={(node) =>
                                      measureLaneCardHeight(laneHeightKey, node, WEEK_CARD_FOOTER_SAFE_SPACE_PX)}
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
                                  />
                                </div>
                              );
                            }) : null}
                            {hasLaneContent && needsDayCellRow ? tourLane.dayBuckets.map((dayBucket, dayIdx) => {
                              const day = days[dayIdx];

                              return (
                                <div
                                  key={`${tourLane.laneKey}-${dayBucket.dateKey}`}
                                  className="h-full p-2 space-y-2"
                                  style={{ gridColumn: dayIdx + 1, gridRow: tileRowCount + 1, zIndex: 10 }}
                                  onDragOver={(event) => event.preventDefault()}
                                  onDrop={(event) => {
                                    void handleDrop(event, day);
                                  }}
                                  data-testid={`week-day-${dayBucket.dateKey}-lane-${tourLane.laneKey}`}
                                >
                                  {laneRenderData.singleDayOverflowByBucket[dayIdx].map((appointmentId, stackIndex) => {
                                    const appointment = appointmentsById.get(appointmentId);
                                    if (!appointment) return null;

                                    const isHighlighted = hoveredAppointmentId === appointment.id;
                                    const isSegmentLocked = appointment.isLocked && !isAdmin;
                                    const isHistoricalSource = appointment.startDate < berlinToday;
                                    const canDragSegment = !isSegmentLocked && !isHistoricalSource;

                                    return (
                                      <CalendarWeekAppointmentPanel
                                        key={`${appointment.id}-${tourLane.laneKey}-${dayIdx}-${stackIndex}`}
                                        appointment={appointment}
                                        context="week-calendar"
                                        segment="start"
                                        continuationHeightPx={DEFAULT_CONTINUATION_HEIGHT_PX}
                                        uniformHeightPx={laneUniformHeightPx}
                                        projectStatusAreaHeightPx={projectStatusAreaHeightPx}
                                        projectStatusAreaRef={(node) => measureProjectStatusHeight(weekKey, node)}
                                        containerRef={(node) =>
                                          measureLaneCardHeight(laneHeightKey, node, WEEK_CARD_FOOTER_SAFE_SPACE_PX)}
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
                                      />
                                    );
                                  })}
                                </div>
                              );
                            }) : null}
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
