import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Ban, Calendar, Clock, FolderKanban, ParkingCircle, Trash2, Users, X } from "lucide-react";
import { addDays, differenceInCalendarDays, format, getISOWeek, getISOWeekYear, parseISO } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import type { Customer, Employee, Project, Tag, Team, Tour } from "@shared/schema";
import { EntityFormShell } from "@/components/ui/entity-form-shell";
import { Button } from "@/components/ui/button";
import { ColorSelectButton } from "@/components/ui/color-select-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { CustomerDetailCard } from "@/components/ui/customer-detail-card";
import { ProjectDetailCard } from "@/components/ui/project-detail-card";
import { RelationSlot } from "@/components/ui/relation-slot";
import { TourInfoBadge } from "@/components/ui/tour-info-badge";
import { TagPickerPanel, type TagRelationItem } from "@/components/TagPickerPanel";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectsPage } from "@/components/ProjectsPage";
import { CustomersPage } from "@/components/CustomersPage";
import { EmployeePickerDialogList } from "@/components/EmployeePickerDialogList";
import { TourEmployeeCascadeDialog } from "@/components/TourEmployeeCascadeDialog";
import {
  AppointmentAttachmentsPanel,
  type PendingAppointmentAttachmentItem,
} from "@/components/AppointmentAttachmentsPanel";
import { AppointmentEmployeeSlot } from "@/components/AppointmentEmployeeSlot";
import { NotesSection } from "@/components/NotesSection";
import { RichTextEditor } from "@/components/RichTextEditor";
import { DocumentExtractionDropzone } from "@/components/DocumentExtractionDropzone";
import {
  DocumentExtractionDialog,
  type ExtractionCustomerDraft,
  type ExtractionDialogData,
} from "@/components/DocumentExtractionDialog";
import {
  ProjectDuplicateResolutionDialog,
  type ProjectDuplicateLatestAppointment,
  type ProjectDuplicateResolution,
} from "@/components/ProjectDuplicateResolutionDialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
import { invalidateTagProjectionQueries } from "@/lib/tag-invalidation";
import { fetchTagCatalog, getTagCatalogQueryKey } from "@/lib/tags";
import {
  createEmptyProjectProductSelections,
  type ProjectProductSelections,
} from "@/lib/project-product-form";
import {
  PROJECT_APPOINTMENTS_ALL_FROM_DATE,
  getBerlinTodayDateString,
  getProjectAppointmentsQueryKey,
} from "@/lib/project-appointments";
import type { Note } from "@shared/schema";
import type { NoteTemplate } from "@shared/schema";
import {
  RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
  RESERVED_VACANT_TAG_COLOR,
} from "@shared/appointmentCancellation";
import { computeTagAddedAction, computeTagRemovedAction } from "@/hooks/useTagRuleEngine";
import { Switch } from "@/components/ui/switch";

interface AppointmentFormProps {
  onCancel?: () => void;
  onSaved?: (result?: AppointmentFormSaveResult) => void;
  onBack?: () => void;
  initialDate?: string;
  initialTourId?: number | null;
  projectId?: number;
  appointmentId?: number;
  readOnlyFields?: Array<"project" | "customer">;
  showBackButton?: boolean;
}

interface AppointmentDetail {
  id: number;
  version: number;
  projectId: number | null;
  customerId: number;
  displayMode: "standard" | "compact" | "detail";
  tourId: number | null;
  title: string;
  description: string | null;
  startDate: string;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  employees: Employee[];
  isCancelled: boolean;
}

export type AppointmentFormSaveResult = {
  appointmentId: number | null;
  startDate: string;
  tourId: number | null;
  shouldOfferFollow: boolean;
};

type AppointmentFormProject = Project & {
  projectArticleItems?: ProjectArticleItem[];
};

type AppointmentFormProjectDetailResponse = {
  project: AppointmentFormProject;
};

type AppointmentApiError = Error & { status?: number; code?: string };
type ApiConflictEmployee = { id?: unknown; fullName?: unknown };
type ApiErrorPayload = {
  message?: string;
  code?: string;
  conflictEmployees?: ApiConflictEmployee[];
};
type ApiSuccessPayload = {
  id?: number;
  message?: string;
  employees?: Array<{ id: number }>;
};
type ExtractedProjectDraft =
  | {
      mode: "create";
      name: string;
      orderNumber: string;
      amount: string;
      customerId: number;
      extractedArticleListHtml: string;
      productSelections: ProjectProductSelections;
      documentFile: File | null;
    }
  | {
      mode: "existing";
      projectId: number;
      documentFile: File | null;
    };

type ProjectOrderNumberResolutionResponse = {
  resolution: "none" | "single" | "multiple";
  count: number;
  project: Project | null;
  latestAppointment: ProjectDuplicateLatestAppointment | null;
};

type DraftAppointmentNote = Note & {
  templateId?: number;
};

type AppointmentWeekEmployeePreviewItem = {
  employeeId: number;
  employeeName: string;
  status: "will_add" | "conflict" | "already_present" | "current_only";
  selectable: boolean;
  conflictReason: string | null;
};

type AppointmentWeekEmployeePreviewResponse = {
  isoYear: number;
  isoWeek: number;
  hasWeekPlan: boolean;
  currentEmployeeIds: number[];
  items: AppointmentWeekEmployeePreviewItem[];
};

type AppointmentWeekPreviewDialogState = {
  open: boolean;
  title: string;
  description: string;
  preview: AppointmentWeekEmployeePreviewResponse;
  resolutionKey: string;
  selectedIds: number[];
  resolutionMode: "additive" | "replace";
  persistAfterConfirm: boolean;
};

const logPrefix = "[AppointmentForm]";

const normalizeTimeInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = /^(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) return trimmed;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return trimmed;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return trimmed;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const buildTimeString = (timeValue: string) => {
  const normalized = normalizeTimeInput(timeValue);
  if (!normalized) return null;
  return `${normalized}:00`;
};

const getBerlinCurrentTimeString = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
};

