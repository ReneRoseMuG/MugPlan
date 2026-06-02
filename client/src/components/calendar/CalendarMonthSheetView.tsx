import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addDays, format, getISOWeek, getISOWeekYear, isSameDay, parseISO, startOfISOWeek } from "date-fns";
import { de } from "date-fns/locale";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSetting, useSettings } from "@/hooks/useSettings";
import { getStoredUserRole, isReaderRole } from "@/lib/auth";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
import {
  useCalendarAppointments,
  useCalendarBlockedTourWeeks,
  type CalendarAppointment,
} from "@/lib/calendar-appointments";
import {
  formatCalendarMoveDate,
  isRegularCalendarMoveTarget,
  toCalendarMoveSelection,
  type CalendarMoveRequest,
  type CalendarMoveSelection,
} from "@/lib/calendar-move";
import { useCalendarMarkers, type CalendarMarker } from "@/lib/calendar-markers";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { applyWeekendExpansion, buildDayGridTemplate, getDayWeights, normalizeWeekendColumnPercent } from "@/lib/calendar-layout";
import { getPrimaryCalendarMarkerVisualization } from "@/lib/calendar-marker-visualization";
import type { CalendarMarkerVisualizationStyle } from "@/hooks/useSettings";
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
import { buildMonthSheetMatrix, buildMonthWindowMatrix, type MonthSheetMatrix } from "./monthSheetModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppointmentCancelConfirmDialog } from "@/components/AppointmentCancelConfirmDialog";
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
import {
  isReservedVacantTagName,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
  RESERVED_VACANT_TAG_COLOR,
} from "@shared/appointmentCancellation";
import { isAbsenceAppointmentSummary, isAbsenceTourName } from "@shared/absenceAppointments";
import { Ban, ChevronDown, ChevronUp, ExternalLink, FolderOpen, MoreVertical, ParkingCircle, Scissors, ScanLine, Trash2 } from "lucide-react";
import type { Tour } from "@shared/schema";
import type { MonitoringConflictMeta } from "@/lib/monitoring-ui";
import { CalendarMarkerHeaderLabel } from "./CalendarMarkerHeaderLabel";
import { Button } from "@/components/ui/button";
import { PrintPreviewDialog } from "@/components/print/PrintPreviewDialog";
import { PrintPageShell } from "@/components/print/PrintPageShell";

type CalendarMonthSheetViewProps = {
  currentDate: Date;
  employeeFilterId?: number | null;
  conflictHighlightActive?: boolean;
  conflictAppointmentMap?: Map<number, MonitoringConflictMeta>;
  readOnly?: boolean;
  visibleWeekCount?: number;
  showMonthHeader?: boolean;
  headerAction?: ReactNode;
  absenceVisibility?: "planning" | "absences" | "include";
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
  onNewAppointment?: (date: string, options?: { scrollLeft?: number | null }) => void;
  onOpenAppointment?: (appointmentId: number, options?: { scrollLeft?: number | null }) => void;
  onOpenProject?: (projectId: number) => void;
  selectedMoveAppointment?: CalendarMoveSelection | null;
  onSelectMoveAppointment?: (appointment: CalendarMoveSelection) => void;
  onRequestMoveAppointment?: (request: CalendarMoveRequest) => void | Promise<void>;
  onFooterActionChange?: (action: ReactNode | null) => void;
};

type MonthSheetRenderWeek = {
  rowLayout: MonthWeekRowLayout;
  slotTopPxByTourId: Map<number | null, number>;
  weekAppointments: CalendarAppointment[];
};

const logPrefix = "[calendar-month-sheet]";
const MONTH_SHEET_BAR_HORIZONTAL_INSET_PX = 4;
const MONTH_SLOT_BACKGROUND_ALPHA = 0.14;
const BLOCKED_WEEK_OVERLAY_STYLE = {
  backgroundImage: "repeating-linear-gradient(135deg, rgba(194,65,12,0.42) 0px, rgba(194,65,12,0.42) 8px, rgba(251,146,60,0.28) 8px, rgba(251,146,60,0.28) 16px)",
  backgroundColor: "rgba(154,52,18,0.22)",
} as const;
const MONTH_FIT_PAGE_MIN_SCALE = 0.65;

const normalizeTourName = (value: string | null | undefined) => (value ?? "").trim().toLocaleLowerCase("de").replace(/ß/g, "ss");

function isHistoricalParkplatzAppointment(appointment: CalendarAppointment): boolean {
  return appointment.startDate < getBerlinTodayDateString()
    && normalizeTourName(appointment.tourName) === normalizeTourName("Parkplatz");
}

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

function buildBlockedTourWeekKey(tourId: number, isoYear: number, isoWeek: number): string {
  return `${tourId}-${isoYear}-${isoWeek}`;
}

export function isBlockedTourWeekSlot(params: {
  tourId: number | null | undefined;
  weekDate: Date;
  blockedTourWeekKeys: Set<string>;
}): boolean {
  return typeof params.tourId === "number"
    && params.blockedTourWeekKeys.has(buildBlockedTourWeekKey(
      params.tourId,
      getISOWeekYear(params.weekDate),
      getISOWeek(params.weekDate),
    ));
}

