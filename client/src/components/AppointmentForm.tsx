import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Ban, Calendar, Clock, FolderKanban, LayoutList, ParkingCircle, ScrollText, Trash2, Users, X } from "lucide-react";
import { flushSync } from "react-dom";
import { addDays, differenceInCalendarDays, format, getISOWeek, getISOWeekYear, parseISO } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import type { AppointmentMutationEvent } from "@shared/appointmentMutationEvents";
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
import { EditFormContextText } from "@/components/ui/edit-form-context-text";
import { ProjectDetailCard } from "@/components/ui/project-detail-card";
import { RelationSlot } from "@/components/ui/relation-slot";
import { TourInfoBadge } from "@/components/ui/tour-info-badge";
import { TagPickerPanel, type InheritedTagGroup, type TagRelationItem } from "@/components/TagPickerPanel";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectsPage } from "@/components/ProjectsPage";
import { CustomersPage } from "@/components/CustomersPage";
import { EmployeePickerDialogList } from "@/components/EmployeePickerDialogList";
import { AppointmentMoveDialog, type AppointmentMoveDialogContext } from "@/components/AppointmentMoveDialog";
import { TourEmployeeCascadeDialog } from "@/components/TourEmployeeCascadeDialog";
import {
  AppointmentAttachmentsPanel,
  type PendingAppointmentAttachmentItem,
} from "@/components/AppointmentAttachmentsPanel";
import { AppointmentEmployeeSlot } from "@/components/AppointmentEmployeeSlot";
import { JournalRecordsView } from "@/components/JournalRecordsView";
import { NotesSection } from "@/components/NotesSection";
import { WorkflowNoteRemovalDialog, WorkflowNoteSuggestionDialog } from "@/components/notes/WorkflowNoteDialogs";
import { RichTextEditor } from "@/components/RichTextEditor";
import { DocumentExtractionDropzone } from "@/components/DocumentExtractionDropzone";
import { AppointmentCancelConfirmDialog } from "@/components/AppointmentCancelConfirmDialog";
import {
  AppointmentSaveReviewDialog,
  type AppointmentSaveReviewNoteReview,
  type AppointmentSaveReviewResourceRequest,
  type AppointmentSaveReviewResult,
} from "@/components/AppointmentSaveReviewDialog";
import {
  type ExtractionCustomerDraft,
  type ExtractionDialogData,
} from "@/components/DocumentExtractionDialog";
import {
  buildCustomerBackfillUpdatePayload,
  ProjectDocumentExtractionWorkflowDialog,
  type DocumentExtractionCustomerResolution,
  type ProjectDocumentExtractionWorkflowResult,
} from "@/components/ProjectDocumentExtractionWorkflowDialog";
import {
  ProjectDuplicateResolutionDialog,
  type ProjectDuplicateLatestAppointment,
  type ProjectDuplicateResolution,
} from "@/components/ProjectDuplicateResolutionDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatAppointmentEditContext, resolveCustomerEditLabel } from "@/lib/edit-form-context";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
import { invalidateTagProjectionQueries } from "@/lib/tag-invalidation";
import { fetchTagCatalog, getTagCatalogQueryKey } from "@/lib/tags";
import { getStoredUserRole, isReaderRole } from "@/lib/auth";
import {
  buildEmployeeIdsFromResourcePreviewSelection,
  getDefaultResourceResolutionMode,
  getDefaultResourcePreviewSelection,
  hasCurrentEmployeeRemovals,
  hasResourcePreviewDecision,
  shouldShowResourceResolutionMode,
  type AppointmentResourceEmployeeCarryoverMode,
  type AppointmentResourcePreviewResponse,
  type AppointmentResourceResolutionMode,
} from "@/lib/resource-planning";
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
  MANAGED_COMPLAINT_TAG_COLOR,
  MANAGED_COMPLAINT_TAG_NAME,
  isManagedComplaintTagName,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
  RESERVED_VACANT_TAG_COLOR,
} from "@shared/appointmentCancellation";
import { computeTagAddedAction, computeTagRemovedAction } from "@/hooks/useTagRuleEngine";
import {
  buildWorkflowNoteDraft,
  findWorkflowNoteTemplate,
  normalizeWorkflowNoteTitle,
} from "@/lib/workflow-note-templates";
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
  appointmentTags: Tag[];
  customerTags: Tag[];
  projectTags: Tag[];
  isCancelled: boolean;
}

export type AppointmentFormSaveResult = {
  appointmentId: number | null;
  startDate: string;
  tourId: number | null;
  shouldOfferFollow: boolean;
};

export function shouldOfferFollowAfterAppointmentSave(params: {
  isEditing: boolean;
  savedAppointmentId: number | null;
  originalTourId: number | null;
  nextTourId: number | null;
  originalStartDate: string | null;
  nextStartDate: string;
}) {
  if (!params.isEditing || typeof params.savedAppointmentId !== "number") {
    return false;
  }

  return params.originalTourId !== params.nextTourId
    || (params.originalStartDate !== null && params.originalStartDate !== params.nextStartDate);
}

type AppointmentFormProject = Project & {
  projectArticleItems?: ProjectArticleItem[];
  tags?: Tag[];
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
  version?: number;
  message?: string;
  employees?: Array<{ id: number }>;
  mutationEvents?: AppointmentMutationEvent[];
};

type ExtractedProjectDraft =
  | {
      mode: "create";
      name: string;
      orderNumber: string;
      amount: string;
      customerId: number;
      customer: Customer;
      extractedArticleListHtml: string;
      descriptionMd?: string;
      productSelections: ProjectProductSelections;
      documentFile: File | null;
      documentExtractionDecisions?: {
        articleListReviewed: boolean;
        reklamationReviewed: boolean;
      };
      documentExtractionReklamation?: {
        enabled: boolean;
        createNote: boolean;
        noteDraft?: ProjectDocumentExtractionWorkflowResult["reklamationNote"];
      };
    }
  | {
      mode: "existing";
      projectId: number;
      documentFile: File | null;
    };

type AppointmentSaveReviewRequest = {
  resourceRequest: AppointmentSaveReviewResourceRequest | null;
  noteReview: AppointmentSaveReviewNoteReview | null;
};