const normalizeDateInputValue = (value: string | null | undefined): string => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const localizedMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmed);
  if (localizedMatch) {
    return `${localizedMatch[3]}-${localizedMatch[2]}-${localizedMatch[1]}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildApiError = (message: string, status?: number, code?: string): AppointmentApiError => {
  const error = new Error(message) as AppointmentApiError;
  error.status = status;
  error.code = code;
  return error;
};

const parseJsonBody = (rawBody: string): unknown | null => {
  const trimmedBody = rawBody.trim();
  if (
    !trimmedBody ||
    !(
      (trimmedBody.startsWith("{") && trimmedBody.endsWith("}")) ||
      (trimmedBody.startsWith("[") && trimmedBody.endsWith("]"))
    )
  ) {
    return null;
  }
  try {
    return JSON.parse(trimmedBody);
  } catch {
    return null;
  }
};

const parseErrorPayload = (rawBody: string): ApiErrorPayload | null => {
  const parsed = parseJsonBody(rawBody);
  if (!parsed || typeof parsed !== "object") return null;
  const payload = parsed as {
    message?: unknown;
    code?: unknown;
      conflictEmployees?: unknown;
  };
  return {
    message: typeof payload.message === "string" && payload.message.trim().length > 0 ? payload.message : undefined,
    code: typeof payload.code === "string" ? payload.code : undefined,
    conflictEmployees: Array.isArray(payload.conflictEmployees) ? payload.conflictEmployees as ApiConflictEmployee[] : undefined,
  };
};

const formatConflictEmployees = (conflictEmployees?: ApiConflictEmployee[]) => {
  if (!Array.isArray(conflictEmployees) || conflictEmployees.length === 0) return null;
  const names = conflictEmployees
    .map((entry) => (typeof entry.fullName === "string" ? entry.fullName.trim() : ""))
    .filter((name) => name.length > 0);
  if (names.length === 0) return null;
  return names.join(", ");
};

const isPastStartDate = (startDate: string) => {
  const startDateValue = new Date(`${startDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return startDateValue < today;
};

const normalizeTourName = (value: string | null | undefined) => (value ?? "").trim().toLocaleLowerCase("de").replace(/ß/g, "ss");
const isParkplatzTour = (tourId: number | null, parkplatzTourId: number | null) => tourId !== null && parkplatzTourId !== null && tourId === parkplatzTourId;

const buildIsoWeekKey = (dateValue: string) => {
  const parsedDate = parseISO(dateValue);
  return `${getISOWeekYear(parsedDate)}-${String(getISOWeek(parsedDate)).padStart(2, "0")}`;
};

const buildAppointmentWeekResolutionKey = (tourId: number | null, startDate: string) => {
  if (tourId === null) return null;
  return `${tourId}-${buildIsoWeekKey(startDate)}`;
};

const shiftEndDateByStartDateChange = (
  currentStartDate: string,
  currentEndDate: string,
  nextStartDate: string,
) => {
  const parsedCurrentStartDate = parseISO(currentStartDate);
  const parsedCurrentEndDate = parseISO(currentEndDate);
  const parsedNextStartDate = parseISO(nextStartDate);

  if (
    Number.isNaN(parsedCurrentStartDate.getTime())
    || Number.isNaN(parsedCurrentEndDate.getTime())
    || Number.isNaN(parsedNextStartDate.getTime())
  ) {
    return nextStartDate;
  }

  const durationDays = differenceInCalendarDays(parsedCurrentEndDate, parsedCurrentStartDate);
  return format(addDays(parsedNextStartDate, Math.max(0, durationDays)), "yyyy-MM-dd");
};

const getDefaultPreviewSelection = (preview: AppointmentWeekEmployeePreviewResponse) =>
  preview.items
    .filter((item) => item.selectable && item.status === "will_add")
    .map((item) => item.employeeId);

const buildEmployeeIdsFromPreviewSelection = (
  preview: AppointmentWeekEmployeePreviewResponse,
  selectedIds: number[],
  resolutionMode: "additive" | "replace",
) => {
  if (resolutionMode === "additive") {
    return Array.from(new Set([...preview.currentEmployeeIds, ...selectedIds]));
  }

  const selectedSet = new Set(selectedIds);
  return Array.from(new Set(
    preview.items
      .filter((item) => item.status === "already_present" || selectedSet.has(item.employeeId))
      .map((item) => item.employeeId),
  ));
};

const fetchJson = async <T,>(url: string) => {
  console.info(`${logPrefix} request`, { url });
  const response = await fetch(url, { credentials: "include" });
  const payload = await response.json();
  console.info(`${logPrefix} response`, { url, status: response.status });
  if (!response.ok) {
    throw new Error(payload?.message ?? response.statusText);
  }
  return payload as T;
};

export function AppointmentForm({
  onCancel,
  onSaved,
  onBack,
  initialDate,
  initialTourId,
  projectId,
  appointmentId,
  readOnlyFields,
  showBackButton = false,
}: AppointmentFormProps) {
  const { toast } = useToast();
  const projectsQueryKey = ["/api/projects?filter=all&scope=all"] as const;
  const isEditing = Boolean(appointmentId);
  const createDefaultDate = initialDate ?? getBerlinTodayDateString();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(projectId ?? null);
  const [pendingProjectDraft, setPendingProjectDraft] = useState<ExtractedProjectDraft | null>(null);
  const [projectDuplicateResolution, setProjectDuplicateResolution] = useState<ProjectDuplicateResolution | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<string>(
    isEditing ? "" : createDefaultDate,
  );
  const [endDate, setEndDate] = useState<string>(
    isEditing ? "" : createDefaultDate,
  );
  const [isEndDateEnabled, setIsEndDateEnabled] = useState(false);
  const [startTimeEnabled, setStartTimeEnabled] = useState(false);
  const [startTimeValue, setStartTimeValue] = useState("");
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [employeeConfirmOpen, setEmployeeConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [parkConfirmOpen, setParkConfirmOpen] = useState(false);
  const [noteSuggestionDialog, setNoteSuggestionDialog] = useState<{ templateTitle: string } | null>(null);
  const [noteRemovalDialog, setNoteRemovalDialog] = useState<{ templateTitle: string; noteId: number; noteVersion: number } | null>(null);
  const [templateNoteEditorOpen, setTemplateNoteEditorOpen] = useState(false);
  const [templateNoteEditorId, setTemplateNoteEditorId] = useState<number | null>(null);
  const [templateNoteEditorVersion, setTemplateNoteEditorVersion] = useState<number>(1);
  const [templateNoteTitle, setTemplateNoteTitle] = useState("");
  const [templateNoteBody, setTemplateNoteBody] = useState("");
  const [templateNoteCardColor, setTemplateNoteCardColor] = useState("#f8fafc");
  const [templateNotePrint, setTemplateNotePrint] = useState(false);
  const [templateNoteCardColorLocked, setTemplateNoteCardColorLocked] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [appointmentWeekPreviewDialog, setAppointmentWeekPreviewDialog] = useState<AppointmentWeekPreviewDialogState | null>(null);
  const [resolvedAppointmentWeekPlanKey, setResolvedAppointmentWeekPlanKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [documentExtractionOpen, setDocumentExtractionOpen] = useState(false);
  const [documentExtractionLoading, setDocumentExtractionLoading] = useState(false);
  const [documentExtractionData, setDocumentExtractionData] = useState<ExtractionDialogData | null>(null);
  const [documentExtractionFile, setDocumentExtractionFile] = useState<File | null>(null);
  const [draftAppointmentTags, setDraftAppointmentTags] = useState<TagRelationItem[]>([]);
  const [draftAppointmentNotes, setDraftAppointmentNotes] = useState<DraftAppointmentNote[]>([]);
  const [draftAppointmentAttachments, setDraftAppointmentAttachments] = useState<PendingAppointmentAttachmentItem[]>([]);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string | null>(null);
  const weekTourPrefillAppliedRef = useRef(false);
  const hydratedEditAppointmentIdRef = useRef<number | null>(null);
  const draftNoteIdRef = useRef(-1);
  const draftAttachmentIdRef = useRef(-1);

  const matchesAttachmentFileSignature = (attachment: PendingAppointmentAttachmentItem, file: File) =>
    attachment.originalName === file.name &&
    attachment.file.size === file.size &&
    attachment.file.lastModified === file.lastModified;

  const buildFormSnapshot = (input: {
    projectId: number | null;
    customerId: number | null;
    tourId: number | null;
    startDate: string;
    endDate: string;
    isEndDateEnabled: boolean;
    startTimeValue: string;
    startTimeEnabled: boolean;
    employeeIds: number[];
    sidebarDraftSignature?: string | null;
  }) =>
    JSON.stringify({
      projectId: input.projectId,
      customerId: input.customerId,
      tourId: input.tourId,
      startDate: input.startDate,
      endDate: input.isEndDateEnabled ? input.endDate : null,
      isEndDateEnabled: input.isEndDateEnabled,
      startTimeEnabled: input.startTimeEnabled,
      startTimeValue: input.startTimeEnabled ? input.startTimeValue : "",
      employeeIds: [...input.employeeIds].sort((a, b) => a - b),
      sidebarDraftSignature: input.sidebarDraftSignature ?? null,
    });

  const [userRole] = useState(() =>
    window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER",
  );
  const isAdmin = userRole === "ADMIN";
  const canManageAppointmentTags = isAdmin || userRole === "DISPATCHER";
  const canDeleteAttachments = isAdmin || userRole === "DISPATCHER";
  const projectAppointmentsUpcomingFromDate = getBerlinTodayDateString();
  const invalidateTourenplanReportQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ["reports-tourenplan-preview"] });
    await queryClient.invalidateQueries({ queryKey: ["reports-tourenplan-appointments"] });
  };
  const invalidateRelatedAppointmentQueries = async (projectId: number | null | undefined) => {
    await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
    await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
    if (projectId) {
      const upcomingAppointmentsQueryKey = getProjectAppointmentsQueryKey({
        projectId,
        fromDate: projectAppointmentsUpcomingFromDate,
        userRole,
      });
      const allAppointmentsQueryKey = getProjectAppointmentsQueryKey({
        projectId,
        fromDate: PROJECT_APPOINTMENTS_ALL_FROM_DATE,
        userRole,
      });
      await queryClient.invalidateQueries({ queryKey: upcomingAppointmentsQueryKey });
      await queryClient.invalidateQueries({ queryKey: allAppointmentsQueryKey });
    }
    await invalidateTourenplanReportQueries();
    await invalidateTagProjectionQueries();
  };

  const { data: projects = [], isLoading: projectsLoading } = useQuery<AppointmentFormProject[]>({
    queryKey: projectsQueryKey,
    queryFn: () => fetchJson<AppointmentFormProject[]>("/api/projects?filter=all&scope=all"),
  });

  // Fallback: keep a direct detail fetch in case the list query is stale or the
  // selected project is otherwise not present in the current response.
  const selectedProjectInList = projects.find((p) => p.id === selectedProjectId) ?? null;
  const { data: selectedProjectById = null } = useQuery<AppointmentFormProject | null>({
    queryKey: [`/api/projects/${selectedProjectId}`],
    enabled: selectedProjectId !== null && selectedProjectInList === null,
    queryFn: async () => {
      const data = await fetchJson<AppointmentFormProjectDetailResponse>(`/api/projects/${selectedProjectId}`);
      return data.project;
    },
    staleTime: 60_000,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: () => fetchJson<Customer[]>("/api/customers"),
  });

  const { data: tours = [], isLoading: toursLoading } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
    queryFn: () => fetchJson<Tour[]>("/api/tours"),
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    queryFn: () => fetchJson<Team[]>("/api/teams"),
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "active" }],
    queryFn: () => fetchJson<Employee[]>("/api/employees?scope=active"),
  });
  const { data: appointmentDetail, isLoading: appointmentLoading } = useQuery<AppointmentDetail>({
    queryKey: ["/api/appointments", appointmentId],
    queryFn: () => fetchJson<AppointmentDetail>(`/api/appointments/${appointmentId}`),
    enabled: Boolean(appointmentId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  });
  const {
    data: appointmentTagRelations = [],
    isLoading: appointmentTagsLoading,
    error: appointmentTagsError,
  } = useQuery<TagRelationItem[]>({
    queryKey: ["/api/appointments", appointmentId, "tags"],
    queryFn: () => fetchJson<TagRelationItem[]>(`/api/appointments/${appointmentId}/tags`),
    enabled: Boolean(appointmentId),
  });
  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: getTagCatalogQueryKey("appointment"),
    queryFn: () => fetchTagCatalog("appointment"),
  });

  const { data: appointmentNotes = [], isLoading: appointmentNotesLoading } = useQuery<Note[]>({
    queryKey: ["/api/appointments", appointmentId, "notes"],
    queryFn: () => fetchJson<Note[]>(`/api/appointments/${appointmentId}/notes`),
    enabled: Boolean(appointmentId),
  });
  const { data: noteTemplates = [] } = useQuery<NoteTemplate[]>({
    queryKey: ["/api/note-templates"],
    queryFn: () => fetchJson<NoteTemplate[]>("/api/note-templates"),
    enabled: Boolean(appointmentId),
  });
  const createSidebarDraftSignature = useMemo(
    () => JSON.stringify({
      tagIds: draftAppointmentTags.map((item) => item.tag.id).sort((a, b) => a - b),
      notes: draftAppointmentNotes.map((note) => ({
        id: note.id,
        title: note.title,
        body: note.body,
        cardColor: note.cardColor,
        print: note.print,
        isPinned: note.isPinned,
      })),
      attachments: draftAppointmentAttachments.map((attachment) => ({
        id: attachment.id,
        originalName: attachment.originalName,
      })),
    }),
    [draftAppointmentAttachments, draftAppointmentNotes, draftAppointmentTags],
  );
  const addAppointmentTagMutation = useMutation({
    mutationFn: async ({ tagId }: { tagId: number; tagName: string }) => {
      const response = await apiRequest("POST", `/api/appointments/${appointmentId}/tags`, { tagId });
      return response.json();
    },
    onSuccess: async (_data, { tagName }) => {
      const action = computeTagAddedAction(tagName, appointmentId, visibleAppointmentNotes.map((n) => ({ title: n.title })));
      if (action.kind === "show_note_suggestion_dialog") {
        setNoteSuggestionDialog({ templateTitle: action.templateTitle });
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId, "tags"] });
      await invalidateRelatedAppointmentQueries(selectedProjectId);
    },
    onError: (error: Error) => {
      toast({ title: "Tag-Zuweisung fehlgeschlagen", description: error.message, variant: "destructive" });
    },
  });
  const removeAppointmentTagMutation = useMutation({
    mutationFn: async (item: TagRelationItem) => {
      await apiRequest("DELETE", `/api/appointments/${appointmentId}/tags/${item.tag.id}`, { version: item.relationVersion });
    },
    onSuccess: async (_data, item) => {
      const action = computeTagRemovedAction(item.tag.name, visibleAppointmentNotes.map((n) => ({ title: n.title })));
      if (action.kind === "show_note_removal_dialog") {
        const normalizeTitle = (v: string) => v.trim().toLocaleLowerCase("de").replace(/ß/g, "ss");
        const matchingNote = visibleAppointmentNotes.find(
          (n) => normalizeTitle(n.title) === normalizeTitle(action.templateTitle),
        );
        if (matchingNote) {
          setNoteRemovalDialog({ templateTitle: action.templateTitle, noteId: matchingNote.id, noteVersion: matchingNote.version });
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId, "tags"] });
      await invalidateRelatedAppointmentQueries(selectedProjectId);
    },
    onError: (error: Error) => {
      toast({ title: "Tag konnte nicht entfernt werden", description: error.message, variant: "destructive" });
    },
  });
  const cancelAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId: targetAppointmentId, version }: { appointmentId: number; version: number }) => {
      const response = await fetch(`/api/appointments/${targetAppointmentId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ version }),
        credentials: "include",
      });
      if (response.ok) {
        return targetAppointmentId;
      }

      const rawBody = await response.text();
      const parsed = parseErrorPayload(rawBody);
      if (parsed?.code === "PAST_APPOINTMENT_READONLY") {
        throw buildApiError("Termin ist gesperrt.", response.status, "PAST_APPOINTMENT_READONLY");
      }
      if (parsed?.code === "CANCELLATION_TAG_NOT_CONFIGURED") {
        throw buildApiError(
          "Der reservierte Storno-Tag ist nicht konfiguriert.",
          response.status,
          "CANCELLATION_TAG_NOT_CONFIGURED",
        );
      }
      if (parsed?.code === "VERSION_CONFLICT") {
        throw buildApiError("Termin wurde parallel geaendert.", response.status, "VERSION_CONFLICT");
      }

      throw buildApiError(parsed?.message ?? (response.statusText || "Stornieren fehlgeschlagen"), response.status, parsed?.code);
    },
    onSuccess: async () => {
      if (!appointmentId) return;
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId, "tags"] });
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      if (selectedProjectId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProjectId}`] });
      }
      await invalidateRelatedAppointmentQueries(selectedProjectId);
      await refreshMonitoringWithNotification(toast);
      toast({ title: "Termin storniert" });
      onSaved?.();
    },
    onError: (error) => {
      const err = error as AppointmentApiError;
      if (err.code === "PAST_APPOINTMENT_READONLY") {
        toast({
          title: "Stornieren nicht möglich",
          description: "Termin ist gesperrt.",
          variant: "destructive",
        });
        return;
      }
      if (err.code === "CANCELLATION_TAG_NOT_CONFIGURED") {
        toast({
          title: "Stornieren nicht möglich",
          description: "Der reservierte Storno-Tag ist in den Stammdaten nicht vorhanden.",
          variant: "destructive",
        });
        return;
      }
      if (err.code === "VERSION_CONFLICT") {
        toast({
          title: "Stornieren nicht möglich",
          description: "Termin wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Stornieren nicht möglich",
        description: err.message || "Termin konnte nicht storniert werden.",
        variant: "destructive",
      });
    },
  });

  const parkAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId: targetId, version }: { appointmentId: number; version: number }) => {
      const response = await fetch(`/api/appointments/${targetId}/park`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
        credentials: "include",
      });
      if (response.ok) return targetId;
      const rawBody = await response.text();
      const parsed = parseErrorPayload(rawBody);
      if (parsed?.code === "ALREADY_PARKED") {
        throw buildApiError("Termin ist bereits geparkt.", response.status, "ALREADY_PARKED");
      }
      if (parsed?.code === "VERSION_CONFLICT") {
        throw buildApiError("Termin wurde parallel geaendert.", response.status, "VERSION_CONFLICT");
      }
      if (parsed?.code === "PAST_APPOINTMENT_READONLY") {
        throw buildApiError("Termin ist gesperrt.", response.status, "PAST_APPOINTMENT_READONLY");
      }
      if (parsed?.code === "CANCELLED_APPOINTMENT_READONLY") {
        throw buildApiError("Stornierte Termine koennen nicht geparkt werden.", response.status, "CANCELLED_APPOINTMENT_READONLY");
      }
      throw buildApiError(parsed?.message ?? (response.statusText || "Parken fehlgeschlagen"), response.status, parsed?.code);
    },
    onSuccess: async () => {
      if (!appointmentId) return;
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId, "tags"] });
      await invalidateRelatedAppointmentQueries(selectedProjectId);
      await refreshMonitoringWithNotification(toast);
      toast({ title: "Termin geparkt" });
      onSaved?.();
    },
    onError: (error) => {
      const err = error as AppointmentApiError;
      if (err.code === "ALREADY_PARKED") {
        toast({ title: "Parken nicht moeglich", description: "Termin ist bereits geparkt.", variant: "destructive" });
        return;
      }
      if (err.code === "VERSION_CONFLICT") {
        toast({ title: "Parken nicht moeglich", description: "Termin wurde zwischenzeitlich geaendert. Bitte neu laden.", variant: "destructive" });
        return;
      }
      if (err.code === "PAST_APPOINTMENT_READONLY") {
        toast({ title: "Parken nicht moeglich", description: "Termin ist gesperrt.", variant: "destructive" });
        return;
      }
      if (err.code === "CANCELLED_APPOINTMENT_READONLY") {
        toast({ title: "Parken nicht moeglich", description: "Stornierte Termine koennen nicht geparkt werden.", variant: "destructive" });
        return;
      }
      toast({ title: "Parken nicht moeglich", description: err.message || "Termin konnte nicht geparkt werden.", variant: "destructive" });
    },
  });

  const isLoading =
    projectsLoading || customersLoading || toursLoading || teamsLoading || employeesLoading || appointmentLoading;

  useEffect(() => {
    if (!isEditing || !appointmentId) {
      hydratedEditAppointmentIdRef.current = null;
      return;
    }
    if (!appointmentDetail || appointmentDetail.id !== appointmentId) return;
    if (hydratedEditAppointmentIdRef.current === appointmentId) return;
    hydratedEditAppointmentIdRef.current = appointmentId;
    console.info(`${logPrefix} appointment detail loaded`, { appointmentId: appointmentDetail.id });
    const normalizedStartDate = normalizeDateInputValue(appointmentDetail.startDate);
    const normalizedEndDate = normalizeDateInputValue(appointmentDetail.endDate ?? appointmentDetail.startDate);
    const hasExplicitEndDate = normalizedEndDate.length > 0 && normalizedEndDate !== normalizedStartDate;
    setSelectedProjectId(appointmentDetail.projectId);
    setSelectedCustomerId(appointmentDetail.customerId);
    setSelectedTourId(appointmentDetail.tourId ?? null);
    setStartDate(normalizedStartDate);
    setEndDate(normalizedEndDate || normalizedStartDate);
    setIsEndDateEnabled(hasExplicitEndDate);
    const startTime = appointmentDetail.startTime?.slice(0, 5) ?? "";
    setStartTimeEnabled(Boolean(startTime));
    setStartTimeValue(startTime);
    const initialEmployeeIds = appointmentDetail.employees.map((employee) => employee.id);
    setAssignedEmployeeIds(initialEmployeeIds);
    setInitialFormSnapshot(
      buildFormSnapshot({
        projectId: appointmentDetail.projectId,
        customerId: appointmentDetail.customerId,
        tourId: appointmentDetail.tourId ?? null,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate || normalizedStartDate,
        isEndDateEnabled: hasExplicitEndDate,
        startTimeValue: startTime,
        startTimeEnabled: Boolean(startTime),
        employeeIds: initialEmployeeIds,
        sidebarDraftSignature: null,
      }),
    );
  }, [appointmentDetail, appointmentId, isEditing]);

  useEffect(() => {
    if (isEditing || initialFormSnapshot !== null) return;
    setInitialFormSnapshot(
      buildFormSnapshot({
        projectId: selectedProjectId,
        customerId: selectedCustomerId,
        tourId: selectedTourId,
        startDate,
        endDate,
        isEndDateEnabled,
        startTimeValue,
        startTimeEnabled,
        employeeIds: assignedEmployeeIds,
        sidebarDraftSignature: createSidebarDraftSignature,
      }),
    );
    // Intentionally only initialize once for create mode.
  }, [isEditing, selectedProjectId, selectedCustomerId, selectedTourId, startDate, endDate, isEndDateEnabled, startTimeValue, startTimeEnabled, assignedEmployeeIds, createSidebarDraftSignature, initialFormSnapshot]);
  useEffect(() => {
    if (isEditing) return;
    if (initialTourId === null || initialTourId === undefined) return;
    if (weekTourPrefillAppliedRef.current) return;

    handleTourChange(initialTourId);
    weekTourPrefillAppliedRef.current = true;

    console.info(`${logPrefix} week-prefill applied`, {
      tourId: initialTourId,
    });
  }, [initialTourId, isEditing]);

  useEffect(() => {
    if (!startDate) return;
    if (!isEndDateEnabled) {
      setEndDate(startDate);
    }
  }, [isEndDateEnabled, startDate]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? selectedProjectById ?? null,
    [projects, selectedProjectId, selectedProjectById],
  );

  const resolvedCustomerId = selectedProject?.customerId ?? selectedCustomerId;
  const selectedCustomer = useMemo(() => {
    if (!resolvedCustomerId) return null;
    return customers.find((customer) => customer.id === resolvedCustomerId) ?? null;
  }, [customers, resolvedCustomerId]);

  const selectedTour = useMemo(
    () => tours.find((tour) => tour.id === selectedTourId) ?? null,
    [tours, selectedTourId],
  );
  const visibleAppointmentTags = isEditing ? appointmentTagRelations : draftAppointmentTags;
  const visibleAppointmentNotes = isEditing ? appointmentNotes : draftAppointmentNotes;

  const assignedEmployeesById = useMemo(() => {
    const map = new Map<number, Employee>();
    for (const employee of employees) {
      map.set(employee.id, employee);
    }
    for (const employee of appointmentDetail?.employees ?? []) {
      if (!map.has(employee.id)) {
        map.set(employee.id, employee);
      }
    }
    return map;
  }, [employees, appointmentDetail?.employees]);

  const assignedEmployees = useMemo(
    () => assignedEmployeeIds
      .map((id) => assignedEmployeesById.get(id))
      .filter((employee): employee is Employee => Boolean(employee)),
    [assignedEmployeeIds, assignedEmployeesById],
  );

  const availableEmployees = useMemo(
    () => employees.filter((employee) => employee.isActive && !assignedEmployeeIds.includes(employee.id)),
    [employees, assignedEmployeeIds],
  );

  const teamMembersById = useMemo(() => {
    const result = new Map<number, { id: number; fullName: string }[]>();
    for (const employee of employees) {
      if (!employee.teamId) continue;
      const current = result.get(employee.teamId) ?? [];
      current.push({ id: employee.id, fullName: employee.fullName });
      result.set(employee.teamId, current);
    }
    return result;
  }, [employees]);

  const tourMembersById = useMemo(() => new Map<number, { id: number; fullName: string }[]>(), []);

  const lockedStartDate = appointmentDetail?.startDate ?? startDate;
  const lockedTourId = appointmentDetail?.tourId ?? selectedTourId;
  const parkplatzTourId = useMemo(
    () => tours.find((tour) => normalizeTourName(tour.name) === normalizeTourName("Parkplatz"))?.id ?? null,
    [tours],
  );
  const isParked = isEditing && isParkplatzTour(lockedTourId, parkplatzTourId);
  const isHistoricalReadOnly = isEditing && isPastStartDate(lockedStartDate) && !isParked;
  const isCancelled = appointmentDetail?.isCancelled === true;
  const isReadOnlyView = isHistoricalReadOnly || isCancelled;
  const isMutationLocked = isReadOnlyView;
  const isProjectReadOnly = isMutationLocked || readOnlyFields?.includes("project") === true;
  const isCustomerReadOnly = isMutationLocked || selectedProjectId !== null || readOnlyFields?.includes("customer") === true;
  const closeAction = onBack ?? onCancel;
  const isFormDirty = initialFormSnapshot !== null && buildFormSnapshot({
    projectId: selectedProjectId,
    customerId: selectedCustomerId,
    tourId: selectedTourId,
    startDate,
    endDate,
    isEndDateEnabled,
    startTimeValue,
    startTimeEnabled,
    employeeIds: assignedEmployeeIds,
    sidebarDraftSignature: isEditing ? null : createSidebarDraftSignature,
  }) !== initialFormSnapshot;
  const handleRequestClose = () => {
    if (isFormDirty && !isSaving) {
      setCloseConfirmOpen(true);
      return;
    }
    closeAction?.();
  };
  const readOnlyCloseAction = closeAction ?? handleRequestClose;

  const addEmployees = (ids: number[]) => {
    setAssignedEmployeeIds((prev) => {
      const set = new Set(prev);
      ids.forEach((id) => set.add(id));
      return Array.from(set);
    });
  };

  const removeEmployee = (employeeId: number) => {
    setAssignedEmployeeIds((prev) => prev.filter((id) => id !== employeeId));
  };

  const handleStartDateChange = (nextStartDate: string) => {
    if (isEndDateEnabled && endDate) {
      setEndDate(shiftEndDateByStartDateChange(startDate, endDate, nextStartDate));
    }
    setStartDate(nextStartDate);
  };

  const handleAssignTeam = (team: Team) => {
    const teamEmployees = employees
      .filter((employee) => employee.teamId === team.id && employee.isActive)
      .map((employee) => employee.id);
    console.info(`${logPrefix} team add`, { teamId: team.id, employees: teamEmployees.length });
    addEmployees(teamEmployees);
  };

  const loadTourAssignmentPreview = async (
    tourId: number,
    existingEmployeeIds: number[],
  ): Promise<AppointmentWeekEmployeePreviewResponse> => {
    const response = await apiRequest("POST", `/api/tours/${tourId}/week-employees/assignment-preview`, {
      startDate,
      endDate: isEndDateEnabled ? endDate : null,
      startTime: startTimeEnabled ? buildTimeString(startTimeValue) : null,
      existingEmployeeIds,
    });
    return response.json() as Promise<AppointmentWeekEmployeePreviewResponse>;
  };

  const loadAppointmentTourChangePreview = async (): Promise<AppointmentWeekEmployeePreviewResponse | null> => {
    if (!appointmentId) return null;
    const response = await apiRequest("POST", `/api/appointments/${appointmentId}/tour-change-preview`, {
      newTourId: selectedTourId,
      newStartDate: startDate,
      newEndDate: isEndDateEnabled ? endDate : null,
      newStartTime: startTimeEnabled ? buildTimeString(startTimeValue) : null,
      currentEmployeeIds: assignedEmployeeIds,
    });
    return response.json() as Promise<AppointmentWeekEmployeePreviewResponse>;
  };

  const openAppointmentWeekPreviewDialog = (
    preview: AppointmentWeekEmployeePreviewResponse,
    params: { title: string; description: string; persistAfterConfirm: boolean; resolutionKey: string },
  ) => {
    setAppointmentWeekPreviewDialog({
      open: true,
      title: params.title,
      description: params.description,
      preview,
      resolutionKey: params.resolutionKey,
      selectedIds: getDefaultPreviewSelection(preview),
      resolutionMode: "additive",
      persistAfterConfirm: params.persistAfterConfirm,
    });
  };

  const applyTourChange = (tourId: number | null) => {
    setSelectedTourId(tourId);
    console.info(`${logPrefix} tour change applied`, {
      tourId,
    });
  };

  const handleTourChange = (tourId: number | null) => {
    if (tourId === selectedTourId) return;
    void (async () => {
      applyTourChange(tourId);
      setResolvedAppointmentWeekPlanKey(null);
      if (tourId === null) {
        return;
      }

      try {
        const resolutionKey = buildAppointmentWeekResolutionKey(tourId, startDate);
        const preview = await loadTourAssignmentPreview(tourId, assignedEmployeeIds);
        if (!preview.hasWeekPlan) {
          setResolvedAppointmentWeekPlanKey(resolutionKey);
          return;
        }
        openAppointmentWeekPreviewDialog(preview, {
          title: "Wochenplanung fuer Termin uebernehmen",
          description: "Die ausgewählte Tour hat für diese Kalenderwoche eine Planung. Wählen Sie, welche Mitarbeiter übernommen werden sollen.",
          persistAfterConfirm: false,
          resolutionKey: resolutionKey ?? `${tourId}-${preview.isoYear}-${preview.isoWeek}`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Vorschau konnte nicht geladen werden.";
        toast({
          title: "Wochenplanung konnte nicht geladen werden",
          description: message,
          variant: "destructive",
        });
      }
    })();
  };

  const handleProjectSelect = (id: number) => {
    const project = projects.find((item) => item.id === id) ?? null;
    setSelectedProjectId(id);
    setSelectedCustomerId(project?.customerId ?? null);
    setProjectPickerOpen(false);
    console.info(`${logPrefix} project selected`, { projectId: id });
  };

  const handleCustomerSelect = (id: number) => {
    setSelectedCustomerId(id);
    setCustomerPickerOpen(false);
    console.info(`${logPrefix} customer selected`, { customerId: id });
  };

  const addDraftAppointmentTag = (tagId: number) => {
    const tag = availableTags.find((entry) => entry.id === tagId);
    if (!tag) {
      toast({
        title: "Tag konnte nicht hinzugefuegt werden",
        description: "Der ausgewaehlte Tag ist nicht verfuegbar.",
        variant: "destructive",
      });
      return;
    }
    setDraftAppointmentTags((current) => {
      if (current.some((entry) => entry.tag.id === tagId)) {
        return current;
      }
      return [...current, { tag, relationVersion: 1 }];
    });
  };

  const removeDraftAppointmentTag = (item: TagRelationItem) => {
    setDraftAppointmentTags((current) => current.filter((entry) => entry.tag.id !== item.tag.id));
  };

  const addDraftAppointmentAttachment = (file: File) => {
    setDraftAppointmentAttachments((current) => {
      const duplicate = current.some((attachment) => matchesAttachmentFileSignature(attachment, file));
      if (duplicate) {
        return current;
      }
      return [
        ...current,
        {
          id: draftAttachmentIdRef.current--,
          originalName: file.name,
          mimeType: file.type || null,
          file,
        },
      ];
    });
  };

  const removeDraftAppointmentAttachmentForFile = (file: File) => {
    setDraftAppointmentAttachments((current) =>
      current.filter((attachment) => !matchesAttachmentFileSignature(attachment, file)),
    );
  };

  const addDraftAppointmentNote = ({
    title,
    body,
    cardColor,
    print,
    templateId,
  }: {
    title: string;
    body: string;
    cardColor?: string | null;
    print: boolean;
    templateId?: number;
  }) => {
    const now = new Date();
    setDraftAppointmentNotes((current) => [
      ...current,
      {
        id: draftNoteIdRef.current--,
        title,
        body,
        cardColor: cardColor ?? null,
        print,
        cardColorLocked: false,
        isPinned: false,
        version: 1,
        createdAt: now,
        updatedAt: now,
        templateId,
      },
    ]);
  };

  const updateDraftAppointmentNote = (
    noteId: number,
    data: { title: string; body: string; cardColor?: string | null; print: boolean },
  ) => {
    const updatedAt = new Date();
    setDraftAppointmentNotes((current) => current.map((note) => (
      note.id === noteId
        ? {
            ...note,
            title: data.title,
            body: data.body,
            cardColor: data.cardColor ?? null,
            print: data.print,
            updatedAt,
          }
        : note
    )));
  };

  const toggleDraftAppointmentNotePin = (noteId: number, isPinned: boolean) => {
    const updatedAt = new Date();
    setDraftAppointmentNotes((current) => current.map((note) => (
      note.id === noteId
        ? {
            ...note,
            isPinned,
            updatedAt,
          }
        : note
    )));
  };

  const deleteDraftAppointmentNote = (noteId: number) => {
    setDraftAppointmentNotes((current) => current.filter((note) => note.id !== noteId));
  };

  const mapExtractionCustomerToPayload = (customer: ExtractionCustomerDraft) => ({
    customerNumber: customer.customerNumber.trim(),
    firstName: customer.firstName?.trim() || null,
    lastName: customer.lastName?.trim() || null,
    company: customer.company?.trim() || null,
    email: customer.email?.trim() || null,
    phone: customer.phone?.trim() || null,
    addressLine1: customer.addressLine1?.trim() || null,
    addressLine2: customer.addressLine2?.trim() || null,
    postalCode: customer.postalCode?.trim() || null,
    city: customer.city?.trim() || null,
    country: customer.country?.trim() || null,
  });

  const normalizeOptionalExtractionText = (value: string | null | undefined): string | null => {
    if (value == null) return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  };

  const isBlankCustomerValue = (value: string | null | undefined): boolean =>
    value == null || value.trim().length === 0;

  const buildExistingCustomerMergePayload = (existingCustomer: Customer, customerDraft: ExtractionCustomerDraft) => {
    const mergedFields: Record<string, string | null> = {};
    const maybeAssign = (key: keyof ExtractionCustomerDraft, existingValue: string | null | undefined) => {
      const incomingValue = normalizeOptionalExtractionText(customerDraft[key]);
      if (!incomingValue) return;
      if (!isBlankCustomerValue(existingValue)) return;
      mergedFields[key] = incomingValue;
    };

    maybeAssign("firstName", existingCustomer.firstName);
    maybeAssign("lastName", existingCustomer.lastName);
    maybeAssign("company", existingCustomer.company);
    maybeAssign("email", existingCustomer.email);
    maybeAssign("phone", existingCustomer.phone);
    maybeAssign("addressLine1", existingCustomer.addressLine1);
    maybeAssign("addressLine2", existingCustomer.addressLine2);
    maybeAssign("postalCode", existingCustomer.postalCode);
    maybeAssign("city", existingCustomer.city);
    maybeAssign("country", existingCustomer.country);

    if (Object.keys(mergedFields).length === 0) {
      return null;
    }

    return {
      ...mergedFields,
      version: existingCustomer.version,
    };
  };

  const tryPatchExistingCustomerFromExtraction = async (
    existingCustomer: Customer,
    customerDraft: ExtractionCustomerDraft,
  ): Promise<Customer> => {
    const updatePayload = buildExistingCustomerMergePayload(existingCustomer, customerDraft);
    if (!updatePayload) {
      return existingCustomer;
    }

    const sendUpdate = async (customer: Customer, payload: Record<string, string | number | null>) =>
      fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

    let response = await sendUpdate(existingCustomer, updatePayload);
    if (response.ok) {
      const updatedCustomer = (await response.json()) as Customer;
      await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/customers/list"] });
      return updatedCustomer;
    }

    const firstErrorPayload = await response.json().catch(() => null);
    if (firstErrorPayload?.code !== "VERSION_CONFLICT") {
      return existingCustomer;
    }

    const freshResponse = await fetch(`/api/customers/${existingCustomer.id}`, {
      method: "GET",
      credentials: "include",
    });
    if (!freshResponse.ok) {
      return existingCustomer;
    }

    const freshCustomer = (await freshResponse.json()) as Customer;
    const retryPayload = buildExistingCustomerMergePayload(freshCustomer, customerDraft);
    if (!retryPayload) {
      return freshCustomer;
    }

    response = await sendUpdate(freshCustomer, retryPayload);
    if (!response.ok) {
      return freshCustomer;
    }

    const updatedCustomer = (await response.json()) as Customer;
    await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/customers/list"] });
    return updatedCustomer;
  };

  const resolveCustomerByNumber = async (customerNumber: string) => {
    const response = await fetch("/api/document-extraction/resolve-customer-by-number", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerNumber: customerNumber.trim() }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message ?? "Kundennummer konnte nicht aufgelöst werden");
    }
    return (await response.json()) as { resolution: "none" | "single" | "multiple"; count: number; customer: Customer | null };
  };

  const resolveProjectByOrderNumber = async (orderNumber: string) => {
    const response = await fetch("/api/document-extraction/resolve-project-by-order-number", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderNumber: orderNumber.trim() }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message ?? "Auftragsnummer konnte nicht aufgelöst werden");
    }
    return (await response.json()) as ProjectOrderNumberResolutionResponse;
  };

  const confirmExistingProjectDuplicate = () => {
    if (!projectDuplicateResolution) return;
    setPendingProjectDraft({
      mode: "existing",
      projectId: projectDuplicateResolution.project.id,
      documentFile: documentExtractionFile,
    });
    setProjectDuplicateResolution(null);
    setDocumentExtractionOpen(false);
    toast({
      title: "Vorhandenes Projekt geöffnet",
      description: "Projekt mit dieser Auftragsnummer existiert bereits.",
    });
  };

  const createCustomerFromDraft = async (customerDraft: ExtractionCustomerDraft) => {
    const payload = mapExtractionCustomerToPayload(customerDraft);
    const response = await fetch("/api/customers", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(json?.code === "CUSTOMER_NUMBER_CONFLICT" ? "Kundennummer ist bereits vergeben." : (json?.message ?? "Kunde konnte nicht angelegt werden"));
    }
    await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/customers/list"] });
    return json as Customer;
  };

  const resolveOrCreateCustomerForExtraction = async (customerDraft: ExtractionCustomerDraft): Promise<Customer | null> => {
    if (!customerDraft.customerNumber.trim()) {
      throw new Error("Kundennummer ist erforderlich");
    }
    const resolution = await resolveCustomerByNumber(customerDraft.customerNumber);
    if (resolution.resolution === "multiple") {
      throw new Error("Dateninkonsistenz: Kundennummer ist mehrfach vorhanden. Prozess wurde abgebrochen.");
    }
    if (resolution.resolution === "single") {
      if (!resolution.customer) {
        throw new Error("Dateninkonsistenz: Vorhandener Kunde konnte nicht geladen werden.");
      }
      return resolution.customer;
    }
    return createCustomerFromDraft(customerDraft);
  };

  const runDocumentExtraction = async (file: File) => {
    setDocumentExtractionLoading(true);
    setDocumentExtractionFile(file);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/document-extraction/extract?scope=appointment_form", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Dokumentextraktion fehlgeschlagen");
      }
      addDraftAppointmentAttachment(file);
      const extraction = payload as {
        customer: ExtractionCustomerDraft;
        orderNumber: string | null;
        amount: string | null;
        saunaModel: string;
        articleItems: ExtractionDialogData["articleItems"];
        categorizedItems: ExtractionDialogData["categorizedItems"];
        articleListHtml: string;
        fieldReport: ExtractionDialogData["fieldReport"];
        warnings: string[];
      };
      setDocumentExtractionData({
        customer: {
          customerNumber: extraction.customer.customerNumber ?? "",
          firstName: extraction.customer.firstName ?? "",
          lastName: extraction.customer.lastName ?? "",
          company: extraction.customer.company ?? "",
          email: extraction.customer.email ?? "",
          phone: extraction.customer.phone ?? "",
          addressLine1: extraction.customer.addressLine1 ?? "",
          addressLine2: extraction.customer.addressLine2 ?? "",
          postalCode: extraction.customer.postalCode ?? "",
          city: extraction.customer.city ?? "",
          country: extraction.customer.country ?? "",
        },
        orderNumber: extraction.orderNumber ?? null,
        amount: extraction.amount ?? null,
        saunaModel: extraction.saunaModel ?? "",
        articleItems: extraction.articleItems ?? [],
        categorizedItems: extraction.categorizedItems ?? [],
        articleListHtml: extraction.articleListHtml ?? "",
        fieldReport: extraction.fieldReport,
        warnings: extraction.warnings ?? [],
      });
      setDocumentExtractionOpen(true);
      toast({ title: "Dokument erfolgreich extrahiert" });
    } catch (error) {
      toast({
        title: "Extraktion fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setDocumentExtractionLoading(false);
    }
  };

  const applyExtractedProject = async (payload: {
    saunaModel: string;
    orderNumber: string;
    amount: string;
    articleListHtml: string;
    customer: ExtractionCustomerDraft;
  }) => {
    try {
      if (selectedProjectId) {
        throw new Error("Projektübernahme ist nur möglich, wenn kein Projekt ausgewählt ist.");
      }

      const resolvedCustomer = await resolveOrCreateCustomerForExtraction(payload.customer);
      if (!resolvedCustomer) {
        return;
      }
      const mergedCustomer = await tryPatchExistingCustomerFromExtraction(resolvedCustomer, payload.customer);
      const normalizedOrderNumber = payload.orderNumber.trim();
      if (normalizedOrderNumber.length > 0) {
        const projectResolution = await resolveProjectByOrderNumber(normalizedOrderNumber);
        if (projectResolution.resolution === "multiple") {
          throw new Error("Dateninkonsistenz: Auftragsnummer ist mehrfach vorhanden. Prozess wurde abgebrochen.");
        }
        if (projectResolution.resolution === "single") {
          if (!projectResolution.project) {
            throw new Error("Dateninkonsistenz: Vorhandenes Projekt konnte nicht geladen werden.");
          }
          setProjectDuplicateResolution({
            project: projectResolution.project,
            latestAppointment: projectResolution.latestAppointment,
          });
          return;
        }
      }
      setPendingProjectDraft({
        mode: "create",
        name: payload.saunaModel.trim(),
        orderNumber: normalizedOrderNumber,
        amount: payload.amount.trim(),
        customerId: mergedCustomer.id,
        extractedArticleListHtml: payload.articleListHtml.trim(),
        productSelections: createEmptyProjectProductSelections(),
        documentFile: documentExtractionFile,
      });
      setDocumentExtractionOpen(false);
      toast({ title: "Projektformular geöffnet", description: "Extrahierte Daten wurden vorbefüllt." });
    } catch (error) {
      toast({
        title: "Projekt konnte nicht übernommen werden",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    }
  };

  const extractApiCode = (error: unknown): string | null => {
    if (!(error instanceof Error)) return null;
    const match = error.message.match(/"code"\s*:\s*"([A-Z_]+)"/);
    return match?.[1] ?? null;
  };

  const getAppointmentNoteVersion = (noteId: number): number => {
    const note = appointmentNotes.find((entry) => entry.id === noteId);
    if (!note || !Number.isInteger(note.version) || note.version < 1) {
      throw new Error("422: {\"code\":\"VALIDATION_ERROR\"}");
    }
    return note.version;
  };

  const invalidateAppointmentNotesQueries = async (targetAppointmentId: number) => {
    await queryClient.invalidateQueries({ queryKey: ["/api/appointments", targetAppointmentId, "notes"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/notes-preview"] });
  };

  const createAppointmentNoteMutation = useMutation({
    mutationFn: async ({ title, body, cardColor, print, templateId }: { title: string; body: string; cardColor?: string | null; print: boolean; templateId?: number }) => {
      const res = await apiRequest("POST", `/api/appointments/${appointmentId}/notes`, { title, body, cardColor, print, templateId });
      return res.json();
    },
    onSuccess: (createdNote: Note) => {
      if (!appointmentId) return;
      void invalidateAppointmentNotesQueries(appointmentId);
      void invalidateRelatedAppointmentQueries(selectedProjectId);
      setTemplateNoteEditorId(createdNote.id);
      setTemplateNoteEditorVersion(createdNote.version);
      setTemplateNoteTitle(createdNote.title);
      setTemplateNoteBody(createdNote.body ?? "");
      setTemplateNoteCardColor(createdNote.cardColor ?? "#f8fafc");
      setTemplateNotePrint(createdNote.print);
      setTemplateNoteCardColorLocked(createdNote.cardColorLocked);
      setTemplateNoteEditorOpen(true);
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const updateAppointmentNoteMutation = useMutation({
    mutationFn: async ({ noteId, title, body, cardColor, print, version }: { noteId: number; title: string; body: string; cardColor?: string | null; print: boolean; version: number }) => {
      const res = await apiRequest("PUT", `/api/notes/${noteId}`, { title, body, cardColor, print, version });
      return res.json();
    },
    onSuccess: (updatedNote: Note) => {
      if (!appointmentId) return;
      void invalidateAppointmentNotesQueries(appointmentId);
      void invalidateRelatedAppointmentQueries(selectedProjectId);
      setTemplateNoteEditorVersion(updatedNote.version);
      setTemplateNoteEditorOpen(false);
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Notiz konnte nicht aktualisiert werden",
          description: "Datensatz wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const toggleAppointmentNotePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned, version }: { noteId: number; isPinned: boolean; version: number }) => {
      const res = await apiRequest("PATCH", `/api/notes/${noteId}/pin`, { isPinned, version });
      return res.json();
    },
    onSuccess: () => {
      if (!appointmentId) return;
      void invalidateAppointmentNotesQueries(appointmentId);
      void invalidateRelatedAppointmentQueries(selectedProjectId);
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Notiz konnte nicht aktualisiert werden",
          description: "Datensatz wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const deleteAppointmentNoteMutation = useMutation({
    mutationFn: async ({ noteId, version }: { noteId: number; version: number }) => {
      await apiRequest("DELETE", `/api/appointments/${appointmentId}/notes/${noteId}`, { version });
    },
    onSuccess: () => {
      if (!appointmentId) return;
      void invalidateAppointmentNotesQueries(appointmentId);
      void invalidateRelatedAppointmentQueries(selectedProjectId);
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Notiz konnte nicht geloescht werden",
          description: "Datensatz wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const validateForm = () => {
    const allowHistoricalInput = isParked;
    if (!selectedProjectId && !selectedCustomerId) {
      console.info(`${logPrefix} validation blocked: relation missing`);
      toast({ title: "Kunde oder Projekt ist erforderlich", variant: "destructive" });
      return false;
    }
    if (isEndDateEnabled && endDate < startDate) {
      console.info(`${logPrefix} validation blocked: endDate before startDate`);
      toast({ title: "Enddatum darf nicht vor dem Startdatum liegen", variant: "destructive" });
      return false;
    }
    const berlinToday = getBerlinTodayDateString();
    const isPastDateInput = startDate < berlinToday;
    if (isPastDateInput && !allowHistoricalInput) {
      console.info(`${logPrefix} validation blocked: startDate in past`);
      toast({ title: "Datum in der Vergangenheit", variant: "destructive" });
      return false;
    }
    const currentBerlinTime = getBerlinCurrentTimeString();
    const normalizedStartTime = normalizeTimeInput(startTimeValue);
    const isPastTimeInput =
      startTimeEnabled &&
      normalizedStartTime.length === 5 &&
      startDate === berlinToday &&
      normalizedStartTime < currentBerlinTime;
    if (isPastTimeInput && !allowHistoricalInput) {
      console.info(`${logPrefix} validation blocked: startTime in past`);
      toast({ title: "Startzeit liegt in der Vergangenheit", variant: "destructive" });
      return false;
    }
    return true;
  };

  const submitAppointment = async () => {
    if (isMutationLocked) {
      if (isCancelled) {
        toast({ title: "Termin ist storniert", description: "Stornierte Termine können nicht mehr bearbeitet werden.", variant: "destructive" });
        console.info(`${logPrefix} save blocked: cancelled appointment`);
        return;
      }
      toast({ title: "Termin ist gesperrt", description: "Historische Termine können nicht geändert werden.", variant: "destructive" });
      console.info(`${logPrefix} save blocked: locked appointment`);
      return;
    }
    if (!validateForm()) return;
    const allowHistoricalInput = isParked;
    const berlinToday = getBerlinTodayDateString();
    const isPastDateInput = startDate < berlinToday;
    const currentBerlinTime = getBerlinCurrentTimeString();
    const normalizedStartTime = normalizeTimeInput(startTimeValue);
    const isPastTimeInput =
      startTimeEnabled &&
      normalizedStartTime.length === 5 &&
      startDate === berlinToday &&
      normalizedStartTime < currentBerlinTime;
    // Kein Save bei historischen Eingaben.
    if ((isPastDateInput || isPastTimeInput) && !allowHistoricalInput) return;

    if (assignedEmployeeIds.length === 0) {
      console.info(`${logPrefix} save requires confirmation: no employees`);
      setEmployeeConfirmOpen(true);
      return;
    }

    if (isEditing && appointmentId && appointmentDetail) {
      const originalTourId = appointmentDetail.tourId ?? null;
      const originalWeekKey = buildIsoWeekKey(normalizeDateInputValue(appointmentDetail.startDate));
      const currentWeekKey = buildIsoWeekKey(startDate);
      const requiresTourPreview = originalTourId !== selectedTourId || originalWeekKey !== currentWeekKey;
      const currentResolutionKey = buildAppointmentWeekResolutionKey(selectedTourId, startDate);

      if (requiresTourPreview && currentResolutionKey !== resolvedAppointmentWeekPlanKey) {
        try {
          const preview = await loadAppointmentTourChangePreview();
          if (preview?.hasWeekPlan) {
            openAppointmentWeekPreviewDialog(preview, {
              title: "Wochenplanung vor dem Speichern prüfen",
              description: "Tour oder Kalenderwoche wurden geändert. Prüfen Sie, welche Mitarbeiter aus der Zielplanung für diesen Termin übernommen werden sollen.",
              persistAfterConfirm: true,
              resolutionKey: currentResolutionKey ?? `${selectedTourId ?? "none"}-${preview.isoYear}-${preview.isoWeek}`,
            });
            return;
          }
          setResolvedAppointmentWeekPlanKey(currentResolutionKey);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Vorschau konnte nicht geladen werden.";
          toast({
            title: "Wochenplanung konnte nicht geladen werden",
            description: message,
            variant: "destructive",
          });
          return;
        }
      }
    }

    await persistAppointment();
  };

  const deleteAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId: targetAppointmentId }: { appointmentId: number; projectId: number | null }) => {
      const fetchFreshVersion = async (): Promise<number> => {
        const detail = await queryClient.fetchQuery({
          queryKey: ["/api/appointments", targetAppointmentId],
          queryFn: () => fetchJson<AppointmentDetail>(`/api/appointments/${targetAppointmentId}`),
          staleTime: 0,
        });
        const version = detail?.version;
        if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
          console.warn(`${logPrefix} delete blocked: missing or invalid fresh version`, {
            appointmentId: targetAppointmentId,
            version,
          });
          throw buildApiError("Termin kann derzeit nicht geloescht werden. Bitte neu laden.", 422, "VALIDATION_ERROR");
        }
        return version;
      };

      const requestDelete = async (version: number) => {
        console.info(`${logPrefix} delete request`, { appointmentId: targetAppointmentId, version });
        const response = await fetch(`/api/appointments/${targetAppointmentId}`, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ version }),
        });
        console.info(`${logPrefix} delete response`, { appointmentId: targetAppointmentId, status: response.status, version });
        if (response.ok) return;

        const rawBody = await response.text();
        const parsed = parseErrorPayload(rawBody);
        if (parsed?.code === "PAST_APPOINTMENT_READONLY") {
          throw buildApiError("Termin ist gesperrt.", response.status, "PAST_APPOINTMENT_READONLY");
        }
        if (parsed?.code === "CANCELLED_APPOINTMENT_READONLY") {
          throw buildApiError("Stornierte Termine koennen nicht geloescht werden.", response.status, "CANCELLED_APPOINTMENT_READONLY");
        }
        if (parsed?.code === "VERSION_CONFLICT") {
          throw buildApiError("Termin wurde parallel geaendert.", response.status, "VERSION_CONFLICT");
        }
        if (parsed?.code === "VALIDATION_ERROR") {
          throw buildApiError("Ungueltige Loeschdaten (Version). Bitte neu laden.", response.status, "VALIDATION_ERROR");
        }
        throw buildApiError(parsed?.message ?? (response.statusText || "Loeschen fehlgeschlagen"), response.status, parsed?.code);
      };

      try {
        const freshVersion = await fetchFreshVersion();
        await requestDelete(freshVersion);
      } catch (error) {
        const err = error as AppointmentApiError;
        if (err.code !== "VERSION_CONFLICT") throw error;

        console.info(`${logPrefix} delete retry after VERSION_CONFLICT`, { appointmentId: targetAppointmentId });
        const freshVersion = await fetchFreshVersion();
        try {
          await requestDelete(freshVersion);
        } catch (retryError) {
          const retryErr = retryError as AppointmentApiError;
          if (retryErr.code === "VERSION_CONFLICT") {
            throw buildApiError(
              "Termin wurde parallel geaendert. Bitte Formular neu oeffnen.",
              retryErr.status,
              "VERSION_CONFLICT",
            );
          }
          throw retryError;
        }
      }

      return targetAppointmentId;
    },
    onSuccess: async (_deletedAppointmentId, variables) => {
      const projectIdForInvalidation = variables.projectId;
      await invalidateRelatedAppointmentQueries(projectIdForInvalidation);
      await refreshMonitoringWithNotification(toast);
      if (appointmentId) {
        await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId] });
      }
      toast({ title: "Termin gelöscht" });
      onSaved?.();
    },
    onError: (error) => {
      const err = error as AppointmentApiError;
      if (err.code === "PAST_APPOINTMENT_READONLY" || err.status === 403) {
        toast({
          title: "Löschen nicht möglich",
          description: "Termin ist gesperrt.",
          variant: "destructive",
        });
        return;
      }
      if (err.code === "CANCELLED_APPOINTMENT_READONLY") {
        toast({
          title: "Löschen nicht möglich",
          description: "Stornierte Termine koennen nicht geloescht werden.",
          variant: "destructive",
        });
        return;
      }
      if (err.code === "VERSION_CONFLICT") {
        toast({
          title: "Löschen nicht möglich",
          description: err.message || "Termin wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      if (err.code === "VALIDATION_ERROR") {
        toast({
          title: "Löschen nicht möglich",
          description: "Ungueltige Loeschdaten. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      const message = error instanceof Error ? error.message : "Löschen fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    },
  });

  const persistDraftAppointmentTags = async (targetAppointmentId: number) => {
    for (const item of draftAppointmentTags) {
      await apiRequest("POST", `/api/appointments/${targetAppointmentId}/tags`, { tagId: item.tag.id });
    }
  };

  const persistDraftAppointmentNotes = async (targetAppointmentId: number) => {
    for (const note of draftAppointmentNotes) {
      await apiRequest("POST", `/api/appointments/${targetAppointmentId}/notes`, {
        title: note.title,
        body: note.body,
        cardColor: note.cardColor,
        print: note.print,
        templateId: note.templateId,
      });
    }
  };

  const persistDraftAppointmentAttachments = async (targetAppointmentId: number) => {
    for (const attachment of draftAppointmentAttachments) {
      const formData = new FormData();
      formData.append("file", attachment.file);
      const response = await fetch(`/api/appointments/${targetAppointmentId}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Terminanhang konnte nicht hochgeladen werden");
      }
    }
  };

  const handleCreateTemplateNoteFromSuggestion = () => {
    if (!noteSuggestionDialog) return;
    const template = noteTemplates.find(
      (entry) => entry.title.trim().toLocaleLowerCase("de") === noteSuggestionDialog.templateTitle.trim().toLocaleLowerCase("de"),
    );
    if (!template) {
      toast({
        title: "Notizvorlage fehlt",
        description: `Die Notizvorlage „${noteSuggestionDialog.templateTitle}“ wurde nicht gefunden.`,
        variant: "destructive",
      });
      return;
    }
    createAppointmentNoteMutation.mutate({
      title: template.title,
      body: template.body,
      cardColor: template.cardColor,
      print: template.print,
      templateId: template.id,
    });
    setNoteSuggestionDialog(null);
  };

  const persistCreateSidebarDrafts = async (targetAppointmentId: number) => {
    await persistDraftAppointmentTags(targetAppointmentId);
    await persistDraftAppointmentNotes(targetAppointmentId);
    await persistDraftAppointmentAttachments(targetAppointmentId);
  };

  const persistAppointment = async (employeeIdsOverride?: number[]) => {
    const resolvedPayloadCustomerId = selectedProject?.customerId ?? selectedCustomerId;
    if (!resolvedPayloadCustomerId) {
      toast({
        title: "Speichern nicht moeglich",
        description: "Bitte Kunde oder Projekt zuordnen.",
        variant: "destructive",
      });
      return;
    }
    const basePayload = {
      projectId: selectedProjectId,
      customerId: resolvedPayloadCustomerId,
      tourId: selectedTourId,
      startDate,
      endDate: isEndDateEnabled ? endDate : null,
      startTime: startTimeEnabled ? buildTimeString(startTimeValue) : null,
      employeeIds: employeeIdsOverride ?? assignedEmployeeIds,
    };

    const method = isEditing ? "PATCH" : "POST";
    const url = isEditing ? `/api/appointments/${appointmentId}` : "/api/appointments";
    const version = appointmentDetail?.version;
    if (isEditing && (typeof version !== "number" || !Number.isInteger(version) || version < 1)) {
      console.warn(`${logPrefix} submit blocked: missing or invalid version`, {
        appointmentId,
        version,
      });
      toast({
        title: "Speichern nicht moeglich",
        description: "Termin kann derzeit nicht gespeichert werden. Bitte neu laden.",
        variant: "destructive",
      });
      return;
    }
    const payload = isEditing
      ? { ...basePayload, version }
      : basePayload;

    console.info(`${logPrefix} submit`, {
      method,
      url,
      projectId: payload.projectId,
      tourId: payload.tourId,
      version: isEditing ? (payload as { version?: number }).version : undefined,
      employeeCount: payload.employeeIds.length,
      startDate: payload.startDate,
      endDate: payload.endDate,
    });

    try {
      setIsSaving(true);
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const rawBody = await response.text();
      const parsedBody = parseJsonBody(rawBody);
      const parsed = parseErrorPayload(rawBody);
      const data =
        parsedBody && typeof parsedBody === "object"
          ? (parsedBody as ApiSuccessPayload)
          : (rawBody.trim().length > 0 ? { message: rawBody } : null);
      console.info(`${logPrefix} submit response`, { status: response.status });
      if (!response.ok) {
        if (parsed?.code === "EMPLOYEE_OVERLAP_CONFLICT") {
          const conflictNames = formatConflictEmployees(parsed.conflictEmployees);
          const conflictDetail = conflictNames
            ? `Konflikt mit: ${conflictNames}.`
            : "Mindestens ein Mitarbeiter ist in diesem Zeitraum bereits geplant.";
          console.info(`${logPrefix} submit blocked: EMPLOYEE_OVERLAP_CONFLICT`, {
            status: response.status,
            conflictEmployees: parsed.conflictEmployees?.length ?? 0,
          });
          toast({
            title: "Speichern nicht moeglich",
            description: `${parsed.message ?? "Termin überschneidet sich mit bestehenden Mitarbeiter-Terminen."} ${conflictDetail}`,
            variant: "destructive",
          });
          return;
        }
        if (parsed?.code === "INACTIVE_ENTITY_ASSIGNMENT") {
          toast({
            title: "Speichern nicht moeglich",
            description: "Mindestens ein zugewiesener Mitarbeiter ist inaktiv.",
            variant: "destructive",
          });
          return;
        }
        if (parsed?.code === "PAST_APPOINTMENT_READONLY") {
          toast({
            title: "Speichern nicht moeglich",
            description: "Historische Termine koennen nicht geaendert werden.",
            variant: "destructive",
          });
          return;
        }
        if (parsed?.code === "CANCELLED_APPOINTMENT_READONLY") {
          toast({
            title: "Speichern nicht moeglich",
            description: "Stornierte Termine koennen nicht mehr bearbeitet werden.",
            variant: "destructive",
          });
          return;
        }
        if (parsed?.code === "VERSION_CONFLICT") {
          console.info(`${logPrefix} submit blocked: VERSION_CONFLICT`, { status: response.status });
          toast({
            title: "Speichern nicht moeglich",
            description: "Termin wurde zwischenzeitlich geaendert. Bitte neu laden und erneut speichern.",
            variant: "destructive",
          });
          return;
        }
        throw new Error((data as { message?: string } | null)?.message ?? "Speichern fehlgeschlagen");
      }
      setAssignedEmployeeIds(
        Array.isArray(data?.employees)
          ? data.employees.map((employee) => employee.id)
          : (employeeIdsOverride ?? assignedEmployeeIds),
      );
      const savedAppointmentId = data?.id ?? appointmentId ?? null;
      const normalizedSavedStartDate = normalizeDateInputValue(payload.startDate);
      const originalWeekKey = appointmentDetail ? buildIsoWeekKey(normalizeDateInputValue(appointmentDetail.startDate)) : null;
      const savedWeekKey = buildIsoWeekKey(normalizedSavedStartDate);
      const originalTourId = appointmentDetail?.tourId ?? null;
      const shouldOfferFollow = Boolean(
        isEditing
        && typeof savedAppointmentId === "number"
        && (
          originalTourId !== (payload.tourId ?? null)
          || (originalWeekKey !== null && originalWeekKey !== savedWeekKey)
        ),
      );
      console.info(`${logPrefix} save success`, {
        action: isEditing ? "edit" : "create",
        projectId: payload.projectId ?? null,
        appointmentId: savedAppointmentId,
      });
      if (!isEditing) {
        if (typeof savedAppointmentId !== "number" || savedAppointmentId < 1) {
          throw new Error("Termin wurde erstellt, aber die Termin-ID fehlt fuer die Nachverarbeitung.");
        }
        try {
          await persistCreateSidebarDrafts(savedAppointmentId);
          setDraftAppointmentTags([]);
          setDraftAppointmentNotes([]);
          setDraftAppointmentAttachments([]);
        } catch (error) {
          await invalidateRelatedAppointmentQueries(payload.projectId);
          await refreshMonitoringWithNotification(toast);
          await queryClient.invalidateQueries({ queryKey: ["/api/appointments", savedAppointmentId] });
          toast({
            title: "Termin erstellt, aber Zusatzdaten sind unvollstaendig",
            description: error instanceof Error
              ? error.message
              : "Tags, Notizen oder Terminanhaenge konnten nicht vollstaendig gespeichert werden.",
            variant: "destructive",
          });
          onSaved?.({
            appointmentId: savedAppointmentId,
            startDate: normalizedSavedStartDate,
            tourId: payload.tourId ?? null,
            shouldOfferFollow,
          });
          return;
        }
      }
      if (payload.projectId) {
        const upcomingAppointmentsQueryKey = getProjectAppointmentsQueryKey({
          projectId: payload.projectId,
          fromDate: projectAppointmentsUpcomingFromDate,
          userRole,
        });
        const allAppointmentsQueryKey = getProjectAppointmentsQueryKey({
          projectId: payload.projectId,
          fromDate: PROJECT_APPOINTMENTS_ALL_FROM_DATE,
          userRole,
        });
        console.info(`${logPrefix} cache invalidate`, {
          upcomingQueryKey: upcomingAppointmentsQueryKey,
          allQueryKey: allAppointmentsQueryKey,
        });
      }
      await invalidateRelatedAppointmentQueries(payload.projectId);
      await refreshMonitoringWithNotification(toast);
      if (isEditing && appointmentId) {
        await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId] });
      }
      toast({
        title: isEditing ? "Termin gespeichert" : "Termin erstellt",
      });
      setInitialFormSnapshot(buildFormSnapshot({
        projectId: selectedProjectId,
        customerId: selectedCustomerId,
        tourId: selectedTourId,
        startDate,
        endDate,
        isEndDateEnabled,
        startTimeValue,
        startTimeEnabled,
        employeeIds: assignedEmployeeIds,
        sidebarDraftSignature: isEditing ? null : createSidebarDraftSignature,
      }));
      onSaved?.({
        appointmentId: savedAppointmentId,
        startDate: normalizedSavedStartDate,
        tourId: payload.tourId ?? null,
        shouldOfferFollow,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Speichern fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAppointmentWeekPreview = async () => {
    if (!appointmentWeekPreviewDialog) return;
    const nextEmployeeIds = buildEmployeeIdsFromPreviewSelection(
      appointmentWeekPreviewDialog.preview,
      appointmentWeekPreviewDialog.selectedIds,
      appointmentWeekPreviewDialog.resolutionMode,
    );
    setAssignedEmployeeIds(nextEmployeeIds);
    const persistAfterConfirm = appointmentWeekPreviewDialog.persistAfterConfirm;
    setResolvedAppointmentWeekPlanKey(appointmentWeekPreviewDialog.resolutionKey);
    setAppointmentWeekPreviewDialog(null);
    if (persistAfterConfirm) {
      await persistAppointment(nextEmployeeIds);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1">
      <EntityFormShell
        header={(
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              {showBackButton && !isReadOnlyView ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRequestClose}
                  data-testid="button-back-appointment"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Schließen
                </Button>
              ) : null}
              <h2 className="text-2xl font-bold text-primary flex min-w-0 items-center gap-3">
                <Calendar className="w-6 h-6" />
                {isEditing ? "Termin bearbeiten" : "Neuer Termin"}
              </h2>
            </div>

            {!isReadOnlyView ? (
              <Button
                type="button"
                size="lg"
                variant="ghost"
                onClick={handleRequestClose}
                data-testid="button-close-appointment"
              >
                <X className="w-6 h-6" />
              </Button>
            ) : null}
          </div>
        )}
        sidebar={(
          <div className="min-w-0 space-y-6 p-6" data-testid="appointment-form-sidebar">
            {isEditing && appointmentId && !isReadOnlyView ? (
              <div className="sub-panel space-y-3" data-testid="appointment-form-functions-panel">
                <h3 className="text-sm font-bold tracking-wider text-primary">Funktionen</h3>
                <div className="flex flex-col gap-2">
                  {!isCancelled ? (
                    <Button
                      type="button"
                      className="w-full justify-start gap-2 border bg-[var(--action-bg)] text-[var(--action-fg)] [border-color:var(--action-border)] transition-[background-color,border-color,box-shadow,color] hover:bg-[var(--action-bg-hover)] hover:[border-color:var(--action-border-hover)] hover:shadow-sm"
                      style={{
                        "--action-bg": RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR + "22",
                        "--action-bg-hover": RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR + "33",
                        "--action-border": RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR + "66",
                        "--action-border-hover": RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR + "99",
                        "--action-fg": RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
                      } as React.CSSProperties}
                      onClick={() => setCancelConfirmOpen(true)}
                      disabled={isMutationLocked || cancelAppointmentMutation.isPending}
                      data-testid="button-cancel-appointment"
                    >
                      <Ban className="w-4 h-4" />
                      {cancelAppointmentMutation.isPending ? "Stornieren..." : "Stornieren"}
                    </Button>
                  ) : null}
                  {!isCancelled && !isParked ? (
                    <Button
                      type="button"
                      className="w-full justify-start gap-2 border bg-[var(--action-bg)] text-[var(--action-fg)] [border-color:var(--action-border)] transition-[background-color,border-color,box-shadow,color] hover:bg-[var(--action-bg-hover)] hover:[border-color:var(--action-border-hover)] hover:shadow-sm"
                      style={{
                        "--action-bg": RESERVED_VACANT_TAG_COLOR + "22",
                        "--action-bg-hover": RESERVED_VACANT_TAG_COLOR + "33",
                        "--action-border": RESERVED_VACANT_TAG_COLOR + "66",
                        "--action-border-hover": RESERVED_VACANT_TAG_COLOR + "99",
                        "--action-fg": RESERVED_VACANT_TAG_COLOR,
                      } as React.CSSProperties}
                      onClick={() => setParkConfirmOpen(true)}
                      disabled={isMutationLocked || parkAppointmentMutation.isPending}
                      data-testid="button-park-appointment"
                    >
                      <ParkingCircle className="w-4 h-4" />
                      {parkAppointmentMutation.isPending ? "Parken..." : "Parken"}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    className="w-full justify-start gap-2 border bg-[var(--action-bg)] text-[var(--action-fg)] [border-color:var(--action-border)] transition-[background-color,border-color,box-shadow,color] hover:bg-[var(--action-bg-hover)] hover:[border-color:var(--action-border-hover)] hover:shadow-sm"
                    style={{
                      "--action-bg": "hsl(var(--destructive) / 0.14)",
                      "--action-bg-hover": "hsl(var(--destructive) / 0.22)",
                      "--action-border": "hsl(var(--destructive) / 0.35)",
                      "--action-border-hover": "hsl(var(--destructive) / 0.5)",
                      "--action-fg": "hsl(var(--destructive))",
                    } as React.CSSProperties}
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={isMutationLocked || deleteAppointmentMutation.isPending}
                    data-testid="button-delete-appointment"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleteAppointmentMutation.isPending ? "Löschen..." : "Löschen"}
                  </Button>
                </div>
              </div>
            ) : null}

            <AppointmentAttachmentsPanel
              appointmentId={appointmentId}
              customerId={resolvedCustomerId}
              projectId={selectedProjectId}
              pendingAppointmentAttachments={isEditing ? undefined : draftAppointmentAttachments}
              onUploadPendingAppointmentAttachment={isEditing ? undefined : addDraftAppointmentAttachment}
              readOnly={isReadOnlyView}
              canDelete={canDeleteAttachments}
            />

            <TagPickerPanel
              assignedTags={visibleAppointmentTags}
              availableTags={availableTags}
              isLoading={isEditing ? appointmentTagsLoading : false}
              loadErrorMessage={isEditing && appointmentTagsError instanceof Error ? appointmentTagsError.message : null}
              canEdit={canManageAppointmentTags && !isMutationLocked}
              title="Tags"
              testIdPrefix="appointment-tag-picker"
              onAdd={(tagId) => {
                if (isEditing) {
                  const tagName = availableTags.find((t) => t.id === tagId)?.name ?? "";
                  addAppointmentTagMutation.mutate({ tagId, tagName });
                  return;
                }
                addDraftAppointmentTag(tagId);
              }}
              onRemove={(item) => {
                if (isEditing) {
                  removeAppointmentTagMutation.mutate(item);
                  return;
                }
                removeDraftAppointmentTag(item);
              }}
            />

            <NotesSection
              notes={visibleAppointmentNotes}
              isLoading={isEditing ? appointmentNotesLoading : false}
              readOnly={isReadOnlyView}
              onAdd={(data) => {
                if (isEditing) {
                  createAppointmentNoteMutation.mutate(data);
                  return;
                }
                addDraftAppointmentNote(data);
              }}
              onUpdate={(noteId, data) => {
                if (isEditing) {
                  const version = getAppointmentNoteVersion(noteId);
                  updateAppointmentNoteMutation.mutate({ noteId, ...data, version });
                  return;
                }
                updateDraftAppointmentNote(noteId, data);
              }}
              onTogglePin={(id, isPinned) => {
                if (isEditing) {
                  const version = getAppointmentNoteVersion(id);
                  toggleAppointmentNotePinMutation.mutate({ noteId: id, isPinned, version });
                  return;
                }
                toggleDraftAppointmentNotePin(id, isPinned);
              }}
              onDelete={(noteId) => {
                if (isEditing) {
                  const version = getAppointmentNoteVersion(noteId);
                  deleteAppointmentNoteMutation.mutate({ noteId, version });
                  return;
                }
                deleteDraftAppointmentNote(noteId);
              }}
            />
          </div>
        )}
        footer={(
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={isReadOnlyView ? readOnlyCloseAction : handleRequestClose}
                data-testid="button-secondary-cancel-appointment"
              >
                Schließen
              </Button>
            </div>

            {!isReadOnlyView ? (
              <Button
                type="button"
                onClick={() => {
                  void submitAppointment();
                }}
                disabled={isSaving}
                data-testid="button-save-appointment"
              >
                {isSaving ? `${isEditing ? "Speichern" : "Termin erstellen"}...` : (isEditing ? "Speichern" : "Termin erstellen")}
              </Button>
            ) : null}
          </div>
        )}
      >
        <div className="w-full space-y-6" data-testid="appointment-form-main-column">
          {isCancelled && (
            <Alert variant="destructive">
              <AlertTitle>Termin storniert</AlertTitle>
              <AlertDescription>
                Dieser Termin wurde als Storno markiert und kann nicht mehr bearbeitet, verschoben oder gelöscht werden.
              </AlertDescription>
            </Alert>
          )}
          {isHistoricalReadOnly && (
            <Alert variant="destructive">
              <AlertTitle>Termin gesperrt</AlertTitle>
              <AlertDescription>
                Historische Termine können nicht verändert werden.
              </AlertDescription>
            </Alert>
          )}

          <div className="sub-panel space-y-3">
            <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Zeitpunkt und Dauer
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Startdatum</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(event) => handleStartDateChange(event.target.value)}
                  disabled={isMutationLocked}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Enddatum</Label>
                {isEndDateEnabled ? (
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    disabled={isMutationLocked}
                    data-testid="input-end-date"
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setIsEndDateEnabled(true)}
                    disabled={isMutationLocked}
                    data-testid="button-enable-end-date"
                  >
                    Enddatum hinzufügen
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Startzeit (optional)</Label>
                {startTimeEnabled ? (
                  <Input
                    id="startTime"
                    type="time"
                    step={60}
                    value={startTimeValue}
                    onChange={(event) => setStartTimeValue(normalizeTimeInput(event.target.value))}
                    placeholder="HH:mm"
                    disabled={isMutationLocked}
                    data-testid="input-start-time"
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setStartTimeEnabled(true)}
                    disabled={isMutationLocked}
                    data-testid="button-enable-start-time"
                  >
                    Startzeit hinzufügen
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Endzeit</Label>
                <Input
                  id="endTime"
                  type="time"
                  disabled
                  value=""
                  placeholder="--:--"
                  data-testid="input-end-time"
                />
              </div>
            </div>
          </div>

          <RelationSlot
            title="Projekt"
            icon={<FolderKanban className="w-4 h-4" />}
            state={isProjectReadOnly ? "readonly" : selectedProject ? "active" : "empty"}
            onAdd={isProjectReadOnly ? undefined : () => setProjectPickerOpen(true)}
            addLabel="Projekt auswählen"
            emptyText="Kein Projekt ausgewählt"
            testId="slot-project-relation"
            addActionTestId="button-select-project"
            className="min-h-[18rem]"
          >
            {selectedProject ? (
              <ProjectDetailCard
                project={selectedProject}
                testId="badge-project"
              />
            ) : null}
          </RelationSlot>

          <RelationSlot
            title="Kunde"
            icon={<Users className="w-4 h-4" />}
            state={isCustomerReadOnly ? "readonly" : selectedCustomer ? "active" : "empty"}
            onAdd={isCustomerReadOnly ? undefined : () => setCustomerPickerOpen(true)}
            onRemove={isCustomerReadOnly ? undefined : () => setSelectedCustomerId(null)}
            addLabel="Kunde auswählen"
            emptyText="Kein Kunde ausgewählt"
            testId="slot-customer-relation"
          >
            {selectedCustomer ? (
              <CustomerDetailCard customer={selectedCustomer} testId="badge-customer" variant="relationCompact" />
            ) : null}
          </RelationSlot>

          {selectedTour ? (
            <TourInfoBadge
              id={selectedTour.id}
              name={selectedTour.name}
              color={selectedTour.color}
              members={tourMembersById.get(selectedTour.id) ?? []}
              action={isReadOnlyView ? "none" : "remove"}
              onRemove={() => handleTourChange(null)}
              fullWidth
              testId="badge-tour"
            />
          ) : null}

          <AppointmentEmployeeSlot
            teams={teams}
            assignedEmployees={assignedEmployees}
            teamMembersById={teamMembersById}
            isLocked={isMutationLocked}
            readOnly={isReadOnlyView}
            onAssignTeam={handleAssignTeam}
            onAddEmployee={() => setEmployeePickerOpen(true)}
            onRemoveEmployee={removeEmployee}
            tours={tours}
            tourMembersById={tourMembersById}
            selectedTour={selectedTour}
            onTourChange={handleTourChange}
          />

          {selectedProjectId === null ? (
            <DocumentExtractionDropzone
              onFileSelected={(file) => {
                void runDocumentExtraction(file);
              }}
              disabled={isMutationLocked}
              isProcessing={documentExtractionLoading}
            />
          ) : null}
        </div>
      </EntityFormShell>

      {appointmentWeekPreviewDialog ? (
        <TourEmployeeCascadeDialog
          variant="appointment"
          open={appointmentWeekPreviewDialog.open}
          title={appointmentWeekPreviewDialog.title}
          description={appointmentWeekPreviewDialog.description}
          previewItems={appointmentWeekPreviewDialog.preview.items}
          selectedIds={appointmentWeekPreviewDialog.selectedIds}
          resolutionMode={appointmentWeekPreviewDialog.resolutionMode}
          showResolutionMode
          isSubmitting={isSaving}
          onSelectedIdsChange={(selectedIds) => {
            setAppointmentWeekPreviewDialog((current) => current ? { ...current, selectedIds } : current);
          }}
          onResolutionModeChange={(resolutionMode) => {
            setAppointmentWeekPreviewDialog((current) => current ? { ...current, resolutionMode } : current);
          }}
          onConfirm={() => {
            void handleConfirmAppointmentWeekPreview();
          }}
          onClose={() => setAppointmentWeekPreviewDialog(null)}
        />
      ) : null}

      <DocumentExtractionDialog
        open={documentExtractionOpen}
        onOpenChange={(open) => {
          setDocumentExtractionOpen(open);
          if (!open) {
            setProjectDuplicateResolution(null);
          }
        }}
        data={documentExtractionData}
        isBusy={documentExtractionLoading}
        disableProjectApply={Boolean(selectedProjectId)}
        dataApplyLabel="Daten übernehmen"
        onApplyData={applyExtractedProject}
      />

      <ProjectDuplicateResolutionDialog
        open={projectDuplicateResolution !== null}
        resolution={projectDuplicateResolution}
        onOpenChange={(open) => {
          if (!open) {
            setProjectDuplicateResolution(null);
          }
        }}
        onConfirm={confirmExistingProjectDuplicate}
      />

      {pendingProjectDraft ? (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto bg-background"
          data-testid="appointment-project-overlay"
        >
          <div className="min-h-full">
            <ProjectForm
              projectId={pendingProjectDraft.mode === "existing" ? pendingProjectDraft.projectId : undefined}
              initialDraft={pendingProjectDraft.mode === "create" ? {
                name: pendingProjectDraft.name,
                orderNumber: pendingProjectDraft.orderNumber,
                amount: pendingProjectDraft.amount,
                customerId: pendingProjectDraft.customerId,
                extractedArticleListHtml: pendingProjectDraft.extractedArticleListHtml,
                productSelections: pendingProjectDraft.productSelections,
              } : null}
              initialDocumentExtractionFile={pendingProjectDraft.documentFile}
              onSaved={() => {
                const completedDraft = pendingProjectDraft;
                if (completedDraft.mode === "existing") {
                  setSelectedProjectId(completedDraft.projectId);
                  setSelectedCustomerId(null);
                  if (completedDraft.documentFile) {
                    removeDraftAppointmentAttachmentForFile(completedDraft.documentFile);
                  }
                }
                setPendingProjectDraft(null);
                setDocumentExtractionFile(null);
                toast({
                  title: "Projekt übernommen",
                  description: completedDraft.mode === "existing"
                    ? "Vorhandenes Projekt wurde dem Termin zugeordnet."
                    : "Neues Projekt wurde erzeugt und dem Termin zugeordnet.",
                });
              }}
              onProjectCreated={(createdProjectId, result) => {
                setSelectedProjectId(createdProjectId);
                setSelectedCustomerId(null);
                if (result?.attachmentLinked && pendingProjectDraft.documentFile) {
                  removeDraftAppointmentAttachmentForFile(pendingProjectDraft.documentFile);
                }
                void queryClient.invalidateQueries({ queryKey: projectsQueryKey });
              }}
              onCancel={() => {
                setPendingProjectDraft(null);
              }}
            />
          </div>
        </div>
      ) : null}

      <Dialog open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <ProjectsPage
            showCloseButton={false}
            tableOnly
            title="Projekt auswählen"
            onSelectProject={handleProjectSelect}
            onCancel={() => setProjectPickerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <CustomersPage
            showCloseButton={false}
            tableOnly
            title="Kunde auswählen"
            onSelectCustomer={handleCustomerSelect}
            onCancel={() => setCustomerPickerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <EmployeePickerDialogList
            employees={availableEmployees}
            teams={teams}
            tours={tours}
            isLoading={employeesLoading}
            title="Mitarbeiter auswählen"
            onSelectEmployee={(employeeId) => {
              addEmployees([employeeId]);
              setEmployeePickerOpen(false);
            }}
            onClose={() => setEmployeePickerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={employeeConfirmOpen} onOpenChange={setEmployeeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ohne Mitarbeiter speichern?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Termin wird ohne zugewiesene Mitarbeiter gespeichert. Möchten Sie fortfahren?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setEmployeeConfirmOpen(false);
                void persistAppointment();
              }}
            >
              Trotzdem speichern
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Termin stornieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Termin wird dauerhaft als storniert markiert. Alle Mitarbeiter werden vom Termin abgezogen und sind im Terminzeitraum zur erneuten Planung verfügbar. Der Auftragswert wird im System auf 0,- Euro gesetzt. Stornierte Termine können nicht reaktiviert werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelAppointmentMutation.isPending || !appointmentId || typeof appointmentDetail?.version !== "number" || !Number.isInteger(appointmentDetail.version) || appointmentDetail.version < 1}
              onClick={() => {
                if (!appointmentId) return;
                const version = appointmentDetail?.version;
                if (typeof version !== "number" || !Number.isInteger(version) || version < 1) return;
                cancelAppointmentMutation.mutate({ appointmentId, version });
              }}
            >
              {cancelAppointmentMutation.isPending ? "Termin stornieren..." : "Termin stornieren"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={parkConfirmOpen} onOpenChange={setParkConfirmOpen}>
        <AlertDialogContent data-testid="dialog-park-appointment">
          <AlertDialogHeader>
            <AlertDialogTitle>Termin parken?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Termin wird in die Parkplatz-Tour verschoben, alle Mitarbeiter werden abgezogen und der Geparkt-Tag wird gesetzt. Die Aktion kann durch Neuzuweisung einer Tour rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={parkAppointmentMutation.isPending || !appointmentId || typeof appointmentDetail?.version !== "number" || !Number.isInteger(appointmentDetail.version) || appointmentDetail.version < 1}
              onClick={() => {
                if (!appointmentId) return;
                const version = appointmentDetail?.version;
                if (typeof version !== "number" || !Number.isInteger(version) || version < 1) return;
                parkAppointmentMutation.mutate({ appointmentId, version });
              }}
            >
              {parkAppointmentMutation.isPending ? "Termin parken..." : "Termin parken"}
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
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground border border-destructive-border hover:bg-destructive/90"
              disabled={deleteAppointmentMutation.isPending || !appointmentId}
              onClick={() => {
                if (!appointmentId) return;
                deleteAppointmentMutation.mutate({ appointmentId, projectId: selectedProjectId });
              }}
            >
              {deleteAppointmentMutation.isPending ? "Termin löschen..." : "Termin löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={noteSuggestionDialog !== null} onOpenChange={(open) => { if (!open) setNoteSuggestionDialog(null); }}>
        <AlertDialogContent data-testid="dialog-note-suggestion">
          <AlertDialogHeader>
            <AlertDialogTitle>Notiz anlegen?</AlertDialogTitle>
            <AlertDialogDescription>
              {`Soll eine Notiz „${noteSuggestionDialog?.templateTitle ?? ""}" für diesen Termin angelegt werden?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-note-suggestion-skip">Überspringen</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-note-suggestion-confirm"
              onClick={handleCreateTemplateNoteFromSuggestion}
            >
              Jetzt anlegen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={noteRemovalDialog !== null} onOpenChange={(open) => { if (!open) setNoteRemovalDialog(null); }}>
        <AlertDialogContent data-testid="dialog-note-removal">
          <AlertDialogHeader>
            <AlertDialogTitle>Notiz entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              {`Soll die Notiz „${noteRemovalDialog?.templateTitle ?? ""}" ebenfalls entfernt werden?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-note-removal-keep">Behalten</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-note-removal-confirm"
              onClick={() => {
                if (!noteRemovalDialog) return;
                deleteAppointmentNoteMutation.mutate({ noteId: noteRemovalDialog.noteId, version: noteRemovalDialog.noteVersion });
                setNoteRemovalDialog(null);
              }}
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={templateNoteEditorOpen} onOpenChange={setTemplateNoteEditorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Notiz bearbeiten</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-note-title">Titel *</Label>
              <Input
                id="template-note-title"
                value={templateNoteTitle}
                onChange={(event) => setTemplateNoteTitle(event.target.value)}
                placeholder="Titel der Notiz..."
                data-testid="input-note-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Inhalt</Label>
              <RichTextEditor
                key={`template-note-editor-${templateNoteEditorId ?? "new"}`}
                value={templateNoteBody}
                onChange={setTemplateNoteBody}
                placeholder="Notizinhalt eingeben..."
                className="min-h-[150px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Kartenfarbe</Label>
              <ColorSelectButton
                color={templateNoteCardColor}
                onChange={setTemplateNoteCardColor}
                testId="button-note-card-color-picker"
                disabled={templateNoteCardColorLocked}
              />
              {templateNoteCardColorLocked ? (
                <p className="text-xs text-slate-500" data-testid="text-note-card-color-locked">
                  Die Kartenfarbe stammt aus der Vorlage und kann fuer diese Notiz nicht geaendert werden.
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
              <div>
                <Label htmlFor="template-note-print" className="text-sm font-medium">Drucken</Label>
                <p className="text-xs text-slate-500">Bestimmt, ob die Notiz in Druckausgaben beruecksichtigt wird.</p>
              </div>
              <Switch
                id="template-note-print"
                checked={templateNotePrint}
                onCheckedChange={setTemplateNotePrint}
                data-testid="switch-note-print"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTemplateNoteEditorOpen(false)} data-testid="button-cancel-note">
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (!templateNoteEditorId || !templateNoteTitle.trim()) return;
                updateAppointmentNoteMutation.mutate({
                  noteId: templateNoteEditorId,
                  title: templateNoteTitle,
                  body: templateNoteBody,
                  cardColor: templateNoteCardColor,
                  print: templateNotePrint,
                  version: templateNoteEditorVersion,
                });
              }}
              disabled={!templateNoteTitle.trim()}
              data-testid="button-save-note"
            >
              Aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Änderungen verwerfen?</AlertDialogTitle>
            <AlertDialogDescription>
              Es gibt ungespeicherte Änderungen. Möchten Sie das Formular wirklich schließen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Weiter bearbeiten</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCloseConfirmOpen(false);
                closeAction?.();
              }}
            >
              Verwerfen und schließen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading && (
        <div className="mt-6 text-sm text-muted-foreground">
          Daten werden geladen...
        </div>
      )}
    </div>
  );
}
