import { useMemo, useState } from "react";
import { addDays, format, getISOWeek, getISOWeekYear, isSameDay, parseISO, startOfISOWeek } from "date-fns";
import { de } from "date-fns/locale";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSetting } from "@/hooks/useSettings";
import { getStoredUserRole, isReaderRole } from "@/lib/auth";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
import {
  useCalendarAppointments,
  useCalendarBlockedTourWeeks,
  type CalendarAppointment,
} from "@/lib/calendar-appointments";
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
import { buildFixedWeekMatrix, buildMonthSheetMatrix, type MonthSheetMatrix } from "./monthSheetModel";
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
import { Ban, ExternalLink, MoreVertical, ParkingCircle, Trash2 } from "lucide-react";
import type { Tour } from "@shared/schema";
import type { MonitoringConflictMeta } from "@/lib/monitoring-ui";

type CalendarMonthSheetViewProps = {
  currentDate: Date;
  employeeFilterId?: number | null;
  conflictHighlightActive?: boolean;
  conflictAppointmentMap?: Map<number, MonitoringConflictMeta>;
  readOnly?: boolean;
  visibleWeekCount?: number;
  onNewAppointment?: (date: string, options?: { scrollLeft?: number | null }) => void;
  onOpenAppointment?: (appointmentId: number, options?: { scrollLeft?: number | null }) => void;
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
  onNewAppointment,
  onOpenAppointment,
}: CalendarMonthSheetViewProps) {
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userRole = useMemo(() => getStoredUserRole(), []);
  const isReaderCalendarReadOnly = readOnly || isReaderRole(userRole);
  const weekendColumnPercentSetting = useSetting("calendarWeekendColumnPercent");
  const isAdmin = userRole === "ADMIN";
  const weekendColumnPercent = normalizeWeekendColumnPercent(weekendColumnPercentSetting);
  const dayWeights = useMemo(() => getDayWeights(weekendColumnPercent), [weekendColumnPercent]);
  const dayGridTemplate = useMemo(() => buildDayGridTemplate(dayWeights), [dayWeights]);
  const monthRowTemplate = useMemo(() => `50px ${dayGridTemplate}`, [dayGridTemplate]);
  const totalDayWeight = useMemo(() => dayWeights.reduce((sum, weight) => sum + weight, 0), [dayWeights]);
  const berlinToday = getBerlinTodayDateString();

  const month = useMemo(
    () => visibleWeekCount !== undefined
      ? buildFixedWeekMatrix(startOfISOWeek(currentDate), visibleWeekCount)
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
  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const appointmentsById = useMemo(
    () => new Map(appointments.map((appointment) => [appointment.id, appointment] as const)),
    [appointments],
  );
  const blockedTourWeekKeys = useMemo(
    () => new Set(blockedTourWeeks
      .filter((week) => week.isBlocked)
      .map((week) => buildBlockedTourWeekKey(week.tourId, week.isoYear, week.isoWeek))),
    [blockedTourWeeks],
  );
  const tourSlots = useMemo(() => buildMonthTourSlots(tours), [tours]);

  const getCurrentScrollLeft = () => null;

  const getSlotBarPosition = (startIndex: number, endIndex: number) => {
    const startWeight = dayWeights.slice(0, startIndex).reduce((sum, weight) => sum + weight, 0);
    const spanWeight = dayWeights.slice(startIndex, endIndex + 1).reduce((sum, weight) => sum + weight, 0);
    return {
      left: `calc(${(startWeight / totalDayWeight) * 100}% + ${MONTH_SHEET_BAR_HORIZONTAL_INSET_PX}px)`,
      width: `calc(${(spanWeight / totalDayWeight) * 100}% - ${MONTH_SHEET_BAR_HORIZONTAL_INSET_PX * 2}px)`,
    };
  };

  const weekData = useMemo(() => {
    const nextWeekData = new Map<string, MonthSheetRenderWeek>();

    month.weeks.forEach((week) => {
      const weekAppointments = appointments
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
  }, [appointments, month, tourSlots]);

  const handleAppointmentClick = (appointmentId: number) => {
    const appointment = appointmentsById.get(appointmentId);
    if (!appointment) return;
    console.info(`${logPrefix} open appointment`, { appointmentId, scrollLeft: getCurrentScrollLeft() });
    onOpenAppointment?.(appointmentId, { scrollLeft: getCurrentScrollLeft() });
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
    await queryClient.invalidateQueries({
      queryKey: ["calendarWeekLaneEmployeePreviews"],
    });
    await refreshMonitoringWithNotification(toast);
    console.info(`${logPrefix} drop success`, { appointmentId });
    return true;
  };

  const handleDrop = async (event: React.DragEvent, targetDate: Date, targetTourId?: number | null) => {
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
      toast({
        title: "Verschieben nicht erlaubt",
        description: "Vergangene Termine können nicht per Drag & Drop verschoben werden.",
        variant: "destructive",
      });
      setDraggedAppointmentId(null);
      return;
    }

    if (targetDate < today && !isHistoricalParkplatz) {
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
      tourId: targetTourId,
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
      <div
        className="flex-1 min-h-0"
        data-testid="month-sheet-container"
      >
        <MonthSheetSection
          month={month}
          weekData={weekData}
          monthRowTemplate={monthRowTemplate}
          dayGridTemplate={dayGridTemplate}
          appointmentsById={appointmentsById}
          conflictHighlightActive={conflictHighlightActive}
          conflictAppointmentMap={conflictAppointmentMap}
          blockedTourWeekKeys={blockedTourWeekKeys}
          berlinToday={berlinToday}
          isAdmin={isAdmin}
          readOnly={isReaderCalendarReadOnly}
          showMonthHeader={visibleWeekCount === undefined}
          draggedAppointmentId={draggedAppointmentId}
          getSlotBarPosition={getSlotBarPosition}
          onDrop={handleDrop}
          onNewAppointment={(dateKey) => onNewAppointment?.(dateKey, { scrollLeft: getCurrentScrollLeft() })}
          onAppointmentClick={handleAppointmentClick}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          weekDays={weekDays}
        />
      </div>
    </div>
  );
}

function MonthSheetSection({
  month,
  weekData,
  monthRowTemplate,
  dayGridTemplate,
  appointmentsById,
  conflictHighlightActive,
  conflictAppointmentMap,
  blockedTourWeekKeys,
  berlinToday,
  isAdmin,
  readOnly,
  showMonthHeader,
  draggedAppointmentId,
  getSlotBarPosition,
  onDrop,
  onNewAppointment,
  onAppointmentClick,
  onDragStart,
  onDragEnd,
  weekDays,
}: {
  month: MonthSheetMatrix;
  weekData: Map<string, MonthSheetRenderWeek>;
  monthRowTemplate: string;
  dayGridTemplate: string;
  appointmentsById: Map<number, CalendarAppointment>;
  conflictHighlightActive: boolean;
  conflictAppointmentMap: Map<number, MonitoringConflictMeta>;
  blockedTourWeekKeys: Set<string>;
  berlinToday: string;
  isAdmin: boolean;
  readOnly: boolean;
  showMonthHeader: boolean;
  draggedAppointmentId: number | null;
  getSlotBarPosition: (startIndex: number, endIndex: number) => { left: string; width: string };
  onDrop: (event: React.DragEvent, targetDate: Date, targetTourId?: number | null) => Promise<void>;
  onNewAppointment: (dateKey: string) => void;
  onAppointmentClick: (appointmentId: number) => void;
  onDragStart: (event: React.DragEvent, appointmentId: number) => void;
  onDragEnd: () => void;
  weekDays: string[];
}) {
  return (
    <section
      className="h-full min-w-full w-full border-r border-border/30 last:border-r-0"
      data-testid={`month-sheet-${month.monthKey}`}
    >
      <div className="flex h-full flex-col">
        {showMonthHeader ? (
          <div className="border-b border-border/40 bg-muted/20 px-6 py-3">
            <span className="text-sm font-semibold tracking-wide text-primary" data-testid={`month-sheet-title-${month.monthKey}`}>
              {format(month.monthStart, "MMMM yyyy", { locale: de })}
            </span>
          </div>
        ) : null}

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
          className="flex-1 grid overflow-y-auto overflow-x-hidden"
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
                          ${dayIdx === 6 ? "border-r-0" : ""}
                        `}
                        onDragOver={readOnly ? undefined : (event) => event.preventDefault()}
                        onDrop={readOnly ? undefined : (event) => {
                          void onDrop(event, day.date);
                        }}
                        data-testid={`month-sheet-day-${day.dateKey}`}
                        data-month-scope={day.isCurrentMonth ? "current" : "adjacent"}
                      >
                        <div
                          style={{ height: `${MONTH_DAY_HEADER_HEIGHT_PX}px` }}
                          className={`flex items-center justify-between rounded-md px-1.5 ${dayHeaderClassName}`}
                        >
                          <span
                            className={`
                              flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                              ${dayNumberClassName}
                            `}
                          >
                            {format(day.date, "d")}
                          </span>
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
                                onDragOver={readOnly ? undefined : (event) => event.preventDefault()}
                                onDrop={readOnly ? undefined : (event) => {
                                  event.stopPropagation();
                                  void onDrop(event, day.date, slot.tourId);
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
                                onDoubleClick={() => onAppointmentClick(appointment.id)}
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
                                isBlocked={isSlotBlocked}
                                allowHistoricalActions={isAdmin}
                                onDoubleClick={() => onAppointmentClick(appointment.id)}
                                onDragStart={canDrag ? (event) => onDragStart(event, appointment.id) : undefined}
                                onDragEnd={canDrag ? onDragEnd : undefined}
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

function MonthCompactBarWithMenu({
  appointment,
  readOnly = false,
  isFirstDay,
  isLastDay,
  isConflict = false,
  conflictColor,
  isLocked,
  isDragging,
  isBlocked = false,
  allowHistoricalActions = false,
  onDoubleClick,
  onDragStart,
  onDragEnd,
}: {
  appointment: CalendarAppointment;
  readOnly?: boolean;
  isFirstDay: boolean;
  isLastDay: boolean;
  isConflict?: boolean;
  conflictColor?: string;
  isLocked?: boolean;
  isDragging?: boolean;
  isBlocked?: boolean;
  allowHistoricalActions?: boolean;
  onDoubleClick?: () => void;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
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