type AppointmentFormSnapshotData = {
  startDate: string;
  endDate: string | null;
  startTimeEnabled: boolean;
  startTimeValue: string;
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

type CreateAppointmentNoteMutationVariables = {
  appointmentId: number;
  title: string;
  body: string;
  cardColor?: string | null;
  print: boolean;
  templateId?: number;
  openEditorOnSuccess?: boolean;
};

type AppointmentWeekEmployeePreviewResponse = AppointmentResourcePreviewResponse;

type AppointmentWeekPreviewDialogState = {
  open: boolean;
  title: string;
  description: string;
  preview: AppointmentWeekEmployeePreviewResponse;
  resolutionKey: string;
  selectedIds: number[];
  resolutionMode: AppointmentResourceResolutionMode;
  showResolutionMode: boolean;
  resolutionNotice: string | null;
  persistAfterConfirm: boolean;
  moveContext: AppointmentMoveDialogContext | null;
};

const logPrefix = "[AppointmentForm]";

export function buildAppointmentCardTagGroups({
  appointmentTags,
  projectTags,
  customerTags,
}: {
  appointmentTags: readonly Tag[];
  projectTags: readonly Tag[];
  customerTags: readonly Tag[];
}): InheritedTagGroup[] {
  const emittedTagIds = new Set(appointmentTags.map((tag) => tag.id));
  const sources: Array<Omit<InheritedTagGroup, "tags"> & { sourceTags: readonly Tag[] }> = [
    { source: "project", title: "Tags vom Projekt", sourceTags: projectTags },
    { source: "customer", title: "Tags vom Kunden", sourceTags: customerTags },
  ];

  return sources
    .map((source) => {
      const tags = source.sourceTags.filter((tag) => {
        if (emittedTagIds.has(tag.id)) return false;
        emittedTagIds.add(tag.id);
        return true;
      });

      return {
        source: source.source,
        title: source.title,
        tags,
      };
    })
    .filter((group) => group.tags.length > 0);
}

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

const normalizeComparableTime = (value: string | null | undefined): string | null => {
  const normalized = normalizeTimeInput((value ?? "").slice(0, 5));
  return normalized ? `${normalized}:00` : null;
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

const parseAppointmentFormSnapshotData = (snapshot: string | null): AppointmentFormSnapshotData | null => {
  if (!snapshot) return null;
  try {
    const parsed = JSON.parse(snapshot) as Partial<AppointmentFormSnapshotData>;
    if (typeof parsed.startDate !== "string") return null;
    return {
      startDate: parsed.startDate,
      endDate: typeof parsed.endDate === "string" ? parsed.endDate : null,
      startTimeEnabled: parsed.startTimeEnabled === true,
      startTimeValue: typeof parsed.startTimeValue === "string" ? parsed.startTimeValue : "",
    };
  } catch {
    return null;
  }
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

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const jsonStart = error.message.indexOf("{");
  if (jsonStart >= 0) {
    const parsed = parseErrorPayload(error.message.slice(jsonStart));
    if (parsed?.message) return parsed.message;
  }
  return error.message || fallback;
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

const buildAppointmentResourceResolutionKey = (params: {
  tourId: number | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  employeeIds: number[];
}) => {
  const weekKey = buildAppointmentWeekResolutionKey(params.tourId, params.startDate)
    ?? `ohne-tour-${buildIsoWeekKey(params.startDate)}`;
  const sortedEmployeeIds = [...params.employeeIds].sort((a, b) => a - b).join(",");
  return [
    weekKey,
    params.endDate ?? "",
    params.startTime ?? "",
    sortedEmployeeIds,
  ].join("|");
};

const FIXED_REPLACE_RESOURCE_NOTICE =
  "Vorhandene Termin-Mitarbeiter werden entfernt. Übernommen werden nur die ausgewählten Mitarbeiter aus der Ziel-KW.";

const getResourceResolutionNotice = (
  preview: AppointmentWeekEmployeePreviewResponse,
  employeeCarryoverMode: AppointmentResourceEmployeeCarryoverMode,
) => (
  employeeCarryoverMode === "replace" && hasCurrentEmployeeRemovals(preview)
    ? FIXED_REPLACE_RESOURCE_NOTICE
    : null
);

const areEmployeeIdsEqual = (left: number[], right: number[]) => {
  if (left.length !== right.length) return false;
  const leftSorted = [...left].sort((a, b) => a - b);
  const rightSorted = [...right].sort((a, b) => a - b);
  return leftSorted.every((value, index) => value === rightSorted[index]);
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
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [projectReklamationConfirmOpen, setProjectReklamationConfirmOpen] = useState(false);
  const [parkConfirmOpen, setParkConfirmOpen] = useState(false);
  const [noteSuggestionDialog, setNoteSuggestionDialog] = useState<{ templateTitle: string; appointmentId: number | null } | null>(null);
  const [noteRemovalDialog, setNoteRemovalDialog] = useState<{ templateTitle: string; noteId: number; noteVersion: number } | null>(null);
  const [suggestedAppointmentNoteDraft, setSuggestedAppointmentNoteDraft] = useState<{
    title: string;
    body: string;
    cardColor?: string | null;
    print: boolean;
    templateId?: number;
  } | null>(null);
  const [pendingPostSaveResult, setPendingPostSaveResult] = useState<AppointmentFormSaveResult | null>(null);
  const [templateNoteEditorOpen, setTemplateNoteEditorOpen] = useState(false);
  const [templateNoteEditorId, setTemplateNoteEditorId] = useState<number | null>(null);
  const [templateNoteEditorVersion, setTemplateNoteEditorVersion] = useState<number>(1);
  const [templateNoteTitle, setTemplateNoteTitle] = useState("");
  const [templateNoteBody, setTemplateNoteBody] = useState("");
  const [templateNoteCardColor, setTemplateNoteCardColor] = useState("#f8fafc");
  const [templateNotePrint, setTemplateNotePrint] = useState(true);
  const [templateNoteCardColorLocked, setTemplateNoteCardColorLocked] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [appointmentWeekPreviewDialog, setAppointmentWeekPreviewDialog] = useState<AppointmentWeekPreviewDialogState | null>(null);
  const [appointmentSaveReviewRequest, setAppointmentSaveReviewRequest] = useState<AppointmentSaveReviewRequest | null>(null);
  const [resolvedAppointmentWeekPlanKey, setResolvedAppointmentWeekPlanKey] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<"details" | "journal">("details");
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
  const workflowNoteSuggestionSeenRef = useRef(new Set<string>());

  const matchesAttachmentFileSignature = (attachment: PendingAppointmentAttachmentItem, file: File) =>
    attachment.originalName === file.name &&
    attachment.file.size === file.size &&
    attachment.file.lastModified === file.lastModified;
  const documentExtractionFileUrl = useMemo(() => {
    if (!documentExtractionFile) return null;
    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return null;
    return URL.createObjectURL(documentExtractionFile);
  }, [documentExtractionFile]);

  useEffect(() => {
    return () => {
      if (documentExtractionFileUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(documentExtractionFileUrl);
      }
    };
  }, [documentExtractionFileUrl]);

  const openDocumentExtractionFileInTab = () => {
    if (!documentExtractionFileUrl || typeof window === "undefined") return;
    window.open(documentExtractionFileUrl, "_blank", "noopener,noreferrer");
  };

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

  const [userRole] = useState(() => getStoredUserRole());
  const isAdmin = userRole === "ADMIN";
  const isReader = isReaderRole(userRole);
  const canManageAppointmentTags = !isReader && (isAdmin || userRole === "DISPATCHER");
  const canDeleteAttachments = !isReader && (isAdmin || userRole === "DISPATCHER");
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
  const {
    data: appointmentDetail,
    isLoading: appointmentLoading,
    isFetching: appointmentFetching,
  } = useQuery<AppointmentDetail>({
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
  });
  const documentExtractionReklamationNoteDraft = useMemo(() => {
    const template = findWorkflowNoteTemplate(noteTemplates, "Reklamation");
    if (template) return buildWorkflowNoteDraft(template);
    return {
      title: "Reklamation",
      body: "",
      print: true,
    };
  }, [noteTemplates]);
  const clearWorkflowNoteSuggestionSeen = (templateTitle: string) => {
    workflowNoteSuggestionSeenRef.current.delete(normalizeWorkflowNoteTitle(templateTitle));
  };
  const openWorkflowNoteSuggestionDialog = (
    templateTitle: string,
    targetAppointmentId: number | null,
  ) => {
    const suggestionKey = normalizeWorkflowNoteTitle(templateTitle);
    if (workflowNoteSuggestionSeenRef.current.has(suggestionKey)) {
      return false;
    }
    workflowNoteSuggestionSeenRef.current.add(suggestionKey);
    setNoteSuggestionDialog({ templateTitle, appointmentId: targetAppointmentId });
    return true;
  };
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
          openWorkflowNoteSuggestionDialog(action.templateTitle, appointmentId!);
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
      const removedTemplate = computeTagAddedAction(item.tag.name, null, []);
      if (removedTemplate.kind === "show_note_suggestion_dialog") {
        clearWorkflowNoteSuggestionSeen(removedTemplate.templateTitle);
      }
      const action = computeTagRemovedAction(item.tag.name, visibleAppointmentNotes.map((n) => ({ title: n.title })));
      if (action.kind === "show_note_removal_dialog") {
        openNoteRemovalDialogForTemplate(action.templateTitle, visibleAppointmentNotes);
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
        throw buildApiError("Termin wurde parallel geändert.", response.status, "VERSION_CONFLICT");
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
          description: "Termin wurde zwischenzeitlich geändert. Bitte neu laden.",
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
        throw buildApiError("Termin wurde parallel geändert.", response.status, "VERSION_CONFLICT");
      }
      if (parsed?.code === "PAST_APPOINTMENT_READONLY") {
        throw buildApiError("Termin ist gesperrt.", response.status, "PAST_APPOINTMENT_READONLY");
      }
      if (parsed?.code === "CANCELLED_APPOINTMENT_READONLY") {
        throw buildApiError("Stornierte Termine können nicht geparkt werden.", response.status, "CANCELLED_APPOINTMENT_READONLY");
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
        toast({ title: "Parken nicht möglich", description: "Termin ist bereits geparkt.", variant: "destructive" });
        return;
      }
      if (err.code === "VERSION_CONFLICT") {
        toast({ title: "Parken nicht möglich", description: "Termin wurde zwischenzeitlich geändert. Bitte neu laden.", variant: "destructive" });
        return;
      }
      if (err.code === "PAST_APPOINTMENT_READONLY") {
        toast({ title: "Parken nicht möglich", description: "Termin ist gesperrt.", variant: "destructive" });
        return;
      }
      if (err.code === "CANCELLED_APPOINTMENT_READONLY") {
        toast({ title: "Parken nicht möglich", description: "Stornierte Termine können nicht geparkt werden.", variant: "destructive" });
        return;
      }
      toast({ title: "Parken nicht möglich", description: err.message || "Termin konnte nicht geparkt werden.", variant: "destructive" });
    },
  });

  const reklamationAppointmentMutation = useMutation({
    mutationFn: async ({ action, version }: { action: "set" | "remove"; version: number }) => {
      const response = await apiRequest(
        action === "set" ? "POST" : "DELETE",
        `/api/appointments/${appointmentId}/reklamation`,
        { version },
      );
      return response.json() as Promise<{ kind: "updated" | "noop"; mutationEvents?: AppointmentMutationEvent[] }>;
    },
    onSuccess: async (result, variables) => {
      if (!appointmentId) return;
      if (variables.action === "remove") {
        clearWorkflowNoteSuggestionSeen("Reklamation");
      }
      const openedDialog = applyAppointmentMutationEvents({
        mutationEvents: result.mutationEvents,
        targetAppointmentId: appointmentId,
        notes: visibleAppointmentNotes.map((note) => ({
          id: note.id,
          version: note.version,
          title: note.title,
        })),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId, "tags"] });
      await invalidateRelatedAppointmentQueries(selectedProjectId);
      await invalidateTagProjectionQueries();
      toast({ title: hasReklamationTag ? "Reklamation aufgehoben" : "Reklamation gemeldet" });
      if (!openedDialog) {
        onSaved?.();
      }
    },
    onError: (error) => {
      const err = error as AppointmentApiError;
      toast({
        title: "Reklamation konnte nicht geändert werden",
        description: err.message || "Bitte neu laden und erneut versuchen.",
        variant: "destructive",
      });
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
    if (appointmentFetching) return;
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
  }, [appointmentDetail, appointmentFetching, appointmentId, isEditing]);

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
    weekTourPrefillAppliedRef.current = true;

    console.info(`${logPrefix} week-prefill deferred`, { tourId: initialTourId });

    // Delay so the form is visually established before the cascade dialog appears.
    const timer = setTimeout(() => {
      handleTourChange(initialTourId);
    }, 400);
    return () => clearTimeout(timer);
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
  const appointmentEditContext = useMemo(
    () => (
      isEditing
        ? formatAppointmentEditContext({
          startDate,
          startTime: startTimeEnabled ? startTimeValue : null,
          tourName: selectedTour?.name ?? null,
          customerName: resolveCustomerEditLabel(selectedCustomer),
        })
        : null
    ),
    [
      isEditing,
      selectedCustomer,
      selectedTour?.name,
      startDate,
      startTimeEnabled,
      startTimeValue,
    ],
  );
  const visibleAppointmentTags = isEditing ? appointmentTagRelations : draftAppointmentTags;
  const visibleAppointmentNotes = isEditing ? appointmentNotes : draftAppointmentNotes;
  const buildAppointmentNoteReviewRequest = (
    currentEndDate: string | null,
    currentStartTime: string | null,
  ): AppointmentSaveReviewNoteReview | null => {
    const notes = visibleAppointmentNotes
      .map((note) => ({ id: note.id, title: note.title }))
      .filter((note) => Number.isFinite(note.id));
    if (notes.length === 0) return null;

    const previousTiming = isEditing && appointmentDetail
      ? {
          startDate: normalizeDateInputValue(appointmentDetail.startDate),
          endDate: appointmentDetail.endDate ? normalizeDateInputValue(appointmentDetail.endDate) : null,
          startTime: normalizeComparableTime(appointmentDetail.startTime),
        }
      : (() => {
          const snapshot = parseAppointmentFormSnapshotData(initialFormSnapshot);
          if (!snapshot) return null;
          return {
            startDate: normalizeDateInputValue(snapshot.startDate),
            endDate: snapshot.endDate ? normalizeDateInputValue(snapshot.endDate) : null,
            startTime: snapshot.startTimeEnabled ? normalizeComparableTime(snapshot.startTimeValue) : null,
          };
        })();

    if (!previousTiming || !previousTiming.startDate) return null;
    const nextEndDate = currentEndDate ? normalizeDateInputValue(currentEndDate) : null;
    const timingChanged = previousTiming.startDate !== startDate
      || previousTiming.endDate !== nextEndDate
      || previousTiming.startTime !== currentStartTime;
    if (!timingChanged) return null;

    return {
      previousStartDate: previousTiming.startDate,
      previousEndDate: previousTiming.endDate,
      previousStartTime: previousTiming.startTime,
      nextStartDate: startDate,
      nextEndDate,
      nextStartTime: currentStartTime,
      notes,
    };
  };
  const hasReklamationTag = visibleAppointmentTags.some((item) => isManagedComplaintTagName(item.tag.name));
  const hasProjectReklamationTag = (
    isEditing ? (appointmentDetail?.projectTags ?? []) : (selectedProject?.tags ?? [])
  ).some((tag) => isManagedComplaintTagName(tag.name));
  const availableComplaintTag = useMemo(
    () => availableTags.find((tag) => isManagedComplaintTagName(tag.name)) ?? null,
    [availableTags],
  );
  const appointmentCardTagGroups = useMemo(
    () => buildAppointmentCardTagGroups({
      appointmentTags: visibleAppointmentTags.map((item) => item.tag),
      projectTags: isEditing ? (appointmentDetail?.projectTags ?? []) : (selectedProject?.tags ?? []),
      customerTags: isEditing
        ? (appointmentDetail?.customerTags ?? [])
        : (((selectedCustomer as (Customer & { tags?: Tag[] }) | null)?.tags) ?? []),
    }),
    [
      appointmentDetail?.customerTags,
      appointmentDetail?.projectTags,
      isEditing,
      selectedCustomer,
      selectedProject?.tags,
      visibleAppointmentTags,
    ],
  );

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
  const isHistoricalReadOnly = isEditing && isPastStartDate(lockedStartDate) && !isAdmin && !isParked;
  const isCancelled = appointmentDetail?.isCancelled === true;
  const readOnlyReason = isReader
    ? "reader"
    : isHistoricalReadOnly
      ? "historical"
      : isCancelled
        ? "cancelled"
        : null;
  const isReadOnlyView = readOnlyReason !== null;
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
    const currentResolutionKey = buildAppointmentWeekResolutionKey(selectedTourId, startDate);
    const nextResolutionKey = buildAppointmentWeekResolutionKey(selectedTourId, nextStartDate);
    const shiftedEndDate = isEndDateEnabled && endDate
      ? shiftEndDateByStartDateChange(startDate, endDate, nextStartDate)
      : null;

    flushSync(() => {
      if (shiftedEndDate) {
        setEndDate(shiftedEndDate);
      }
      setStartDate(nextStartDate);
    });

    if (currentResolutionKey !== nextResolutionKey) {
      setResolvedAppointmentWeekPlanKey(null);
    }
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

  const loadAppointmentTourChangePreview = async (overrides?: {
    tourId?: number | null;
    startDate?: string;
    endDate?: string | null;
    startTime?: string | null;
    employeeIds?: number[];
    employeeCarryoverMode?: AppointmentResourceEmployeeCarryoverMode;
  }): Promise<AppointmentWeekEmployeePreviewResponse | null> => {
    if (!appointmentId) return null;
    const response = await apiRequest("POST", `/api/appointments/${appointmentId}/tour-change-preview`, {
      newTourId: overrides?.tourId ?? selectedTourId,
      newStartDate: overrides?.startDate ?? startDate,
      newEndDate: overrides?.endDate ?? (isEndDateEnabled ? endDate : null),
      newStartTime: overrides?.startTime ?? (startTimeEnabled ? buildTimeString(startTimeValue) : null),
      currentEmployeeIds: overrides?.employeeIds ?? assignedEmployeeIds,
      employeeCarryoverMode: overrides?.employeeCarryoverMode ?? "preserve",
    });
    return response.json() as Promise<AppointmentWeekEmployeePreviewResponse>;
  };

  const openAppointmentWeekPreviewDialog = (
    preview: AppointmentWeekEmployeePreviewResponse,
    params: {
      title: string;
      description: string;
      persistAfterConfirm: boolean;
      resolutionKey: string;
      employeeCarryoverMode: AppointmentResourceEmployeeCarryoverMode;
      isExistingAppointment: boolean;
      isSameTourAndWeek: boolean;
      moveContext: AppointmentMoveDialogContext | null;
    },
  ) => {
    const showResolutionMode = shouldShowResourceResolutionMode(preview, {
      employeeCarryoverMode: params.employeeCarryoverMode,
      isExistingAppointment: params.isExistingAppointment,
      isSameTourAndWeek: params.isSameTourAndWeek,
    });
    setAppointmentWeekPreviewDialog({
      open: true,
      title: params.title,
      description: params.description,
      preview,
      resolutionKey: params.resolutionKey,
      selectedIds: getDefaultResourcePreviewSelection(preview),
      resolutionMode: getDefaultResourceResolutionMode(params.employeeCarryoverMode),
      showResolutionMode,
      resolutionNotice: showResolutionMode ? null : getResourceResolutionNotice(preview, params.employeeCarryoverMode),
      persistAfterConfirm: params.persistAfterConfirm,
      moveContext: params.moveContext,
    });
  };

  const closeAppointmentWeekPreviewDialog = () => {
    if (!appointmentWeekPreviewDialog) return;
    if (
      appointmentWeekPreviewDialog.resolutionMode !== "replace"
      || !hasCurrentEmployeeRemovals(appointmentWeekPreviewDialog.preview)
    ) {
      setResolvedAppointmentWeekPlanKey(appointmentWeekPreviewDialog.resolutionKey);
    }
    setAppointmentWeekPreviewDialog(null);
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
      setResolvedAppointmentWeekPlanKey(null);
      if (tourId === null) {
        applyTourChange(tourId);
        return;
      }

      try {
        const resolutionKey = buildAppointmentResourceResolutionKey({
          tourId,
          startDate,
          endDate: isEndDateEnabled ? endDate : null,
          startTime: startTimeEnabled ? buildTimeString(startTimeValue) : null,
          employeeIds: assignedEmployeeIds,
        });
        const isExistingAppointment = isEditing && Boolean(appointmentId);
        const originalTourId = appointmentDetail?.tourId ?? null;
        const originalWeekKey = appointmentDetail
          ? buildIsoWeekKey(normalizeDateInputValue(appointmentDetail.startDate))
          : buildIsoWeekKey(startDate);
        const targetWeekKey = buildIsoWeekKey(startDate);
        const isSameTourAndWeek = isExistingAppointment
          && originalTourId === tourId
          && originalWeekKey === targetWeekKey;
        const employeeCarryoverMode: AppointmentResourceEmployeeCarryoverMode = isExistingAppointment && !isSameTourAndWeek
          ? "replace"
          : "preserve";
        const preview = isEditing && appointmentId
          ? await loadAppointmentTourChangePreview({ tourId, employeeCarryoverMode })
          : await loadTourAssignmentPreview(tourId, assignedEmployeeIds);
        applyTourChange(tourId);
        if (!preview || !hasResourcePreviewDecision(preview)) {
          setResolvedAppointmentWeekPlanKey(resolutionKey);
          return;
        }
        const tourChanged = isExistingAppointment && (appointmentDetail?.tourId ?? null) !== tourId;
        const weekChanged = isExistingAppointment && originalWeekKey !== targetWeekKey;
        openAppointmentWeekPreviewDialog(preview, {
          title: "Wochenplanung für Termin übernehmen",
          description: preview.hasWeekPlan
            ? "Die ausgewählte Tour hat für diese Kalenderwoche eine Planung. Wählen Sie, welche Mitarbeiter übernommen werden sollen."
            : "Für die ausgewählte Tour gibt es in dieser Kalenderwoche keine übernehmbaren KW-Mitarbeiter. Vorhandene Termin-Mitarbeiter werden entfernt.",
          persistAfterConfirm: false,
          resolutionKey: resolutionKey ?? `${tourId}-${preview.isoYear}-${preview.isoWeek}`,
          employeeCarryoverMode,
          isExistingAppointment,
          isSameTourAndWeek,
          moveContext: isExistingAppointment ? { tourChanged, weekChanged, isCalendarMove: false } : null,
        });
      } catch (error) {
        const message = getApiErrorMessage(error, "Vorschau konnte nicht geladen werden.");
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
        title: "Tag konnte nicht hinzugefügt werden",
        description: "Der ausgewählte Tag ist nicht verfügbar.",
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

  const buildDraftComplaintTag = (): Tag => availableComplaintTag ?? ({
    id: -1000,
    name: MANAGED_COMPLAINT_TAG_NAME,
    color: MANAGED_COMPLAINT_TAG_COLOR,
    isDefault: true,
    version: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  });

  const setDraftAppointmentReklamation = () => {
    const complaintTag = buildDraftComplaintTag();
    setDraftAppointmentTags((current) => {
      if (current.some((entry) => isManagedComplaintTagName(entry.tag.name))) {
        return current;
      }
      return [...current, { tag: complaintTag, relationVersion: 1 }];
    });
    const action = computeTagAddedAction(
      "Reklamation",
      null,
      visibleAppointmentNotes.map((note) => ({ title: note.title })),
    );
    if (action.kind === "show_note_suggestion_dialog") {
      openWorkflowNoteSuggestionDialog(action.templateTitle, null);
    }
  };

  const removeDraftAppointmentReklamation = () => {
    setDraftAppointmentTags((current) => current.filter((entry) => !isManagedComplaintTagName(entry.tag.name)));
    clearWorkflowNoteSuggestionSeen("Reklamation");
    const action = computeTagRemovedAction(
      "Reklamation",
      visibleAppointmentNotes.map((note) => ({ title: note.title })),
    );
    if (action.kind === "show_note_removal_dialog") {
      openNoteRemovalDialogForTemplate(action.templateTitle, visibleAppointmentNotes);
    }
  };

  const toggleDraftAppointmentReklamation = () => {
    if (hasReklamationTag) {
      removeDraftAppointmentReklamation();
      return;
    }
    setDraftAppointmentReklamation();
  };

  const executeAppointmentReklamationAction = () => {
    if (!isEditing) {
      toggleDraftAppointmentReklamation();
      return;
    }
    const version = appointmentDetail?.version;
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
      toast({ title: "Reklamation nicht möglich", description: "Terminversion fehlt. Bitte neu laden.", variant: "destructive" });
      return;
    }
    reklamationAppointmentMutation.mutate({ action: hasReklamationTag ? "remove" : "set", version });
  };

  const requestAppointmentReklamationAction = () => {
    if (!hasReklamationTag && hasProjectReklamationTag) {
      setProjectReklamationConfirmOpen(true);
      return;
    }
    executeAppointmentReklamationAction();
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

  const escapeDescriptionHtml = (value: string): string =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const buildDocumentTextDescriptionHtml = (documentText: string): string => {
    const escaped = escapeDescriptionHtml(documentText.trim());
    if (!escaped) return "";
    return `<p><strong>Extrahierter Dokumenttext</strong></p><pre>${escaped}</pre>`;
  };

  const resolveCustomerByNumber = async (customerNumber: string): Promise<DocumentExtractionCustomerResolution> => {
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
    return (await response.json()) as DocumentExtractionCustomerResolution;
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

  const updateExistingCustomerFromDraft = async (
    existingCustomer: Customer,
    customerDraft: ExtractionCustomerDraft,
  ): Promise<Customer> => {
    const backfill = buildCustomerBackfillUpdatePayload(existingCustomer, customerDraft);
    if (Object.keys(backfill).length === 0) {
      return existingCustomer;
    }

    const sendUpdate = async (customer: Customer, version: number) =>
      fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...backfill, version }),
      });

    let response = await sendUpdate(existingCustomer, existingCustomer.version);
    if (response.status === 409) {
      const freshResponse = await fetch(`/api/customers/${existingCustomer.id}`, {
        method: "GET",
        credentials: "include",
      });
      if (!freshResponse.ok) {
        throw new Error("Kunde konnte vor der Ergänzung nicht neu geladen werden.");
      }
      const freshCustomer = (await freshResponse.json()) as Customer;
      const retryBackfill = buildCustomerBackfillUpdatePayload(freshCustomer, customerDraft);
      if (Object.keys(retryBackfill).length === 0) {
        return freshCustomer;
      }
      response = await fetch(`/api/customers/${freshCustomer.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...retryBackfill, version: freshCustomer.version }),
      });
    }

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(json?.message ?? "Kunde konnte nicht ergänzt werden.");
    }
    const updatedCustomer = json as Customer;
    await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/customers/list"] });
    return updatedCustomer;
  };

  const validateProjectDocumentExtractionTarget = async ({ orderNumber: extractedOrderNumber }: { orderNumber: string }) => {
    if (selectedProjectId) {
      throw new Error("Projektübernahme ist nur möglich, wenn kein Projekt ausgewählt ist.");
    }
    const normalizedOrderNumber = extractedOrderNumber.trim();
    if (normalizedOrderNumber.length === 0) return true;
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
      return false;
    }
    return true;
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
        documentText?: string;
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
        documentText: extraction.documentText ?? "",
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

  const applyExtractedProject = async (payload: ProjectDocumentExtractionWorkflowResult) => {
    try {
      if (selectedProjectId) {
        throw new Error("Projektübernahme ist nur möglich, wenn kein Projekt ausgewählt ist.");
      }

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
        customerId: payload.customerId,
        customer: payload.resolvedCustomer,
        extractedArticleListHtml: payload.articleListHtml.trim(),
        descriptionMd: payload.appendDocumentText && documentExtractionData?.documentText?.trim()
          ? buildDocumentTextDescriptionHtml(documentExtractionData.documentText)
          : undefined,
        productSelections: createEmptyProjectProductSelections(),
        documentFile: documentExtractionFile,
        documentExtractionDecisions: {
          articleListReviewed: false,
          reklamationReviewed: payload.acceptMissingArticleListAsReklamation,
        },
        documentExtractionReklamation: payload.acceptMissingArticleListAsReklamation
          ? { enabled: true, createNote: payload.createReklamationNote, noteDraft: payload.reklamationNote }
          : undefined,
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
    mutationFn: async ({ appointmentId: targetAppointmentId, title, body, cardColor, print, templateId }: CreateAppointmentNoteMutationVariables) => {
      const res = await apiRequest("POST", `/api/appointments/${targetAppointmentId}/notes`, { title, body, cardColor, print, templateId });
      return res.json();
    },
    onSuccess: (createdNote: Note, variables) => {
      void invalidateAppointmentNotesQueries(variables.appointmentId);
      void invalidateRelatedAppointmentQueries(selectedProjectId);
      if (variables.openEditorOnSuccess) {
        setTemplateNoteEditorId(createdNote.id);
        setTemplateNoteEditorVersion(createdNote.version);
        setTemplateNoteTitle(createdNote.title);
        setTemplateNoteBody(createdNote.body ?? "");
        setTemplateNoteCardColor(createdNote.cardColor ?? "#f8fafc");
        setTemplateNotePrint(createdNote.print);
        setTemplateNoteCardColorLocked(createdNote.cardColorLocked);
        setTemplateNoteEditorOpen(true);
      }
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
      const targetAppointmentId = appointmentId ?? pendingPostSaveResult?.appointmentId ?? null;
      if (typeof targetAppointmentId === "number" && targetAppointmentId > 0) {
        void invalidateAppointmentNotesQueries(targetAppointmentId);
        void invalidateRelatedAppointmentQueries(selectedProjectId);
      }
      setTemplateNoteEditorVersion(updatedNote.version);
      setTemplateNoteEditorOpen(false);
      if (pendingPostSaveResult) {
        const result = pendingPostSaveResult;
        setPendingPostSaveResult(null);
        onSaved?.(result);
      }
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Notiz konnte nicht aktualisiert werden",
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
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
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
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
          title: "Notiz konnte nicht gelöscht werden",
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const validateForm = () => {
    const allowHistoricalInput = isAdmin || isParked;
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
      if (readOnlyReason === "reader") {
        toast({ title: "Nur Lesemodus", description: "Diese Rolle darf Termine nicht bearbeiten.", variant: "destructive" });
        console.info(`${logPrefix} save blocked: reader role`);
        return;
      }
      if (readOnlyReason === "cancelled") {
        toast({ title: "Termin ist storniert", description: "Stornierte Termine können nicht mehr bearbeitet werden.", variant: "destructive" });
        console.info(`${logPrefix} save blocked: cancelled appointment`);
        return;
      }
      toast({ title: "Termin ist gesperrt", description: "Historische Termine können nicht geändert werden.", variant: "destructive" });
      console.info(`${logPrefix} save blocked: locked appointment`);
      return;
    }
    if (!validateForm()) return;
    const allowHistoricalInput = isAdmin || isParked;
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

    const currentEndDate = isEndDateEnabled ? endDate : null;
    const currentStartTime = startTimeEnabled ? buildTimeString(startTimeValue) : null;
    const currentResolutionKey = buildAppointmentResourceResolutionKey({
      tourId: selectedTourId,
      startDate,
      endDate: currentEndDate,
      startTime: currentStartTime,
      employeeIds: assignedEmployeeIds,
    });
    let saveReviewResourceRequest: AppointmentSaveReviewResourceRequest | null = null;
    if ((isEditing || selectedTourId !== null) && currentResolutionKey !== null && currentResolutionKey !== resolvedAppointmentWeekPlanKey) {
      try {
        let shouldLoadResourcePreview = !isEditing;
        if (isEditing && appointmentId && appointmentDetail) {
          const originalTourId = appointmentDetail.tourId ?? null;
          const originalStartDate = normalizeDateInputValue(appointmentDetail.startDate);
          const originalEndDate = appointmentDetail.endDate ? normalizeDateInputValue(appointmentDetail.endDate) : null;
          const originalStartTime = appointmentDetail.startTime ? appointmentDetail.startTime.slice(0, 8) : null;
          const originalEmployeeIds = appointmentDetail.employees.map((employee) => employee.id);
          const originalWeekKey = buildIsoWeekKey(normalizeDateInputValue(appointmentDetail.startDate));
          const currentWeekKey = buildIsoWeekKey(startDate);
          const requiresTourPreview = selectedTourId !== null
            && (originalTourId !== selectedTourId || originalWeekKey !== currentWeekKey);
          const isSameTourAndWeek = selectedTourId !== null
            && originalTourId === selectedTourId
            && originalWeekKey === currentWeekKey;
          const employeeCarryoverMode: AppointmentResourceEmployeeCarryoverMode = requiresTourPreview ? "replace" : "preserve";
          shouldLoadResourcePreview = requiresTourPreview
            || originalStartDate !== startDate
            || originalEndDate !== currentEndDate
            || originalStartTime !== currentStartTime
            || !areEmployeeIdsEqual(originalEmployeeIds, assignedEmployeeIds);

          if (shouldLoadResourcePreview) {
            const preview = await loadAppointmentTourChangePreview({ employeeCarryoverMode });
            if (preview && hasResourcePreviewDecision(preview)) {
              const showResolutionMode = shouldShowResourceResolutionMode(preview, {
                employeeCarryoverMode,
                isExistingAppointment: true,
                isSameTourAndWeek,
              });
              saveReviewResourceRequest = {
                preview,
                resolutionKey: currentResolutionKey,
                selectedIds: getDefaultResourcePreviewSelection(preview),
                resolutionMode: getDefaultResourceResolutionMode(employeeCarryoverMode),
                showResolutionMode,
                resolutionNotice: showResolutionMode ? null : getResourceResolutionNotice(preview, employeeCarryoverMode),
              };
            }
          }
        } else if (selectedTourId !== null && shouldLoadResourcePreview) {
          const preview = await loadTourAssignmentPreview(selectedTourId, assignedEmployeeIds);
          if (hasResourcePreviewDecision(preview)) {
            const employeeCarryoverMode: AppointmentResourceEmployeeCarryoverMode = "preserve";
            saveReviewResourceRequest = {
              preview,
              resolutionKey: currentResolutionKey,
              selectedIds: getDefaultResourcePreviewSelection(preview),
              resolutionMode: getDefaultResourceResolutionMode(employeeCarryoverMode),
              showResolutionMode: false,
              resolutionNotice: null,
            };
          }
        }

        if (!saveReviewResourceRequest) {
          setResolvedAppointmentWeekPlanKey(currentResolutionKey);
        }
      } catch (error) {
        const message = getApiErrorMessage(error, "Vorschau konnte nicht geladen werden.");
        toast({
          title: "Wochenplanung konnte nicht geladen werden",
          description: message,
          variant: "destructive",
        });
        return;
      }
    }

    const employeeIdsAfterResourceReview = saveReviewResourceRequest
      ? buildEmployeeIdsFromResourcePreviewSelection(
        saveReviewResourceRequest.preview,
        saveReviewResourceRequest.selectedIds,
        saveReviewResourceRequest.resolutionMode,
      )
      : assignedEmployeeIds;
    const noteReviewRequest = buildAppointmentNoteReviewRequest(currentEndDate, currentStartTime);

    if (saveReviewResourceRequest || noteReviewRequest || employeeIdsAfterResourceReview.length === 0) {
      console.info(`${logPrefix} save requires review`, {
        hasResourceReview: Boolean(saveReviewResourceRequest),
        hasNoteReview: Boolean(noteReviewRequest),
        employeeCount: employeeIdsAfterResourceReview.length,
      });
      setAppointmentSaveReviewRequest({
        resourceRequest: saveReviewResourceRequest,
        noteReview: noteReviewRequest,
      });
      return;
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
          throw buildApiError("Termin kann derzeit nicht gelöscht werden. Bitte neu laden.", 422, "VALIDATION_ERROR");
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
          throw buildApiError("Stornierte Termine können nicht gelöscht werden.", response.status, "CANCELLED_APPOINTMENT_READONLY");
        }
        if (parsed?.code === "VERSION_CONFLICT") {
          throw buildApiError("Termin wurde parallel geändert.", response.status, "VERSION_CONFLICT");
        }
        if (parsed?.code === "VALIDATION_ERROR") {
          throw buildApiError("Ungültige Löschdaten (Version). Bitte neu laden.", response.status, "VALIDATION_ERROR");
        }
        throw buildApiError(parsed?.message ?? (response.statusText || "Löschen fehlgeschlagen"), response.status, parsed?.code);
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
              "Termin wurde parallel geändert. Bitte Formular neu oeffnen.",
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
          description: "Stornierte Termine können nicht gelöscht werden.",
          variant: "destructive",
        });
        return;
      }
      if (err.code === "VERSION_CONFLICT") {
        toast({
          title: "Löschen nicht möglich",
          description: err.message || "Termin wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      if (err.code === "VALIDATION_ERROR") {
        toast({
          title: "Löschen nicht möglich",
          description: "Ungültige Löschdaten. Bitte neu laden.",
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
      if (isManagedComplaintTagName(item.tag.name)) {
        continue;
      }
      await apiRequest("POST", `/api/appointments/${targetAppointmentId}/tags`, { tagId: item.tag.id });
    }
  };

  const persistDraftAppointmentReklamation = async (
    targetAppointmentId: number,
    expectedVersion: number | undefined,
  ) => {
    if (!draftAppointmentTags.some((item) => isManagedComplaintTagName(item.tag.name))) {
      return;
    }
    if (typeof expectedVersion !== "number" || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new Error("Terminversion für Reklamationsworkflow fehlt.");
    }
    await apiRequest("POST", `/api/appointments/${targetAppointmentId}/reklamation`, { version: expectedVersion });
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

  const openNoteRemovalDialogForTemplate = (
    templateTitle: string,
    notes: Array<{ id: number; version: number; title: string }>,
  ) => {
    const matchingNote = notes.find((note) => normalizeWorkflowNoteTitle(note.title) === normalizeWorkflowNoteTitle(templateTitle));
    if (!matchingNote) {
      return;
    }
    setNoteRemovalDialog({
      templateTitle,
      noteId: matchingNote.id,
      noteVersion: matchingNote.version,
    });
  };

  const completePendingPostSave = () => {
    if (!pendingPostSaveResult) {
      return;
    }
    const result = pendingPostSaveResult;
    setPendingPostSaveResult(null);
    onSaved?.(result);
  };

  const applyAppointmentMutationEvents = (params: {
    mutationEvents: AppointmentMutationEvent[] | undefined;
    targetAppointmentId: number | null;
    notes: Array<{ id: number; version: number; title: string }>;
  }) => {
    if (!params.mutationEvents || params.mutationEvents.length === 0 || !params.targetAppointmentId) {
      return false;
    }

    let openedDialog = false;
    for (const event of params.mutationEvents) {
      if (event.kind !== "tag_mutated") {
        continue;
      }

      if (event.action === "added") {
        const action = computeTagAddedAction(
          event.tagName,
          params.targetAppointmentId,
          params.notes.map((note) => ({ title: note.title })),
        );
        if (action.kind === "show_note_suggestion_dialog") {
          openedDialog = openWorkflowNoteSuggestionDialog(
            action.templateTitle,
            params.targetAppointmentId,
          ) || openedDialog;
        }
        continue;
      }

      const action = computeTagRemovedAction(
        event.tagName,
        params.notes.map((note) => ({ title: note.title })),
      );
      if (action.kind === "show_note_removal_dialog") {
        clearWorkflowNoteSuggestionSeen(action.templateTitle);
        openNoteRemovalDialogForTemplate(action.templateTitle, params.notes);
        openedDialog = true;
      }
    }
    return openedDialog;
  };

  const handleSkipTemplateNoteSuggestion = () => {
    setNoteSuggestionDialog(null);
    completePendingPostSave();
  };

  const closeTemplateNoteEditor = (open: boolean) => {
    setTemplateNoteEditorOpen(open);
    if (!open) {
      completePendingPostSave();
    }
  };

  const handleCreateTemplateNoteFromSuggestion = async () => {
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
    if (!noteSuggestionDialog.appointmentId) {
      setSuggestedAppointmentNoteDraft(buildWorkflowNoteDraft(template));
      setNoteSuggestionDialog(null);
      return;
    }
    try {
      await createAppointmentNoteMutation.mutateAsync({
        appointmentId: noteSuggestionDialog.appointmentId,
        title: template.title,
        body: template.body,
        cardColor: template.cardColor,
        print: true,
        templateId: template.id,
        openEditorOnSuccess: true,
      });
      setNoteSuggestionDialog(null);
    } catch {
      // onError der Mutation zeigt bereits das Toast an.
    }
  };

  const handleKeepTemplateNote = () => {
    setNoteRemovalDialog(null);
    completePendingPostSave();
  };

  const handleRemoveTemplateNote = async () => {
    if (!noteRemovalDialog) return;
    if (!appointmentId) {
      deleteDraftAppointmentNote(noteRemovalDialog.noteId);
      setNoteRemovalDialog(null);
      return;
    }
    try {
      await deleteAppointmentNoteMutation.mutateAsync({
        noteId: noteRemovalDialog.noteId,
        version: noteRemovalDialog.noteVersion,
      });
      setNoteRemovalDialog(null);
      completePendingPostSave();
    } catch {
      // onError der Mutation zeigt bereits das Toast an.
    }
  };

  const persistCreateSidebarDrafts = async (targetAppointmentId: number, expectedVersion: number | undefined) => {
    await persistDraftAppointmentReklamation(targetAppointmentId, expectedVersion);
    await persistDraftAppointmentTags(targetAppointmentId);
    await persistDraftAppointmentNotes(targetAppointmentId);
    await persistDraftAppointmentAttachments(targetAppointmentId);
  };

  const persistAppointment = async (employeeIdsOverride?: number[]) => {
    const resolvedPayloadCustomerId = selectedProject?.customerId ?? selectedCustomerId;
    if (!resolvedPayloadCustomerId) {
      toast({
        title: "Speichern nicht möglich",
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
        title: "Speichern nicht möglich",
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
            title: "Speichern nicht möglich",
            description: `${parsed.message ?? "Termin überschneidet sich mit bestehenden Mitarbeiter-Terminen."} ${conflictDetail}`,
            variant: "destructive",
          });
          return;
        }
        if (parsed?.code === "INACTIVE_ENTITY_ASSIGNMENT") {
          toast({
            title: "Speichern nicht möglich",
            description: "Mindestens ein zugewiesener Mitarbeiter ist inaktiv.",
            variant: "destructive",
          });
          return;
        }
        if (parsed?.code === "PAST_APPOINTMENT_READONLY") {
          toast({
            title: "Speichern nicht möglich",
            description: "Historische Termine koennen nicht geaendert werden.",
            variant: "destructive",
          });
          return;
        }
        if (parsed?.code === "CANCELLED_APPOINTMENT_READONLY") {
          toast({
            title: "Speichern nicht möglich",
            description: "Stornierte Termine koennen nicht mehr bearbeitet werden.",
            variant: "destructive",
          });
          return;
        }
        if (parsed?.code === "VERSION_CONFLICT") {
          console.info(`${logPrefix} submit blocked: VERSION_CONFLICT`, { status: response.status });
          toast({
            title: "Speichern nicht möglich",
            description: "Termin wurde zwischenzeitlich geaendert. Bitte neu laden und erneut speichern.",
            variant: "destructive",
          });
          return;
        }
        throw new Error((data as { message?: string } | null)?.message ?? "Speichern fehlgeschlagen");
      }
      const savedAppointmentId = data?.id ?? appointmentId ?? null;
      const openedPostSaveDialog = applyAppointmentMutationEvents({
        mutationEvents: data?.mutationEvents,
        targetAppointmentId: savedAppointmentId,
        notes: visibleAppointmentNotes.map((note) => ({
          id: note.id,
          version: note.version,
          title: note.title,
        })),
      });
      setAssignedEmployeeIds(
        Array.isArray(data?.employees)
          ? data.employees.map((employee) => employee.id)
          : (employeeIdsOverride ?? assignedEmployeeIds),
      );
      const normalizedSavedStartDate = normalizeDateInputValue(payload.startDate);
      const originalStartDate = appointmentDetail ? normalizeDateInputValue(appointmentDetail.startDate) : null;
      const originalTourId = appointmentDetail?.tourId ?? null;
      const shouldOfferFollow = shouldOfferFollowAfterAppointmentSave({
        isEditing,
        savedAppointmentId,
        originalTourId,
        nextTourId: payload.tourId ?? null,
        originalStartDate,
        nextStartDate: normalizedSavedStartDate,
      });
      console.info(`${logPrefix} save success`, {
        action: isEditing ? "edit" : "create",
        projectId: payload.projectId ?? null,
        appointmentId: savedAppointmentId,
      });
      const saveResult = {
        appointmentId: savedAppointmentId,
        startDate: normalizedSavedStartDate,
        tourId: payload.tourId ?? null,
        shouldOfferFollow,
      } satisfies AppointmentFormSaveResult;
      if (!isEditing) {
        if (typeof savedAppointmentId !== "number" || savedAppointmentId < 1) {
          throw new Error("Termin wurde erstellt, aber die Termin-ID fehlt fuer die Nachverarbeitung.");
        }
        try {
          await persistCreateSidebarDrafts(savedAppointmentId, data?.version);
          setDraftAppointmentTags([]);
          setDraftAppointmentNotes([]);
          setDraftAppointmentAttachments([]);
        } catch (error) {
          await invalidateRelatedAppointmentQueries(payload.projectId);
          await refreshMonitoringWithNotification(toast);
          await queryClient.invalidateQueries({ queryKey: ["/api/appointments", savedAppointmentId] });
          toast({
            title: "Termin erstellt, aber Zusatzdaten sind unvollständig",
            description: error instanceof Error
              ? error.message
              : "Tags, Notizen oder Terminhänge konnten nicht vollständig gespeichert werden.",
            variant: "destructive",
          });
          if (openedPostSaveDialog) {
            setPendingPostSaveResult(saveResult);
          } else {
            onSaved?.(saveResult);
          }
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
        await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId, "tags"] });
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
      if (openedPostSaveDialog) {
        setPendingPostSaveResult(saveResult);
        return;
      }
      onSaved?.(saveResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Speichern fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAppointmentWeekPreview = async () => {
    if (!appointmentWeekPreviewDialog) return;
    const nextEmployeeIds = buildEmployeeIdsFromResourcePreviewSelection(
      appointmentWeekPreviewDialog.preview,
      appointmentWeekPreviewDialog.selectedIds,
      appointmentWeekPreviewDialog.resolutionMode,
    );
    setAssignedEmployeeIds(nextEmployeeIds);
    const persistAfterConfirm = appointmentWeekPreviewDialog.persistAfterConfirm;
    const resolvedResourceKey = buildAppointmentResourceResolutionKey({
      tourId: selectedTourId,
      startDate,
      endDate: isEndDateEnabled ? endDate : null,
      startTime: startTimeEnabled ? buildTimeString(startTimeValue) : null,
      employeeIds: nextEmployeeIds,
    }) ?? appointmentWeekPreviewDialog.resolutionKey;
    setResolvedAppointmentWeekPlanKey(resolvedResourceKey);
    setAppointmentWeekPreviewDialog(null);
    if (persistAfterConfirm) {
      await persistAppointment(nextEmployeeIds);
    }
  };

  const handleAppointmentSaveReviewCancel = () => {
    if (isSaving) return;
    setAppointmentSaveReviewRequest(null);
  };

  const handleAppointmentSaveReviewConfirm = (result: AppointmentSaveReviewResult) => {
    setAppointmentSaveReviewRequest(null);
    setAssignedEmployeeIds(result.employeeIds);
    if (result.resourceResolutionKey) {
      setResolvedAppointmentWeekPlanKey(result.resourceResolutionKey);
    }
    void persistAppointment(result.employeeIds);
  };

  return (
    <Tabs
      value={isEditing ? activeMainTab : "details"}
      onValueChange={(value) => setActiveMainTab(value as "details" | "journal")}
      className="h-full"
    >
      <div className="flex h-full min-h-0 w-full flex-1">
      <EntityFormShell
        header={(
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex min-w-0 flex-col gap-3">
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
              <EditFormContextText>{appointmentEditContext}</EditFormContextText>
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
            {isEditing ? (
              <div className="sub-panel space-y-3">
                <h3 className="text-sm font-bold tracking-wider text-primary">Daten anzeigen</h3>
                <TabsList className="w-full" data-testid="tabs-appointment-main">
                  <TabsTrigger value="details" className="flex-1 gap-1.5" data-testid="tab-appointment-details"><LayoutList className="w-4 h-4" />Details</TabsTrigger>
                  <TabsTrigger value="journal" className="flex-1 gap-1.5" data-testid="tab-appointment-journal"><ScrollText className="w-4 h-4" />Journal</TabsTrigger>
                </TabsList>
              </div>
            ) : null}
            {!isReadOnlyView && ((isEditing && appointmentId) || canManageAppointmentTags) ? (
              <div className="sub-panel space-y-3" data-testid="appointment-form-functions-panel">
                <h3 className="text-sm font-bold tracking-wider text-primary">Funktionen</h3>
                <div className="flex flex-col gap-2">
                  {isEditing && appointmentId && !isCancelled ? (
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
                  {isEditing && appointmentId && !isCancelled && !isParked ? (
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
                  {!isCancelled && canManageAppointmentTags ? (
                    <Button
                      type="button"
                      className="w-full justify-start gap-2 border bg-[var(--action-bg)] text-[var(--action-fg)] [border-color:var(--action-border)] transition-[background-color,border-color,box-shadow,color] hover:bg-[var(--action-bg-hover)] hover:[border-color:var(--action-border-hover)] hover:shadow-sm"
                      style={{
                        "--action-bg": MANAGED_COMPLAINT_TAG_COLOR + "22",
                        "--action-bg-hover": MANAGED_COMPLAINT_TAG_COLOR + "33",
                        "--action-border": MANAGED_COMPLAINT_TAG_COLOR + "66",
                        "--action-border-hover": MANAGED_COMPLAINT_TAG_COLOR + "99",
                        "--action-fg": MANAGED_COMPLAINT_TAG_COLOR,
                      } as React.CSSProperties}
                      onClick={requestAppointmentReklamationAction}
                      disabled={isMutationLocked || (isEditing && reklamationAppointmentMutation.isPending)}
                      data-testid={hasReklamationTag ? "button-remove-appointment-reklamation" : "button-set-appointment-reklamation"}
                    >
                      <ScrollText className="w-4 h-4" />
                      {isEditing && reklamationAppointmentMutation.isPending
                        ? "Reklamation..."
                        : hasReklamationTag
                          ? "Reklamation aufheben"
                          : "Reklamation melden"}
                    </Button>
                  ) : null}
                  {isEditing && appointmentId ? (
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
                  ) : null}
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
              inheritedTagGroups={appointmentCardTagGroups}
              canEdit={canManageAppointmentTags && !isMutationLocked}
              title="Tags"
              emptyText={appointmentCardTagGroups.length > 0 ? "Keine Termin-Tags zugewiesen" : undefined}
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
              prefillDraft={suggestedAppointmentNoteDraft}
              onPrefillDraftConsumed={() => setSuggestedAppointmentNoteDraft(null)}
              onAdd={(data) => {
                if (isEditing) {
                  if (!appointmentId) return;
                  createAppointmentNoteMutation.mutate({ appointmentId, ...data });
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
        {activeMainTab === "details" ? (
          <div className="w-full space-y-6" data-testid="appointment-form-main-column">
          {readOnlyReason === "cancelled" && (
            <Alert variant="destructive">
              <AlertTitle>Termin storniert</AlertTitle>
              <AlertDescription>
                Dieser Termin wurde als Storno markiert und kann nicht mehr bearbeitet, verschoben oder gelöscht werden.
              </AlertDescription>
            </Alert>
          )}
          {readOnlyReason === "historical" && (
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
                  <div className="flex items-center gap-2">
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => {
                        setStartTimeValue("");
                        setStartTimeEnabled(false);
                      }}
                      disabled={isMutationLocked}
                      aria-label="Startzeit entfernen"
                      data-testid="button-remove-start-time"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
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
        ) : (
          <JournalRecordsView
            context={{ tableName: "appointment", recordId: appointmentId }}
            pageSize={25}
            testIdPrefix="appointment-journal"
          />
        )}
      </EntityFormShell>

      {appointmentWeekPreviewDialog?.moveContext ? (
        /* Edit-Modus mit Tour-/Wochenwechsel: neuer kontextueller Dialog */
        <AppointmentMoveDialog
          open={appointmentWeekPreviewDialog.open}
          preview={appointmentWeekPreviewDialog.preview}
          moveContext={appointmentWeekPreviewDialog.moveContext}
          selectedIds={appointmentWeekPreviewDialog.selectedIds}
          onSelectedIdsChange={(selectedIds) => {
            setAppointmentWeekPreviewDialog((current) => current ? { ...current, selectedIds } : current);
          }}
          isSubmitting={isSaving}
          onConfirm={() => { void handleConfirmAppointmentWeekPreview(); }}
          onClose={closeAppointmentWeekPreviewDialog}
        />
      ) : appointmentWeekPreviewDialog ? (
        /* Create-Modus oder kein Tourwechselkontext: bisheriges Verhalten erhalten */
        <TourEmployeeCascadeDialog
          variant="appointment"
          open={appointmentWeekPreviewDialog.open}
          title={appointmentWeekPreviewDialog.title}
          description={appointmentWeekPreviewDialog.description}
          previewItems={appointmentWeekPreviewDialog.preview.items}
          selectedIds={appointmentWeekPreviewDialog.selectedIds}
          resolutionMode={appointmentWeekPreviewDialog.resolutionMode}
          showResolutionMode={appointmentWeekPreviewDialog.showResolutionMode}
          resolutionNotice={appointmentWeekPreviewDialog.resolutionNotice}
          isSubmitting={isSaving}
          onSelectedIdsChange={(selectedIds) => {
            setAppointmentWeekPreviewDialog((current) => current ? { ...current, selectedIds } : current);
          }}
          onResolutionModeChange={(resolutionMode) => {
            setAppointmentWeekPreviewDialog((current) => current ? { ...current, resolutionMode } : current);
          }}
          onConfirm={() => { void handleConfirmAppointmentWeekPreview(); }}
          onClose={closeAppointmentWeekPreviewDialog}
        />
      ) : null}

      <AppointmentSaveReviewDialog
        open={appointmentSaveReviewRequest !== null}
        currentEmployeeIds={assignedEmployeeIds}
        resourceRequest={appointmentSaveReviewRequest?.resourceRequest ?? null}
        noteReview={appointmentSaveReviewRequest?.noteReview ?? null}
        isBusy={isSaving}
        onOpenChange={(open) => {
          if (!open) handleAppointmentSaveReviewCancel();
        }}
        onCancel={handleAppointmentSaveReviewCancel}
        onConfirm={handleAppointmentSaveReviewConfirm}
      />

      <AlertDialog open={projectReklamationConfirmOpen} onOpenChange={setProjectReklamationConfirmOpen}>
        <AlertDialogContent data-testid="dialog-project-reklamation-appointment-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Projekt ist bereits Reklamation</AlertDialogTitle>
            <AlertDialogDescription>
              Das Projekt ist bereits als Reklamation markiert. Soll auch der Termin als Reklamation markiert werden?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setProjectReklamationConfirmOpen(false);
                executeAppointmentReklamationAction();
              }}
              data-testid="button-confirm-project-reklamation-appointment"
            >
              Termin markieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProjectDocumentExtractionWorkflowDialog
        open={documentExtractionOpen}
        onOpenChange={(open) => {
          setDocumentExtractionOpen(open);
          if (!open) {
            setProjectDuplicateResolution(null);
          }
        }}
        data={documentExtractionData}
        isBusy={documentExtractionLoading}
        canCreateCustomer={!isMutationLocked && (userRole === "ADMIN" || userRole === "DISPATCHER")}
        onResolveCustomerByNumber={resolveCustomerByNumber}
        onCreateCustomer={createCustomerFromDraft}
        onUpdateExistingCustomer={updateExistingCustomerFromDraft}
        onOpenDocument={openDocumentExtractionFileInTab}
        onValidateProject={validateProjectDocumentExtractionTarget}
        onApply={applyExtractedProject}
        reklamationNoteDraft={documentExtractionReklamationNoteDraft}
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
          className="fixed inset-0 z-[70] overflow-hidden bg-background"
          data-testid="appointment-project-overlay"
        >
          <div className="flex h-full min-h-0 flex-col">
            <ProjectForm
              projectId={pendingProjectDraft.mode === "existing" ? pendingProjectDraft.projectId : undefined}
              initialDraft={pendingProjectDraft.mode === "create" ? {
                name: pendingProjectDraft.name,
                orderNumber: pendingProjectDraft.orderNumber,
                amount: pendingProjectDraft.amount,
                customerId: pendingProjectDraft.customerId,
                customer: pendingProjectDraft.customer,
                extractedArticleListHtml: pendingProjectDraft.extractedArticleListHtml,
                descriptionMd: pendingProjectDraft.descriptionMd,
                productSelections: pendingProjectDraft.productSelections,
                documentExtractionDecisions: pendingProjectDraft.documentExtractionDecisions,
                documentExtractionReklamation: pendingProjectDraft.documentExtractionReklamation,
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
        <DialogContent hideClose className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <EmployeePickerDialogList
            employees={availableEmployees}
            teams={teams}
            tours={tours}
            isLoading={employeesLoading}
            title="Mitarbeiter auswählen"
            selectionMode="multiple"
            viewModeSettingKey="appointmentEmployeePicker.viewMode"
            onSelectEmployee={(employeeId) => {
              addEmployees([employeeId]);
              setEmployeePickerOpen(false);
            }}
            onConfirmSelection={(employeeIds) => {
              addEmployees(employeeIds);
              setEmployeePickerOpen(false);
            }}
            onClose={() => setEmployeePickerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AppointmentCancelConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        disabled={cancelAppointmentMutation.isPending || !appointmentId || typeof appointmentDetail?.version !== "number" || !Number.isInteger(appointmentDetail.version) || appointmentDetail.version < 1}
        isPending={cancelAppointmentMutation.isPending}
        onConfirm={() => {
          if (!appointmentId) return;
          const version = appointmentDetail?.version;
          if (typeof version !== "number" || !Number.isInteger(version) || version < 1) return;
          cancelAppointmentMutation.mutate({ appointmentId, version });
        }}
      />

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

      <WorkflowNoteSuggestionDialog
        open={noteSuggestionDialog !== null}
        templateTitle={noteSuggestionDialog?.templateTitle}
        targetLabel="diesen Termin"
        onOpenChange={(open) => { if (!open) setNoteSuggestionDialog(null); }}
        onSkip={handleSkipTemplateNoteSuggestion}
        onConfirm={handleCreateTemplateNoteFromSuggestion}
      />

      <WorkflowNoteRemovalDialog
        open={noteRemovalDialog !== null}
        description={`Soll die Notiz „${noteRemovalDialog?.templateTitle ?? ""}“ ebenfalls entfernt werden?`}
        onOpenChange={(open) => { if (!open) setNoteRemovalDialog(null); }}
        onKeep={handleKeepTemplateNote}
        onConfirm={handleRemoveTemplateNote}
      />

      <Dialog open={templateNoteEditorOpen} onOpenChange={closeTemplateNoteEditor}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100dvw-2rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notiz bearbeiten</DialogTitle>
            <EditFormContextText>{templateNoteTitle.trim() || null}</EditFormContextText>
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
                label="Kartenfarbe"
              />
              {templateNoteCardColorLocked ? (
                <p className="text-xs text-slate-500" data-testid="text-note-card-color-locked">
                  Die Kartenfarbe stammt aus der Vorlage und kann für diese Notiz nicht geändert werden.
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
              <div>
                <Label htmlFor="template-note-print" className="text-sm font-medium">Drucken</Label>
                <p className="text-xs text-slate-500">Bestimmt, ob die Notiz in Druckausgaben berücksichtigt wird.</p>
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
            <Button variant="outline" onClick={() => closeTemplateNoteEditor(false)} data-testid="button-cancel-note">
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
              Speichern
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
    </Tabs>
  );
}
