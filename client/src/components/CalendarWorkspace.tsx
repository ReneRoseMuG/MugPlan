import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, addWeeks, differenceInCalendarDays, format, getISOWeek, parseISO, startOfISOWeek, subWeeks } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { MonthSheetGrid } from "@/components/MonthSheetGrid";
import { WeekGrid } from "@/components/WeekGrid";
import {
  getNextMonthWindowStart,
  getPreviousMonthWindowStart,
  normalizeMonthWindowStart,
  parseMonthWindowStart,
} from "@/components/calendar/monthSheetModel";
import { CalendarFilterPanel } from "@/components/ui/filter-panels/calendar-filter-panel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AppointmentSaveReviewDialog,
  type AppointmentSaveReviewNoteReview,
  type AppointmentSaveReviewResourceRequest,
  type AppointmentSaveReviewResult,
} from "@/components/AppointmentSaveReviewDialog";
import { WorkflowNoteSuggestionDialog } from "@/components/notes/WorkflowNoteDialogs";
import { parseIsoWeekInput, sanitizeIsoWeekInput } from "@/lib/isoWeekInput";
import { resolveKwJumpTarget } from "@/lib/kwJump";
import { getStoredUserRole, isReaderRole } from "@/lib/auth";
import { useSetting, useSettings } from "@/hooks/useSettings";
import type { MonitoringListResponse } from "@shared/routes";
import type { AppointmentMutationEvent } from "@shared/appointmentMutationEvents";
import type { NoteTemplate } from "@shared/schema";
import { MANAGED_MESSE_TAG_NAME } from "@shared/appointmentCancellation";
import { buildMonitoringConflictMap } from "@/lib/monitoring-ui";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { computeTagAddedAction } from "@/hooks/useTagRuleEngine";
import {
  buildWorkflowNoteDraft,
  findWorkflowNoteTemplate,
  normalizeWorkflowNoteTitle,
} from "@/lib/workflow-note-templates";
import {
  buildEmployeeIdsFromPreviewSelection,
  formatCalendarMoveDate,
  getCalendarMoveSelectionTitle,
  getDefaultPreviewSelection,
  isCalendarMoveSameTourAndWeek,
  isRegularCalendarMoveTarget,
  type AppointmentWeekEmployeePreviewResponse,
  type CalendarMoveRequest,
  type CalendarMoveSelection,
} from "@/lib/calendar-move";
import { hasResourcePreviewDecision } from "@/lib/resource-planning";
import type { WeekViewRestoreRequest } from "@/pages/Home";
import type { Note } from "@shared/schema";

type CalendarWorkspaceView = "week" | "month" | "monthSheet";
type CalendarAbsenceMode = "planning" | "absences";

type PendingCalendarMove = {
  request: CalendarMoveRequest;
  targetEndDate: string | null;
  resourceRequest: AppointmentSaveReviewResourceRequest | null;
  noteReview: AppointmentSaveReviewNoteReview | null;
  employeeIds: number[];
};

type CalendarMoveResponsePayload = {
  code?: string;
  message?: string;
  mutationEvents?: AppointmentMutationEvent[];
};

type OpenAppointmentContext = {
  initialDate?: string;
  initialTourId?: number | null;
  appointmentId?: number;
  projectId?: number;
  returnView?: CalendarWorkspaceView;
  weekScrollLeft?: number | null;
  weekScrollTop?: number | null;
};

function normalizeCalendarMoveTourName(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase("de").replace(/ß/g, "ss").replace(/ÃŸ/g, "ss");
}

function isCalendarMoveMesseTourName(value: string | null | undefined): boolean {
  const normalized = normalizeCalendarMoveTourName(value);
  return normalized === "messe" || normalized === "tour messe";
}

interface CalendarWorkspaceProps {
  mode: "global" | "contextual";
  activeView: CalendarWorkspaceView;
  currentDate: Date;
  monitoringItems?: MonitoringListResponse;
  employeeFilterId: number | null;
  onEmployeeFilterChange: (id: number | null) => void;
  onViewChange: (view: CalendarWorkspaceView) => void;
  onDateChange: (date: Date) => void;
  onOpenAppointmentForm: (ctx: OpenAppointmentContext) => void;
  onOpenProject?: (projectId: number) => void;
  onBack?: () => void;
  projectId?: number;
  hideMainNavigation?: boolean;
  restoreRequest?: WeekViewRestoreRequest | null;
  onRestoreApplied?: () => void;
}

const calendarPagingButtonClassName =
  "h-full w-7 border-amber-200 bg-amber-50 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";
