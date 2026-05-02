import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addWeeks,
  endOfWeek,
  format,
  getISOWeek,
  getISOWeekYear,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppointmentMutationEvent } from "@shared/appointmentMutationEvents";
import { isAbsenceAppointmentSummary, isAbsenceTourName } from "@shared/absenceAppointments";
import { Lock, LockOpen, MoreVertical, StickyNote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSetting, useSettings } from "@/hooks/useSettings";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
import {
  useCalendarAppointments,
  useCalendarBlockedTourWeeks,
  useCalendarWeekLaneEmployeePreviews,
  type CalendarAppointment,
} from "@/lib/calendar-appointments";
import { useCalendarMarkers } from "@/lib/calendar-markers";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { apiRequest } from "@/lib/queryClient";
import { buildDayGridTemplate, getDayWeights, normalizeWeekendColumnPercent } from "@/lib/calendar-layout";
import { getPrimaryCalendarMarkerVisualization } from "@/lib/calendar-marker-visualization";
import {
  CALENDAR_UNASSIGNED_TOUR_COLOR,
  compareTourNamesForCalendar,
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
import { CalendarWeekTourLaneDayHoverPreview } from "./CalendarWeekTourLaneDayHoverPreview";
import { CalendarWeekTourLaneHeaderBar } from "./CalendarWeekTourLaneHeaderBar";
import { CalendarWeekNotesButton } from "./CalendarWeekNotesButton";
import { isLaneCollapsed, normalizeExpandedLaneId, resolveCollapsedLaneSelection } from "./weekLaneState";
import { HoverPreview } from "@/components/ui/hover-preview";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ColorSelectButton } from "@/components/ui/color-select-button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditFormContextText } from "@/components/ui/edit-form-context-text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/RichTextEditor";
import { WorkflowNoteRemovalDialog, WorkflowNoteSuggestionDialog } from "@/components/notes/WorkflowNoteDialogs";
import type { CalendarNavCommand, WeekViewRestoreRequest } from "@/pages/Home";
import type { Note, NoteTemplate, Tour } from "@shared/schema";
import type { MonitoringConflictMeta } from "@/lib/monitoring-ui";
import { computeTagAddedAction, computeTagRemovedAction } from "@/hooks/useTagRuleEngine";
import { getStoredUserRole, isReaderRole } from "@/lib/auth";
import {
  buildWorkflowNoteDraft,
  findWorkflowNoteTemplate,
  normalizeWorkflowNoteTitle,
} from "@/lib/workflow-note-templates";
import { CalendarMarkerBadges } from "./CalendarMarkerBadges";

type CalendarWeekViewProps = {
  currentDate: Date;
  employeeFilterId?: number | null;
  readOnly?: boolean;
  weekTileBodyMode?: "collapsed" | "semiexpanded" | "expanded";
  weekLanesCollapsed?: boolean;
  onWeekLanesCollapsedChange?: (collapsed: boolean) => void;
  conflictHighlightActive?: boolean;
  conflictAppointmentMap?: Map<number, MonitoringConflictMeta>;
  navCommand?: CalendarNavCommand;
  onVisibleDateChange?: (date: Date) => void;
  onNewAppointment?: (date: string, options?: { tourId?: number | null; scrollLeft?: number | null; scrollTop?: number | null }) => void;
  onOpenAppointment?: (appointmentId: number, options?: { scrollLeft?: number | null; scrollTop?: number | null }) => void;
  restoreRequest?: WeekViewRestoreRequest | null;
  onRestoreApplied?: () => void;
  onViewportChange?: (viewport: { scrollLeft: number; scrollTop: number }) => void;
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
  dayBuckets: WeekDayBucket[];
};

const normalizeTourName = (value: string | null | undefined) => (value ?? "").trim().toLocaleLowerCase("de").replace(/ß/g, "ss");

function isHistoricalParkplatzAppointment(appointment: CalendarAppointment): boolean {
  return appointment.startDate < getBerlinTodayDateString()
    && normalizeTourName(appointment.tourName) === normalizeTourName("Parkplatz");
}

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
const BLOCKED_WEEK_OVERLAY_STYLE = {
  backgroundImage: "repeating-linear-gradient(135deg, rgba(194,65,12,0.42) 0px, rgba(194,65,12,0.42) 8px, rgba(251,146,60,0.28) 8px, rgba(251,146,60,0.28) 16px)",
  backgroundColor: "rgba(154,52,18,0.22)",
} as const;
const MIN_COLLAPSED_WEEK_CARD_HEIGHT_PX = 180;

const compareAppointmentsForWeekLane = (a: CalendarAppointment, b: CalendarAppointment) => {
  const priorityCompare = getAppointmentStackPriority(a) - getAppointmentStackPriority(b);
  if (priorityCompare !== 0) return priorityCompare;
  return getAppointmentSortValue(a).localeCompare(getAppointmentSortValue(b));
};

function resolveWeekLaneRowMinHeightPx(weekTileBodyMode: "collapsed" | "semiexpanded" | "expanded") {
  return weekTileBodyMode === "collapsed"
    ? Math.min(MIN_COLLAPSED_WEEK_CARD_HEIGHT_PX, MIN_WEEK_CARD_HEIGHT_PX)
    : MIN_WEEK_CARD_HEIGHT_PX;
}

