import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { ChevronDown, ChevronRight, ListChecks, Lock, LockOpen, MoreVertical, StickyNote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSetting, useSettings } from "@/hooks/useSettings";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
import {
  useCalendarAppointments,
  useCalendarBlockedTourWeeks,
  useCalendarWeekLaneEmployeePreviews,
  type CalendarAppointment,
} from "@/lib/calendar-appointments";
import {
  formatCalendarMoveDate,
  isRegularCalendarMoveTarget,
  toCalendarMoveSelection,
  type CalendarMoveRequest,
  type CalendarMoveSelection,
} from "@/lib/calendar-move";
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
import { getWeekAppointmentFooterStyle } from "./weekAppointmentCardStyles";
import { CalendarWeekTourLaneHeaderBar } from "./CalendarWeekTourLaneHeaderBar";
import { CalendarWeekNotesButton } from "./CalendarWeekNotesButton";
import { TourWeekNotesHoverPreview } from "@/components/TourWeekNotesHoverPreview";
import { isLaneCollapsed, normalizeExpandedLaneId, resolveCollapsedLaneSelection } from "./weekLaneState";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ColorSelectButton } from "@/components/ui/color-select-button";
import { ConfirmDialogBase, type DialogBaseStep } from "@/components/ui/dialog-base";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditFormContextText } from "@/components/ui/edit-form-context-text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RichTextEditor } from "@/components/RichTextEditor";
import { WorkflowNoteRemovalDialog, WorkflowNoteSuggestionDialog } from "@/components/notes/WorkflowNoteDialogs";
import { TourEmployeeCascadeDialog } from "@/components/TourEmployeeCascadeDialog";
import { EmployeePickerDialogList, buildIneligibleReasonById, type EmployeeWithEligibility } from "@/components/EmployeePickerDialogList";
import type { CalendarNavCommand, WeekViewRestoreRequest } from "@/pages/Home";
import type { Employee, Note, NoteTemplate, Team, Tour } from "@shared/schema";
import type { MonitoringConflictMeta } from "@/lib/monitoring-ui";
import { computeTagAddedAction, computeTagRemovedAction } from "@/hooks/useTagRuleEngine";
import { getStoredUserRole, isReaderRole } from "@/lib/auth";
import {
  buildWorkflowNoteDraft,
  findWorkflowNoteTemplate,
  normalizeWorkflowNoteTitle,
} from "@/lib/workflow-note-templates";
import { CalendarMarkerHeaderLabel } from "./CalendarMarkerHeaderLabel";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { PrintPreviewDialog } from "@/components/print/PrintPreviewDialog";
import { PrintPageShell } from "@/components/print/PrintPageShell";
import type { CalendarWeekInlineNote, CalendarWeekInlineNoteSource } from "./CalendarWeekInlineNotes";

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
  onOpenProject?: (projectId: number) => void;
  selectedMoveAppointment?: CalendarMoveSelection | null;
  onSelectMoveAppointment?: (appointment: CalendarMoveSelection) => void;
  onRequestMoveAppointment?: (request: CalendarMoveRequest) => void | Promise<void>;
  restoreRequest?: WeekViewRestoreRequest | null;
  onRestoreApplied?: () => void;
  onViewportChange?: (viewport: { scrollLeft: number; scrollTop: number }) => void;
  onFooterActionChange?: (action: ReactNode | null) => void;
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

type WeekAbsenceEmployee = CalendarAppointment["employees"][number];
type WeekPlanningPreviewItem = {
  appointmentId: number;
  startDate: string;
  endDate: string | null;
  projectName?: string | null;
  customerName?: string | null;
  status?: "will_add" | "conflict" | "already_assigned" | "will_remove" | "understaffed" | "keep";
  selectable?: boolean;
  conflictReason: string | null;
  isUnderstaffed?: boolean;
};
type AppointmentEmployeePreviewItem = {
  employeeId: number;
  employeeName: string;
  status: "will_add" | "conflict" | "already_present" | "current_only";
  selectable: boolean;
  conflictReason: string | null;
  source?: "week_plan" | "available" | "current";
};
type WeekPlanningDialogOperation = {
  mode: "add" | "remove";
  tourId: number;
  tourName?: string;
  isoYear: number;
  isoWeek: number;
  assignmentId?: number;
  employeeId: number;
  employeeName: string;
  weekLabel: string;
  previewItems: WeekPlanningPreviewItem[];
  selectedIds: number[];
  executionStatus?: "pending" | "success" | "error";
  executionMessage?: string;
};
type WeekPlanningDialogState = {
  mode: "add" | "remove";
  activeIndex: number;
  phase: "preview" | "executing" | "partial_error";
  operations: WeekPlanningDialogOperation[];
};
type WeekPersonnelPickerState = {
  tourId: number;
  isoYear: number;
  isoWeek: number;
  weekLabel: string;
};

const normalizeTourName = (value: string | null | undefined) => (value ?? "").trim().toLocaleLowerCase("de").replace(/ß/g, "ss");

const SHORT_WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
const SHORT_MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"] as const;
const WEEK_PERSONNEL_COLLAPSED_COLUMN_WIDTH = "3rem";
const WEEK_PERSONNEL_EXPANDED_FALLBACK_COLUMN_WIDTH = "8.5rem";
const WEEK_PERSONNEL_EXPANDED_COLUMN_CHROME_PX = 36;

export function formatCompactWeekDayHeader(day: Date, includeMonth = true): string {
  const weekday = SHORT_WEEKDAYS[(day.getDay() + 6) % 7] ?? "Mo";
  const month = SHORT_MONTHS[day.getMonth()] ?? "";
  return includeMonth ? `${weekday} ${format(day, "d")} ${month}` : `${weekday} ${format(day, "d")}`;
}

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

function usesCompactDayWidthForCalendarMarker(marker: { type: string }): boolean {
  return marker.type === "public_holiday" || marker.type === "company_holiday";
}

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

function areStringRecordsEqual(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && rightKeys.every((key) => left[key] === right[key]);
}

function buildWeekPlanningLabel(isoYear: number, isoWeek: number): string {
  return `KW ${String(isoWeek).padStart(2, "0")} / ${isoYear}`;
}

function resolveSelectablePreviewIds(items: WeekPlanningPreviewItem[]): number[] {
  return items
    .filter((item) => item.selectable ?? false)
    .map((item) => item.appointmentId);
}

function buildWeekPlanningDialogOperation(
  params: Omit<WeekPlanningDialogOperation, "selectedIds" | "executionStatus" | "executionMessage">,
): WeekPlanningDialogOperation {
  return {
    ...params,
    selectedIds: resolveSelectablePreviewIds(params.previewItems),
    executionStatus: "pending",
  };
}

export function isWeekPlanningLockedForCalendarRole(
  weekKey: string,
  currentWeekKey: string,
  canManageCurrentWeek: boolean,
): boolean {
  return weekKey < currentWeekKey || (weekKey === currentWeekKey && !canManageCurrentWeek);
}

export function resolveInitialAppointmentEmployeeSelection(items: AppointmentEmployeePreviewItem[]): number[] {
  return items
    .filter((item) => item.selectable && item.status === "will_add" && (item.source ?? "week_plan") === "week_plan")
    .map((item) => item.employeeId);
}

// Bildet die serverseitig konfliktannotierten Preview-Items auf Picker-Mitarbeiter ab.
// Es bleiben bewusst alle Items erhalten (auch nicht zuweisbare), damit der Picker sie
// sichtbar gesperrt anzeigen kann, statt sie stillschweigend auszublenden.
export function mapAppointmentPreviewToPickerEmployees(items: AppointmentEmployeePreviewItem[]): Employee[] {
  return items.map((item) => ({
    id: item.employeeId,
    firstName: "",
    lastName: item.employeeName,
    fullName: item.employeeName,
    phone: null,
    email: null,
    exitDate: null,
    isActive: true,
    version: 0,
    teamId: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  } as Employee));
}