const MONTH_WINDOW_URL_PARAM = "windowStart";
const MONTH_WINDOW_STORAGE_KEY = "calendar.month.windowStart";

function isMonthWindowView(activeView: CalendarWorkspaceView): boolean {
  return activeView === "month" || activeView === "monthSheet";
}

function formatMonthWindowStart(value: Date): string {
  return format(normalizeMonthWindowStart(value), "yyyy-MM-dd");
}

function readStoredMonthWindowStart(fallbackDate: Date): Date {
  if (typeof window === "undefined") {
    return normalizeMonthWindowStart(fallbackDate);
  }

  const urlValue = typeof window.location?.search === "string"
    ? new URLSearchParams(window.location.search).get(MONTH_WINDOW_URL_PARAM)
    : null;
  if (urlValue !== null) {
    return parseMonthWindowStart(urlValue, new Date());
  }

  const storedValue = window.localStorage?.getItem(MONTH_WINDOW_STORAGE_KEY);
  return parseMonthWindowStart(storedValue, fallbackDate);
}

function persistMonthWindowStart(value: Date) {
  if (typeof window === "undefined") {
    return;
  }

  const dateKey = formatMonthWindowStart(value);
  window.localStorage?.setItem(MONTH_WINDOW_STORAGE_KEY, dateKey);

  if (typeof window.location?.href !== "string" || typeof window.history?.replaceState !== "function") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set(MONTH_WINDOW_URL_PARAM, dateKey);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function buildWeekNavigationRestoreRequest(
  activeView: CalendarWorkspaceView,
  viewport: { scrollLeft: number; scrollTop: number } | null,
): WeekViewRestoreRequest | null {
  if (activeView !== "week" || !viewport) {
    return null;
  }
  return {
    scrollLeft: viewport.scrollLeft,
    scrollTop: viewport.scrollTop,
  };
}

export function collectCalendarMoveWorkflowNoteSuggestions(params: {
  appointmentId: number;
  mutationEvents: AppointmentMutationEvent[] | undefined;
  existingNotes: Array<{ title: string }>;
}): string[] {
  if (!params.mutationEvents || params.mutationEvents.length === 0) {
    return [];
  }

  const suggestions: string[] = [];
  const seenTemplateTitles = new Set<string>();
  for (const event of params.mutationEvents) {
    if (event.kind !== "tag_mutated" || event.action !== "added") {
      continue;
    }

    const action = computeTagAddedAction(
      event.tagName,
      params.appointmentId,
      params.existingNotes.map((note) => ({ title: note.title })),
    );
    if (action.kind !== "show_note_suggestion_dialog") {
      continue;
    }

    const normalizedTemplateTitle = normalizeWorkflowNoteTitle(action.templateTitle);
    if (seenTemplateTitles.has(normalizedTemplateTitle)) {
      continue;
    }
    seenTemplateTitles.add(normalizedTemplateTitle);
    suggestions.push(action.templateTitle);
  }
  return suggestions;
}

export function resolveCalendarMoveWorkflowMutationEvents(
  request: CalendarMoveRequest,
  mutationEvents: AppointmentMutationEvent[] | undefined,
): AppointmentMutationEvent[] | undefined {
  const events = mutationEvents ?? [];
  const hasMesseTagAddedEvent = events.some((event) =>
    event.kind === "tag_mutated"
    && event.action === "added"
    && normalizeWorkflowNoteTitle(event.tagName) === normalizeWorkflowNoteTitle(MANAGED_MESSE_TAG_NAME),
  );
  const movedToMesseTour = !isCalendarMoveMesseTourName(request.appointment.tourName)
    && isCalendarMoveMesseTourName(request.targetTourName);

  if (!movedToMesseTour || hasMesseTagAddedEvent) {
    return mutationEvents;
  }

  return [
    ...events,
    {
      kind: "tag_mutated",
      appointmentId: request.appointment.id,
      tagName: MANAGED_MESSE_TAG_NAME,
      action: "added",
    },
  ];
}

export function CalendarMoveSelectionCard({
  selection,
  onClear,
}: {
  selection: CalendarMoveSelection;
  onClear: () => void;
}) {
  const title = getCalendarMoveSelectionTitle(selection);
  return (
    <div
      className="flex flex-shrink-0 items-center justify-between gap-4 border-b-2 border-amber-500 bg-amber-100 px-6 py-3 text-amber-950 shadow-sm"
      data-testid="calendar-move-selection-card"
    >
      <div className="min-w-0">
        <div className="text-sm font-bold">Termin zum Verschieben selektiert</div>
        <div className="truncate text-sm">
          {title} - {formatCalendarMoveDate(selection.startDate)}
          {selection.tourName ? ` - ${selection.tourName}` : ""}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 border-amber-500 bg-white text-amber-950 hover:bg-amber-50"
        onClick={onClear}
        data-testid="button-clear-calendar-move-selection"
      >
        Aufheben
      </Button>
    </div>
  );
}

export function CalendarWorkspace({
  mode,
  activeView,
  currentDate,
  monitoringItems,
  employeeFilterId,
  onEmployeeFilterChange,
  onViewChange,
  onDateChange,
  onOpenAppointmentForm,
  onOpenProject,
  onBack,
  projectId,
  hideMainNavigation = false,
  restoreRequest,
  onRestoreApplied,
}: CalendarWorkspaceProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setSetting } = useSettings();
  const isKwJumpEnabled = activeView === "week";
  const [conflictHighlightActive, setConflictHighlightActive] = useState(false);
  const [jumpBackDate, setJumpBackDate] = useState<Date | null>(null);
  const [localWeekRestoreRequest, setLocalWeekRestoreRequest] = useState<WeekViewRestoreRequest | null>(null);
  const [calendarAbsenceMode, setCalendarAbsenceMode] = useState<CalendarAbsenceMode>("planning");
  const [footerAction, setFooterAction] = useState<ReactNode | null>(null);
  const [selectedMoveAppointment, setSelectedMoveAppointment] = useState<CalendarMoveSelection | null>(null);
  const [pendingCalendarMove, setPendingCalendarMove] = useState<PendingCalendarMove | null>(null);
  const [isCalendarMoveSubmitting, setIsCalendarMoveSubmitting] = useState(false);
  const [noteSuggestionDialog, setNoteSuggestionDialog] = useState<{ templateTitle: string; appointmentId: number } | null>(null);
  const [kwInputValue, setKwInputValue] = useState(() =>
    isKwJumpEnabled ? String(getISOWeek(currentDate)) : "",
  );
  const [kwJumpError, setKwJumpError] = useState(false);
  const latestWeekViewportRef = useRef<{ scrollLeft: number; scrollTop: number } | null>(null);
  const monthWindowRestoreAppliedRef = useRef(false);
  const workflowNoteSuggestionSeenRef = useRef(new Set<string>());
  const weekLanesCollapsedSetting = useSetting("calendar.weekLanes.isCollapsed");
  const weekTileBodyModeSetting = useSetting("calendar.weekTileBodyMode");
  const userRole = getStoredUserRole();
  const isReaderCalendarReadOnly = isReaderRole(userRole);
  const conflictAppointmentMap = useMemo(
    () => buildMonitoringConflictMap(monitoringItems),
    [monitoringItems],
  );
  const conflictAppointmentCount = conflictAppointmentMap.size;

  useEffect(() => {
    if (conflictAppointmentCount === 0 && conflictHighlightActive) {
      setConflictHighlightActive(false);
    }
  }, [conflictAppointmentCount, conflictHighlightActive]);

  useEffect(() => {
    setJumpBackDate(null);
    setLocalWeekRestoreRequest(null);
    setKwJumpError(false);
    if (mode !== "global" || !isMonthWindowView(activeView)) {
      monthWindowRestoreAppliedRef.current = false;
    }
    if (!isKwJumpEnabled) {
      setKwInputValue("");
    }
  }, [activeView, isKwJumpEnabled, mode]);

  useEffect(() => {
    if (mode !== "global" || !isMonthWindowView(activeView) || monthWindowRestoreAppliedRef.current) {
      return;
    }

    monthWindowRestoreAppliedRef.current = true;
    const restoredWindowStart = readStoredMonthWindowStart(currentDate);
    if (restoredWindowStart.getTime() !== normalizeMonthWindowStart(currentDate).getTime()) {
      onDateChange(restoredWindowStart);
      return;
    }

    persistMonthWindowStart(restoredWindowStart);
  }, [activeView, currentDate, mode, onDateChange]);

  useEffect(() => {
    if (mode !== "global" || !isMonthWindowView(activeView) || !monthWindowRestoreAppliedRef.current) {
      return;
    }
    persistMonthWindowStart(currentDate);
  }, [activeView, currentDate, mode]);

  useEffect(() => {
    if (!isKwJumpEnabled) {
      setKwInputValue("");
      return;
    }
    setKwInputValue(String(getISOWeek(currentDate)));
  }, [currentDate, isKwJumpEnabled]);

  const rememberWeekViewportForNextNavigation = () => {
    const nextRestoreRequest = buildWeekNavigationRestoreRequest(activeView, latestWeekViewportRef.current);
    if (!nextRestoreRequest) return;
    setLocalWeekRestoreRequest(nextRestoreRequest);
  };

  const submitKwJump = (valueOverride?: string) => {
    const trimmedValue = sanitizeIsoWeekInput(valueOverride ?? kwInputValue);
    if (trimmedValue.length === 0) {
      setKwJumpError(false);
      return;
    }

    const parsedKw = parseIsoWeekInput(trimmedValue);
    if (!parsedKw) {
      setKwJumpError(true);
      return;
    }

    const targetDate = resolveKwJumpTarget(parsedKw, currentDate);
    if (targetDate) {
      const currentWeekStart = startOfISOWeek(currentDate);
      if (targetDate.getTime() === currentWeekStart.getTime()) {
        setKwInputValue(String(parsedKw));
        setKwJumpError(false);
        return;
      }
      rememberWeekViewportForNextNavigation();
      setJumpBackDate(isMonthWindowView(activeView) ? normalizeMonthWindowStart(currentDate) : currentDate);
      onDateChange(isMonthWindowView(activeView) ? normalizeMonthWindowStart(targetDate) : targetDate);
      setKwInputValue(String(parsedKw));
      setKwJumpError(false);
      return;
    }

    setKwJumpError(true);
  };

  const persistWeekLanesCollapsed = (collapsed: boolean) => {
    void setSetting({
      key: "calendar.weekLanes.isCollapsed",
      scopeType: "USER",
      value: collapsed,
    }).catch((error) => {
      console.error("[calendar-workspace] week lanes collapsed persist failed", error);
      toast({
        title: "Tourenansicht konnte nicht gespeichert werden",
        description: "Bitte erneut versuchen.",
        variant: "destructive",
      });
    });
  };

  const next = () => {
    setJumpBackDate(null);
    setKwJumpError(false);
    if (isMonthWindowView(activeView)) {
      onDateChange(getNextMonthWindowStart(currentDate));
      return;
    }
    rememberWeekViewportForNextNavigation();
    onDateChange(addWeeks(currentDate, 1));
  };

  const prev = () => {
    setJumpBackDate(null);
    setKwJumpError(false);
    if (isMonthWindowView(activeView)) {
      onDateChange(getPreviousMonthWindowStart(currentDate));
      return;
    }
    rememberWeekViewportForNextNavigation();
    onDateChange(subWeeks(currentDate, 1));
  };

  const buildTargetEndDate = (appointment: CalendarMoveSelection, targetStartDate: string) => {
    if (!appointment.endDate) return null;
    const durationDays = differenceInCalendarDays(parseISO(appointment.endDate), parseISO(appointment.startDate));
    return durationDays > 0 ? format(addDays(parseISO(targetStartDate), durationDays), "yyyy-MM-dd") : null;
  };

  const buildMoveErrorMessage = (payload: { code?: string; message?: string } | null, fallback: string) => {
    if (payload?.code === "VERSION_CONFLICT") return "Termin wurde zwischenzeitlich geändert. Bitte neu laden.";
    if (payload?.code === "PAST_APPOINTMENT_READONLY" || payload?.code === "PAST_WEEK_READONLY") return "Termin ist gesperrt.";
    if (payload?.code === "CANCELLED_APPOINTMENT_READONLY") return "Stornierte Termine können nicht verschoben werden.";
    if (payload?.code === "EMPLOYEE_OVERLAP_CONFLICT") return payload.message ?? "Mitarbeiterüberschneidung beim Verschieben.";
    if (payload?.code === "BUSINESS_CONFLICT" || payload?.code === "VALIDATION_ERROR") return payload.message ?? fallback;
    return payload?.message ?? fallback;
  };

  const getWorkflowNoteSuggestionKey = (appointmentId: number, templateTitle: string) =>
    `${appointmentId}:${normalizeWorkflowNoteTitle(templateTitle)}`;

  const openWorkflowNoteSuggestionDialog = (appointmentId: number, templateTitle: string) => {
    const suggestionKey = getWorkflowNoteSuggestionKey(appointmentId, templateTitle);
    if (workflowNoteSuggestionSeenRef.current.has(suggestionKey)) {
      return false;
    }
    workflowNoteSuggestionSeenRef.current.add(suggestionKey);
    setNoteSuggestionDialog({ appointmentId, templateTitle });
    return true;
  };

  const loadAppointmentNotes = async (appointmentId: number): Promise<Note[]> => {
    const response = await fetch(`/api/appointments/${appointmentId}/notes`, { credentials: "include" });
    if (!response.ok) {
      throw new Error("Terminnotizen konnten nicht geladen werden.");
    }
    const payload = await response.json().catch(() => []);
    return Array.isArray(payload) ? payload as Note[] : [];
  };

  const loadNoteTemplates = async (): Promise<NoteTemplate[]> => {
    const response = await fetch("/api/note-templates", { credentials: "include" });
    if (!response.ok) {
      throw new Error("Notizvorlagen konnten nicht geladen werden.");
    }
    const payload = await response.json().catch(() => []);
    return Array.isArray(payload) ? payload as NoteTemplate[] : [];
  };

  const applyCalendarMoveMutationEvents = async (
    appointmentId: number,
    mutationEvents: AppointmentMutationEvent[] | undefined,
  ) => {
    if (!mutationEvents || mutationEvents.length === 0) {
      return;
    }

    const existingNotes = await loadAppointmentNotes(appointmentId);
    const suggestions = collectCalendarMoveWorkflowNoteSuggestions({
      appointmentId,
      mutationEvents,
      existingNotes,
    });
    for (const templateTitle of suggestions) {
      openWorkflowNoteSuggestionDialog(appointmentId, templateTitle);
    }
  };

  const handleCreateAppointmentNoteFromSuggestion = async () => {
    if (!noteSuggestionDialog) return;
    try {
      const templates = await loadNoteTemplates();
      const template = findWorkflowNoteTemplate(templates, noteSuggestionDialog.templateTitle);
      if (!template) {
        toast({
          title: "Notizvorlage fehlt",
          description: `Die Notizvorlage „${noteSuggestionDialog.templateTitle}“ wurde nicht gefunden.`,
          variant: "destructive",
        });
        return;
      }

      const draft = buildWorkflowNoteDraft(template);
      const response = await fetch(`/api/appointments/${noteSuggestionDialog.appointmentId}/notes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(payload?.message ?? "Notiz konnte nicht erstellt werden.");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/appointments", noteSuggestionDialog.appointmentId, "notes"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      setNoteSuggestionDialog(null);
    } catch (error) {
      toast({
        title: "Notiz konnte nicht erstellt werden",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
    }
  };

  const fetchCalendarMovePreview = async (
    request: CalendarMoveRequest,
    targetEndDate: string | null,
    employeeCarryoverMode: "preserve" | "replace",
  ): Promise<AppointmentWeekEmployeePreviewResponse> => {
    const response = await fetch(`/api/appointments/${request.appointment.id}/tour-change-preview`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newTourId: request.targetTourId,
        newStartDate: request.targetStartDate,
        newEndDate: targetEndDate,
        newStartTime: request.appointment.startTime,
        currentEmployeeIds: request.appointment.employeeIds,
        employeeCarryoverMode,
      }),
    });
    const payload = await response.json().catch(() => null) as (AppointmentWeekEmployeePreviewResponse & { code?: string; message?: string }) | null;
    if (!response.ok) {
      throw new Error(buildMoveErrorMessage(payload, "Mitarbeitervorschau konnte nicht geladen werden."));
    }
    return payload as AppointmentWeekEmployeePreviewResponse;
  };

  const buildCalendarMoveNoteReview = async (
    request: CalendarMoveRequest,
    targetEndDate: string | null,
  ): Promise<AppointmentSaveReviewNoteReview | null> => {
    const notes = await loadAppointmentNotes(request.appointment.id);
    if (notes.length === 0) return null;

    return {
      previousStartDate: request.appointment.startDate,
      previousEndDate: request.appointment.endDate,
      previousStartTime: request.appointment.startTime,
      previousTourName: request.appointment.tourName,
      nextStartDate: request.targetStartDate,
      nextEndDate: targetEndDate,
      nextStartTime: request.appointment.startTime,
      nextTourName: request.targetTourName ?? request.appointment.tourName,
      notes,
    };
  };

  const requestCalendarMoveSaveReview = async ({
    request,
    targetEndDate,
    resourceRequest,
    employeeIds,
  }: {
    request: CalendarMoveRequest;
    targetEndDate: string | null;
    resourceRequest: AppointmentSaveReviewResourceRequest | null;
    employeeIds: number[];
  }) => {
    let noteReview: AppointmentSaveReviewNoteReview | null = null;
    try {
      noteReview = await buildCalendarMoveNoteReview(request, targetEndDate);
    } catch (error) {
      toast({
        title: "Terminnotizen konnten nicht geladen werden",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
      return;
    }

    if (!resourceRequest && !noteReview && employeeIds.length > 0) {
      await executeCalendarMove(request, targetEndDate, employeeIds);
      return;
    }

    setPendingCalendarMove({
      request,
      targetEndDate,
      resourceRequest,
      noteReview,
      employeeIds,
    });
  };

  const executeCalendarMove = async (
    request: CalendarMoveRequest,
    targetEndDate: string | null,
    employeeIds: number[],
  ) => {
    setIsCalendarMoveSubmitting(true);
    try {
      const response = await fetch(`/api/appointments/${request.appointment.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: request.appointment.version,
          projectId: request.appointment.projectId,
          customerId: request.appointment.customerId,
          tourId: request.targetTourId,
          startDate: request.targetStartDate,
          endDate: targetEndDate,
          startTime: request.appointment.startTime,
          employeeIds,
        }),
      });
      const payload = await response.json().catch(() => null) as CalendarMoveResponsePayload | null;
      if (!response.ok) {
        throw new Error(buildMoveErrorMessage(payload, "Termin konnte nicht verschoben werden."));
      }

      try {
        await applyCalendarMoveMutationEvents(
          request.appointment.id,
          resolveCalendarMoveWorkflowMutationEvents(request, payload?.mutationEvents),
        );
      } catch (error) {
        toast({
          title: "Notizworkflow konnte nicht gestartet werden",
          description: error instanceof Error ? error.message : "Bitte Terminnotizen manuell prüfen.",
          variant: "destructive",
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarBlockedTourWeeks"] });
      await refreshMonitoringWithNotification(toast);
      setPendingCalendarMove(null);
      setSelectedMoveAppointment((current) => current?.id === request.appointment.id ? null : current);
      toast({ title: "Termin verschoben" });
    } catch (error) {
      toast({
        title: "Verschieben fehlgeschlagen",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
    } finally {
      setIsCalendarMoveSubmitting(false);
    }
  };

  const requestCalendarMove = async (request: CalendarMoveRequest) => {
    if (isReaderCalendarReadOnly) {
      toast({ title: "Keine Berechtigung", description: "Leser dürfen Termine nicht verschieben.", variant: "destructive" });
      return;
    }
    if (!isRegularCalendarMoveTarget(request.targetTourId, request.targetTourName)) {
      toast({
        title: "Ziel nicht erlaubt",
        description: "Termine können nur in reguläre Touren eingefügt oder verschoben werden.",
        variant: "destructive",
      });
      return;
    }
    if (request.appointment.isCancelled) {
      toast({ title: "Termin ist storniert", description: "Stornierte Termine können nicht verschoben werden.", variant: "destructive" });
      return;
    }
    if (request.appointment.isLocked && userRole !== "ADMIN") {
      toast({ title: "Termin ist gesperrt", description: "Nur Admins dürfen gesperrte Termine ändern.", variant: "destructive" });
      return;
    }

    const today = getBerlinTodayDateString();
    if (userRole !== "ADMIN" && (request.appointment.startDate < today || request.targetStartDate < today)) {
      toast({
        title: "Verschieben nicht erlaubt",
        description: "Vergangene Termine können nicht durch Disponenten verschoben werden.",
        variant: "destructive",
      });
      return;
    }

    const targetEndDate = buildTargetEndDate(request.appointment, request.targetStartDate);
    const sameTarget = request.appointment.startDate === request.targetStartDate
      && (request.appointment.endDate ?? null) === targetEndDate
      && request.appointment.tourId === request.targetTourId;
    if (sameTarget) {
      toast({ title: "Keine Änderung", description: "Der Termin liegt bereits auf diesem Ziel." });
      return;
    }

    // Same tour and same week keeps the current employees, but still runs the shared note/no-employee review.
    if (isCalendarMoveSameTourAndWeek(request)) {
      await requestCalendarMoveSaveReview({
        request,
        targetEndDate,
        resourceRequest: null,
        employeeIds: request.appointment.employeeIds,
      });
      return;
    }

    try {
      const preview = await fetchCalendarMovePreview(request, targetEndDate, "replace");

      // No resource decision is needed, but notes and empty employee assignments still require review.
      if (!hasResourcePreviewDecision(preview)) {
        const employeeIds = buildEmployeeIdsFromPreviewSelection(preview, [], "replace");
        await requestCalendarMoveSaveReview({
          request,
          targetEndDate,
          resourceRequest: null,
          employeeIds,
        });
        return;
      }

      await requestCalendarMoveSaveReview({
        request,
        targetEndDate,
        resourceRequest: {
          preview,
          resolutionKey: `calendar:${request.appointment.id}:${request.targetTourId}:${request.targetStartDate}:${targetEndDate ?? ""}:${request.mode}`,
          selectedIds: getDefaultPreviewSelection(preview),
          resolutionMode: "replace",
          resolutionNotice: "Vorhandene Termin-Mitarbeiter werden passend zur Ziel-Tour und Ziel-KW neu bewertet.",
        },
        employeeIds: request.appointment.employeeIds,
      });
    } catch (error) {
      toast({
        title: "Verschieben nicht möglich",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
    }
  };

  const handleCalendarMoveSaveReviewConfirm = (result: AppointmentSaveReviewResult) => {
    if (!pendingCalendarMove) return;
    const pending = pendingCalendarMove;
    setPendingCalendarMove(null);
    void executeCalendarMove(pending.request, pending.targetEndDate, result.employeeIds);
  };

  const handleCalendarMoveSaveReviewCancel = () => {
    if (isCalendarMoveSubmitting) return;
    setPendingCalendarMove(null);
  };

  const handleSelectMoveAppointment = (appointment: CalendarMoveSelection) => {
    if (isReaderCalendarReadOnly) return;
    setSelectedMoveAppointment(appointment);
  };

  const handleCalendarContextMenu = (event: MouseEvent) => {
    if (!selectedMoveAppointment) return;
    event.preventDefault();
    setSelectedMoveAppointment(null);
  };

  const calendarAbsenceModeToggle = (
    <div className="inline-flex rounded-md border border-border bg-background p-0.5" data-testid="calendar-absence-mode-toggle">
      <button
        type="button"
        onClick={() => setCalendarAbsenceMode("planning")}
        className={`px-3 py-1.5 text-sm font-medium ${calendarAbsenceMode === "planning" ? "rounded bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        data-testid="button-calendar-planning-mode"
      >
        Terminplanung
      </button>
      <button
        type="button"
        onClick={() => setCalendarAbsenceMode("absences")}
        className={`px-3 py-1.5 text-sm font-medium ${calendarAbsenceMode === "absences" ? "rounded bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        data-testid="button-calendar-absence-mode"
      >
        Abwesenheiten
      </button>
    </div>
  );

  const renderContent = () => {
    if (activeView === "week") {
      return (
        <WeekGrid
          currentDate={currentDate}
          employeeFilterId={employeeFilterId}
          readOnly={isReaderCalendarReadOnly}
          weekTileBodyMode={weekTileBodyModeSetting ?? "semiexpanded"}
          weekLanesCollapsed={Boolean(weekLanesCollapsedSetting)}
          onWeekLanesCollapsedChange={persistWeekLanesCollapsed}
          conflictHighlightActive={conflictHighlightActive}
          conflictAppointmentMap={conflictAppointmentMap}
          onNewAppointment={isReaderCalendarReadOnly ? undefined : (date, options) => {
            onOpenAppointmentForm({
              initialDate: date,
              initialTourId: options?.tourId ?? null,
              projectId,
              returnView: "week",
              weekScrollLeft: options?.scrollLeft ?? null,
              weekScrollTop: options?.scrollTop ?? null,
            });
          }}
          onOpenAppointment={(appointmentId, options) => {
            onOpenAppointmentForm({
              appointmentId,
              returnView: "week",
              weekScrollLeft: options?.scrollLeft ?? null,
              weekScrollTop: options?.scrollTop ?? null,
            });
          }}
          onOpenProject={onOpenProject}
          selectedMoveAppointment={selectedMoveAppointment}
          onSelectMoveAppointment={isReaderCalendarReadOnly ? undefined : handleSelectMoveAppointment}
          onRequestMoveAppointment={isReaderCalendarReadOnly ? undefined : requestCalendarMove}
          restoreRequest={restoreRequest ?? localWeekRestoreRequest}
          onRestoreApplied={() => {
            setLocalWeekRestoreRequest(null);
            onRestoreApplied?.();
          }}
          onViewportChange={(viewport) => {
            latestWeekViewportRef.current = viewport;
          }}
          onFooterActionChange={setFooterAction}
        />
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <MonthSheetGrid
            currentDate={currentDate}
            employeeFilterId={employeeFilterId}
            showMonthHeader
            headerAction={calendarAbsenceModeToggle}
            readOnly={isReaderCalendarReadOnly || calendarAbsenceMode === "absences"}
            absenceVisibility={calendarAbsenceMode}
            conflictHighlightActive={conflictHighlightActive}
            conflictAppointmentMap={conflictAppointmentMap}
            onNewAppointment={isReaderCalendarReadOnly || calendarAbsenceMode === "absences" ? undefined : (date) => {
              onOpenAppointmentForm({
                initialDate: date,
                projectId,
                returnView: activeView,
              });
            }}
            onOpenAppointment={(appointmentId) => {
              onOpenAppointmentForm({
                appointmentId,
                returnView: activeView,
              });
            }}
            onOpenProject={onOpenProject}
            selectedMoveAppointment={selectedMoveAppointment}
            onSelectMoveAppointment={isReaderCalendarReadOnly || calendarAbsenceMode === "absences" ? undefined : handleSelectMoveAppointment}
            onRequestMoveAppointment={isReaderCalendarReadOnly || calendarAbsenceMode === "absences" ? undefined : requestCalendarMove}
            onFooterActionChange={setFooterAction}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-white overflow-hidden flex flex-col" onContextMenu={handleCalendarContextMenu}>
      {mode === "contextual" ? (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-accent"
              data-testid="button-calendar-context-back"
            >
              Zurück
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onViewChange("week")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                activeView === "week"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-accent"
              }`}
              data-testid="button-calendar-context-week"
            >
              Woche
            </button>
            <button
              type="button"
              onClick={() => onViewChange("month")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                activeView === "month"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-accent"
              }`}
              data-testid="button-calendar-context-month"
            >
              Monat
            </button>
          </div>
        </div>
      ) : null}

      {selectedMoveAppointment ? (
        <CalendarMoveSelectionCard
          selection={selectedMoveAppointment}
          onClear={() => setSelectedMoveAppointment(null)}
        />
      ) : null}

      <div className="flex-1 min-h-0 grid grid-cols-[28px_minmax(0,1fr)_28px]">
        <button
          onClick={prev}
          className={`${calendarPagingButtonClassName} inline-flex items-center justify-center border-r`}
          data-testid="button-prev"
          aria-label="Zurück"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="min-w-0 h-full overflow-hidden">{renderContent()}</div>
        <button
          onClick={next}
          className={`${calendarPagingButtonClassName} inline-flex items-center justify-center border-l`}
          data-testid="button-next"
          aria-label="Vor"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {hideMainNavigation ? null : (
        <div className="flex-shrink-0 border-t border-border px-6 py-2 bg-card">
          <CalendarFilterPanel
            employeeId={employeeFilterId}
            onEmployeeIdChange={onEmployeeFilterChange}
            showWeekDisplayMode={activeView === "week"}
            weekLanesCollapsed={Boolean(weekLanesCollapsedSetting)}
            onWeekLanesCollapsedChange={persistWeekLanesCollapsed}
            conflictHighlightActive={conflictHighlightActive}
            conflictAppointmentCount={conflictAppointmentCount}
            onConflictHighlightChange={setConflictHighlightActive}
            showKwJump={isKwJumpEnabled}
            kwJumpValue={kwInputValue}
            kwJumpError={kwJumpError}
            onKwJumpChange={(value) => {
              setKwInputValue(sanitizeIsoWeekInput(value));
              setKwJumpError(false);
            }}
            onKwJumpSubmit={() => submitKwJump()}
            onKwJumpValueCommit={(value) => {
              setKwInputValue(value);
              setKwJumpError(false);
              submitKwJump(value);
            }}
            showKwJumpBack={jumpBackDate !== null}
            onKwJumpBack={() => {
              if (!jumpBackDate) return;
              rememberWeekViewportForNextNavigation();
              setKwInputValue(String(getISOWeek(jumpBackDate)));
              onDateChange(isMonthWindowView(activeView) ? normalizeMonthWindowStart(jumpBackDate) : jumpBackDate);
              setJumpBackDate(null);
              setKwJumpError(false);
            }}
            footerAction={footerAction}
          />
        </div>
      )}
      {pendingCalendarMove ? (
        <AppointmentSaveReviewDialog
          open
          currentEmployeeIds={
            pendingCalendarMove.resourceRequest
              ? pendingCalendarMove.request.appointment.employeeIds
              : pendingCalendarMove.employeeIds
          }
          resourceRequest={pendingCalendarMove.resourceRequest}
          noteReview={pendingCalendarMove.noteReview}
          isBusy={isCalendarMoveSubmitting}
          onOpenChange={(open) => {
            if (!open) handleCalendarMoveSaveReviewCancel();
          }}
          onCancel={handleCalendarMoveSaveReviewCancel}
          onConfirm={handleCalendarMoveSaveReviewConfirm}
        />
      ) : null}
      <WorkflowNoteSuggestionDialog
        open={noteSuggestionDialog !== null}
        templateTitle={noteSuggestionDialog?.templateTitle}
        targetLabel="diesen Termin"
        onOpenChange={(open) => { if (!open) setNoteSuggestionDialog(null); }}
        onSkip={() => setNoteSuggestionDialog(null)}
        onConfirm={handleCreateAppointmentNoteFromSuggestion}
      />
    </div>
  );
}