export function resolveVisibleWeekStartFromScroll(params: {
  baseWeekStart: Date;
  weekStarts: Date[];
  viewportMidpoint: number;
  getSectionMetrics: (weekKey: string) => { offsetLeft: number; width: number } | null;
}): Date {
  const { baseWeekStart, weekStarts, viewportMidpoint, getSectionMetrics } = params;
  let closestWeekStart = baseWeekStart;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const weekStart of weekStarts) {
    const weekKey = format(weekStart, "yyyy-MM-dd");
    const sectionMetrics = getSectionMetrics(weekKey);
    if (!sectionMetrics) continue;

    const sectionMidpoint = sectionMetrics.offsetLeft + (sectionMetrics.width / 2);
    const distance = Math.abs(sectionMidpoint - viewportMidpoint);
    if (distance >= closestDistance) continue;

    closestDistance = distance;
    closestWeekStart = weekStart;
  }

  return closestWeekStart;
}

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

  const occupiedCells = new Set<string>();
  const spanningAppointments: WeekLaneRenderData["spanningAppointments"] = [];

  const spanningCandidates = distinctAppointments.filter((appointment) => getAppointmentDurationDays(appointment) > 0);

  for (const appointment of spanningCandidates) {
    const occupiedDayIndices = tourLane.dayBuckets
      .filter((dayBucket) => dayBucket.appointments.includes(appointment.id))
      .map((dayBucket) => dayBucket.dayIndex);
    if (occupiedDayIndices.length === 0) {
      continue;
    }

    let rowIndex = 0;
    while (occupiedDayIndices.some((dayIndex) => occupiedCells.has(`${rowIndex}-${dayIndex}`))) {
      rowIndex += 1;
    }

    occupiedDayIndices.forEach((dayIndex) => {
      occupiedCells.add(`${rowIndex}-${dayIndex}`);
    });

    spanningAppointments.push({
      appointmentId: appointment.id,
      rowIndex,
    });
  }

  const hasSingleDayAppointments = distinctAppointments.some((appointment) => getAppointmentDurationDays(appointment) === 0);
  const tileRowCount =
    spanningAppointments.length > 0
      ? Math.max(...spanningAppointments.map((appointment) => appointment.rowIndex)) + 1
      : hasSingleDayAppointments
        ? 1
        : 0;

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
  readOnly = false,
  weekTileBodyMode: weekTileBodyModeProp,
  weekLanesCollapsed: weekLanesCollapsedProp,
  onWeekLanesCollapsedChange,
  conflictHighlightActive = false,
  conflictAppointmentMap = new Map<number, MonitoringConflictMeta>(),
  navCommand: _navCommand,
  onVisibleDateChange: _onVisibleDateChange,
  onNewAppointment,
  onOpenAppointment,
  restoreRequest,
  onRestoreApplied,
  onViewportChange,
}: CalendarWeekViewProps) {
  // FIX-RULE:
  // Navigation/Sync-Signale werden absichtlich nicht verarbeitet.
  // Zeitraumwechsel darf nur explizit über Home-Buttons und currentDate erfolgen.
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<number | null>(null);
  const [hoveredAppointmentId, setHoveredAppointmentId] = useState<number | null>(null);
  const [noteSuggestionDialog, setNoteSuggestionDialog] = useState<{ templateTitle: string; appointmentId: number } | null>(null);
  const [noteRemovalDialog, setNoteRemovalDialog] = useState<{ templateTitle: string; appointmentId: number; noteId: number; noteVersion: number } | null>(null);
  const [workflowNoteEditorOpen, setWorkflowNoteEditorOpen] = useState(false);
  const [workflowNoteEditorAppointmentId, setWorkflowNoteEditorAppointmentId] = useState<number | null>(null);
  const [workflowNoteEditorId, setWorkflowNoteEditorId] = useState<number | null>(null);
  const [workflowNoteEditorVersion, setWorkflowNoteEditorVersion] = useState<number>(1);
  const [workflowNoteTitle, setWorkflowNoteTitle] = useState("");
  const [workflowNoteBody, setWorkflowNoteBody] = useState("");
  const [workflowNoteCardColor, setWorkflowNoteCardColor] = useState<string>("#f8fafc");
  const [workflowNotePrint, setWorkflowNotePrint] = useState(false);
  const [workflowNoteCardColorLocked, setWorkflowNoteCardColorLocked] = useState(false);
  const [visibleWeekStart, setVisibleWeekStart] = useState(() => startOfWeek(currentDate, { weekStartsOn: 1, locale: de }));
  const cardHeightByLaneRef = useRef<Map<string, number>>(new Map());
  const projectStatusHeightByWeekRef = useRef<Map<string, number>>(new Map());
  const firstWeekdayHeaderRef = useRef<HTMLDivElement | null>(null);
  const horizontalScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const weekSectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const weekScrollContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingLaneCorrectionRef = useRef<string | null>(null);
  const [, setAppointmentHeightVersion] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setSetting } = useSettings();
  const userRole = useMemo(() => getStoredUserRole(), []);
  const isReaderCalendarReadOnly = readOnly || isReaderRole(userRole);

  const weekendColumnPercentSetting = useSetting("calendarWeekendColumnPercent");
  const weekScrollRangeSetting = useSetting("calendarWeekScrollRange");
  const persistedIsCollapsed = useSetting("calendar.weekLanes.isCollapsed");
  const persistedExpandedLaneIdRaw = useSetting("calendar.weekLanes.expandedLaneId");
  const persistedWeekTileBodyMode = useSetting("calendar.weekTileBodyMode");
  const markerVisualizationStyle = useSetting("calendar.markerVisualizationStyle") ?? "standard";
  const isAdmin = userRole === "ADMIN";
  const canWriteNotes = userRole !== "READER";
  const weekendColumnPercent = normalizeWeekendColumnPercent(weekendColumnPercentSetting);
  const extraWeekCount =
    typeof weekScrollRangeSetting === "number" && Number.isInteger(weekScrollRangeSetting) && weekScrollRangeSetting >= 0
      ? Math.min(weekScrollRangeSetting, 12)
      : 4;
  const weekTileBodyMode = weekTileBodyModeProp ?? persistedWeekTileBodyMode ?? "semiexpanded";
  const isCollapsedMode = typeof weekLanesCollapsedProp === "boolean" ? weekLanesCollapsedProp : Boolean(persistedIsCollapsed);
  const persistedExpandedLaneId = normalizeExpandedLaneId(persistedExpandedLaneIdRaw ?? "");
  const canManageAppointmentTags = !isReaderCalendarReadOnly && (userRole === "ADMIN" || userRole === "DISPATCHER");
  const canManageWeekPlanning = !isReaderCalendarReadOnly && (userRole === "ADMIN" || userRole === "DISPATCHER");
  const { data: noteTemplates = [] } = useQuery<NoteTemplate[]>({
    queryKey: ["/api/note-templates"],
    queryFn: async () => {
      const response = await fetch("/api/note-templates", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Notizvorlagen konnten nicht geladen werden.");
      }
      return response.json() as Promise<NoteTemplate[]>;
    },
  });

  const dayWeights = useMemo(
    () => getDayWeights(weekendColumnPercent),
    [weekendColumnPercent],
  );

  const baseWeekStart = startOfWeek(currentDate, { weekStartsOn: 1, locale: de });
  const scrollResetKey = format(baseWeekStart, "yyyy-MM-dd");
  const berlinToday = getBerlinTodayDateString();

  const weekStarts = useMemo(
    () => Array.from({ length: extraWeekCount + 1 }, (_, index) => addWeeks(baseWeekStart, index)),
    [baseWeekStart, extraWeekCount],
  );

  const stripFromDate = format(weekStarts[0], "yyyy-MM-dd");
  const stripToDate = format(endOfWeek(weekStarts[weekStarts.length - 1], { weekStartsOn: 1, locale: de }), "yyyy-MM-dd");

  useEffect(() => {
    setVisibleWeekStart(baseWeekStart);
  }, [baseWeekStart]);

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
    const horizontalNode = horizontalScrollContainerRef.current;
    const verticalNode = weekScrollContainerRefs.current.get(scrollResetKey);
    if (!horizontalNode || !verticalNode || !onViewportChange) return;

    const publishViewport = () => {
      onViewportChange({
        scrollLeft: horizontalNode.scrollLeft,
        scrollTop: verticalNode.scrollTop,
      });
    };

    publishViewport();
    horizontalNode.addEventListener("scroll", publishViewport, { passive: true });
    verticalNode.addEventListener("scroll", publishViewport, { passive: true });

    return () => {
      horizontalNode.removeEventListener("scroll", publishViewport);
      verticalNode.removeEventListener("scroll", publishViewport);
    };
  }, [onViewportChange, scrollResetKey]);

  useEffect(() => {
    const horizontalNode = horizontalScrollContainerRef.current;
    if (!horizontalNode) return;

    const syncVisibleWeekStart = () => {
      const closestWeekStart = resolveVisibleWeekStartFromScroll({
        baseWeekStart,
        weekStarts,
        viewportMidpoint: horizontalNode.scrollLeft + (horizontalNode.clientWidth / 2),
        getSectionMetrics: (weekKey) => {
          const sectionNode = weekSectionRefs.current.get(weekKey);
          if (!sectionNode) return null;
          return {
            offsetLeft: sectionNode.offsetLeft,
            width: sectionNode.clientWidth,
          };
        },
      });

      setVisibleWeekStart((currentVisibleWeekStart) =>
        currentVisibleWeekStart.getTime() === closestWeekStart.getTime() ? currentVisibleWeekStart : closestWeekStart,
      );
    };

    syncVisibleWeekStart();
    horizontalNode.addEventListener("scroll", syncVisibleWeekStart, { passive: true });

    return () => {
      horizontalNode.removeEventListener("scroll", syncVisibleWeekStart);
    };
  }, [baseWeekStart, weekStarts, scrollResetKey]);

  const { data: appointments = [] } = useCalendarAppointments({
    fromDate: stripFromDate,
    toDate: stripToDate,
    employeeId: employeeFilterId ?? undefined,
    detail: "full",
    userRole,
  });
  const { data: weekLaneEmployeePreviews = [] } = useCalendarWeekLaneEmployeePreviews({
    fromDate: stripFromDate,
    toDate: stripToDate,
  });
  const { data: blockedTourWeeks = [] } = useCalendarBlockedTourWeeks({
    fromDate: stripFromDate,
    toDate: stripToDate,
  });
  const { data: calendarMarkers = [] } = useCalendarMarkers({
    fromDate: stripFromDate,
    toDate: stripToDate,
    userRole,
  });
  const calendarMarkersByDate = useMemo(() => {
    const result = new Map<string, typeof calendarMarkers>();
    for (const marker of calendarMarkers) {
      const markerEndDate = marker.endDate ?? marker.date;
      for (
        let cursor = parseISO(marker.date);
        format(cursor, "yyyy-MM-dd") <= markerEndDate;
        cursor = addDays(cursor, 1)
      ) {
        const dateKey = format(cursor, "yyyy-MM-dd");
        if (dateKey < stripFromDate || dateKey > stripToDate) {
          continue;
        }
        result.set(dateKey, [...(result.get(dateKey) ?? []), marker]);
      }
    }
    return result;
  }, [calendarMarkers, stripFromDate, stripToDate]);

  useEffect(() => {
    cardHeightByLaneRef.current.clear();
    projectStatusHeightByWeekRef.current.clear();
    setAppointmentHeightVersion((prev) => prev + 1);
  }, [appointments, scrollResetKey, weekTileBodyMode]);

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const appointmentsById = useMemo(
    () => new Map(appointments.map((appointment) => [appointment.id, appointment] as const)),
    [appointments],
  );

  const weekLaneEmployeePreviewByTourDay = useMemo(
    () => new Map(
      weekLaneEmployeePreviews.map((preview) => [`${preview.tourId}-${preview.date}`, preview] as const),
    ),
    [weekLaneEmployeePreviews],
  );

  const blockedTourWeekKeys = useMemo(
    () => new Set(blockedTourWeeks
      .filter((week) => week.isBlocked)
      .map((week) => `${week.tourId}-${week.isoYear}-${week.isoWeek}`)),
    [blockedTourWeeks],
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
        .sort((a, b) => compareTourNamesForCalendar(a.name, b.name))
        .map((tour) => ({
          laneKey: `tour-${tour.id}`,
          label: tour.name,
          color: tour.color,
          tourId: tour.id,
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
        dayBuckets: Array.from({ length: 7 }, (_, dayIndex) => ({
          dayIndex,
          dateKey: format(addDays(weekStart, dayIndex), "yyyy-MM-dd"),
          appointments: [],
        })),
      };

      const regularLanes = initialLanes.filter((lane) => !isAbsenceTourName(lane.label));
      const absenceLanes = initialLanes.filter((lane) => isAbsenceTourName(lane.label));
      const lanes = [...regularLanes, unassignedLane, ...absenceLanes];
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
  }, [appointments, appointmentsById, tours, weekStarts]);

  const getLaneRenderData = (tourLane: WeekTourLane): WeekLaneRenderData =>
    buildWeekLaneRenderData(tourLane, appointmentsById);

  const invalidateWeekPlanningViews = async () => {
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && (
          key[0] === "calendarAppointments"
          || key[0] === "calendarWeekLaneEmployeePreviews"
          || key[0] === "calendarBlockedTourWeeks"
          || key[0] === "/api/appointments"
          || (typeof key[0] === "string" && key[0].startsWith("/api/tours/") && key[0].endsWith("/week-employees"))
        );
      },
    });
  };

  const blockWeekMutation = useMutation({
    mutationFn: async (params: { tourId: number; isoYear: number; isoWeek: number }) => {
      const response = await apiRequest("POST", `/api/tours/${params.tourId}/weeks/${params.isoYear}/${params.isoWeek}/block`);
      return response.json() as Promise<{ affectedAppointmentCount: number }>;
    },
    onSuccess: async () => {
      await invalidateWeekPlanningViews();
      await refreshMonitoringWithNotification(toast);
    },
  });

  const unblockWeekMutation = useMutation({
    mutationFn: async (params: { tourId: number; isoYear: number; isoWeek: number }) => {
      const response = await apiRequest("POST", `/api/tours/${params.tourId}/weeks/${params.isoYear}/${params.isoWeek}/unblock`);
      return response.json() as Promise<{ affectedAppointmentCount: number }>;
    },
    onSuccess: async () => {
      await invalidateWeekPlanningViews();
      await refreshMonitoringWithNotification(toast);
    },
  });

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

  useEffect(() => {
    if (!restoreRequest) return;

    const frame = window.requestAnimationFrame(() => {
      const targetAppointmentId = restoreRequest.focusAppointmentId;
      if (typeof targetAppointmentId === "number" && Number.isFinite(targetAppointmentId)) {
        const targetAppointment = appointmentsById.get(targetAppointmentId);
        if (!targetAppointment) return;

        const targetLaneKey = targetAppointment.tourId ? `tour-${targetAppointment.tourId}` : "tour-unassigned";
        if (isCollapsedMode && effectiveExpandedLaneId !== targetLaneKey) {
          void persistExpandedLaneId(targetLaneKey).catch((error) => {
            console.error(`${logPrefix} failed to expand lane for restore`, error);
            toast({
              title: "Lane-Zustand konnte nicht gespeichert werden",
              description: "Bitte erneut versuchen.",
              variant: "destructive",
            });
          });
          return;
        }

        const targetElement = document.querySelector<HTMLElement>(
          `[data-testid="week-spanning-tile-${targetAppointmentId}"], [data-testid="week-appointment-panel-${targetAppointmentId}"]`,
        );
        if (!targetElement) return;

        const sectionEntry = Array.from(weekSectionRefs.current.entries()).find(([, sectionNode]) => sectionNode.contains(targetElement));
        if (!sectionEntry) return;

        const [weekKey, sectionNode] = sectionEntry;
        const horizontalNode = horizontalScrollContainerRef.current;
        const verticalNode = weekScrollContainerRefs.current.get(weekKey);
        if (horizontalNode) {
          horizontalNode.scrollLeft = Math.max(0, sectionNode.offsetLeft);
        }
        if (verticalNode) {
          const targetRect = targetElement.getBoundingClientRect();
          const containerRect = verticalNode.getBoundingClientRect();
          const verticalOffset = Math.max(
            0,
            verticalNode.scrollTop
              + (targetRect.top - containerRect.top)
              - Math.max(24, Math.round((verticalNode.clientHeight - targetRect.height) / 2)),
          );
          verticalNode.scrollTop = verticalOffset;
        }
        onRestoreApplied?.();
        return;
      }

      const horizontalNode = horizontalScrollContainerRef.current;
      const verticalNode = weekScrollContainerRefs.current.get(scrollResetKey);
      if (horizontalNode && typeof restoreRequest.scrollLeft === "number" && Number.isFinite(restoreRequest.scrollLeft)) {
        horizontalNode.scrollLeft = Math.max(0, restoreRequest.scrollLeft);
      }
      if (verticalNode && typeof restoreRequest.scrollTop === "number" && Number.isFinite(restoreRequest.scrollTop)) {
        verticalNode.scrollTop = Math.max(0, restoreRequest.scrollTop);
      }
      onRestoreApplied?.();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    appointmentsById,
    effectiveExpandedLaneId,
    isCollapsedMode,
    onRestoreApplied,
    restoreRequest,
    scrollResetKey,
    toast,
  ]);

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

  const handleLaneHeaderClick = async (laneKey: string) => {
    if (!isCollapsedMode) return;
    if (effectiveExpandedLaneId === laneKey) return;
    await persistExpandedLaneId(laneKey);
  };

  const handleAppointmentClick = (appointmentId: number) => {
    const appointment = appointmentsById.get(appointmentId);
    if (!appointment) return;
    const weekScrollTop = weekScrollContainerRefs.current.get(scrollResetKey)?.scrollTop ?? null;
    const weekScrollLeft = horizontalScrollContainerRef.current?.scrollLeft ?? null;
    console.info(`${logPrefix} open appointment`, { appointmentId });
    onOpenAppointment?.(appointmentId, { scrollLeft: weekScrollLeft, scrollTop: weekScrollTop });
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

  const loadAppointmentNotes = async (appointmentId: number) => {
    const response = await fetch(`/api/appointments/${appointmentId}/notes`, { credentials: "include" });
    if (!response.ok) {
      throw new Error("Terminnotizen konnten nicht geladen werden.");
    }
    return response.json() as Promise<Array<{ id: number; version: number; title: string }>>;
  };

  const createAppointmentNoteMutation = useMutation({
    mutationFn: async ({ appointmentId, title, body, cardColor, print, templateId }: {
      appointmentId: number;
      title: string;
      body: string;
      cardColor?: string | null;
      print: boolean;
      templateId?: number;
      openEditorOnSuccess?: boolean;
    }) => {
      const response = await apiRequest("POST", `/api/appointments/${appointmentId}/notes`, {
        title,
        body,
        cardColor,
        print,
        templateId,
      });
      return response.json() as Promise<Note>;
    },
    onSuccess: async (createdNote, variables) => {
      if (variables.openEditorOnSuccess) {
        setWorkflowNoteEditorAppointmentId(variables.appointmentId);
        setWorkflowNoteEditorId(createdNote.id);
        setWorkflowNoteEditorVersion(createdNote.version);
        setWorkflowNoteTitle(createdNote.title);
        setWorkflowNoteBody(createdNote.body ?? "");
        setWorkflowNoteCardColor(createdNote.cardColor ?? "#f8fafc");
        setWorkflowNotePrint(createdNote.print);
        setWorkflowNoteCardColorLocked(createdNote.cardColorLocked);
        setWorkflowNoteEditorOpen(true);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments", variables.appointmentId, "notes"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await refreshMonitoringWithNotification(toast);
    },
    onError: (error: Error) => {
      toast({ title: "Notiz konnte nicht erstellt werden", description: error.message, variant: "destructive" });
    },
  });

  const updateWorkflowAppointmentNoteMutation = useMutation({
    mutationFn: async ({
      noteId,
      version,
      title,
      body,
      cardColor,
      print,
    }: {
      noteId: number;
      version: number;
      title: string;
      body: string;
      cardColor?: string | null;
      print: boolean;
    }) => {
      const response = await apiRequest("PUT", `/api/notes/${noteId}`, { title, body, cardColor, print, version });
      return response.json() as Promise<Note>;
    },
    onSuccess: async (updatedNote) => {
      setWorkflowNoteEditorVersion(updatedNote.version);
      setWorkflowNoteEditorOpen(false);
      if (workflowNoteEditorAppointmentId) {
        await queryClient.invalidateQueries({ queryKey: ["/api/appointments", workflowNoteEditorAppointmentId, "notes"] });
      }
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await refreshMonitoringWithNotification(toast);
    },
    onError: (error: Error) => {
      toast({ title: "Notiz konnte nicht aktualisiert werden", description: error.message, variant: "destructive" });
    },
  });

  const deleteAppointmentNoteMutation = useMutation({
    mutationFn: async ({ appointmentId, noteId, version }: { appointmentId: number; noteId: number; version: number }) => {
      await apiRequest("DELETE", `/api/appointments/${appointmentId}/notes/${noteId}`, { version });
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments", variables.appointmentId, "notes"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await refreshMonitoringWithNotification(toast);
    },
    onError: (error: Error) => {
      toast({ title: "Notiz konnte nicht gelöscht werden", description: error.message, variant: "destructive" });
    },
  });

  const applyDropMutationEvents = (params: {
    appointmentId: number;
    mutationEvents: AppointmentMutationEvent[] | undefined;
    notes: Array<{ id: number; version: number; title: string }>;
  }) => {
    if (!params.mutationEvents || params.mutationEvents.length === 0) {
      return;
    }

    for (const event of params.mutationEvents) {
      if (event.kind !== "tag_mutated") {
        continue;
      }

      if (event.action === "added") {
        const action = computeTagAddedAction(
          event.tagName,
          params.appointmentId,
          params.notes.map((note) => ({ title: note.title })),
        );
        if (action.kind === "show_note_suggestion_dialog") {
          setNoteSuggestionDialog({
            templateTitle: action.templateTitle,
            appointmentId: params.appointmentId,
          });
        }
        continue;
      }

      const action = computeTagRemovedAction(
        event.tagName,
        params.notes.map((note) => ({ title: note.title })),
      );
      if (action.kind !== "show_note_removal_dialog") {
        continue;
      }

      const matchingNote = params.notes.find((note) => normalizeWorkflowNoteTitle(note.title) === normalizeWorkflowNoteTitle(action.templateTitle));
      if (!matchingNote) {
        continue;
      }
      setNoteRemovalDialog({
        templateTitle: action.templateTitle,
        appointmentId: params.appointmentId,
        noteId: matchingNote.id,
        noteVersion: matchingNote.version,
      });
    }
  };

  const handleAppointmentTagMutationEvents = async (
    appointmentId: number,
    mutationEvents: AppointmentMutationEvent[] | undefined,
  ) => {
    if (!mutationEvents || mutationEvents.length === 0) {
      return;
    }
    const existingNotes = await loadAppointmentNotes(appointmentId);
    applyDropMutationEvents({
      appointmentId,
      mutationEvents,
      notes: existingNotes,
    });
  };

  const handleCreateAppointmentNoteFromSuggestion = () => {
    if (!noteSuggestionDialog) return;
    const template = findWorkflowNoteTemplate(noteTemplates, noteSuggestionDialog.templateTitle);
    if (!template) {
      toast({
        title: "Notizvorlage fehlt",
        description: `Die Notizvorlage „${noteSuggestionDialog.templateTitle}“ wurde nicht gefunden.`,
        variant: "destructive",
      });
      return;
    }
    createAppointmentNoteMutation.mutate({
      appointmentId: noteSuggestionDialog.appointmentId,
      ...buildWorkflowNoteDraft(template),
      openEditorOnSuccess: true,
    });
    setNoteSuggestionDialog(null);
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

    const responseBody = await response.json().catch(() => null) as { message?: string; code?: string; mutationEvents?: AppointmentMutationEvent[] } | null;

    if (!response.ok) {
      if (responseBody?.code === "VERSION_CONFLICT") {
        throw new Error("Termin wurde zwischenzeitlich geaendert. Bitte neu laden.");
      }
      if (responseBody?.code === "VALIDATION_ERROR") {
        throw new Error(responseBody?.message ?? "Termin kann nicht verschoben werden. Bitte neu laden.");
      }
      throw new Error(responseBody?.message ?? "Termin konnte nicht verschoben werden");
    }

    const existingNotes = await loadAppointmentNotes(appointmentId);
    applyDropMutationEvents({
      appointmentId,
      mutationEvents: responseBody?.mutationEvents,
      notes: existingNotes,
    });

    await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
    await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
    await refreshMonitoringWithNotification(toast);
    console.info(`${logPrefix} drop success`, { appointmentId });
    return true;
  };

  const handleDrop = async (event: React.DragEvent, targetDate: Date) => {
    if (isReaderCalendarReadOnly) {
      event.preventDefault();
      setDraggedAppointmentId(null);
      return;
    }

    event.preventDefault();
    const appointmentId = Number(event.dataTransfer.getData("text/plain"));
    if (!appointmentId) return;

    const appointment = appointmentsById.get(appointmentId);
    if (!appointment) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentStart = parseISO(appointment.startDate);
    const isHistoricalParkplatz = isHistoricalParkplatzAppointment(appointment);

    if (appointmentStart < today && !isHistoricalParkplatz) {
      console.info(`${logPrefix} drop blocked: past source`, { appointmentId, startDate: appointment.startDate });
      toast({
        title: "Verschieben nicht erlaubt",
        description: "Vergangene Termine können nicht per Drag & Drop verschoben werden.",
        variant: "destructive",
      });
      setDraggedAppointmentId(null);
      return;
    }

    if (targetDate < today && !isHistoricalParkplatz) {
      console.info(`${logPrefix} drop blocked: past target`, { appointmentId, targetDate: format(targetDate, "yyyy-MM-dd") });
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
        description: "Stornierte Termine koennen nicht verschoben werden.",
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
      await persistDropMutation({
        appointmentId,
        version: appointment.version,
        projectId: appointment.projectId,
        customerId: appointment.customer.id,
        tourId: appointment.tourId ?? null,
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

  const measureLaneCardHeight = (laneKey: string, node: HTMLDivElement | null, footerSafeSpacePx = 0) => {
    if (!node) return;
    const heightPx = Math.max(0, Math.round(node.getBoundingClientRect().height) - footerSafeSpacePx);
    if (heightPx <= 0) return;
    const currentLaneHeightPx = cardHeightByLaneRef.current.get(laneKey) ?? 0;
    if (heightPx <= currentLaneHeightPx) return;
    cardHeightByLaneRef.current.set(laneKey, heightPx);
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

  const visibleWeekEnd = endOfWeek(visibleWeekStart, { weekStartsOn: 1, locale: de });

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden">
      <div className="relative z-30 flex items-center justify-between border-b border-border/40 bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-primary">KW {getISOWeek(visibleWeekStart)}</span>
          <span className="text-sm text-muted-foreground">
            {format(visibleWeekStart, "d. MMMM", { locale: de })} - {format(visibleWeekEnd, "d. MMMM yyyy", { locale: de })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kacheln</span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => {
                void setSetting({
                  key: "calendar.weekTileBodyMode",
                  scopeType: "USER",
                  value: "collapsed",
                });
              }}
              data-testid="toggle-week-tile-body-mode-collapsed"
              className={`rounded-md px-3 py-1.5 text-left text-[10px] font-semibold leading-none transition-all ${
                weekTileBodyMode === "collapsed"
                  ? "border border-slate-200 bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Kompakt
            </button>
            <button
              type="button"
              onClick={() => {
                void setSetting({
                  key: "calendar.weekTileBodyMode",
                  scopeType: "USER",
                  value: "semiexpanded",
                });
              }}
              data-testid="toggle-week-tile-body-mode-semiexpanded"
              className={`rounded-md px-3 py-1.5 text-left text-[10px] font-semibold leading-none transition-all ${
                weekTileBodyMode === "semiexpanded"
                  ? "border border-slate-200 bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => {
                void setSetting({
                  key: "calendar.weekTileBodyMode",
                  scopeType: "USER",
                  value: "expanded",
                });
              }}
              data-testid="toggle-week-tile-body-mode-expanded"
              className={`rounded-md px-3 py-1.5 text-left text-[10px] font-semibold leading-none transition-all ${
                weekTileBodyMode === "expanded"
                  ? "border border-slate-200 bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Detail
            </button>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Touren</span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => onWeekLanesCollapsedChange?.(false)}
              data-testid="toggle-week-lanes-expanded"
              className={`rounded-md px-3 py-1.5 text-left text-[10px] font-semibold leading-none transition-all ${
                !isCollapsedMode
                  ? "border border-slate-200 bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Aufgeklappt
            </button>
            <button
              type="button"
              onClick={() => onWeekLanesCollapsedChange?.(true)}
              data-testid="toggle-week-lanes-collapsed"
              className={`rounded-md px-3 py-1.5 text-left text-[10px] font-semibold leading-none transition-all ${
                isCollapsedMode
                  ? "border border-slate-200 bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Zugeklappt
            </button>
          </div>
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
      <div key={scrollResetKey} ref={horizontalScrollContainerRef} className="relative z-0 flex-1 overflow-x-auto overflow-y-hidden">
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

            const weekDayWeights = dayWeights.map((weight, dayIdx) =>
              dayIdx >= 5 && dayHeaderBadges[dayIdx].length > 0 ? 1 : weight,
            );
            const weekDayGridTemplate = buildDayGridTemplate(weekDayWeights);

            return (
              <section
                key={weekKey}
                ref={(node) => {
                  if (node) {
                    weekSectionRefs.current.set(weekKey, node);
                  } else {
                    weekSectionRefs.current.delete(weekKey);
                  }
                }}
                className="w-full min-w-full h-full border-r border-border/30 last:border-r-0"
              >
                <div
                  ref={(node) => {
                    if (node) {
                      weekScrollContainerRefs.current.set(weekKey, node);
                    } else {
                      weekScrollContainerRefs.current.delete(weekKey);
                    }
                  }}
                  className="h-full flex flex-col overflow-y-auto"
                >
                  <div className="sticky top-0 z-20 grid divide-x divide-border/30 border-b border-border/30 bg-background" style={{ gridTemplateColumns: weekDayGridTemplate }}>
                    {days.map((day, dayIdx) => {
                      const isTodayDate = isToday(day);
                      const isWeekend = dayIdx >= 5;
                      const dayKey = format(day, "yyyy-MM-dd");
                      const dayMarkers = calendarMarkersByDate.get(dayKey) ?? [];
                      const dayMarkerVisualization = getPrimaryCalendarMarkerVisualization(dayMarkers, markerVisualizationStyle);

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
                              ${dayMarkerVisualization?.headerClassName ?? ""}
                            `}
                            data-marker-visualization={dayMarkerVisualization?.tone ?? "none"}
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
                            <CalendarMarkerBadges markers={dayMarkers} visualizationStyle={markerVisualizationStyle} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-3 pb-3">
                    {weekLanes.map((tourLane) => {
                      const dayAppointmentCounts = tourLane.dayBuckets.map((bucket) => bucket.appointments.length);
                      const laneRenderData = getLaneRenderData(tourLane);
                      const isCompactWeekMode = weekTileBodyMode === "collapsed";
                      const laneRowMinHeightPx = resolveWeekLaneRowMinHeightPx(weekTileBodyMode);
                      const getLaneHeightKey = (rowKey: string) => `${weekKey}:${tourLane.laneKey}:${rowKey}`;
                      const getLaneUniformHeightPx = (rowKey: string) => isCompactWeekMode
                        ? null
                        : (cardHeightByLaneRef.current.get(getLaneHeightKey(rowKey)) ?? null);
                      const projectStatusAreaHeightPx = projectStatusHeightByWeekRef.current.get(weekKey) ?? null;
                      const tileRowCount = laneRenderData.tileRowCount;
                      const needsDayCellRow = laneRenderData.needsDayCellRow;
                      const totalLaneRowCount = tileRowCount + (needsDayCellRow ? 1 : 0);
                      const laneGridRowCount = Math.max(1, totalLaneRowCount);
                      const hasLaneContent = totalLaneRowCount > 0;
                      const laneGridTemplateRows =
                        hasLaneContent
                          ? [
                              ...Array.from(
                                { length: tileRowCount },
                                () => `minmax(${laneRowMinHeightPx}px, auto)`,
                              ),
                              ...(needsDayCellRow
                                ? [`minmax(${laneRowMinHeightPx}px, auto)`]
                                : []),
                            ].join(" ")
                          : `minmax(${laneRowMinHeightPx}px, auto)`;
                      const isoYear = getISOWeekYear(weekStart);
                      const isoWeek = getISOWeek(weekStart);
                      const isLaneBlocked = tourLane.tourId != null
                        && blockedTourWeekKeys.has(`${tourLane.tourId}-${isoYear}-${isoWeek}`);
                      const isLaneWeekLocked = weekKey <= format(startOfWeek(new Date(), { weekStartsOn: 1, locale: de }), "yyyy-MM-dd");
                      const isAbsenceLane = isAbsenceTourName(tourLane.label);

                      return (
                      <CalendarWeekNotesButton
                        key={tourLane.laneKey}
                        yearNumber={isoYear}
                        weekNumber={isoWeek}
                        tourId={tourLane.tourId ?? null}
                        tourLabel={tourLane.label}
                            readOnly={!canWriteNotes || isAbsenceLane}
                      >
                        {({ iconSlot, countSlot, dialog, openDialog }) => (
                        <div className="rounded-lg border border-border/40 bg-muted/10">
                        <div className="relative">
                          <CalendarWeekTourLaneHeaderBar
                            label={tourLane.label}
                            color={tourLane.color}
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
                            weekNotesIcon={iconSlot}
                            weekNotesCount={countSlot}
                            menuSlot={(
                              <span
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => event.stopPropagation()}
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="flex items-center justify-center rounded p-0.5 opacity-70 transition-opacity hover:bg-white/20 hover:opacity-100"
                                      aria-label="Wochenaktionen"
                                      data-testid={`week-tour-lane-menu-trigger-${tourLane.laneKey}`}
                                    >
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="min-w-[190px]">
                                    <DropdownMenuItem
                                      onClick={() => openDialog()}
                                      className="gap-2 text-xs cursor-pointer"
                                    >
                                      <StickyNote className="h-3.5 w-3.5 shrink-0" />
                                      {canWriteNotes ? "Notizen verwalten" : "Notizen anzeigen"}
                                    </DropdownMenuItem>
                                    {!isReaderCalendarReadOnly && tourLane.tourId != null && !isAbsenceLane ? (
                                      isLaneBlocked ? (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            void unblockWeekMutation.mutateAsync({
                                              tourId: tourLane.tourId!,
                                              isoYear,
                                              isoWeek,
                                            }).then(() => {
                                              toast({
                                                title: "Wochenplanung freigegeben",
                                              });
                                            }).catch(() => {
                                              toast({
                                                title: "Wochenplanung konnte nicht freigegeben werden",
                                                description: "Bitte erneut versuchen.",
                                                variant: "destructive",
                                              });
                                            });
                                          }}
                                          disabled={!canManageWeekPlanning || isLaneWeekLocked || unblockWeekMutation.isPending}
                                          className="gap-2 text-xs cursor-pointer"
                                        >
                                          <LockOpen className="h-3.5 w-3.5 shrink-0" />
                                          Wochenplanung freigeben
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            void blockWeekMutation.mutateAsync({
                                              tourId: tourLane.tourId!,
                                              isoYear,
                                              isoWeek,
                                            }).then(() => {
                                              toast({
                                                title: "Wochenplanung blockiert",
                                              });
                                            }).catch(() => {
                                              toast({
                                                title: "Wochenplanung konnte nicht blockiert werden",
                                                description: "Bitte erneut versuchen.",
                                                variant: "destructive",
                                              });
                                            });
                                          }}
                                          disabled={!canManageWeekPlanning || isLaneWeekLocked || blockWeekMutation.isPending}
                                          className="gap-2 text-xs cursor-pointer"
                                        >
                                          <Lock className="h-3.5 w-3.5 shrink-0" />
                                          Wochenplanung blockieren
                                        </DropdownMenuItem>
                                      )
                                    ) : null}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </span>
                            )}
                          />
                          {isLaneBlocked ? (
                            <div
                              className="pointer-events-none absolute inset-0 rounded-md"
                              style={BLOCKED_WEEK_OVERLAY_STYLE}
                              aria-hidden
                            />
                          ) : null}
                          <div
                            className="pointer-events-none absolute inset-0 grid"
                            style={{ gridTemplateColumns: weekDayGridTemplate }}
                            aria-hidden
                          >
                            {tourLane.dayBuckets.map((dayBucket, dayIdx) => {
                              const markerVisualization = getPrimaryCalendarMarkerVisualization(
                                calendarMarkersByDate.get(dayBucket.dateKey) ?? [],
                                markerVisualizationStyle,
                              );
                              return (
                                <div
                                  key={`lane-divider-${tourLane.laneKey}-${dayBucket.dateKey}`}
                                  className={`${dayIdx === 0 ? "" : "border-l border-white/20"} ${markerVisualization?.columnClassName ?? ""}`}
                                  data-testid={`week-tour-lane-day-divider-${tourLane.laneKey}-${dayBucket.dateKey}`}
                                  data-marker-visualization={markerVisualization?.tone ?? "none"}
                                />
                              );
                            })}
                          </div>
                          <div
                            className="pointer-events-none absolute inset-0 grid"
                            style={{ gridTemplateColumns: weekDayGridTemplate }}
                          >
                            {tourLane.dayBuckets.map((dayBucket, dayIdx) => {
                              const dayPreview = tourLane.tourId == null
                                ? null
                                : weekLaneEmployeePreviewByTourDay.get(`${tourLane.tourId}-${dayBucket.dateKey}`) ?? {
                                    date: dayBucket.dateKey,
                                    weekStartDate: format(startOfWeek(parseISO(dayBucket.dateKey), { weekStartsOn: 1, locale: de }), "yyyy-MM-dd"),
                                    tourId: tourLane.tourId,
                                    weekEmployees: [],
                                    additionalDayEmployees: [],
                                  };

                              return (
                                <HoverPreview
                                  key={`lane-add-${tourLane.laneKey}-${dayBucket.dateKey}`}
                                  preview={dayPreview ? (
                                    <CalendarWeekTourLaneDayHoverPreview
                                      weekEmployees={dayPreview.weekEmployees}
                                      additionalDayEmployees={dayPreview.additionalDayEmployees}
                                    />
                                  ) : null}
                                  side="bottom"
                                  align="start"
                                  maxWidth={320}
                                  maxHeight={320}
                                  className="z-[9999] w-[320px]"
                                >
                                  <div
                                    className="pointer-events-auto relative flex h-full items-center justify-end gap-1 px-1"
                                    data-testid={`week-tour-lane-day-hover-trigger-${tourLane.laneKey}-${dayBucket.dateKey}`}
                                    onClick={() => {
                                      if (!isCollapsedMode) return;
                                      void handleLaneHeaderClick(tourLane.laneKey).catch((error) => {
                                        console.error(`${logPrefix} lane day hover click failed`, error);
                                        toast({
                                          title: "Lane-Zustand konnte nicht gespeichert werden",
                                          description: "Bitte erneut versuchen.",
                                          variant: "destructive",
                                        });
                                      });
                                    }}
                                  >
                                    {dayAppointmentCounts[dayIdx] > 0 ? (
                                      <span
                                        className="pointer-events-none ml-auto min-w-0 truncate text-right text-[10px] font-semibold"
                                        style={{ color: "#ffffff" }}
                                        data-testid={`week-tour-lane-day-counter-${tourLane.laneKey}-${dayBucket.dateKey}`}
                                      >
                                        {dayAppointmentCounts[dayIdx]} {dayAppointmentCounts[dayIdx] === 1 ? "Termin" : "Termine"}
                                      </span>
                                    ) : (
                                      <span className="ml-auto" />
                                    )}
                                    {!isReaderCalendarReadOnly && !isAbsenceLane && dayBucket.dateKey >= berlinToday ? (
                                      <button
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          const scrollLeft = horizontalScrollContainerRef.current?.scrollLeft ?? null;
                                          const scrollTop = weekScrollContainerRefs.current.get(weekKey)?.scrollTop ?? null;
                                          console.info(`${logPrefix} new appointment click`, {
                                            date: dayBucket.dateKey,
                                            tourId: tourLane.tourId,
                                            laneKey: tourLane.laneKey,
                                            scrollLeft,
                                            scrollTop,
                                          });
                                          onNewAppointment?.(dayBucket.dateKey, { tourId: tourLane.tourId, scrollLeft, scrollTop });
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
                                </HoverPreview>
                              );
                            })}
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
                            className="relative grid divide-x divide-border/30 rounded-md border border-border/30 overflow-hidden"
                            style={{
                              gridTemplateColumns: weekDayGridTemplate,
                              minHeight: `${laneRowMinHeightPx}px`,
                              gridTemplateRows: laneGridTemplateRows,
                            }}
                          >
                            {days.map((_, dayIdx) => {
                              const isWeekend = dayIdx >= 5;
                              return (
                                <div
                                  key={`week-lane-column-background-${tourLane.laneKey}-${dayIdx}`}
                                  className={isWeekend ? "bg-slate-200/45" : "bg-white/80"}
                                  style={{
                                    gridColumn: dayIdx + 1,
                                    gridRow: `1 / span ${laneGridRowCount}`,
                                  }}
                                  aria-hidden
                                />
                              );
                            })}
                            {isLaneBlocked ? (
                              <div
                                className="pointer-events-none absolute inset-0 z-[1]"
                                style={BLOCKED_WEEK_OVERLAY_STYLE}
                                aria-hidden
                              />
                            ) : null}
                            {hasLaneContent && draggedAppointmentId !== null && !isReaderCalendarReadOnly && !isAbsenceLane ? (
                              <div
                                className="absolute inset-0 grid z-20"
                                style={{ gridTemplateColumns: weekDayGridTemplate }}
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
                              const conflictMeta = conflictAppointmentMap.get(appointment.id);
                              const isConflict = conflictHighlightActive && Boolean(conflictMeta) && !isLaneBlocked;
                              const isSegmentLocked = appointment.isCancelled || (appointment.isLocked && !isAdmin);
                              const isHistoricalSource = appointment.startDate < berlinToday;
                              const canDragSegment = !isReaderCalendarReadOnly
                                && !isAbsenceLane
                                && !isSegmentLocked
                                && (!isHistoricalSource || isAdmin || isHistoricalParkplatzAppointment(appointment));
                              const canEditAppointmentTags = canManageAppointmentTags
                                && !isAbsenceLane
                                && !appointment.isCancelled
                                && (!isHistoricalSource || isAdmin);
                              const heightRowKey = `grid-row-${rowIndex}`;

                              return (
                                <div
                                  key={`week-spanning-tile-${appointment.id}`}
                                  style={{
                                    gridColumn: `${startColumn} / span ${columnSpan}`,
                                    gridRow: rowIndex + 1,
                                    padding: "0.5rem",
                                    zIndex: 10,
                                    minWidth: 0,
                                    width: "100%",
                                    boxSizing: "border-box",
                                    alignSelf: isCompactWeekMode ? "start" : undefined,
                                  }}
                                >
                                  <CalendarWeekSpanningTile
                                    appointment={appointment}
                                    spanColumns={columnSpan}
                                    weekTileBodyMode={weekTileBodyMode}
                                    visibleStartDate={visibleStartDate}
                                    visibleDayNumberStart={visibleDayNumberStart}
                                    uniformHeightPx={getLaneUniformHeightPx(heightRowKey)}
                                    projectStatusAreaHeightPx={projectStatusAreaHeightPx}
                                    showTagActions={!isAbsenceLane}
                                    canEditTags={canEditAppointmentTags}
                                    allowHistoricalActions={isAdmin}
                                    interactive={!isAbsenceLane}
                                    onTagMutationEvents={handleAppointmentTagMutationEvents}
                                    style={{ width: "100%" }}
                                    isDragging={draggedAppointmentId === appointment.id}
                                    isLocked={isSegmentLocked}
                                    highlighted={isHighlighted}
                                    isConflict={isConflict}
                                    isBlocked={isLaneBlocked}
                                    conflictColor={conflictMeta?.color}
                                    onDoubleClick={
                                      isAbsenceAppointmentSummary({
                                        tourName: appointment.tourName,
                                        appointmentTags: appointment.appointmentTags,
                                      })
                                        ? undefined
                                        : () => handleAppointmentClick(appointment.id)
                                    }
                                    onDragStart={canDragSegment ? (event) => handleDragStart(event, appointment.id) : undefined}
                                    onDragEnd={canDragSegment ? handleDragEnd : undefined}
                                    onMouseEnter={() => setHoveredAppointmentId(appointment.id)}
                                    onMouseLeave={() =>
                                      setHoveredAppointmentId((prev) => (prev === appointment.id ? null : prev))
                                    }
                                    projectStatusAreaRef={(node) => measureProjectStatusHeight(weekKey, node)}
                                    containerRef={isCompactWeekMode
                                      ? undefined
                                      : (node) =>
                                          measureLaneCardHeight(
                                            getLaneHeightKey(heightRowKey),
                                            node,
                                            WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX,
                                          )}
                                    testId={`week-spanning-tile-${appointment.id}`}
                                  />
                                </div>
                              );
                            }) : null}
                            {hasLaneContent ? laneRenderData.singleDayGridItems.map(({ appointmentId, gridColumn, gridRow }) => {
                              const appointment = appointmentsById.get(appointmentId);
                              if (!appointment) return null;

                              const isHighlighted = hoveredAppointmentId === appointment.id;
                              const conflictMeta = conflictAppointmentMap.get(appointment.id);
                              const isConflict = conflictHighlightActive && Boolean(conflictMeta) && !isLaneBlocked;
                              const isSegmentLocked = appointment.isCancelled || (appointment.isLocked && !isAdmin);
                              const isHistoricalSource = appointment.startDate < berlinToday;
                              const canDragSegment = !isReaderCalendarReadOnly
                                && !isAbsenceLane
                                && !isSegmentLocked
                                && (!isHistoricalSource || isAdmin || isHistoricalParkplatzAppointment(appointment));
                              const canEditAppointmentTags = canManageAppointmentTags
                                && !isAbsenceLane
                                && !appointment.isCancelled
                                && (!isHistoricalSource || isAdmin);
                              const heightRowKey = `grid-row-${gridRow - 1}`;

                              return (
                                <div
                                  key={`week-single-grid-item-${appointment.id}`}
                                  style={{
                                    gridColumn,
                                    gridRow,
                                    padding: "0.5rem",
                                    zIndex: 10,
                                    minWidth: 0,
                                    width: "100%",
                                    boxSizing: "border-box",
                                    alignSelf: isCompactWeekMode ? "start" : undefined,
                                  }}
                                >
                                  <CalendarWeekAppointmentPanel
                                    appointment={appointment}
                                    weekTileBodyMode={weekTileBodyMode}
                                    context="week-calendar"
                                    segment="start"
                                    continuationHeightPx={DEFAULT_CONTINUATION_HEIGHT_PX}
                                    uniformHeightPx={getLaneUniformHeightPx(heightRowKey)}
                                    projectStatusAreaHeightPx={projectStatusAreaHeightPx}
                                    showTagActions={!isAbsenceLane}
                                    canEditTags={canEditAppointmentTags}
                                    allowHistoricalActions={isAdmin}
                                    interactive={!isAbsenceLane}
                                    onTagMutationEvents={handleAppointmentTagMutationEvents}
                                    projectStatusAreaRef={(node) => measureProjectStatusHeight(weekKey, node)}
                                    containerRef={isCompactWeekMode
                                      ? undefined
                                      : (node) =>
                                          measureLaneCardHeight(
                                            getLaneHeightKey(heightRowKey),
                                            node,
                                            WEEK_CARD_FOOTER_SAFE_SPACE_PX,
                                          )}
                                    isDragging={draggedAppointmentId === appointment.id}
                                    isLocked={isSegmentLocked}
                                    highlighted={isHighlighted}
                                    isConflict={isConflict}
                                    isBlocked={isLaneBlocked}
                                    conflictColor={conflictMeta?.color}
                                    onDoubleClick={
                                      isAbsenceAppointmentSummary({
                                        tourName: appointment.tourName,
                                        appointmentTags: appointment.appointmentTags,
                                      })
                                        ? undefined
                                        : () => handleAppointmentClick(appointment.id)
                                    }
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
                                  className="h-full min-w-0 p-2 space-y-2"
                                  style={{
                                    gridColumn: dayIdx + 1,
                                    gridRow: tileRowCount + 1,
                                    zIndex: 10,
                                    width: "100%",
                                    boxSizing: "border-box",
                                  }}
                                  onDragOver={isAbsenceLane ? undefined : (event) => event.preventDefault()}
                                  onDrop={isAbsenceLane ? undefined : (event) => {
                                    void handleDrop(event, day);
                                  }}
                                  data-testid={`week-day-${dayBucket.dateKey}-lane-${tourLane.laneKey}`}
                                >
                                  {laneRenderData.singleDayOverflowByBucket[dayIdx].map((appointmentId, stackIndex) => {
                                    const appointment = appointmentsById.get(appointmentId);
                                    if (!appointment) return null;

                                    const isHighlighted = hoveredAppointmentId === appointment.id;
                                    const conflictMeta = conflictAppointmentMap.get(appointment.id);
                                    const isConflict = conflictHighlightActive && Boolean(conflictMeta) && !isLaneBlocked;
                                    const isSegmentLocked = appointment.isCancelled || (appointment.isLocked && !isAdmin);
                                    const isHistoricalSource = appointment.startDate < berlinToday;
                                    const canDragSegment = !isReaderCalendarReadOnly
                                      && !isAbsenceLane
                                      && !isSegmentLocked
                                      && (!isHistoricalSource || isAdmin || isHistoricalParkplatzAppointment(appointment));
                                    const canEditAppointmentTags = canManageAppointmentTags
                                      && !isAbsenceLane
                                      && !appointment.isCancelled
                                      && (!isHistoricalSource || isAdmin);
                                    const heightRowKey = `overflow-day-${dayBucket.dateKey}-row-${stackIndex}`;

                                    return (
                                      <div
                                        key={`${appointment.id}-${tourLane.laneKey}-${dayIdx}-${stackIndex}`}
                                        style={{
                                          width: "100%",
                                          minWidth: 0,
                                          boxSizing: "border-box",
                                        }}
                                      >
                                        <CalendarWeekAppointmentPanel
                                          appointment={appointment}
                                          weekTileBodyMode={weekTileBodyMode}
                                          context="week-calendar"
                                          segment="start"
                                          continuationHeightPx={DEFAULT_CONTINUATION_HEIGHT_PX}
                                          uniformHeightPx={getLaneUniformHeightPx(heightRowKey)}
                                          projectStatusAreaHeightPx={projectStatusAreaHeightPx}
                                        showTagActions={!isAbsenceLane}
                                        canEditTags={canEditAppointmentTags}
                                        allowHistoricalActions={isAdmin}
                                        interactive={!isAbsenceLane}
                                        onTagMutationEvents={handleAppointmentTagMutationEvents}
                                          projectStatusAreaRef={(node) => measureProjectStatusHeight(weekKey, node)}
                                          containerRef={isCompactWeekMode
                                            ? undefined
                                            : (node) =>
                                                measureLaneCardHeight(
                                                  getLaneHeightKey(heightRowKey),
                                                  node,
                                                  WEEK_CARD_FOOTER_SAFE_SPACE_PX,
                                                )}
                                          isDragging={draggedAppointmentId === appointment.id}
                                          isLocked={isSegmentLocked}
                                          highlighted={isHighlighted}
                                        isConflict={isConflict}
                                        isBlocked={isLaneBlocked}
                                        conflictColor={conflictMeta?.color}
                                        onDoubleClick={
                                          isAbsenceAppointmentSummary({
                                            tourName: appointment.tourName,
                                            appointmentTags: appointment.appointmentTags,
                                          })
                                            ? undefined
                                            : () => handleAppointmentClick(appointment.id)
                                        }
                                        onDragStart={canDragSegment ? (event) => handleDragStart(event, appointment.id) : undefined}
                                        onDragEnd={canDragSegment ? handleDragEnd : undefined}
                                          onMouseEnter={() => setHoveredAppointmentId(appointment.id)}
                                          onMouseLeave={() =>
                                            setHoveredAppointmentId((prev) => (prev === appointment.id ? null : prev))
                                          }
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }) : null}
                          </div>
                        </div>
                        {dialog}
                      </div>
                        )}
                      </CalendarWeekNotesButton>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
      <WorkflowNoteSuggestionDialog
        open={noteSuggestionDialog !== null}
        templateTitle={noteSuggestionDialog?.templateTitle}
        targetLabel="diesen Termin"
        onOpenChange={(open) => { if (!open) setNoteSuggestionDialog(null); }}
        onSkip={() => setNoteSuggestionDialog(null)}
        onConfirm={handleCreateAppointmentNoteFromSuggestion}
      />
      <WorkflowNoteRemovalDialog
        open={noteRemovalDialog !== null}
        description={`Soll die Notiz „${noteRemovalDialog?.templateTitle ?? ""}“ ebenfalls entfernt werden?`}
        onOpenChange={(open) => { if (!open) setNoteRemovalDialog(null); }}
        onKeep={() => setNoteRemovalDialog(null)}
        onConfirm={() => {
          if (!noteRemovalDialog) return;
          deleteAppointmentNoteMutation.mutate({
            appointmentId: noteRemovalDialog.appointmentId,
            noteId: noteRemovalDialog.noteId,
            version: noteRemovalDialog.noteVersion,
          });
          setNoteRemovalDialog(null);
        }}
      />
      <Dialog open={workflowNoteEditorOpen} onOpenChange={setWorkflowNoteEditorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Notiz bearbeiten</DialogTitle>
            <EditFormContextText>{workflowNoteTitle.trim() || null}</EditFormContextText>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="week-workflow-note-title">Titel *</Label>
              <Input
                id="week-workflow-note-title"
                value={workflowNoteTitle}
                onChange={(event) => setWorkflowNoteTitle(event.target.value)}
                placeholder="Titel der Notiz..."
                data-testid="input-note-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Inhalt</Label>
              <RichTextEditor
                key={`week-workflow-note-editor-${workflowNoteEditorId ?? "new"}`}
                value={workflowNoteBody}
                onChange={setWorkflowNoteBody}
                placeholder="Notizinhalt eingeben..."
                className="min-h-[150px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Kartenfarbe</Label>
              <ColorSelectButton
                color={workflowNoteCardColor}
                onChange={setWorkflowNoteCardColor}
                testId="button-note-card-color-picker"
                disabled={workflowNoteCardColorLocked}
                label="Kartenfarbe"
              />
              {workflowNoteCardColorLocked ? (
                <p className="text-xs text-slate-500" data-testid="text-note-card-color-locked">
                  Die Kartenfarbe stammt aus der Vorlage und kann für diese Notiz nicht geändert werden.
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
              <div>
                <Label htmlFor="week-workflow-note-print" className="text-sm font-medium">Drucken</Label>
                <p className="text-xs text-slate-500">Bestimmt, ob die Notiz in Druckausgaben berücksichtigt wird.</p>
              </div>
              <Switch
                id="week-workflow-note-print"
                checked={workflowNotePrint}
                onCheckedChange={setWorkflowNotePrint}
                data-testid="switch-note-print"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWorkflowNoteEditorOpen(false)} data-testid="button-cancel-note">
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (!workflowNoteEditorId || !workflowNoteTitle.trim()) return;
                updateWorkflowAppointmentNoteMutation.mutate({
                  noteId: workflowNoteEditorId,
                  version: workflowNoteEditorVersion,
                  title: workflowNoteTitle,
                  body: workflowNoteBody,
                  cardColor: workflowNoteCardColor,
                  print: workflowNotePrint,
                });
              }}
              disabled={!workflowNoteTitle.trim()}
              data-testid="button-save-note"
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