// Sperrgründe für nicht zuweisbare Mitarbeiter: bereits zugewiesen, abwesend/Urlaub oder Terminkonflikt.
export function buildAppointmentAssignIneligibleReasons(
  items: AppointmentEmployeePreviewItem[],
): Record<number, string> {
  const reasons: Record<number, string> = {};
  for (const item of items) {
    if (item.selectable) continue;
    if (item.status === "already_present") {
      reasons[item.employeeId] = "Bereits diesem Termin zugewiesen";
    } else if (item.conflictReason === "ON_LEAVE") {
      reasons[item.employeeId] = "Im Urlaub / abwesend";
    } else {
      reasons[item.employeeId] = "Überschneidung mit bestehendem Termin";
    }
  }
  return reasons;
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

export function CalendarWeekAbsenceRow({
  weekKey,
  days,
  absenceEmployeesByDate,
  absenceTourColor,
  weekDayGridTemplate,
  personnelColumnWidth,
  stickyTopPx = 60,
  isCollapsed = false,
  onCollapsedChange,
}: {
  weekKey: string;
  days: Date[];
  absenceEmployeesByDate: Map<string, WeekAbsenceEmployee[]>;
  absenceTourColor: string;
  weekDayGridTemplate: string;
  personnelColumnWidth?: string | null;
  stickyTopPx?: number;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const rowGridTemplate = personnelColumnWidth ? `${personnelColumnWidth} ${weekDayGridTemplate}` : weekDayGridTemplate;
  return (
    <div
      className="sticky z-20 border-b border-border/30 bg-slate-50"
      style={{ top: `${stickyTopPx}px` }}
      data-testid={`week-absence-row-${weekKey}`}
    >
      <div
        className="flex h-5 items-center gap-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-white"
        style={{ backgroundColor: absenceTourColor }}
        data-testid={`week-absence-row-header-${weekKey}`}
      >
        <button
          type="button"
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/80"
          onClick={() => onCollapsedChange?.(!isCollapsed)}
          data-testid={`button-week-absence-row-toggle-${weekKey}`}
          aria-label={isCollapsed ? "Abwesenheitsspur erweitern" : "Abwesenheitsspur kollabieren"}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />}
        </button>
        <span>Abwesenheiten</span>
      </div>
      {!isCollapsed ? (
        <div
          className="grid divide-x divide-border/30"
          style={{ gridTemplateColumns: rowGridTemplate }}
        >
          {personnelColumnWidth ? (
            <div className="min-h-12 bg-slate-100/80" data-testid={`week-absence-personnel-spacer-${weekKey}`} />
          ) : null}
          {days.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const absentEmployees = absenceEmployeesByDate.get(dayKey) ?? [];
            const visibleEmployees = absentEmployees.slice(0, 4);
            const overflowCount = Math.max(0, absentEmployees.length - visibleEmployees.length);
            return (
              <div key={`week-absence-cell-${dayKey}`} className="min-h-12 overflow-hidden px-2 py-1" data-testid={`week-absence-cell-${dayKey}`}>
                <div className="flex flex-wrap items-center justify-start gap-1">
                  {visibleEmployees.map((employee) => (
                    <EmployeeInfoBadge
                      key={`absence-${dayKey}-${employee.id}`}
                      id={employee.id}
                      firstName={employee.firstName}
                      lastName={employee.lastName}
                      fullName={employee.fullName}
                      renderMode="standard"
                      size="sm"
                      action="none"
                      showAvatar={false}
                      showPreview
                      testId={`week-absence-employee-${dayKey}-${employee.id}`}
                    />
                  ))}
                  {overflowCount > 0 ? (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700" data-testid={`week-absence-overflow-${dayKey}`}>
                      +{overflowCount}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
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
  onOpenProject,
  selectedMoveAppointment,
  onSelectMoveAppointment,
  onRequestMoveAppointment,
  restoreRequest,
  onRestoreApplied,
  onViewportChange,
  onFooterActionChange,
}: CalendarWeekViewProps) {
  // FIX-RULE:
  // Navigation/Sync-Signale werden absichtlich nicht verarbeitet.
  // Zeitraumwechsel darf nur explizit über Home-Buttons und currentDate erfolgen.
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<number | null>(null);
  const [hoveredAppointmentId, setHoveredAppointmentId] = useState<number | null>(null);
  const [noteSuggestionDialog, setNoteSuggestionDialog] = useState<{ templateTitle: string; appointmentId: number } | null>(null);
  const [noteRemovalDialog, setNoteRemovalDialog] = useState<{ templateTitle: string; appointmentId: number; noteId: number; noteVersion: number } | null>(null);
  const [pendingInlineNoteDelete, setPendingInlineNoteDelete] = useState<CalendarWeekInlineNote | null>(null);
  const workflowNoteSuggestionSeenRef = useRef(new Set<string>());
  const [workflowNoteEditorOpen, setWorkflowNoteEditorOpen] = useState(false);
  const [workflowNoteEditorAppointmentId, setWorkflowNoteEditorAppointmentId] = useState<number | null>(null);
  const [workflowNoteEditorSourceType, setWorkflowNoteEditorSourceType] = useState<CalendarWeekInlineNoteSource>("appointment");
  const [workflowNoteEditorParentId, setWorkflowNoteEditorParentId] = useState<number | null>(null);
  const [workflowNoteEditorId, setWorkflowNoteEditorId] = useState<number | null>(null);
  const [workflowNoteEditorVersion, setWorkflowNoteEditorVersion] = useState<number>(1);
  const [workflowNoteTitle, setWorkflowNoteTitle] = useState("");
  const [workflowNoteBody, setWorkflowNoteBody] = useState("");
  const [workflowNoteCardColor, setWorkflowNoteCardColor] = useState<string>("#f8fafc");
  const [workflowNotePrint, setWorkflowNotePrint] = useState(true);
  const [workflowNoteCardColorLocked, setWorkflowNoteCardColorLocked] = useState(false);
  const [weekPrintPreviewOpen, setWeekPrintPreviewOpen] = useState(false);
  const [weekPrintPageIndex, setWeekPrintPageIndex] = useState(0);
  const [weekPersonnelPicker, setWeekPersonnelPicker] = useState<WeekPersonnelPickerState | null>(null);
  const [weekPlanningDialog, setWeekPlanningDialog] = useState<WeekPlanningDialogState | null>(null);
  const [pendingWeekBlock, setPendingWeekBlock] = useState<{
    tourId: number;
    isoYear: number;
    isoWeek: number;
    tourLabel: string | null;
  } | null>(null);
  const [appointmentEmployeeDialog, setAppointmentEmployeeDialog] = useState<{
    action: "assign" | "remove";
    appointmentId: number;
    employeeId?: number;
    title: string;
    description: string;
    previewItems: AppointmentEmployeePreviewItem[];
    currentEmployeeIds: number[];
    selectedIds: number[];
  } | null>(null);
  useEffect(() => {
    if (!onFooterActionChange) return undefined;

    onFooterActionChange(
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setWeekPrintPageIndex(0);
          setWeekPrintPreviewOpen(true);
        }}
        data-testid="button-week-print-preview"
      >
        Drucken
      </Button>,
    );

    return () => onFooterActionChange(null);
  }, [onFooterActionChange]);
  const [visibleWeekStart, setVisibleWeekStart] = useState(() => startOfWeek(currentDate, { weekStartsOn: 1, locale: de }));
  const cardHeightByLaneRef = useRef<Map<string, number>>(new Map());
  const projectStatusHeightByWeekRef = useRef<Map<string, number>>(new Map());
  const firstWeekdayHeaderRef = useRef<HTMLDivElement | null>(null);
  const weekHeaderRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const horizontalScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const weekSectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const weekScrollContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const weekPersonnelBadgeMeasurementRef = useRef<HTMLDivElement | null>(null);
  const pendingLaneCorrectionRef = useRef<string | null>(null);
  const [, setAppointmentHeightVersion] = useState(0);
  const [weekHeaderHeightsByWeek, setWeekHeaderHeightsByWeek] = useState<Record<string, number>>({});
  const [measuredPersonnelColumnWidthsByWeek, setMeasuredPersonnelColumnWidthsByWeek] = useState<Record<string, string>>({});
  const [measuredPersonnelBadgeWidthsByWeek, setMeasuredPersonnelBadgeWidthsByWeek] = useState<Record<string, string>>({});
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
  const persistedPersonnelColumnVisible = useSetting("calendar.weekPersonnelColumn.visible");
  const persistedWeekInlineNotesVisible = useSetting("calendar.weekInlineNotes.visible");
  const persistedPersonnelColumnCollapsed = useSetting("calendar.weekPersonnelColumn.collapsed");
  const persistedAbsenceLaneCollapsed = useSetting("calendar.weekAbsenceLane.collapsed");
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
  const showPersonnelColumn = Boolean(persistedPersonnelColumnVisible);
  const showAppointmentNotesInline = Boolean(persistedWeekInlineNotesVisible);
  const isPersonnelColumnCollapsed = persistedPersonnelColumnCollapsed !== false;
  const isAbsenceLaneCollapsed = Boolean(persistedAbsenceLaneCollapsed);
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

  const measureWeekHeaderHeight = (weekKey: string, node: HTMLDivElement) => {
    const heightPx = Math.round(node.getBoundingClientRect().height);
    if (heightPx <= 0) return;

    setWeekHeaderHeightsByWeek((currentHeights) => {
      if (currentHeights[weekKey] === heightPx) return currentHeights;
      return {
        ...currentHeights,
        [weekKey]: heightPx,
      };
    });
  };

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
    includeAppointmentNotes: showAppointmentNotesInline,
    includeProjectNotes: showAppointmentNotesInline,
    userRole,
  });
  const { data: weekLaneEmployeePreviews = [] } = useCalendarWeekLaneEmployeePreviews({
    fromDate: stripFromDate,
    toDate: stripToDate,
  });
  const personnelBadgeMeasurementGroups = useMemo(() => {
    const groups = new Map<string, Array<{
      key: string;
      id: number;
      assignmentId?: number;
      firstName: string;
      lastName: string;
      fullName: string;
    }>>();
    for (const preview of weekLaneEmployeePreviews) {
      const group = groups.get(preview.weekStartDate) ?? [];
      for (const employee of preview.weekEmployees) {
        group.push({
          key: `${preview.tourId}-${preview.weekStartDate}-${employee.id}-${employee.assignmentId ?? "none"}`,
          ...employee,
        });
      }
      groups.set(preview.weekStartDate, group);
    }
    return Array.from(groups.entries()).map(([weekStartDate, employees]) => ({ weekStartDate, employees }));
  }, [weekLaneEmployeePreviews]);
  useEffect(() => {
    if (!showPersonnelColumn || isPersonnelColumnCollapsed) {
      setMeasuredPersonnelColumnWidthsByWeek({});
      setMeasuredPersonnelBadgeWidthsByWeek({});
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      const measurementRoot = weekPersonnelBadgeMeasurementRef.current;
      if (!measurementRoot) return;

      const nextColumnWidths: Record<string, string> = {};
      const nextBadgeWidths: Record<string, string> = {};
      for (const groupNode of Array.from(measurementRoot.querySelectorAll<HTMLElement>("[data-week-personnel-measurement-week]"))) {
        const weekStartDate = groupNode.dataset.weekPersonnelMeasurementWeek;
        if (!weekStartDate) continue;

        const maxBadgeWidth = Array.from(groupNode.querySelectorAll<HTMLElement>("[data-week-personnel-measurement-badge]"))
          .reduce((maxWidth, badgeNode) => Math.max(maxWidth, badgeNode.getBoundingClientRect().width), 0);
        if (maxBadgeWidth > 0) {
          const badgeWidth = Math.ceil(maxBadgeWidth);
          nextBadgeWidths[weekStartDate] = `${badgeWidth}px`;
          nextColumnWidths[weekStartDate] = `${badgeWidth + WEEK_PERSONNEL_EXPANDED_COLUMN_CHROME_PX}px`;
        }
      }

      setMeasuredPersonnelColumnWidthsByWeek((currentWidths) => {
        return areStringRecordsEqual(currentWidths, nextColumnWidths) ? currentWidths : nextColumnWidths;
      });
      setMeasuredPersonnelBadgeWidthsByWeek((currentWidths) => {
        return areStringRecordsEqual(currentWidths, nextBadgeWidths) ? currentWidths : nextBadgeWidths;
      });
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [isPersonnelColumnCollapsed, personnelBadgeMeasurementGroups, showPersonnelColumn]);
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
    const frame = window.requestAnimationFrame(() => {
      for (const [weekKey, headerNode] of Array.from(weekHeaderRefs.current.entries())) {
        measureWeekHeaderHeight(weekKey, headerNode);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [calendarMarkersByDate, markerVisualizationStyle, scrollResetKey, showPersonnelColumn]);

  const absenceEmployeesByDate = useMemo(() => {
    const result = new Map<string, CalendarAppointment["employees"]>();
    for (const appointment of appointments) {
      if (!isAbsenceAppointmentSummary({ tourName: appointment.tourName, appointmentTags: appointment.appointmentTags })) {
        continue;
      }
      const startDate = appointment.startDate;
      const endDate = appointment.endDate ?? appointment.startDate;
      for (let cursor = parseISO(startDate); format(cursor, "yyyy-MM-dd") <= endDate; cursor = addDays(cursor, 1)) {
        const dateKey = format(cursor, "yyyy-MM-dd");
        if (dateKey < stripFromDate || dateKey > stripToDate) continue;
        const existing = result.get(dateKey) ?? [];
        const merged = [...existing];
        for (const employee of appointment.employees) {
          if (!merged.some((entry) => entry.id === employee.id)) {
            merged.push(employee);
          }
        }
        result.set(dateKey, merged);
      }
    }
    return result;
  }, [appointments, stripFromDate, stripToDate]);

  const setPersonnelColumnVisible = (visible: boolean) => {
    void setSetting({
      key: "calendar.weekPersonnelColumn.visible",
      scopeType: "USER",
      value: visible,
    }).catch((error) => {
      console.error(`${logPrefix} personnel column persist failed`, error);
      toast({
        title: "Personalspalte konnte nicht gespeichert werden",
        description: "Bitte erneut versuchen.",
        variant: "destructive",
      });
    });
  };

  const setInlineNotesVisible = (visible: boolean) => {
    void setSetting({
      key: "calendar.weekInlineNotes.visible",
      scopeType: "USER",
      value: visible,
    }).catch((error) => {
      console.error(`${logPrefix} inline notes persist failed`, error);
      toast({
        title: "Notizen-Anzeige konnte nicht gespeichert werden",
        description: "Bitte erneut versuchen.",
        variant: "destructive",
      });
    });
  };

  const setPersonnelColumnCollapsed = (collapsed: boolean) => {
    void setSetting({
      key: "calendar.weekPersonnelColumn.collapsed",
      scopeType: "USER",
      value: collapsed,
    }).catch((error) => {
      console.error(`${logPrefix} personnel column collapse persist failed`, error);
      toast({
        title: "Personalspalte konnte nicht gespeichert werden",
        description: "Bitte erneut versuchen.",
        variant: "destructive",
      });
    });
  };

  const setAbsenceLaneCollapsed = (collapsed: boolean) => {
    void setSetting({
      key: "calendar.weekAbsenceLane.collapsed",
      scopeType: "USER",
      value: collapsed,
    }).catch((error) => {
      console.error(`${logPrefix} absence lane collapse persist failed`, error);
      toast({
        title: "Abwesenheitsspur konnte nicht gespeichert werden",
        description: "Bitte erneut versuchen.",
        variant: "destructive",
      });
    });
  };

  useEffect(() => {
    cardHeightByLaneRef.current.clear();
    projectStatusHeightByWeekRef.current.clear();
    setAppointmentHeightVersion((prev) => prev + 1);
  }, [appointments, scrollResetKey, weekTileBodyMode]);

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });
  const { data: pickerTeams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: weekPersonnelPicker !== null,
  });
  const { data: availableWeekEmployees = [], isLoading: availableWeekEmployeesLoading } = useQuery<EmployeeWithEligibility[]>({
    queryKey: weekPersonnelPicker
      ? [`/api/tours/${weekPersonnelPicker.tourId}/week-employees/available`, weekPersonnelPicker.isoYear, weekPersonnelPicker.isoWeek]
      : ["/api/tours/week-employees/available", "idle"],
    enabled: weekPersonnelPicker !== null,
    staleTime: 0,
    queryFn: async () => {
      if (!weekPersonnelPicker) return [];
      const params = new URLSearchParams({
        isoYear: String(weekPersonnelPicker.isoYear),
        isoWeek: String(weekPersonnelPicker.isoWeek),
      });
      const response = await fetch(`/api/tours/${weekPersonnelPicker.tourId}/week-employees/available?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Verfügbare Mitarbeiter konnten nicht geladen werden");
      }
      return response.json() as Promise<EmployeeWithEligibility[]>;
    },
  });
  const absenceTourColor = useMemo(
    () => tours.find((tour) => isAbsenceTourName(tour.name))?.color ?? CALENDAR_UNASSIGNED_TOUR_COLOR,
    [tours],
  );

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

  const confirmPendingWeekBlock = async () => {
    if (!pendingWeekBlock) return;
    try {
      await blockWeekMutation.mutateAsync({
        tourId: pendingWeekBlock.tourId,
        isoYear: pendingWeekBlock.isoYear,
        isoWeek: pendingWeekBlock.isoWeek,
      });
      setPendingWeekBlock(null);
      toast({ title: "Wochenplanung blockiert" });
    } catch {
      toast({
        title: "Wochenplanung konnte nicht blockiert werden",
        description: "Bitte erneut versuchen.",
        variant: "destructive",
      });
    }
  };

  const previewAddWeekEmployeeMutation = useMutation({
    mutationFn: async (params: { tourId: number; isoYear: number; isoWeek: number; employeeId: number }) => {
      const response = await apiRequest("POST", `/api/tours/${params.tourId}/week-employees/add/preview`, {
        isoYear: params.isoYear,
        isoWeek: params.isoWeek,
        employeeId: params.employeeId,
      });
      return response.json() as Promise<{
        isoYear: number;
        isoWeek: number;
        employee: { employeeId: number; fullName: string };
        items: WeekPlanningPreviewItem[];
      }>;
    },
  });

  const previewRemoveWeekEmployeeMutation = useMutation({
    mutationFn: async (params: { tourId: number; assignmentId: number }) => {
      const response = await apiRequest("POST", `/api/tours/${params.tourId}/week-employees/remove/preview`, {
        assignmentId: params.assignmentId,
      });
      return response.json() as Promise<{
        assignmentId: number;
        isoYear: number;
        isoWeek: number;
        employee: { assignmentId: number; employeeId: number; fullName: string };
        items: WeekPlanningPreviewItem[];
      }>;
    },
  });

  const executeAddWeekEmployeeMutation = useMutation({
    mutationFn: async (params: { tourId: number; isoYear: number; isoWeek: number; employeeId: number; selectedIds: number[] }) => {
      const response = await apiRequest("POST", `/api/tours/${params.tourId}/week-employees/add`, {
        isoYear: params.isoYear,
        isoWeek: params.isoWeek,
        employeeId: params.employeeId,
        selectedAppointmentIds: params.selectedIds,
      });
      return response.json();
    },
    onSuccess: async () => {
      await invalidateWeekPlanningViews();
      await refreshMonitoringWithNotification(toast);
    },
    onError: (error) => {
      toast({
        title: "Wochenplanung konnte nicht gespeichert werden",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
    },
  });

  const executeRemoveWeekEmployeeMutation = useMutation({
    mutationFn: async (params: { tourId: number; assignmentId: number; isoYear: number; isoWeek: number; selectedIds: number[] }) => {
      const response = await apiRequest("DELETE", `/api/tours/${params.tourId}/week-employees/${params.assignmentId}`, {
        isoYear: params.isoYear,
        isoWeek: params.isoWeek,
        selectedAppointmentIds: params.selectedIds,
      });
      return response.json();
    },
    onSuccess: async () => {
      await invalidateWeekPlanningViews();
      await refreshMonitoringWithNotification(toast);
    },
    onError: (error) => {
      toast({
        title: "Wochenplanung konnte nicht aktualisiert werden",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
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

  const handleCutAppointment = (appointment: CalendarAppointment) => {
    if (!onSelectMoveAppointment) return;
    onSelectMoveAppointment(toCalendarMoveSelection(appointment));
  };

  const handleDragStart = (event: React.DragEvent, appointmentId: number) => {
    setDraggedAppointmentId(appointmentId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(appointmentId));
    console.info(`${logPrefix} drag start`, { appointmentId });
  };

  const openNewAppointmentNoteEditor = (appointmentId: number) => {
    setWorkflowNoteEditorAppointmentId(appointmentId);
    setWorkflowNoteEditorSourceType("appointment");
    setWorkflowNoteEditorParentId(appointmentId);
    setWorkflowNoteEditorId(null);
    setWorkflowNoteEditorVersion(1);
    setWorkflowNoteTitle("");
    setWorkflowNoteBody("");
    setWorkflowNoteCardColor("#f8fafc");
    setWorkflowNotePrint(true);
    setWorkflowNoteCardColorLocked(false);
    setWorkflowNoteEditorOpen(true);
  };

  const hasUsableInlineNoteVersion = (note: CalendarWeekInlineNote): boolean =>
    Number.isInteger(note.version) && note.version >= 1;

  const getInlineNoteListUrl = (note: CalendarWeekInlineNote): string => {
    if (note.parentId < 1) {
      throw new Error("Notizkontext konnte nicht bestimmt werden.");
    }
    if (note.sourceType === "appointment") {
      return `/api/appointments/${note.parentId}/notes`;
    }
    return `/api/projects/${note.parentId}/notes`;
  };

  const loadInlineNote = async (note: CalendarWeekInlineNote): Promise<Note> => {
    const response = await fetch(getInlineNoteListUrl(note), { credentials: "include" });
    if (!response.ok) {
      throw new Error("Notiz konnte nicht geladen werden.");
    }
    const notes = await response.json() as Note[];
    const freshNote = notes.find((item) => item.id === note.id);
    if (!freshNote) {
      throw new Error("Notiz wurde nicht gefunden.");
    }
    return freshNote;
  };

  const applyInlineNoteEditorState = (note: CalendarWeekInlineNote, freshNote?: Note) => {
    setWorkflowNoteEditorAppointmentId(note.sourceType === "appointment" ? note.parentId : null);
    setWorkflowNoteEditorSourceType(note.sourceType);
    setWorkflowNoteEditorParentId(note.parentId);
    setWorkflowNoteEditorId(note.id);
    setWorkflowNoteEditorVersion(freshNote?.version ?? note.version);
    setWorkflowNoteTitle(freshNote?.title ?? note.title);
    setWorkflowNoteBody(freshNote?.body ?? note.body ?? "");
    setWorkflowNoteCardColor(freshNote?.cardColor ?? note.cardColor ?? "#f8fafc");
    setWorkflowNotePrint(freshNote?.print ?? note.print);
    setWorkflowNoteCardColorLocked(freshNote?.cardColorLocked ?? note.cardColorLocked);
    setWorkflowNoteEditorOpen(true);
  };

  const openInlineNoteEditor = (note: CalendarWeekInlineNote) => {
    if (hasUsableInlineNoteVersion(note)) {
      applyInlineNoteEditorState(note);
      return;
    }
    void (async () => {
      try {
        const freshNote = await loadInlineNote(note);
        applyInlineNoteEditorState(note, freshNote);
      } catch (error) {
        toast({
          title: "Notiz konnte nicht geladen werden",
          description: error instanceof Error ? error.message : "Bitte Ansicht aktualisieren und erneut versuchen.",
          variant: "destructive",
        });
      }
    })();
  };

  const openAppointmentEmployeeAssignmentDialog = async (appointmentId: number) => {
    const appointment = appointmentsById.get(appointmentId);
    if (!appointment || !appointment.tourId) {
      toast({
        title: "Mitarbeiterzuweisung nicht möglich",
        description: "Der Termin ist keiner Tour zugeordnet.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", `/api/tours/${appointment.tourId}/week-employees/assignment-preview`, {
        startDate: appointment.startDate,
        endDate: appointment.endDate,
        startTime: appointment.startTime,
        existingEmployeeIds: appointment.employees.map((employee) => employee.id),
        includeAvailableEmployees: true,
      });
      const preview = await response.json() as {
        hasWeekPlan: boolean;
        items: AppointmentEmployeePreviewItem[];
      };
      if (preview.items.length === 0) {
        toast({
          title: "Keine konfliktfreien Mitarbeiter",
          description: "Für diesen Termin sind aktuell keine weiteren Mitarbeiter konfliktfrei zuweisbar.",
        });
        return;
      }
      setAppointmentEmployeeDialog({
        action: "assign",
        appointmentId,
        title: "Mitarbeiter zuweisen",
        description: preview.hasWeekPlan
          ? "Wählen Sie Mitarbeiter aus der Tour-KW-Planung oder weitere konfliktfreie Mitarbeiter."
          : "Wählen Sie konfliktfreie Mitarbeiter für diesen Termin.",
        previewItems: preview.items,
        currentEmployeeIds: appointment.employees.map((employee) => employee.id),
        selectedIds: resolveInitialAppointmentEmployeeSelection(preview.items),
      });
    } catch (error) {
      toast({
        title: "Mitarbeitervorschau fehlgeschlagen",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
    }
  };

  const handleAssignAppointmentEmployees = (appointmentId: number) => {
    void openAppointmentEmployeeAssignmentDialog(appointmentId);
  };

  const openWeekPersonnelPicker = (params: { tourId: number; isoYear: number; isoWeek: number }) => {
    setWeekPersonnelPicker({
      ...params,
      weekLabel: buildWeekPlanningLabel(params.isoYear, params.isoWeek),
    });
  };

  async function openAddWeekPlanningDialogForParams(
    params: { tourId: number; isoYear: number; isoWeek: number; employeeId: number },
  ) {
    try {
      const preview = await previewAddWeekEmployeeMutation.mutateAsync({
        tourId: params.tourId,
        isoYear: params.isoYear,
        isoWeek: params.isoWeek,
        employeeId: params.employeeId,
      });
      setWeekPersonnelPicker(null);
      setWeekPlanningDialog({
        mode: "add",
        activeIndex: 0,
        phase: "preview",
        operations: [
          buildWeekPlanningDialogOperation({
            mode: "add",
            tourId: params.tourId,
            tourName: tours.find((t) => t.id === params.tourId)?.name,
            isoYear: preview.isoYear,
            isoWeek: preview.isoWeek,
            employeeId: preview.employee.employeeId,
            employeeName: preview.employee.fullName,
            weekLabel: buildWeekPlanningLabel(preview.isoYear, preview.isoWeek),
            previewItems: preview.items,
          }),
        ],
      });
    } catch (error) {
      toast({
        title: "Mitarbeitervorschau fehlgeschlagen",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
    }
  }

  const openAddWeekPlanningDialog = async (employeeId: number) => {
    if (!weekPersonnelPicker) return;
    await openAddWeekPlanningDialogForParams({
      tourId: weekPersonnelPicker.tourId,
      isoYear: weekPersonnelPicker.isoYear,
      isoWeek: weekPersonnelPicker.isoWeek,
      employeeId,
    });
  };

  const openApplyWeekPlanningDialog = async (params: { tourId: number; isoYear: number; isoWeek: number; employeeIds: number[] }) => {
    const normalizedEmployeeIds = Array.from(new Set(params.employeeIds.filter((employeeId) => Number.isInteger(employeeId) && employeeId > 0)));
    if (normalizedEmployeeIds.length === 0) {
      toast({
        title: "Keine Mitarbeiter geplant",
        description: "Für diese Tour-KW gibt es keine Mitarbeiter zum Anwenden.",
      });
      return;
    }
    try {
      const operations: WeekPlanningDialogOperation[] = [];
      for (const employeeId of normalizedEmployeeIds) {
        const preview = await previewAddWeekEmployeeMutation.mutateAsync({
          tourId: params.tourId,
          isoYear: params.isoYear,
          isoWeek: params.isoWeek,
          employeeId,
        });
        operations.push(buildWeekPlanningDialogOperation({
          mode: "add",
          tourId: params.tourId,
          tourName: tours.find((t) => t.id === params.tourId)?.name,
          isoYear: preview.isoYear,
          isoWeek: preview.isoWeek,
          employeeId: preview.employee.employeeId,
          employeeName: preview.employee.fullName,
          weekLabel: buildWeekPlanningLabel(preview.isoYear, preview.isoWeek),
          previewItems: preview.items,
        }));
      }
      setWeekPersonnelPicker(null);
      setWeekPlanningDialog({
        mode: "add",
        activeIndex: 0,
        phase: "preview",
        operations,
      });
    } catch (error) {
      toast({
        title: "Mitarbeitervorschau fehlgeschlagen",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
    }
  };

  const openRemoveWeekPlanningDialog = async (params: { tourId: number; assignmentId: number }) => {
    try {
      const preview = await previewRemoveWeekEmployeeMutation.mutateAsync(params);
      setWeekPlanningDialog({
        mode: "remove",
        activeIndex: 0,
        phase: "preview",
        operations: [
          buildWeekPlanningDialogOperation({
            mode: "remove",
            tourId: params.tourId,
            tourName: tours.find((t) => t.id === params.tourId)?.name,
            isoYear: preview.isoYear,
            isoWeek: preview.isoWeek,
            assignmentId: preview.assignmentId,
            employeeId: preview.employee.employeeId,
            employeeName: preview.employee.fullName,
            weekLabel: buildWeekPlanningLabel(preview.isoYear, preview.isoWeek),
            previewItems: preview.items,
          }),
        ],
      });
    } catch (error) {
      toast({
        title: "Mitarbeitervorschau fehlgeschlagen",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
    }
  };

  const confirmWeekPlanningDialog = async () => {
    if (!weekPlanningDialog) return;
    if (weekPlanningDialog.phase === "preview" && weekPlanningDialog.activeIndex < weekPlanningDialog.operations.length - 1) {
      setWeekPlanningDialog((current) => current ? { ...current, activeIndex: current.activeIndex + 1 } : current);
      return;
    }

    setWeekPlanningDialog((current) => current ? { ...current, phase: "executing" } : current);
    try {
      for (let index = 0; index < weekPlanningDialog.operations.length; index += 1) {
        const operation = weekPlanningDialog.operations[index];
        if (operation.executionStatus === "success") continue;
        try {
          if (operation.mode === "add") {
            await executeAddWeekEmployeeMutation.mutateAsync({
              tourId: operation.tourId,
              isoYear: operation.isoYear,
              isoWeek: operation.isoWeek,
              employeeId: operation.employeeId,
              selectedIds: operation.selectedIds,
            });
          } else {
            if (typeof operation.assignmentId !== "number") {
              throw new Error("Die zu löschende Wochenzuordnung fehlt.");
            }
            await executeRemoveWeekEmployeeMutation.mutateAsync({
              tourId: operation.tourId,
              assignmentId: operation.assignmentId,
              isoYear: operation.isoYear,
              isoWeek: operation.isoWeek,
              selectedIds: operation.selectedIds,
            });
          }
          setWeekPlanningDialog((current) => current ? {
            ...current,
            activeIndex: Math.min(index + 1, current.operations.length - 1),
            operations: current.operations.map((entry, entryIndex) =>
              entryIndex === index ? { ...entry, executionStatus: "success", executionMessage: "Ausgeführt" } : entry,
            ),
          } : current);
        } catch (error) {
          setWeekPlanningDialog((current) => current ? {
            ...current,
            phase: "partial_error",
            activeIndex: index,
            operations: current.operations.map((entry, entryIndex) =>
              entryIndex === index
                ? { ...entry, executionStatus: "error", executionMessage: error instanceof Error ? error.message : "Ausführung fehlgeschlagen." }
                : entry,
            ),
          } : current);
          return;
        }
      }
      setWeekPlanningDialog(null);
      toast({ title: weekPlanningDialog.mode === "add" ? "Wochenplanung gespeichert" : "Wochenplanung aktualisiert" });
    } catch (error) {
      toast({
        title: "Wochenplanung konnte nicht gespeichert werden",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
    }
  };

  const assignAppointmentEmployeesMutation = useMutation({
    mutationFn: async ({ appointmentId, employeeIds }: { appointmentId: number; employeeIds: number[] }) => {
      const appointment = appointmentsById.get(appointmentId);
      if (!appointment) throw new Error("Termin nicht gefunden.");
      const response = await apiRequest("PATCH", `/api/appointments/${appointmentId}`, {
        version: appointment.version,
        projectId: appointment.projectId,
        customerId: appointment.customer.id,
        tourId: appointment.tourId,
        startDate: appointment.startDate,
        endDate: appointment.endDate,
        startTime: appointment.startTime,
        employeeIds,
      });
      return response.json() as Promise<CalendarAppointment>;
    },
    onSuccess: async () => {
      setAppointmentEmployeeDialog(null);
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
      await refreshMonitoringWithNotification(toast);
      toast({ title: "Mitarbeiter zugewiesen" });
    },
    onError: (error: Error) => {
      toast({ title: "Mitarbeiterzuweisung nicht möglich", description: error.message, variant: "destructive" });
    },
  });

  const removeAppointmentEmployeeMutation = useMutation({
    mutationFn: async ({ appointmentId, employeeId }: { appointmentId: number; employeeId: number }) => {
      const appointment = appointmentsById.get(appointmentId);
      if (!appointment) throw new Error("Termin nicht gefunden.");
      await apiRequest("DELETE", `/api/appointments/${appointmentId}/employees/${employeeId}`, {
        version: appointment.version,
      });
    },
    onSuccess: async () => {
      setAppointmentEmployeeDialog(null);
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
      await refreshMonitoringWithNotification(toast);
      toast({ title: "Mitarbeiter entfernt" });
    },
    onError: (error: Error) => {
      toast({ title: "Mitarbeiter entfernen nicht möglich", description: error.message, variant: "destructive" });
    },
  });

  const handleRemoveAppointmentEmployee = (appointmentId: number, employeeId: number) => {
    const appointment = appointmentsById.get(appointmentId);
    const employee = appointment?.employees.find((entry) => entry.id === employeeId);
    if (!appointment || !employee) {
      toast({ title: "Mitarbeiter entfernen nicht möglich", description: "Termin oder Mitarbeiter wurde nicht gefunden.", variant: "destructive" });
      return;
    }
    setAppointmentEmployeeDialog({
      action: "remove",
      appointmentId,
      employeeId,
      title: "Mitarbeiter entfernen",
      description: `${employee.fullName} wird aus diesem Termin entfernt. Die Tour- und KW-Planung bleibt unverändert.`,
      previewItems: [{
        employeeId,
        employeeName: employee.fullName,
        status: "current_only",
        selectable: false,
        conflictReason: "WILL_REMOVE",
        source: "current",
      }],
      currentEmployeeIds: appointment.employees.map((entry) => entry.id),
      selectedIds: [],
    });
  };

  const activeWeekPlanningOperation = weekPlanningDialog?.operations[weekPlanningDialog.activeIndex] ?? null;
  const weekPlanningDialogSteps: DialogBaseStep[] = weekPlanningDialog
    ? weekPlanningDialog.operations.map((operation, index) => {
        let state: DialogBaseStep["state"] = index === weekPlanningDialog.activeIndex ? "active" : "pending";
        if (operation.executionStatus === "success") state = "complete";
        if (operation.executionStatus === "error") state = "error";
        if (weekPlanningDialog.phase === "preview" && index < weekPlanningDialog.activeIndex) state = "complete";
        return {
          id: `${operation.mode}-${operation.employeeId}-${index}`,
          title: operation.employeeName,
          state,
        };
      })
    : [];
  const weekPlanningConfirmLabel = weekPlanningDialog
    ? weekPlanningDialog.phase === "partial_error"
      ? "Offene Schritte erneut ausführen"
      : weekPlanningDialog.activeIndex < weekPlanningDialog.operations.length - 1
        ? "Weiter"
        : "Auswahl ausführen"
    : "Bestätigen";
  const weekPlanningExecutionMessage = weekPlanningDialog?.phase === "partial_error"
    ? "Ein Schritt konnte nicht ausgeführt werden. Bereits erfolgreiche Schritte werden beim erneuten Ausführen übersprungen."
    : weekPlanningDialog?.phase === "executing"
      ? "Die bestätigten Entscheidungen werden seriell ausgeführt."
      : null;

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

  const invalidateInlineNoteQueries = async (
    sourceType: CalendarWeekInlineNoteSource,
    parentId: number | null,
  ) => {
    if (sourceType === "appointment" && parentId) {
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments", parentId, "notes"] });
    }
    if (sourceType === "project" && parentId) {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", parentId, "notes"] });
    }
    await queryClient.invalidateQueries({ queryKey: ["/api/notes-preview"] });
    await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
    await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
    await refreshMonitoringWithNotification(toast);
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
        setWorkflowNoteEditorSourceType("appointment");
        setWorkflowNoteEditorParentId(variables.appointmentId);
        setWorkflowNoteEditorId(createdNote.id);
        setWorkflowNoteEditorVersion(createdNote.version);
        setWorkflowNoteTitle(createdNote.title);
        setWorkflowNoteBody(createdNote.body ?? "");
        setWorkflowNoteCardColor(createdNote.cardColor ?? "#f8fafc");
        setWorkflowNotePrint(createdNote.print);
        setWorkflowNoteCardColorLocked(createdNote.cardColorLocked);
        setWorkflowNoteEditorOpen(true);
      }
      await invalidateInlineNoteQueries("appointment", variables.appointmentId);
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
      await invalidateInlineNoteQueries(workflowNoteEditorSourceType, workflowNoteEditorParentId);
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
      await invalidateInlineNoteQueries("appointment", variables.appointmentId);
    },
    onError: (error: Error) => {
      toast({ title: "Notiz konnte nicht gelöscht werden", description: error.message, variant: "destructive" });
    },
  });

  const deleteInlineNoteMutation = useMutation({
    mutationFn: async (note: CalendarWeekInlineNote) => {
      const version = hasUsableInlineNoteVersion(note)
        ? note.version
        : (await loadInlineNote(note)).version;
      if (note.sourceType === "appointment") {
        await apiRequest("DELETE", `/api/appointments/${note.parentId}/notes/${note.id}`, { version });
        return note;
      }
      await apiRequest("DELETE", `/api/projects/${note.parentId}/notes/${note.id}`, { version });
      return note;
    },
    onSuccess: async (_data, note) => {
      await invalidateInlineNoteQueries(note.sourceType, note.parentId);
      setPendingInlineNoteDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Notiz konnte nicht gelöscht werden", description: error.message, variant: "destructive" });
    },
  });

  const handleDeleteInlineNote = (note: CalendarWeekInlineNote) => {
    setPendingInlineNoteDelete(note);
  };

  const getWorkflowNoteSuggestionKey = (appointmentId: number, templateTitle: string) =>
    `${appointmentId}:${normalizeWorkflowNoteTitle(templateTitle)}`;

  const openWorkflowNoteSuggestionDialog = (appointmentId: number, templateTitle: string) => {
    const suggestionKey = getWorkflowNoteSuggestionKey(appointmentId, templateTitle);
    if (workflowNoteSuggestionSeenRef.current.has(suggestionKey)) {
      return false;
    }
    workflowNoteSuggestionSeenRef.current.add(suggestionKey);
    setNoteSuggestionDialog({
      templateTitle,
      appointmentId,
    });
    return true;
  };

  const clearWorkflowNoteSuggestionSeen = (appointmentId: number, templateTitle: string) => {
    workflowNoteSuggestionSeenRef.current.delete(getWorkflowNoteSuggestionKey(appointmentId, templateTitle));
  };

  const resolveWorkflowTemplateTitleForTag = (tagName: string) => {
    const action = computeTagAddedAction(tagName, null, []);
    return action.kind === "show_note_suggestion_dialog" ? action.templateTitle : null;
  };

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
          openWorkflowNoteSuggestionDialog(params.appointmentId, action.templateTitle);
        }
        continue;
      }

      const removedTemplateTitle = resolveWorkflowTemplateTitleForTag(event.tagName);
      if (removedTemplateTitle) {
        clearWorkflowNoteSuggestionSeen(params.appointmentId, removedTemplateTitle);
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

  const handleDrop = async (
    event: React.DragEvent,
    targetDate: Date,
    targetTourId: number | null,
    targetTourName: string | null,
  ) => {
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

    if (!isRegularCalendarMoveTarget(targetTourId, targetTourName)) {
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
      console.info(`${logPrefix} drop blocked: past source`, { appointmentId, startDate: appointment.startDate });
      toast({
        title: "Verschieben nicht erlaubt",
        description: "Vergangene Termine können nicht per Drag & Drop verschoben werden.",
        variant: "destructive",
      });
      setDraggedAppointmentId(null);
      return;
    }

    if (targetDate < today && !isAdmin && !isHistoricalParkplatz) {
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
      if (onRequestMoveAppointment) {
        await onRequestMoveAppointment({
          appointment: toCalendarMoveSelection(appointment),
          targetStartDate: newStartDate,
          targetTourId,
          targetTourName,
          mode: "drag",
        });
      } else {
        await persistDropMutation({
          appointmentId,
          version: appointment.version,
          projectId: appointment.projectId,
          customerId: appointment.customer.id,
          tourId: targetTourId,
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
  const weekPrintPages = useMemo(() => weekStarts.map((weekStart) => {
    const weekKey = format(weekStart, "yyyy-MM-dd");
    return {
      weekKey,
      title: `KW ${getISOWeek(weekStart)} · ${format(weekStart, "dd.MM.yy")} bis ${format(endOfWeek(weekStart, { weekStartsOn: 1, locale: de }), "dd.MM.yy")}`,
      weekStart,
      days: Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
      lanes: lanesByWeekStart.get(weekKey) ?? [],
    };
  }), [lanesByWeekStart, weekStarts]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="relative z-30 flex items-center justify-between border-b border-border/40 bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-primary">KW {getISOWeek(visibleWeekStart)}</span>
          <span className="text-sm text-muted-foreground">
            {format(visibleWeekStart, "d. MMMM", { locale: de })} - {format(visibleWeekEnd, "d. MMMM yyyy", { locale: de })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notizen</span>
            <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5" role="group" aria-label="Notizen anzeigen">
              <button
                type="button"
                onClick={() => setInlineNotesVisible(true)}
                aria-pressed={showAppointmentNotesInline}
                data-testid="switch-week-inline-notes"
                className={`rounded px-2 py-1 text-[10px] font-semibold leading-none transition-all ${
                  showAppointmentNotesInline ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Ja
              </button>
              <button
                type="button"
                onClick={() => setInlineNotesVisible(false)}
                aria-pressed={!showAppointmentNotesInline}
                data-testid="toggle-week-inline-notes-no"
                className={`rounded px-2 py-1 text-[10px] font-semibold leading-none transition-all ${
                  !showAppointmentNotesInline ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Nein
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">KW Plan</span>
            <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5" role="group" aria-label="KW Plan anzeigen">
              <button
                type="button"
                onClick={() => setPersonnelColumnVisible(true)}
                aria-pressed={showPersonnelColumn}
                data-testid="switch-week-personnel-column"
                className={`rounded px-2 py-1 text-[10px] font-semibold leading-none transition-all ${
                  showPersonnelColumn ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Ja
              </button>
              <button
                type="button"
                onClick={() => setPersonnelColumnVisible(false)}
                aria-pressed={!showPersonnelColumn}
                data-testid="toggle-week-personnel-column-no"
                className={`rounded px-2 py-1 text-[10px] font-semibold leading-none transition-all ${
                  !showPersonnelColumn ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Nein
              </button>
            </div>
          </div>
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
      {showPersonnelColumn && !isPersonnelColumnCollapsed && personnelBadgeMeasurementGroups.length > 0 ? (
        <div
          ref={weekPersonnelBadgeMeasurementRef}
          className="pointer-events-none absolute left-0 top-0 -z-10 h-0 overflow-visible opacity-0"
          aria-hidden
          data-testid="week-personnel-badge-measurement"
        >
          {personnelBadgeMeasurementGroups.map((group) => (
            <div
              key={`week-personnel-measurement-${group.weekStartDate}`}
              className="flex w-max flex-col gap-1"
              data-week-personnel-measurement-week={group.weekStartDate}
            >
              {group.employees.map((employee) => (
                <span
                  key={`week-personnel-measurement-badge-${employee.key}`}
                  className="inline-flex whitespace-nowrap"
                  data-week-personnel-measurement-badge
                >
                  <EmployeeInfoBadge
                    id={employee.id}
                    firstName={employee.firstName}
                    lastName={employee.lastName}
                    fullName={employee.fullName}
                    renderMode="standard"
                    size="sm"
                    action="remove"
                    showAvatar={false}
                    showPreview={false}
                  />
                </span>
              ))}
            </div>
          ))}
        </div>
      ) : null}
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
                    isAbsenceLane: isAbsenceTourName(lane.label),
                  }))
                .filter((entry) => entry.count > 0)
                .sort((a, b) => {
                  if (a.tourId === null && b.tourId === null) return 0;
                  if (a.tourId === null) return 1;
                  if (b.tourId === null) return -1;
                  return a.tourId - b.tourId;
                }),
            );

            const compactDayWeight = dayWeights[5] ?? 1;
            const weekDayWeights = dayWeights.map((weight, dayIdx) => {
              const hasRegularDayContent = dayHeaderBadges[dayIdx].some((badge) => !badge.isAbsenceLane);
              if (hasRegularDayContent) {
                return 1;
              }

              const dayKey = format(days[dayIdx], "yyyy-MM-dd");
              const hasCompactHolidayMarker = (calendarMarkersByDate.get(dayKey) ?? []).some(usesCompactDayWidthForCalendarMarker);
              if (hasCompactHolidayMarker) {
                return compactDayWeight;
              }

              return weight;
            });
            const weekDayGridTemplate = buildDayGridTemplate(weekDayWeights);
            const personnelColumnWidth = showPersonnelColumn
              ? (
                  isPersonnelColumnCollapsed
                    ? WEEK_PERSONNEL_COLLAPSED_COLUMN_WIDTH
                    : (measuredPersonnelColumnWidthsByWeek[weekKey] ?? WEEK_PERSONNEL_EXPANDED_FALLBACK_COLUMN_WIDTH)
                )
              : null;
            const personnelBadgeMinWidth = !isPersonnelColumnCollapsed
              ? measuredPersonnelBadgeWidthsByWeek[weekKey]
              : undefined;
            const weekFullGridTemplate = personnelColumnWidth
              ? `${personnelColumnWidth} ${weekDayGridTemplate}`
              : weekDayGridTemplate;

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
                  {/* Sticky stacking: day header z-30, absence lane z-20, lane content z-10, marker background z-0. */}
                  <div
                    ref={(node) => {
                      if (node) {
                        weekHeaderRefs.current.set(weekKey, node);
                        window.requestAnimationFrame(() => measureWeekHeaderHeight(weekKey, node));
                      } else {
                        weekHeaderRefs.current.delete(weekKey);
                      }
                    }}
                    className="sticky top-0 z-30 grid divide-x divide-border/30 border-b border-border/30 bg-background"
                    style={{ gridTemplateColumns: weekFullGridTemplate }}
                  >
                    {personnelColumnWidth ? (
                      <div
                        className="flex min-h-0 items-center justify-center bg-slate-100/80 px-1 py-1.5"
                        data-testid={`week-personnel-header-spacer-${weekKey}`}
                      />
                    ) : null}
                    {days.map((day, dayIdx) => {
                      const isTodayDate = isToday(day);
                      const isWeekend = dayIdx >= 5;
                      const dayKey = format(day, "yyyy-MM-dd");
                      const dayMarkers = calendarMarkersByDate.get(dayKey) ?? [];
                      const dayMarkerVisualization = getPrimaryCalendarMarkerVisualization(dayMarkers, markerVisualizationStyle);
                      const useShortDayHeader = personnelColumnWidth !== null && (weekDayWeights[dayIdx] ?? 1) < 1;

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
                            <div
                              className={`mx-auto inline-flex max-w-full items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${
                                isTodayDate ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                              }`}
                              data-testid={`week-day-header-label-${dayKey}`}
                            >
                              <span className="hidden sm:inline">{formatCompactWeekDayHeader(day, !useShortDayHeader)}</span>
                              <span className="sm:hidden">{formatCompactWeekDayHeader(day, false)}</span>
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
                            <div className="mt-1 flex min-h-5 items-center justify-center px-1">
                              <CalendarMarkerHeaderLabel
                                markers={dayMarkers}
                                visualizationStyle={markerVisualizationStyle}
                                dateKey={dayKey}
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <CalendarWeekAbsenceRow
                    weekKey={weekKey}
                    days={days}
                    absenceEmployeesByDate={absenceEmployeesByDate}
                    absenceTourColor={absenceTourColor}
                    weekDayGridTemplate={weekDayGridTemplate}
                    personnelColumnWidth={personnelColumnWidth}
                    stickyTopPx={weekHeaderHeightsByWeek[weekKey] ?? 60}
                    isCollapsed={isAbsenceLaneCollapsed}
                    onCollapsedChange={setAbsenceLaneCollapsed}
                  />

                  <div className="relative z-0 pb-3">
                    <div
                      className="pointer-events-none absolute inset-0 z-0 grid"
                      style={{ gridTemplateColumns: weekFullGridTemplate }}
                      aria-hidden
                    >
                      {personnelColumnWidth ? (
                        <div
                          className="bg-slate-50"
                          data-testid={`week-body-personnel-marker-spacer-${weekKey}`}
                        />
                      ) : null}
                      {days.map((day) => {
                        const dayKey = format(day, "yyyy-MM-dd");
                        const markerVisualization = getPrimaryCalendarMarkerVisualization(
                          calendarMarkersByDate.get(dayKey) ?? [],
                          markerVisualizationStyle,
                        );
                        return (
                          <div
                            key={`week-body-marker-column-${dayKey}`}
                            className={markerVisualization?.columnClassName ?? ""}
                            data-testid={`week-body-marker-column-${dayKey}`}
                            data-marker-visualization={markerVisualization?.tone ?? "none"}
                          />
                        );
                      })}
                    </div>
                    <div className="relative z-10 space-y-0">
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
                      const currentWeekKey = format(startOfWeek(new Date(), { weekStartsOn: 1, locale: de }), "yyyy-MM-dd");
                      const isLaneWeekLocked = isWeekPlanningLockedForCalendarRole(weekKey, currentWeekKey, canManageWeekPlanning);
                      const isAbsenceLane = isAbsenceTourName(tourLane.label);
                      const isParkplatzLane = normalizeTourName(tourLane.label) === normalizeTourName("Parkplatz");
                      const canPlanLaneWeekPersonnel = tourLane.tourId != null && !isAbsenceLane && !isParkplatzLane;
                      const laneWeekEmployees = tourLane.tourId == null
                        ? []
                        : (weekLaneEmployeePreviewByTourDay.get(`${tourLane.tourId}-${format(weekStart, "yyyy-MM-dd")}`)?.weekEmployees ?? []);
                      const laneFooterBaseStyle = getWeekAppointmentFooterStyle(tourLane.color, "compact");
                      const tourWeekPlanningFooterStyle = {
                        backgroundColor: laneFooterBaseStyle.backgroundColor,
                        borderColor: laneFooterBaseStyle.borderTopColor,
                      };
                      const isCurrentLaneCollapsed = isLaneCollapsed({
                        isCollapsedMode,
                        laneKey: tourLane.laneKey,
                        effectiveExpandedLaneId,
                      });
                      return (
                      <CalendarWeekNotesButton
                        key={tourLane.laneKey}
                        yearNumber={isoYear}
                        weekNumber={isoWeek}
                        tourId={tourLane.tourId ?? null}
                        tourLabel={tourLane.label}
                            readOnly={!canWriteNotes || isAbsenceLane}
                      >
                        {({ dialog, notesCount, openDialog }) => {
                          const weekPlanningMenu = canPlanLaneWeekPersonnel ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                  aria-label="Tour-KW-Aktionen"
                                  data-testid={`week-personnel-card-menu-trigger-${tourLane.laneKey}`}
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
                                  {canWriteNotes ? "Notiz hinzufügen" : "Notizen anzeigen"}
                                </DropdownMenuItem>
                                {!isReaderCalendarReadOnly && tourLane.tourId != null ? (
                                  isLaneBlocked ? (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        void unblockWeekMutation.mutateAsync({
                                          tourId: tourLane.tourId!,
                                          isoYear,
                                          isoWeek,
                                        }).then(() => {
                                          toast({ title: "Wochenplanung freigegeben" });
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
                                        setPendingWeekBlock({
                                          tourId: tourLane.tourId!,
                                          isoYear,
                                          isoWeek,
                                          tourLabel: tourLane.label,
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
                          ) : null;
                          return (
                        <div className="rounded-lg border border-border/40 bg-muted/10">
                        <div
                          className={personnelColumnWidth ? "grid" : undefined}
                          style={personnelColumnWidth ? { gridTemplateColumns: `${personnelColumnWidth} minmax(0, 1fr)` } : undefined}
                        >
                          {personnelColumnWidth ? (
                            <div
                              className="relative z-10 flex h-full min-w-0 flex-col border-r border-border/30 bg-slate-50"
                              data-testid={`week-personnel-column-${tourLane.laneKey}`}
                            >
                              <div
                                className="flex h-7 items-center justify-end px-1"
                                style={{
                                  backgroundColor: tourLane.color ?? CALENDAR_UNASSIGNED_TOUR_COLOR,
                                  opacity: 0.82,
                                }}
                                data-testid={`week-personnel-column-header-${tourLane.laneKey}`}
                              >
                                <button
                                  type="button"
                                  className="rounded px-1.5 py-0.5 text-[10px] font-bold leading-none text-white hover:bg-white/15"
                                  onClick={() => setPersonnelColumnCollapsed(!isPersonnelColumnCollapsed)}
                                  data-testid={`button-week-personnel-column-toggle-${tourLane.laneKey}`}
                                  aria-label={isPersonnelColumnCollapsed ? "Personalspalte erweitern" : "Personalspalte kollabieren"}
                                >
                                  {isPersonnelColumnCollapsed ? ">>>" : "<<<"}
                                </button>
                              </div>
                              <div
                                className={`relative grid min-h-0 content-start gap-1 overflow-hidden transition-all duration-300 ease-in-out ${
                                  isCurrentLaneCollapsed ? "max-h-0 flex-none opacity-0" : "max-h-[2200px] flex-1 opacity-100"
                                } ${
                                  isPersonnelColumnCollapsed ? "justify-items-center" : ""
                                }`}
                                style={{
                                  minHeight: isCurrentLaneCollapsed ? "0px" : `${laneRowMinHeightPx}px`,
                                  gridTemplateRows: laneGridTemplateRows,
                                }}
                                data-testid={`week-personnel-column-body-${tourLane.laneKey}`}
                              >
                                <div
                                  className="absolute inset-0 bg-white/65"
                                  data-testid={`week-personnel-column-background-${tourLane.laneKey}`}
                                  aria-hidden
                                />
                                {canPlanLaneWeekPersonnel ? (
                                <div
                                  className={`absolute inset-0 z-10 min-w-0 p-2 ${
                                    isPersonnelColumnCollapsed ? "flex justify-center" : ""
                                  }`}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    boxSizing: "border-box",
                                  }}
                                  data-testid={`week-personnel-card-wrapper-${tourLane.laneKey}`}
                                >
                                  <div
                                    className={`relative flex h-full min-w-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ${
                                      isPersonnelColumnCollapsed ? "items-center gap-1 px-1 py-1" : ""
                                    }`}
                                    data-testid={`week-personnel-card-${tourLane.laneKey}`}
                                  >
                                  {!isPersonnelColumnCollapsed ? (
                                    <div
                                      className="flex min-h-8 w-full shrink-0 items-center justify-end gap-1 border-b px-1.5 py-1"
                                      style={{
                                        backgroundColor: tourWeekPlanningFooterStyle.backgroundColor,
                                        borderColor: tourWeekPlanningFooterStyle.borderColor,
                                      }}
                                      data-testid={`week-personnel-card-header-${tourLane.laneKey}`}
                                    >
                                      {canPlanLaneWeekPersonnel && canManageWeekPlanning && !isLaneWeekLocked && !isLaneBlocked ? (
                                        <>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="inline-flex">
                                                <button
                                                  type="button"
                                                  className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200/80 bg-white/70 text-sm font-bold text-slate-700 shadow-sm hover:bg-white"
                                                  onClick={() => openWeekPersonnelPicker({ tourId: tourLane.tourId!, isoYear, isoWeek })}
                                                  data-testid={`button-add-week-personnel-${tourLane.laneKey}`}
                                                  aria-label="Mitarbeiter zur Wochenplanung hinzufügen"
                                                >
                                                  +
                                                </button>
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent>Mitarbeiter zur Wochenplanung hinzufügen</TooltipContent>
                                          </Tooltip>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="inline-flex">
                                                <button
                                                  type="button"
                                                  className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm hover:bg-white disabled:opacity-50"
                                                  onClick={() => {
                                                    void openApplyWeekPlanningDialog({
                                                      tourId: tourLane.tourId!,
                                                      isoYear,
                                                      isoWeek,
                                                      employeeIds: laneWeekEmployees.map((employee) => employee.id),
                                                    });
                                                  }}
                                                  disabled={laneWeekEmployees.length === 0 || previewAddWeekEmployeeMutation.isPending || executeAddWeekEmployeeMutation.isPending}
                                                  data-testid={`button-apply-week-personnel-${tourLane.laneKey}`}
                                                  aria-label="Tour-KW-Planung auf Termine anwenden"
                                                >
                                                  <ListChecks className="h-3.5 w-3.5" />
                                                </button>
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              {laneWeekEmployees.length === 0 ? "Keine Mitarbeiter zum Anwenden geplant" : "Wochenplanung auf Termine anwenden"}
                                            </TooltipContent>
                                          </Tooltip>
                                        </>
                                      ) : null}
                                      {canPlanLaneWeekPersonnel ? weekPlanningMenu : null}
                                    </div>
                                  ) : null}
                                  <div className={isPersonnelColumnCollapsed ? "flex flex-col items-center gap-1" : "min-h-0 flex-1 space-y-1 overflow-y-auto px-1.5 py-2"}>
                                    {laneWeekEmployees.length > 0 ? laneWeekEmployees.map((employee) => (
                                      <span
                                        key={`week-personnel-${tourLane.laneKey}-${employee.id}`}
                                        className={isPersonnelColumnCollapsed ? "inline-flex" : "inline-flex w-full whitespace-nowrap"}
                                        style={!isPersonnelColumnCollapsed && personnelBadgeMinWidth ? { minWidth: personnelBadgeMinWidth } : undefined}
                                      >
                                        <EmployeeInfoBadge
                                          id={employee.id}
                                          firstName={employee.firstName}
                                          lastName={employee.lastName}
                                          fullName={employee.fullName}
                                          renderMode={isPersonnelColumnCollapsed ? "compact" : "standard"}
                                          size="sm"
                                          action={!isPersonnelColumnCollapsed && canPlanLaneWeekPersonnel && canManageWeekPlanning && !isLaneWeekLocked && !isLaneBlocked && typeof employee.assignmentId === "number" ? "remove" : "none"}
                                          onRemove={!isPersonnelColumnCollapsed && canPlanLaneWeekPersonnel && canManageWeekPlanning && !isLaneWeekLocked && !isLaneBlocked && typeof employee.assignmentId === "number"
                                            ? () => {
                                                void openRemoveWeekPlanningDialog({
                                                  tourId: tourLane.tourId!,
                                                  assignmentId: employee.assignmentId!,
                                                });
                                              }
                                            : undefined}
                                          showAvatar={!isPersonnelColumnCollapsed ? false : undefined}
                                          fullWidth={!isPersonnelColumnCollapsed}
                                          testId={`week-personnel-employee-${tourLane.laneKey}-${employee.id}`}
                                        />
                                      </span>
                                    )) : (
                                      <span className="text-center text-[10px] italic text-slate-400">Keine MA</span>
                                    )}
                                  </div>
                                  {!isPersonnelColumnCollapsed ? (
                                    <div
                                      className="mt-auto flex min-h-7 w-full shrink-0 items-center justify-between border-t px-1.5 py-1"
                                      style={tourWeekPlanningFooterStyle}
                                      data-testid={`week-personnel-card-footer-${tourLane.laneKey}`}
                                    >
                                      <TourWeekNotesHoverPreview
                                        tourId={tourLane.tourId!}
                                        isoYear={isoYear}
                                        isoWeek={isoWeek}
                                        count={notesCount}
                                        triggerTestId={`week-personnel-card-notes-${tourLane.laneKey}`}
                                        triggerClassName="border-slate-200/70 bg-white/40 text-slate-700 hover:bg-white/70"
                                      />
                                    </div>
                                  ) : null}
                                  </div>
                                </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                          <div className="min-w-0">
                        <div className="relative group">
                          <CalendarWeekTourLaneHeaderBar
                            label={tourLane.label}
                            color={tourLane.color}
                            isExpanded={!isCurrentLaneCollapsed}
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
                          >
                            {tourLane.dayBuckets.map((dayBucket, dayIdx) => {
                              const canUseMoveTarget = selectedMoveAppointment != null
                                && !isLaneBlocked
                                && isRegularCalendarMoveTarget(tourLane.tourId, tourLane.label)
                                && Boolean(onRequestMoveAppointment);
                              const canShowDayAction = !isReaderCalendarReadOnly && !isAbsenceLane && dayBucket.dateKey >= berlinToday;

                              return (
                                <div
                                  key={`lane-add-${tourLane.laneKey}-${dayBucket.dateKey}`}
                                  className="pointer-events-auto relative grid h-full grid-cols-[16px_minmax(0,1fr)_16px] items-center gap-1 px-1"
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
                                    <span className="h-4 w-4" aria-hidden="true" />
                                    {dayAppointmentCounts[dayIdx] > 0 ? (
                                      <span
                                        className="pointer-events-none min-w-0 justify-self-center truncate text-center text-[10px] font-semibold"
                                        style={{ color: "#ffffff" }}
                                        data-testid={`week-tour-lane-day-counter-${tourLane.laneKey}-${dayBucket.dateKey}`}
                                      >
                                        {dayAppointmentCounts[dayIdx]} {dayAppointmentCounts[dayIdx] === 1 ? "Termin" : "Termine"}
                                      </span>
                                    ) : (
                                      <span aria-hidden="true" />
                                    )}
                                    {canShowDayAction ? (
                                      canUseMoveTarget ? (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button
                                              type="button"
                                              onClick={(event) => event.stopPropagation()}
                                              className="pointer-events-auto h-4 w-4 justify-self-end rounded text-[11px] font-bold leading-none hover:bg-white/15 lane-header-plus"
                                              style={{ color: "#ffffff" }}
                                              data-testid={`button-new-appointment-week-${dayBucket.dateKey}-lane-${tourLane.laneKey}`}
                                              title={`Aktionen am ${formatCalendarMoveDate(dayBucket.dateKey)}`}
                                            >
                                              +
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                const scrollLeft = horizontalScrollContainerRef.current?.scrollLeft ?? null;
                                                const scrollTop = weekScrollContainerRefs.current.get(weekKey)?.scrollTop ?? null;
                                                onNewAppointment?.(dayBucket.dateKey, { tourId: tourLane.tourId, scrollLeft, scrollTop });
                                              }}
                                            >
                                              Neuer Termin
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                if (!selectedMoveAppointment || !isRegularCalendarMoveTarget(tourLane.tourId, tourLane.label)) return;
                                                void onRequestMoveAppointment?.({
                                                  appointment: selectedMoveAppointment,
                                                  targetStartDate: dayBucket.dateKey,
                                                  targetTourId: tourLane.tourId,
                                                  targetTourName: tourLane.label,
                                                  mode: "insert",
                                                });
                                              }}
                                              data-testid={`button-insert-selected-appointment-week-${dayBucket.dateKey}-lane-${tourLane.laneKey}`}
                                            >
                                              Markierten Termin einfügen
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      ) : (
                                        <button
                                          type="button"
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
                                          className="pointer-events-auto h-4 w-4 justify-self-end rounded text-[11px] font-bold leading-none hover:bg-white/15 lane-header-plus"
                                          style={{ color: "#ffffff" }}
                                          data-testid={`button-new-appointment-week-${dayBucket.dateKey}-lane-${tourLane.laneKey}`}
                                          title={`Neuer Termin am ${formatCalendarMoveDate(dayBucket.dateKey)}`}
                                        >
                                          +
                                        </button>
                                      )
                                    ) : (
                                      <span className="h-4 w-4 justify-self-end" aria-hidden="true" />
                                    )}
                                  </div>
                              );
                            })}
                          </div>
                        </div>
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            isCurrentLaneCollapsed
                              ? "max-h-0 opacity-0 mt-0"
                              : "max-h-[2200px] opacity-100 mt-0"
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
                                  className={isWeekend ? "bg-slate-200/30" : "bg-white/65"}
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
                            {draggedAppointmentId !== null
                            && !isReaderCalendarReadOnly
                            && !isLaneBlocked
                            && isRegularCalendarMoveTarget(tourLane.tourId, tourLane.label) ? (
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
                                      void handleDrop(event, day, tourLane.tourId, tourLane.label);
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
                              const canSelectForMove = canDragSegment && Boolean(onSelectMoveAppointment);
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
                                    showInlineNotes={showAppointmentNotesInline}
                                    canManageInlineNotes={canWriteNotes}
                                    onCreateAppointmentNote={canWriteNotes ? openNewAppointmentNoteEditor : undefined}
                                    onEditInlineNote={canWriteNotes ? openInlineNoteEditor : undefined}
                                    onDeleteInlineNote={canWriteNotes ? handleDeleteInlineNote : undefined}
                                    onAssignAppointmentEmployees={canManageWeekPlanning ? handleAssignAppointmentEmployees : undefined}
                                    onRemoveAppointmentEmployee={canManageWeekPlanning ? handleRemoveAppointmentEmployee : undefined}
                                    onOpenProject={onOpenProject}
                                    style={{ width: "100%" }}
                                    isDragging={draggedAppointmentId === appointment.id}
                                    isMoveSelected={selectedMoveAppointment?.id === appointment.id}
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
                                    onCutAppointment={canSelectForMove ? () => handleCutAppointment(appointment) : undefined}
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
                              const canSelectForMove = canDragSegment && Boolean(onSelectMoveAppointment);
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
                                    showInlineNotes={showAppointmentNotesInline}
                                    canManageInlineNotes={canWriteNotes}
                                    onCreateAppointmentNote={canWriteNotes ? openNewAppointmentNoteEditor : undefined}
                                    onEditInlineNote={canWriteNotes ? openInlineNoteEditor : undefined}
                                    onDeleteInlineNote={canWriteNotes ? handleDeleteInlineNote : undefined}
                                    onAssignAppointmentEmployees={canManageWeekPlanning ? handleAssignAppointmentEmployees : undefined}
                                    onRemoveAppointmentEmployee={canManageWeekPlanning ? handleRemoveAppointmentEmployee : undefined}
                                    onOpenProject={onOpenProject}
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
                                    isMoveSelected={selectedMoveAppointment?.id === appointment.id}
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
                                    onCutAppointment={canSelectForMove ? () => handleCutAppointment(appointment) : undefined}
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
                                  onDragOver={
                                    isLaneBlocked || !isRegularCalendarMoveTarget(tourLane.tourId, tourLane.label)
                                      ? undefined
                                      : (event) => event.preventDefault()
                                  }
                                  onDrop={
                                    isLaneBlocked || !isRegularCalendarMoveTarget(tourLane.tourId, tourLane.label)
                                      ? undefined
                                      : (event) => {
                                          void handleDrop(event, day, tourLane.tourId, tourLane.label);
                                        }
                                  }
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
                                    const canSelectForMove = canDragSegment && Boolean(onSelectMoveAppointment);
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
                                        showInlineNotes={showAppointmentNotesInline}
                                        canManageInlineNotes={canWriteNotes}
                                        onCreateAppointmentNote={canWriteNotes ? openNewAppointmentNoteEditor : undefined}
                                        onEditInlineNote={canWriteNotes ? openInlineNoteEditor : undefined}
                                        onDeleteInlineNote={canWriteNotes ? handleDeleteInlineNote : undefined}
                                        onAssignAppointmentEmployees={canManageWeekPlanning ? handleAssignAppointmentEmployees : undefined}
                                        onRemoveAppointmentEmployee={canManageWeekPlanning ? handleRemoveAppointmentEmployee : undefined}
                                        onOpenProject={onOpenProject}
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
                                          isMoveSelected={selectedMoveAppointment?.id === appointment.id}
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
                                          onCutAppointment={canSelectForMove ? () => handleCutAppointment(appointment) : undefined}
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
                        </div>
                        </div>
                        {dialog}
                      </div>
                          );
                        }}
                      </CalendarWeekNotesButton>
                      );
                    })}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
      <Dialog open={weekPersonnelPicker !== null} onOpenChange={(open) => { if (!open) setWeekPersonnelPicker(null); }}>
        <DialogContent hideClose className="h-[100dvh] w-[100dvw] max-w-none overflow-hidden rounded-none p-0 sm:h-[85vh] sm:w-[95vw] sm:max-w-5xl sm:rounded-lg">
          <EmployeePickerDialogList
            employees={availableWeekEmployees}
            teams={pickerTeams}
            tours={[]}
            ineligibleReasonById={buildIneligibleReasonById(availableWeekEmployees)}
            isLoading={availableWeekEmployeesLoading || previewAddWeekEmployeeMutation.isPending}
            title={weekPersonnelPicker ? `Mitarbeiter auswählen - ${weekPersonnelPicker.weekLabel}` : "Mitarbeiter auswählen"}
            selectionMode="multiple"
            viewModeSettingKey="appointmentEmployeePicker.viewMode"
            onSelectEmployee={(employeeId) => {
              void openAddWeekPlanningDialog(employeeId);
            }}
            onConfirmSelection={(employeeIds) => {
              if (weekPersonnelPicker) {
                void openApplyWeekPlanningDialog({ ...weekPersonnelPicker, employeeIds });
              }
            }}
            onClose={() => setWeekPersonnelPicker(null)}
          />
        </DialogContent>
      </Dialog>
      {weekPlanningDialog && activeWeekPlanningOperation ? (
        <TourEmployeeCascadeDialog
          open
          variant="week"
          mode={weekPlanningDialog.mode}
          employeeId={activeWeekPlanningOperation.employeeId}
          title={weekPlanningDialog.mode === "add" ? "Mitarbeiter in Wochenplanung aufnehmen" : "Mitarbeiter aus Wochenplanung entfernen"}
          description={
            weekPlanningDialog.mode === "add"
              ? `${activeWeekPlanningOperation.employeeName} wird für ${activeWeekPlanningOperation.weekLabel} eingeplant.`
              : `${activeWeekPlanningOperation.employeeName} wird für ${activeWeekPlanningOperation.weekLabel} aus der Planung entfernt.`
          }
          weekLabel={activeWeekPlanningOperation.weekLabel}
          tourName={activeWeekPlanningOperation.tourName}
          employeeName={activeWeekPlanningOperation.employeeName}
          previewItems={activeWeekPlanningOperation.previewItems}
          selectedIds={activeWeekPlanningOperation.selectedIds}
          steps={weekPlanningDialogSteps}
          executionMessage={weekPlanningExecutionMessage}
          confirmLabel={weekPlanningConfirmLabel}
          summary={`${weekPlanningDialog.operations.length} Entscheidungsschritt${weekPlanningDialog.operations.length === 1 ? "" : "e"} in dieser Ressourcenplanung.`}
          isSubmitting={weekPlanningDialog.phase === "executing" || executeAddWeekEmployeeMutation.isPending || executeRemoveWeekEmployeeMutation.isPending}
          onSelectedIdsChange={(selectedIds) => {
            setWeekPlanningDialog((current) => current ? {
              ...current,
              operations: current.operations.map((operation, index) =>
                index === current.activeIndex ? { ...operation, selectedIds } : operation,
              ),
            } : current);
          }}
          onConfirm={() => {
            void confirmWeekPlanningDialog();
          }}
          onClose={() => setWeekPlanningDialog(null)}
        />
      ) : null}
      <PrintPreviewDialog
        open={weekPrintPreviewOpen}
        onOpenChange={setWeekPrintPreviewOpen}
        title="Wochenkalender drucken"
        pages={weekPrintPages}
        activePageIndex={weekPrintPageIndex}
        onPageChange={setWeekPrintPageIndex}
        pageOrientation="landscape"
        testIdPrefix="week-calendar-print-preview"
        dialogTestId="dialog-week-calendar-print-preview"
        headerActions={(
          <Button type="button" variant="outline" onClick={() => window.print()} data-testid="button-week-calendar-print">
            Drucken
          </Button>
        )}
        getPageTitle={(page) => page.title}
        getPageKey={(page) => page.weekKey}
        renderPage={(page) => (
          <PrintPageShell orientation="landscape" paddingMm={7} testId={`week-calendar-print-page-${page.weekKey}`}>
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <div className="text-lg font-bold text-slate-900">{page.title}</div>
              <div className="text-xs text-slate-500">Wochenkalender</div>
            </div>
            <div className="grid flex-1 grid-cols-7 gap-1 overflow-hidden text-[8px]">
              {page.days.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const absentEmployees = absenceEmployeesByDate.get(dayKey) ?? [];
                return (
                  <div key={`print-week-day-${dayKey}`} className="flex min-h-0 flex-col overflow-hidden rounded border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-100 px-1 py-1 text-center font-semibold">
                      {formatCompactWeekDayHeader(day, true)}
                    </div>
                    {absentEmployees.length > 0 ? (
                      <div className="border-b border-slate-200 bg-slate-50 px-1 py-0.5 text-[7px] text-slate-700">
                        Abwesend: {absentEmployees.map((employee) => employee.fullName).join(", ")}
                      </div>
                    ) : null}
                    <div className="min-h-0 flex-1 space-y-1 overflow-hidden p-1">
                      {page.lanes.flatMap((lane) => {
                        const bucket = lane.dayBuckets.find((item) => item.dateKey === dayKey);
                        return (bucket?.appointments ?? []).map((appointmentId) => ({ lane, appointmentId }));
                      }).map(({ lane, appointmentId }) => {
                        const appointment = appointmentsById.get(appointmentId);
                        if (!appointment) return null;
                        return (
                          <div
                            key={`print-week-appointment-${dayKey}-${appointmentId}`}
                            className="rounded border px-1 py-0.5"
                            style={{ borderColor: appointment.tourColor ?? lane.color ?? "#94a3b8" }}
                          >
                            <div className="truncate font-semibold">{appointment.customer.fullName ?? appointment.customer.customerNumber}</div>
                            <div className="truncate text-slate-700">{appointment.projectName}</div>
                            {appointment.employees.length > 0 ? (
                              <div className="truncate text-slate-600">{appointment.employees.map((employee) => employee.fullName).join(", ")}</div>
                            ) : null}
                            {showAppointmentNotesInline && appointment.appointmentNotesPreview && appointment.appointmentNotesPreview.length > 0 ? (
                              <div className="mt-0.5 space-y-0.5">
                                {appointment.appointmentNotesPreview.map((note) => (
                                  <div key={`print-note-${appointment.id}-${note.id}`} className="truncate rounded bg-slate-100 px-1 text-[7px]">
                                    {note.title}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </PrintPageShell>
        )}
      />
      <WorkflowNoteSuggestionDialog
        open={noteSuggestionDialog !== null}
        templateTitle={noteSuggestionDialog?.templateTitle}
        targetLabel="diesen Termin"
        onOpenChange={(open) => { if (!open) setNoteSuggestionDialog(null); }}
        onSkip={() => setNoteSuggestionDialog(null)}
        onConfirm={handleCreateAppointmentNoteFromSuggestion}
      />
      {appointmentEmployeeDialog?.action === "assign" ? (
        <Dialog open onOpenChange={(open) => { if (!open) setAppointmentEmployeeDialog(null); }}>
          <DialogContent hideClose className="h-[100dvh] w-[100dvw] max-w-none overflow-hidden rounded-none p-0 sm:h-[85vh] sm:w-[95vw] sm:max-w-5xl sm:rounded-lg">
            <EmployeePickerDialogList
              employees={mapAppointmentPreviewToPickerEmployees(appointmentEmployeeDialog.previewItems)}
              teams={[]}
              tours={[]}
              title={appointmentEmployeeDialog.title}
              selectionMode="multiple"
              viewModeSettingKey="appointmentEmployeePicker.viewMode"
              ineligibleReasonById={buildAppointmentAssignIneligibleReasons(appointmentEmployeeDialog.previewItems)}
              defaultSelectedEmployeeIds={appointmentEmployeeDialog.selectedIds}
              isLoading={assignAppointmentEmployeesMutation.isPending}
              onSelectEmployee={(employeeId) => {
                if (!appointmentEmployeeDialog) return;
                assignAppointmentEmployeesMutation.mutate({
                  appointmentId: appointmentEmployeeDialog.appointmentId,
                  employeeIds: Array.from(new Set([...appointmentEmployeeDialog.currentEmployeeIds, employeeId])),
                });
              }}
              onConfirmSelection={(employeeIds) => {
                if (!appointmentEmployeeDialog) return;
                assignAppointmentEmployeesMutation.mutate({
                  appointmentId: appointmentEmployeeDialog.appointmentId,
                  employeeIds: Array.from(new Set([...appointmentEmployeeDialog.currentEmployeeIds, ...employeeIds])),
                });
              }}
              onClose={() => setAppointmentEmployeeDialog(null)}
            />
          </DialogContent>
        </Dialog>
      ) : (
        <TourEmployeeCascadeDialog
          open={appointmentEmployeeDialog !== null}
          variant="appointment"
          title={appointmentEmployeeDialog?.title ?? "Mitarbeiter entfernen"}
          description={appointmentEmployeeDialog?.description ?? ""}
          previewItems={appointmentEmployeeDialog?.previewItems ?? []}
          selectedIds={appointmentEmployeeDialog?.selectedIds ?? []}
          employeeId={appointmentEmployeeDialog?.action === "remove" ? appointmentEmployeeDialog.employeeId : undefined}
          employeeName={appointmentEmployeeDialog?.action === "remove" ? appointmentEmployeeDialog.previewItems[0]?.employeeName : undefined}
          infoText={appointmentEmployeeDialog?.action === "remove" ? "wird vom Termin entfernt" : undefined}
          isSubmitting={removeAppointmentEmployeeMutation.isPending}
          onSelectedIdsChange={(ids) => {
            setAppointmentEmployeeDialog((current) => current ? { ...current, selectedIds: ids } : current);
          }}
          onConfirm={() => {
            if (!appointmentEmployeeDialog) return;
            if (appointmentEmployeeDialog.action === "remove" && typeof appointmentEmployeeDialog.employeeId === "number") {
              removeAppointmentEmployeeMutation.mutate({
                appointmentId: appointmentEmployeeDialog.appointmentId,
                employeeId: appointmentEmployeeDialog.employeeId,
              });
            }
          }}
          onClose={() => setAppointmentEmployeeDialog(null)}
          confirmLabel={appointmentEmployeeDialog?.action === "remove" ? "Bestätigen" : "Zuweisen"}
        />
      )}
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
      <ConfirmDialogBase
        open={pendingWeekBlock !== null}
        onOpenChange={(open) => {
          if (!open && !blockWeekMutation.isPending) setPendingWeekBlock(null);
        }}
        icon={<Lock className="h-5 w-5" />}
        title="Wochenplanung blockieren?"
        description={pendingWeekBlock
          ? `${pendingWeekBlock.tourLabel ?? "Diese Tour-KW"} ${buildWeekPlanningLabel(pendingWeekBlock.isoYear, pendingWeekBlock.isoWeek)} wird blockiert. Danach sind Ressourcenänderungen in dieser Tour-KW gesperrt, bis sie wieder freigegeben wird.`
          : undefined}
        confirmLabel="Blockieren"
        pendingLabel="Blockieren..."
        isPending={blockWeekMutation.isPending}
        onConfirm={() => {
          void confirmPendingWeekBlock();
        }}
        testId="dialog-tour-week-block-confirm"
      />
      <ConfirmDialogBase
        open={pendingInlineNoteDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingInlineNoteDelete(null);
        }}
        icon={<StickyNote className="h-5 w-5" />}
        title="Notiz löschen"
        description={
          pendingInlineNoteDelete
            ? `Soll die Notiz „${pendingInlineNoteDelete.title}“ endgültig gelöscht werden?`
            : undefined
        }
        confirmLabel="Notiz löschen"
        pendingLabel="Löschen..."
        isPending={deleteInlineNoteMutation.isPending}
        onConfirm={() => {
          if (!pendingInlineNoteDelete) return;
          deleteInlineNoteMutation.mutate(pendingInlineNoteDelete);
        }}
        testId="dialog-delete-inline-note"
        variant="destructive"
      />
      <Dialog open={workflowNoteEditorOpen} onOpenChange={setWorkflowNoteEditorOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100dvw-2rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{workflowNoteEditorId ? "Notiz bearbeiten" : "Neue Notiz anlegen"}</DialogTitle>
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
                if (!workflowNoteTitle.trim()) return;
                if (!workflowNoteEditorId && workflowNoteEditorAppointmentId) {
                  createAppointmentNoteMutation.mutate({
                    appointmentId: workflowNoteEditorAppointmentId,
                    title: workflowNoteTitle,
                    body: workflowNoteBody,
                    cardColor: workflowNoteCardColor,
                    print: workflowNotePrint,
                  }, {
                    onSuccess: () => setWorkflowNoteEditorOpen(false),
                  });
                  return;
                }
                if (!workflowNoteEditorId) return;
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