export function CalendarMonthSheetView({
  currentDate,
  employeeFilterId,
  conflictHighlightActive = false,
  conflictAppointmentMap = new Map<number, MonitoringConflictMeta>(),
  readOnly = false,
  visibleWeekCount,
  showMonthHeader = true,
  headerAction,
  absenceVisibility = "planning",
  onPreviousWeek,
  onNextWeek,
  onNewAppointment,
  onOpenAppointment,
  onOpenProject,
  selectedMoveAppointment,
  onSelectMoveAppointment,
  onRequestMoveAppointment,
  onFooterActionChange,
}: CalendarMonthSheetViewProps) {
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<number | null>(null);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1);
  const scaleFactorRef = useRef(1);
  scaleFactorRef.current = scaleFactor;
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleDebounceRef = useRef<number | null>(null);
  const { toast } = useToast();
  const { setSetting } = useSettings();
  const queryClient = useQueryClient();
  const userRole = useMemo(() => getStoredUserRole(), []);
  const isReaderCalendarReadOnly = readOnly || isReaderRole(userRole);
  const weekendColumnPercentSetting = useSetting("calendarWeekendColumnPercent");
  const markerVisualizationStyle = useSetting("calendar.markerVisualizationStyle") ?? "standard";
  const monthFitPage = useSetting("calendar.monthFitPage") ?? true;
  const isAdmin = userRole === "ADMIN";
  const weekendColumnPercent = normalizeWeekendColumnPercent(weekendColumnPercentSetting);
  const dayWeights = useMemo(() => getDayWeights(weekendColumnPercent), [weekendColumnPercent]);
  const berlinToday = getBerlinTodayDateString();

  useEffect(() => {
    if (!onFooterActionChange) return undefined;

    onFooterActionChange(
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setPrintPreviewOpen(true)}
        data-testid="button-month-print-preview"
      >
        Drucken
      </Button>,
    );

    return () => onFooterActionChange(null);
  }, [onFooterActionChange]);

  const month = useMemo(
    () => visibleWeekCount !== undefined
      ? buildMonthWindowMatrix(startOfISOWeek(currentDate), visibleWeekCount)
      : buildMonthSheetMatrix(currentDate.getFullYear(), currentDate.getMonth() + 1),
    [currentDate, visibleWeekCount],
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
  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const visibleAppointments = useMemo(() => {
    if (absenceVisibility === "include") return appointments;
    return appointments.filter((appointment) => {
      const isAbsence = isAbsenceTourName(appointment.tourName);
      return absenceVisibility === "absences" ? isAbsence : !isAbsence;
    });
  }, [absenceVisibility, appointments]);

  const effectiveDayWeights = useMemo(() => {
    const hasSat = visibleAppointments.some((a) => {
      const start = parseISO(a.startDate);
      const end = parseISO(getAppointmentEndDate(a));
      let cursor = start;
      while (cursor <= end) {
        if (cursor.getDay() === 6) return true;
        cursor = addDays(cursor, 1);
      }
      return false;
    });
    const hasSun = visibleAppointments.some((a) => {
      const start = parseISO(a.startDate);
      const end = parseISO(getAppointmentEndDate(a));
      let cursor = start;
      while (cursor <= end) {
        if (cursor.getDay() === 0) return true;
        cursor = addDays(cursor, 1);
      }
      return false;
    });
    return applyWeekendExpansion(dayWeights, hasSat, hasSun);
  }, [dayWeights, visibleAppointments]);

  const dayGridTemplate = useMemo(() => buildDayGridTemplate(effectiveDayWeights), [effectiveDayWeights]);
  const monthRowTemplate = useMemo(() => `50px ${dayGridTemplate}`, [dayGridTemplate]);

  const visibleTours = useMemo(() => {
    if (absenceVisibility === "include") return tours;
    return tours.filter((tour) => {
      const isAbsence = isAbsenceTourName(tour.name);
      return absenceVisibility === "absences" ? isAbsence : !isAbsence;
    });
  }, [absenceVisibility, tours]);
  const appointmentsById = useMemo(
    () => new Map(visibleAppointments.map((appointment) => [appointment.id, appointment] as const)),
    [visibleAppointments],
  );
  const blockedTourWeekKeys = useMemo(
    () => new Set(blockedTourWeeks
      .filter((week) => week.isBlocked)
      .map((week) => buildBlockedTourWeekKey(week.tourId, week.isoYear, week.isoWeek))),
    [blockedTourWeeks],
  );
  const tourSlots = useMemo(() => buildMonthTourSlots(visibleTours), [visibleTours]);

  const getCurrentScrollLeft = () => null;

  const effectiveTotalDayWeight = useMemo(
    () => effectiveDayWeights.reduce((sum, weight) => sum + weight, 0),
    [effectiveDayWeights],
  );

  const getSlotBarPosition = useCallback((startIndex: number, endIndex: number) => {
    const startWeight = effectiveDayWeights.slice(0, startIndex).reduce((sum, weight) => sum + weight, 0);
    const spanWeight = effectiveDayWeights.slice(startIndex, endIndex + 1).reduce((sum, weight) => sum + weight, 0);
    return {
      left: `calc(${(startWeight / effectiveTotalDayWeight) * 100}% + ${MONTH_SHEET_BAR_HORIZONTAL_INSET_PX}px)`,
      width: `calc(${(spanWeight / effectiveTotalDayWeight) * 100}% - ${MONTH_SHEET_BAR_HORIZONTAL_INSET_PX * 2}px)`,
    };
  }, [effectiveDayWeights, effectiveTotalDayWeight]);

  const weekData = useMemo(() => {
    const nextWeekData = new Map<string, MonthSheetRenderWeek>();

    month.weeks.forEach((week) => {
      const weekAppointments = visibleAppointments
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
  }, [visibleAppointments, month, tourSlots]);

  const handleAppointmentClick = (appointmentId: number) => {
    const appointment = appointmentsById.get(appointmentId);
    if (!appointment) return;
    console.info(`${logPrefix} open appointment`, { appointmentId, scrollLeft: getCurrentScrollLeft() });
    onOpenAppointment?.(appointmentId, { scrollLeft: getCurrentScrollLeft() });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const observer = new ResizeObserver(() => {
      if (scaleDebounceRef.current !== null) window.clearTimeout(scaleDebounceRef.current);
      scaleDebounceRef.current = window.setTimeout(() => {
        scaleDebounceRef.current = null;
        const available = container.clientHeight;
        if (!monthFitPage || available <= 0) {
          setScaleFactor(1);
          return;
        }
        const currentScale = scaleFactorRef.current;
        // scrollHeight gibt die tatsaechliche Layout-Hoehe des Inhalts inkl. Overflow.
        // Mit zoom:currentScale gilt: naturalHeight = scrollHeight / currentScale.
        const naturalHeight = currentScale > 0
          ? container.scrollHeight / currentScale
          : container.scrollHeight;
        const raw = available / naturalHeight;
        setScaleFactor(Math.min(1, Math.max(MONTH_FIT_PAGE_MIN_SCALE, raw)));
      }, 100);
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      if (scaleDebounceRef.current !== null) window.clearTimeout(scaleDebounceRef.current);
    };
  }, [monthFitPage, weekData]);

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
    await queryClient.invalidateQueries({
      queryKey: ["calendarWeekLaneEmployeePreviews"],
    });
    await refreshMonitoringWithNotification(toast);
    console.info(`${logPrefix} drop success`, { appointmentId });
    return true;
  };

  const handleDrop = async (
    event: React.DragEvent,
    targetDate: Date,
    targetTourId?: number | null,
    targetTourName?: string | null,
  ) => {
    if (isReaderCalendarReadOnly || absenceVisibility === "absences") {
      event.preventDefault();
      setDraggedAppointmentId(null);
      return;
    }

    event.preventDefault();
    const appointmentId = Number(event.dataTransfer.getData("text/plain"));
    if (!appointmentId) return;

    const appointment = appointmentsById.get(appointmentId);
    if (!appointment) return;

    const resolvedTargetTourId = targetTourId !== undefined ? targetTourId : appointment.tourId ?? null;
    const resolvedTargetTourName = targetTourId !== undefined ? targetTourName ?? null : appointment.tourName ?? null;

    if (!isRegularCalendarMoveTarget(resolvedTargetTourId, resolvedTargetTourName)) {
      toast({
        title: "Ziel nicht erlaubt",
        description: "Termine können nur in reguläre Touren eingefügt oder verschoben werden.",
        variant: "destructive",
      });
      setDraggedAppointmentId(null);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentStart = parseISO(appointment.startDate);
    const isHistoricalParkplatz = isHistoricalParkplatzAppointment(appointment);

    if (appointmentStart < today && !isAdmin && !isHistoricalParkplatz) {
      toast({
        title: "Verschieben nicht erlaubt",
        description: "Vergangene Termine können nicht per Drag & Drop verschoben werden.",
        variant: "destructive",
      });
      setDraggedAppointmentId(null);
      return;
    }

    if (targetDate < today && !isAdmin && !isHistoricalParkplatz) {
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

    if (isBlockedTourWeekSlot({
      tourId: resolvedTargetTourId,
      weekDate: targetDate,
      blockedTourWeekKeys,
    })) {
      toast({
        title: "Wochenplanung blockiert",
        description: "Termine können nicht in eine blockierte Tour-Woche verschoben werden.",
        variant: "destructive",
      });
      setDraggedAppointmentId(null);
      return;
    }

    const durationDays = getAppointmentDurationDays(appointment);
    const newStartDate = format(targetDate, "yyyy-MM-dd");
    const newEndDate = durationDays > 0 ? format(addDays(targetDate, durationDays), "yyyy-MM-dd") : null;

    try {
      if (onRequestMoveAppointment) {
        await onRequestMoveAppointment({
          appointment: toCalendarMoveSelection(appointment),
          targetStartDate: newStartDate,
          targetTourId: resolvedTargetTourId,
          targetTourName: resolvedTargetTourName,
          mode: "drag",
        });
      } else {
        await persistDropMutation({
          appointmentId,
          version: appointment.version,
          projectId: appointment.projectId,
          customerId: appointment.customer.id,
          tourId: resolvedTargetTourId,
          startDate: newStartDate,
          endDate: newEndDate,
          startTime: appointment.startTime ?? null,
          employeeIds: appointment.employees.map((employee) => employee.id),
        });
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

  const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const printPages = useMemo(() => [{
    key: month.monthKey,
    title: `${format(month.visibleStart, "dd.MM.yy")} bis ${format(month.visibleEnd, "dd.MM.yy")}`,
    weeks: month.weeks,
  }], [month]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div
        className="flex-1 min-h-0 overflow-hidden"
        data-testid="month-sheet-container"
      >
        <MonthSheetSection
          month={month}
          weekData={weekData}
          monthRowTemplate={monthRowTemplate}
          dayGridTemplate={dayGridTemplate}
          appointmentsById={appointmentsById}
          calendarMarkersByDate={calendarMarkersByDate}
          markerVisualizationStyle={markerVisualizationStyle}
          conflictHighlightActive={conflictHighlightActive}
          conflictAppointmentMap={conflictAppointmentMap}
          blockedTourWeekKeys={blockedTourWeekKeys}
          berlinToday={berlinToday}
          isAdmin={isAdmin}
          readOnly={isReaderCalendarReadOnly || absenceVisibility === "absences"}
          selectedMoveAppointment={selectedMoveAppointment}
          showMonthHeader={showMonthHeader}
          headerAction={headerAction}
          draggedAppointmentId={draggedAppointmentId}
          gridContainerRef={containerRef}
          scaleFactor={scaleFactor}
          monthFitPage={monthFitPage ?? true}
          onToggleFitPage={() => {
            void setSetting({ key: "calendar.monthFitPage", scopeType: "USER", value: !monthFitPage });
          }}
          getSlotBarPosition={getSlotBarPosition}
          onDrop={handleDrop}
          onNewAppointment={(dateKey) => {
            if (absenceVisibility !== "absences") {
              onNewAppointment?.(dateKey, { scrollLeft: getCurrentScrollLeft() });
            }
          }}
          onAppointmentClick={handleAppointmentClick}
          onOpenProject={onOpenProject}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onSelectMoveAppointment={onSelectMoveAppointment}
          onRequestMoveAppointment={onRequestMoveAppointment}
          weekDays={weekDays}
          onPreviousWeek={onPreviousWeek}
          onNextWeek={onNextWeek}
        />
      </div>
      <PrintPreviewDialog
        open={printPreviewOpen}
        onOpenChange={setPrintPreviewOpen}
        title="Monatskalender drucken"
        pages={printPages}
        activePageIndex={0}
        onPageChange={() => undefined}
        pageOrientation="landscape"
        testIdPrefix="month-calendar-print-preview"
        dialogTestId="dialog-month-calendar-print-preview"
        showPageMetaBar={false}
        headerActions={(
          <Button type="button" variant="outline" onClick={() => window.print()} data-testid="button-month-calendar-print">
            Drucken
          </Button>
        )}
        getPageKey={(page) => page.key}
        renderPage={(page) => (
          <PrintPageShell orientation="landscape" paddingMm={7} testId={`month-calendar-print-page-${page.key}`}>
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <div className="text-lg font-bold text-slate-900">Monatskalender</div>
              <div className="text-xs text-slate-500">{page.title}</div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[8px] font-semibold text-slate-600">
              {weekDays.map((dayLabel) => <div key={`print-month-head-${dayLabel}`} className="text-center">{dayLabel}</div>)}
            </div>
            <div className="grid flex-1 grid-cols-7 gap-1 overflow-hidden text-[7px]">
              {page.weeks.flatMap((week) => week.days).map((day) => {
                const dayAppointments = visibleAppointments
                  .filter((appointment) => appointment.startDate <= day.dateKey && (appointment.endDate ?? appointment.startDate) >= day.dateKey)
                  .sort(compareAppointmentsByTourIndexThenTime);
                return (
                  <div key={`print-month-day-${day.dateKey}`} className="min-h-0 overflow-hidden rounded border border-slate-200 p-1">
                    <div className="mb-1 font-semibold text-slate-800">{format(parseISO(day.dateKey), "dd.MM.yy")}</div>
                    <div className="space-y-0.5">
                      {dayAppointments.slice(0, 8).map((appointment) => (
                        <div key={`print-month-appointment-${day.dateKey}-${appointment.id}`} className="truncate rounded px-1" style={{ backgroundColor: toTransparentTourColor(appointment.tourColor, 0.2) }}>
                          {appointment.customer.fullName ?? appointment.customer.customerNumber} · {appointment.projectName}
                        </div>
                      ))}
                      {dayAppointments.length > 8 ? <div className="text-slate-500">+{dayAppointments.length - 8} weitere</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </PrintPageShell>
        )}
      />
    </div>
  );
}

function MonthSheetSection({
  month,
  weekData,
  monthRowTemplate,
  dayGridTemplate,
  appointmentsById,
  calendarMarkersByDate,
  markerVisualizationStyle,
  conflictHighlightActive,
  conflictAppointmentMap,
  blockedTourWeekKeys,
  berlinToday,
  isAdmin,
  readOnly,
  selectedMoveAppointment,
  showMonthHeader,
  headerAction,
  draggedAppointmentId,
  gridContainerRef,
  scaleFactor,
  monthFitPage,
  onToggleFitPage,
  getSlotBarPosition,
  onDrop,
  onNewAppointment,
  onAppointmentClick,
  onOpenProject,
  onDragStart,
  onDragEnd,
  onSelectMoveAppointment,
  onRequestMoveAppointment,
  weekDays,
  onPreviousWeek,
  onNextWeek,
}: {
  month: MonthSheetMatrix;
  weekData: Map<string, MonthSheetRenderWeek>;
  monthRowTemplate: string;
  dayGridTemplate: string;
  appointmentsById: Map<number, CalendarAppointment>;
  calendarMarkersByDate: Map<string, CalendarMarker[]>;
  markerVisualizationStyle: CalendarMarkerVisualizationStyle;
  conflictHighlightActive: boolean;
  conflictAppointmentMap: Map<number, MonitoringConflictMeta>;
  blockedTourWeekKeys: Set<string>;
  berlinToday: string;
  isAdmin: boolean;
  readOnly: boolean;
  selectedMoveAppointment?: CalendarMoveSelection | null;
  showMonthHeader: boolean;
  headerAction?: ReactNode;
  draggedAppointmentId: number | null;
  gridContainerRef: React.RefObject<HTMLDivElement>;
  scaleFactor: number;
  monthFitPage: boolean;
  onToggleFitPage: () => void;
  getSlotBarPosition: (startIndex: number, endIndex: number) => { left: string; width: string };
  onDrop: (event: React.DragEvent, targetDate: Date, targetTourId?: number | null, targetTourName?: string | null) => Promise<void>;
  onNewAppointment: (dateKey: string) => void;
  onAppointmentClick: (appointmentId: number) => void;
  onOpenProject?: (projectId: number) => void;
  onDragStart: (event: React.DragEvent, appointmentId: number) => void;
  onDragEnd: () => void;
  onSelectMoveAppointment?: (appointment: CalendarMoveSelection) => void;
  onRequestMoveAppointment?: (request: CalendarMoveRequest) => void | Promise<void>;
  weekDays: string[];
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
}) {
  const weekStepButtonClassName =
    "inline-flex h-9 w-full items-center justify-center gap-2 border-y border-amber-200 bg-amber-50 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";

  const scaleStyle: React.CSSProperties = scaleFactor < 1
    ? {
        zoom: scaleFactor,
        width: `${(1 / scaleFactor) * 100}%`,
      }
    : {};

  return (
    <section
      className="h-full min-w-full w-full border-r border-border/30 last:border-r-0"
      data-testid={`month-sheet-${month.monthKey}`}
      data-visible-start={format(month.visibleStart, "yyyy-MM-dd")}
      data-visible-end={format(month.visibleEnd, "yyyy-MM-dd")}
    >
      <div className="flex h-full flex-col">
        {showMonthHeader || headerAction ? (
          <div className="flex items-center justify-between gap-4 border-b border-border/40 bg-muted/20 px-6 py-2.5">
            {showMonthHeader ? (
              <span className="min-w-0 truncate text-sm font-semibold tracking-wide text-primary" data-testid={`month-sheet-title-${month.monthKey}`}>
                {formatMonthSheetHeaderTitle(month)}
              </span>
            ) : (
              <span />
            )}
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={onToggleFitPage}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title={monthFitPage ? "Seite füllen aktiv — klicken zum Deaktivieren" : "Seite füllen inaktiv — klicken zum Aktivieren"}
                data-testid="button-month-fit-page-toggle"
              >
                <ScanLine className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Seite füllen</span>
                <span
                  className={`relative inline-flex h-4 w-7 shrink-0 rounded-full border transition-colors ${monthFitPage ? "bg-primary border-primary" : "bg-muted border-border"}`}
                >
                  <span
                    className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${monthFitPage ? "translate-x-3" : "translate-x-0.5"}`}
                  />
                </span>
              </button>
              {headerAction ? (
                <div>
                  {headerAction}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {onPreviousWeek ? (
          <button
            type="button"
            onClick={onPreviousWeek}
            className={weekStepButtonClassName}
            data-testid="button-calendar-week-window-prev"
          >
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
            1 Woche zurück
          </button>
        ) : null}

        <div ref={gridContainerRef} className={`flex-1 min-h-0 ${monthFitPage ? "" : "overflow-y-auto"}`}>
          <div style={scaleStyle}>
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
          className="grid"
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
                    const dayMarkers = calendarMarkersByDate.get(day.dateKey) ?? [];
                    const markerVisualization = getPrimaryCalendarMarkerVisualization(dayMarkers, markerVisualizationStyle);
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
                          ${markerVisualization?.tileClassName ?? ""}
                          ${dayIdx === 6 ? "border-r-0" : ""}
                        `}
                        onDragOver={readOnly ? undefined : (event) => event.preventDefault()}
                        onDrop={readOnly ? undefined : (event) => {
                          void onDrop(event, day.date);
                        }}
                        data-testid={`month-sheet-day-${day.dateKey}`}
                        data-month-scope={day.isCurrentMonth ? "current" : "adjacent"}
                        data-marker-visualization={markerVisualization?.tone ?? "none"}
                      >
                        <div
                          style={{ height: `${MONTH_DAY_HEADER_HEIGHT_PX}px` }}
                          className={`grid grid-cols-[auto,minmax(0,1fr),auto] items-center gap-1 rounded-md px-1.5 ${dayHeaderClassName} ${markerVisualization?.headerClassName ?? ""}`}
                        >
                          <span
                            className={`
                              flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                              ${dayNumberClassName}
                            `}
                          >
                            {format(day.date, "d")}
                          </span>
                          <CalendarMarkerHeaderLabel
                            markers={dayMarkers}
                            visualizationStyle={markerVisualizationStyle}
                            dateKey={day.dateKey}
                            className="w-full"
                          />
                          {!readOnly && day.dateKey >= berlinToday ? (
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
                            const isSlotBlocked = isBlockedTourWeekSlot({
                              tourId: slot.tourId,
                              weekDate: week.weekStart,
                              blockedTourWeekKeys,
                            });
                            const canUseMoveTarget = selectedMoveAppointment != null
                              && !readOnly
                              && !isSlotBlocked
                              && day.dateKey >= berlinToday
                              && isRegularCalendarMoveTarget(slot.tourId, slot.label)
                              && Boolean(onRequestMoveAppointment);

                            return (
                              <div
                                key={slot.tourId ?? "unassigned"}
                                data-testid={`month-sheet-slot-${day.dateKey}-${slot.tourId ?? "unassigned"}`}
                                data-blocked={isSlotBlocked ? "true" : "false"}
                                style={{
                                  height: `${slotHeightPx}px`,
                                  backgroundColor: toTransparentTourColor(
                                    slot.color,
                                    day.isCurrentMonth ? MONTH_SLOT_BACKGROUND_ALPHA : MONTH_SLOT_BACKGROUND_ALPHA * 0.35,
                                  ),
                                }}
                                className="relative w-full"
                                onDragOver={readOnly || isSlotBlocked || !isRegularCalendarMoveTarget(slot.tourId, slot.label) ? undefined : (event) => event.preventDefault()}
                                onDrop={readOnly || isSlotBlocked || !isRegularCalendarMoveTarget(slot.tourId, slot.label) ? undefined : (event) => {
                                  event.stopPropagation();
                                  void onDrop(event, day.date, slot.tourId, slot.label);
                                }}
                              >
                                {isSlotBlocked ? (
                                  <div
                                    className="pointer-events-none absolute inset-0"
                                    style={BLOCKED_WEEK_OVERLAY_STYLE}
                                    data-testid={`month-sheet-slot-overlay-${day.dateKey}-${slot.tourId ?? "unassigned"}`}
                                    aria-hidden
                                  />
                                ) : null}
                                {canUseMoveTarget && selectedMoveAppointment && isRegularCalendarMoveTarget(slot.tourId, slot.label) ? (
                                  <button
                                    type="button"
                                    className="absolute right-1 top-1 z-10 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 shadow-sm hover:bg-amber-100"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (!isRegularCalendarMoveTarget(slot.tourId, slot.label)) return;
                                      void onRequestMoveAppointment?.({
                                        appointment: selectedMoveAppointment,
                                        targetStartDate: day.dateKey,
                                        targetTourId: slot.tourId,
                                        targetTourName: slot.label,
                                        mode: "insert",
                                      });
                                    }}
                                    data-testid={`button-insert-selected-appointment-month-sheet-${day.dateKey}-${slot.tourId}`}
                                    title={`Markierten Termin am ${formatCalendarMoveDate(day.dateKey)} einfügen`}
                                  >
                                    Einfügen
                                  </button>
                                ) : null}
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
                        const canDrag = !readOnly && !isLocked
                          && (!isHistoricalSource || isAdmin || isHistoricalParkplatzAppointment(appointment));
                        const conflictMeta = conflictAppointmentMap.get(appointment.id);
                        const isSlotBlocked = isBlockedTourWeekSlot({
                          tourId: slot.tourId,
                          weekDate: week.weekStart,
                          blockedTourWeekKeys,
                        });
                        const canSelectForMove = canDrag && !isSlotBlocked;

                        return (
                          <div
                            key={`${month.monthKey}-${weekKey}-${slot.tourId ?? "unassigned"}-${appointment.id}-${bar.startDayIndex}-${bar.endDayIndex}`}
                            className="pointer-events-auto absolute px-0.5"
                            data-testid={`month-compact-bar-${appointment.id}`}
                            style={{
                              ...position,
                              top: `${topPx}px`,
                              height: `${MONTH_SLOT_BAR_HEIGHT_PX}px`,
                            }}
                          >
                            {readOnly ? (
                              <CalendarAppointmentCompactBar
                                appointment={appointment}
                                isFirstDay={isSameDay(segmentStart, appointmentStart)}
                                isLastDay={isSameDay(segmentEnd, appointmentEnd)}
                                isConflict={conflictHighlightActive && Boolean(conflictMeta) && !isSlotBlocked}
                                conflictColor={conflictMeta?.color}
                                hideOrderNumber={true}
                                showPopover={true}
                                isLocked={isLocked}
                                isDragging={false}
                                isBlocked={isSlotBlocked}
                                onDoubleClick={
                                  isAbsenceAppointmentSummary({
                                    tourName: appointment.tourName,
                                    appointmentTags: appointment.appointmentTags,
                                  })
                                    ? undefined
                                    : () => onAppointmentClick(appointment.id)
                                }
                              />
                            ) : (
                              <MonthCompactBarWithMenu
                                appointment={appointment}
                                isFirstDay={isSameDay(segmentStart, appointmentStart)}
                                isLastDay={isSameDay(segmentEnd, appointmentEnd)}
                                isConflict={conflictHighlightActive && Boolean(conflictMeta) && !isSlotBlocked}
                                conflictColor={conflictMeta?.color}
                                isLocked={isLocked}
                                isDragging={draggedAppointmentId === appointment.id}
                                isMoveSelected={selectedMoveAppointment?.id === appointment.id}
                                isBlocked={isSlotBlocked}
                                allowHistoricalActions={isAdmin}
                                onDoubleClick={
                                  isAbsenceAppointmentSummary({
                                    tourName: appointment.tourName,
                                    appointmentTags: appointment.appointmentTags,
                                  })
                                    ? undefined
                                    : () => onAppointmentClick(appointment.id)
                                }
                                onOpenProject={onOpenProject}
                                onDragStart={canDrag ? (event) => onDragStart(event, appointment.id) : undefined}
                                onDragEnd={canDrag ? onDragEnd : undefined}
                                onSelectForMove={canSelectForMove && onSelectMoveAppointment
                                  ? () => onSelectMoveAppointment(toCalendarMoveSelection(appointment))
                                  : undefined}
                              />
                            )}
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
        </div>

        {onNextWeek ? (
          <button
            type="button"
            onClick={onNextWeek}
            className={weekStepButtonClassName}
            data-testid="button-calendar-week-window-next"
          >
            1 Woche vor
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </section>
  );
}

const isPastStartDate = (startDate: string) => {
  const startDateValue = new Date(`${startDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return startDateValue < today;
};

const buildMonthApiError = (message: string, status?: number, code?: string) => {
  const error = new Error(message) as Error & { status?: number; code?: string };
  error.status = status;
  error.code = code;
  return error;
};

const parseMonthErrorPayload = (rawBody: string): { message?: string; code?: string } | null => {
  const trimmed = rawBody.trim();
  if (!trimmed || !(trimmed.startsWith("{") && trimmed.endsWith("}"))) return null;
  try {
    const parsed = JSON.parse(trimmed) as { message?: unknown; code?: unknown };
    return {
      message: typeof parsed.message === "string" && parsed.message.trim().length > 0 ? parsed.message : undefined,
      code: typeof parsed.code === "string" ? parsed.code : undefined,
    };
  } catch {
    return null;
  }
};

function formatMonthSheetHeaderTitle(month: MonthSheetMatrix): string {
  if (!month.isWindow) {
    return format(month.monthStart, "MMMM yyyy", { locale: de });
  }

  const visibleStartMonth = format(month.visibleStart, "yyyy-MM");
  const visibleEndMonth = format(month.visibleEnd, "yyyy-MM");
  if (visibleStartMonth === visibleEndMonth) {
    return format(month.visibleStart, "MMMM yyyy", { locale: de });
  }

  const visibleStartYear = format(month.visibleStart, "yyyy");
  const visibleEndYear = format(month.visibleEnd, "yyyy");
  if (visibleStartYear === visibleEndYear) {
    return `${format(month.visibleStart, "MMMM", { locale: de })} - ${format(month.visibleEnd, "MMMM yyyy", { locale: de })}`;
  }

  return `${format(month.visibleStart, "MMMM yyyy", { locale: de })} - ${format(month.visibleEnd, "MMMM yyyy", { locale: de })}`;
}

function MonthCompactBarWithMenu({
  appointment,
  readOnly = false,
  isFirstDay,
  isLastDay,
  isConflict = false,
  conflictColor,
  isLocked,
  isDragging,
  isMoveSelected = false,
  isBlocked = false,
  allowHistoricalActions = false,
  onDoubleClick,
  onOpenProject,
  onDragStart,
  onDragEnd,
  onSelectForMove,
}: {
  appointment: CalendarAppointment;
  readOnly?: boolean;
  isFirstDay: boolean;
  isLastDay: boolean;
  isConflict?: boolean;
  conflictColor?: string;
  isLocked?: boolean;
  isDragging?: boolean;
  isMoveSelected?: boolean;
  isBlocked?: boolean;
  allowHistoricalActions?: boolean;
  onDoubleClick?: () => void;
  onOpenProject?: (projectId: number) => void;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  onSelectForMove?: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [parkConfirmOpen, setParkConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isParked = appointment.appointmentTags.some((t) => isReservedVacantTagName(t.name));
  const isHistoricalReadOnly = isPastStartDate(appointment.startDate)
    && !allowHistoricalActions
    && normalizeTourName(appointment.tourName) !== normalizeTourName("Parkplatz");

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/appointments/${appointment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: appointment.version }),
      });
      if (!res.ok) throw new Error("Stornieren fehlgeschlagen");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
      toast({ title: "Termin storniert" });
    },
    onError: () => {
      toast({ title: "Stornieren nicht möglich", variant: "destructive" });
    },
  });

  const parkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/appointments/${appointment.id}/park`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: appointment.version }),
      });
      if (!res.ok) throw new Error("Parken fehlgeschlagen");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
      await refreshMonitoringWithNotification(toast);
      toast({ title: "Termin geparkt" });
    },
    onError: () => {
      toast({ title: "Parken nicht möglich", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const fetchFreshVersion = async (): Promise<number> => {
        const detail = await queryClient.fetchQuery({
          queryKey: ["/api/appointments", appointment.id],
          queryFn: async () => {
            const response = await fetch(`/api/appointments/${appointment.id}`, { credentials: "include" });
            if (!response.ok) throw new Error("Termindetails konnten nicht geladen werden");
            return response.json() as Promise<{ version?: number }>;
          },
          staleTime: 0,
        });
        const version = detail?.version;
        if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
          throw buildMonthApiError("Termin kann derzeit nicht gelöscht werden. Bitte neu laden.", 422, "VALIDATION_ERROR");
        }
        return version;
      };
      const requestDelete = async (version: number) => {
        const response = await fetch(`/api/appointments/${appointment.id}`, {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version }),
        });
        if (response.ok) return;
        const rawBody = await response.text();
        const parsed = parseMonthErrorPayload(rawBody);
        if (parsed?.code === "PAST_APPOINTMENT_READONLY") throw buildMonthApiError("Termin ist gesperrt.", response.status, "PAST_APPOINTMENT_READONLY");
        if (parsed?.code === "CANCELLED_APPOINTMENT_READONLY") throw buildMonthApiError("Stornierte Termine können nicht gelöscht werden.", response.status, "CANCELLED_APPOINTMENT_READONLY");
        if (parsed?.code === "VERSION_CONFLICT") throw buildMonthApiError("Termin wurde parallel geändert.", response.status, "VERSION_CONFLICT");
        if (parsed?.code === "VALIDATION_ERROR") throw buildMonthApiError("Ungültige Löschdaten. Bitte neu laden.", response.status, "VALIDATION_ERROR");
        throw buildMonthApiError(parsed?.message ?? (response.statusText || "Löschen fehlgeschlagen"), response.status, parsed?.code);
      };
      try {
        const freshVersion = await fetchFreshVersion();
        await requestDelete(freshVersion);
      } catch (error) {
        const err = error as Error & { code?: string };
        if (err.code !== "VERSION_CONFLICT") throw error;
        const freshVersion = await fetchFreshVersion();
        await requestDelete(freshVersion);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
      await refreshMonitoringWithNotification(toast);
      toast({ title: "Termin gelöscht" });
    },
    onError: (error) => {
      const err = error as Error & { status?: number; code?: string };
      if (err.code === "PAST_APPOINTMENT_READONLY" || err.status === 403) {
        toast({ title: "Löschen nicht möglich", description: "Termin ist gesperrt.", variant: "destructive" });
        return;
      }
      if (err.code === "CANCELLED_APPOINTMENT_READONLY") {
        toast({ title: "Löschen nicht möglich", description: "Stornierte Termine können nicht gelöscht werden.", variant: "destructive" });
        return;
      }
      if (err.code === "VERSION_CONFLICT") {
        toast({ title: "Löschen nicht möglich", description: err.message || "Termin wurde zwischenzeitlich geändert.", variant: "destructive" });
        return;
      }
      if (err.code === "VALIDATION_ERROR") {
        toast({ title: "Löschen nicht möglich", description: "Ungültige Löschdaten. Bitte neu laden.", variant: "destructive" });
        return;
      }
      toast({ title: "Fehler", description: error instanceof Error ? error.message : "Löschen fehlgeschlagen", variant: "destructive" });
    },
  });

  const menuSlot = !isHistoricalReadOnly ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-center rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-white/20 transition-opacity focus:outline-none"
          aria-label="Terminaktionen"
          data-testid={`month-compact-bar-menu-trigger-${appointment.id}`}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {onDoubleClick && (
          <DropdownMenuItem onClick={onDoubleClick} className="gap-2 text-xs cursor-pointer">
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            Termin öffnen
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => {
            if (appointment.projectId) {
              onOpenProject?.(appointment.projectId);
            }
          }}
          disabled={!appointment.projectId || !onOpenProject}
          className="gap-2 text-xs cursor-pointer"
        >
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          Projekt Editieren
        </DropdownMenuItem>
        {onSelectForMove && (
          <DropdownMenuItem
            onClick={onSelectForMove}
            className="gap-2 text-xs cursor-pointer"
          >
            <Scissors className="h-3.5 w-3.5 shrink-0" />
            Ausschneiden
          </DropdownMenuItem>
        )}
        {!readOnly && !appointment.isCancelled && (
          <DropdownMenuItem
            onClick={() => setCancelConfirmOpen(true)}
            className="gap-2 text-xs cursor-pointer"
            style={{ color: RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR }}
          >
            <Ban className="h-3.5 w-3.5 shrink-0" />
            Stornieren
          </DropdownMenuItem>
        )}
        {!readOnly && !appointment.isCancelled && !isParked && (
          <DropdownMenuItem
            onClick={() => setParkConfirmOpen(true)}
            className="gap-2 text-xs cursor-pointer"
            style={{ color: RESERVED_VACANT_TAG_COLOR }}
          >
            <ParkingCircle className="h-3.5 w-3.5 shrink-0" />
            Parken
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => setDeleteConfirmOpen(true)}
          className="gap-2 text-xs cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          Termin löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : undefined;

  return (
    <>
      <CalendarAppointmentCompactBar
        appointment={appointment}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        isConflict={isConflict}
        conflictColor={conflictColor}
        hideOrderNumber={true}
        showPopover={true}
        isLocked={isLocked}
        isDragging={isDragging}
        isMoveSelected={isMoveSelected}
        isBlocked={isBlocked}
        menuSlot={menuSlot}
        onDoubleClick={onDoubleClick}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
      <AppointmentCancelConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        isPending={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
      />
      <AlertDialog open={parkConfirmOpen} onOpenChange={setParkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Termin parken?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Termin wird in die Parkplatz-Tour verschoben und als geparkt markiert. Zugewiesene Mitarbeiter werden entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={parkMutation.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => parkMutation.mutate()}
              disabled={parkMutation.isPending}
              style={{ backgroundColor: RESERVED_VACANT_TAG_COLOR, borderColor: RESERVED_VACANT_TAG_COLOR }}
            >
              {parkMutation.isPending ? "Parken…" : "Parken"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Termin löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Termin wird dauerhaft gelöscht und kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground border border-destructive-border hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Termin löschen..." : "Termin löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
