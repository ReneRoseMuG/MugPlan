import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { EntityFormShell } from "@/components/ui/entity-form-shell";
import { ProjectAppointmentsPanel } from "@/components/ProjectAppointmentsPanel";
import { AppointmentsListPage } from "@/components/AppointmentsListPage";
import {
  ProjectAttachmentsPanel,
  type PendingProjectAttachmentItem,
} from "@/components/ProjectAttachmentsPanel";
import { ProjectOrderForm, ProjectProductFields, type ArticleCreateInput } from "@/components/ProjectOrderForm";
import { RichTextEditor } from "@/components/RichTextEditor";
import { DocumentExtractionDropzone } from "@/components/DocumentExtractionDropzone";
import {
  type ExtractionDialogData,
  type ExtractionCustomerDraft,
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
import { CustomersPage } from "@/components/CustomersPage";
import { NotesSection } from "@/components/NotesSection";
import {
  ProjectSaveReviewDialog,
  type ProjectSaveReviewDuplicateSummary,
  type ProjectSaveReviewNoteDraft,
  type ProjectSaveReviewResult,
} from "@/components/ProjectSaveReviewDialog";
import { WorkflowNoteRemovalDialog, WorkflowNoteSuggestionDialog } from "@/components/notes/WorkflowNoteDialogs";
import { TagPickerPanel, type TagRelationItem } from "@/components/TagPickerPanel";
import { CustomerDetailCard } from "@/components/ui/customer-detail-card";
import { EditFormContextText } from "@/components/ui/edit-form-context-text";
import { RelationSlot } from "@/components/ui/relation-slot";
import {
  FolderKanban,
  FileText,
  Calendar,
  LayoutList,
  ScrollText,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { joinEditFormContext } from "@/lib/edit-form-context";
import { invalidateTagProjectionQueries } from "@/lib/tag-invalidation";
import { fetchTagCatalog, getTagCatalogQueryKey } from "@/lib/tags";
import { DEFAULT_PROJECT_TYPE, resolveProjectEditForm } from "@/lib/project-edit-form";
import {
  buildDynamicProjectCategorySlots,
  buildPersistedProjectDescription,
  buildProjectArticleLines,
  cloneProjectProductSelections,
  createEmptyProjectProductSelections,
  createEmptyDynamicProjectProductSelections,
  createEmptySelection,
  extractEditorDescriptionHtml,
  getProjectProductField,
  isProductSelectionField,
  mapProjectOrderItemsToDynamicSelections,
  mapProjectOrderItemsToSelections,
  PROJECT_PRODUCT_FIELDS,
  resolveSelectionsFromExtraction,
  type DynamicProjectCategorySlot,
  type DynamicProjectProductSelections,
  type ProjectProductFieldKey,
  type ProjectProductSelections,
} from "@/lib/project-product-form";
import { useToast } from "@/hooks/use-toast";
import { computeTagAddedAction, computeTagRemovedAction } from "@/hooks/useTagRuleEngine";
import {
  buildWorkflowNoteDraft,
  findWorkflowNoteTemplate,
  normalizeWorkflowNoteTitle,
} from "@/lib/workflow-note-templates";
import {
  isManagedComplaintTagName,
  MANAGED_COMPLAINT_TAG_COLOR,
  MANAGED_COMPLAINT_TAG_NAME,
} from "@shared/appointmentCancellation";
import { JournalRecordsView } from "@/components/JournalRecordsView";
import { getStoredUserRole, isReaderRole } from "@/lib/auth";
import { collectMissingProjectArticleLabels, resolveSaunaTitleSuggestion } from "@/lib/project-save-review";
import type { Project, Customer, Note, NoteTemplate, Component, ComponentCategory, ProductCategory, ProjectOrderItem, InsertProjectOrderItem, Product, Tag } from "@shared/schema";
import { ADDRESS_ROLE_BILLING } from "@shared/schema";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error((await res.text()) || `Request failed for ${url}`);
  return res.json() as Promise<T>;
}

interface ProjectFormProps {
  projectId?: number;
  onCancel?: () => void;
  onSaved?: () => void;
  onOpenAppointment?: (context: { projectId?: number; appointmentId?: number }) => void;
  onOpenCalendarWorkspace?: (ctx: { projectId: number }) => void;
  initialDocumentExtractionFile?: File | null;
  initialDraft?: {
    name?: string;
    orderNumber?: string;
    amount?: string;
    customerId?: number | null;
    customer?: Customer | null;
    extractedArticleListHtml?: string;
    descriptionMd?: string;
    productSelections?: ProjectProductSelections;
    documentExtractionDecisions?: DocumentExtractionDecisionState | null;
    documentExtractionReklamation?: {
      enabled: boolean;
      createNote: boolean;
      noteDraft?: ProjectNoteDraft | null;
    };
  } | null;
  onProjectCreated?: (projectId: number, result?: { attachmentLinked: boolean }) => void;
}

type DraftProjectNote = Note & {
  templateId?: number;
};

type ProjectNoteDraft = {
  title: string;
  body: string;
  cardColor?: string | null;
  print: boolean;
  templateId?: number;
};

type ProjectSaveReviewRequest = {
  missingArticleLabels: string[];
  saunaModelName: string | null;
  reklamationNoteDraft: ProjectSaveReviewNoteDraft | null;
  duplicateAttachmentSummary: ProjectSaveReviewDuplicateSummary | null;
};

type DocumentExtractionDecisionState = {
  articleListReviewed: boolean;
  reklamationReviewed: boolean;
};

type ExtractionAttachmentDuplicateDecision = "allow" | "skip" | "not-needed" | "check";

type ExecuteProjectSaveOptions = {
  nameOverride?: string;
  additionalProjectNotes?: ProjectNoteDraft[];
  extractionAttachmentDuplicateDecision?: ExtractionAttachmentDuplicateDecision;
};

type ProjectOrderNumberResolutionResponse = {
  resolution: "none" | "single" | "multiple";
  count: number;
  project: Project | null;
  latestAppointment: ProjectDuplicateLatestAppointment | null;
};


export function ProjectForm({
  projectId,
  onCancel,
  onSaved,
  onOpenAppointment,
  onOpenCalendarWorkspace,
  initialDocumentExtractionFile,
  initialDraft,
  onProjectCreated,
}: ProjectFormProps) {
  const { toast } = useToast();
  const [resolvedExistingProjectId, setResolvedExistingProjectId] = useState<number | null>(null);
  const [projectDuplicateResolution, setProjectDuplicateResolution] = useState<ProjectDuplicateResolution | null>(null);
  const effectiveProjectId = projectId ?? resolvedExistingProjectId;
  const isEditing = effectiveProjectId != null;
  const invalidateAppointmentProjectionQueries = async () => {
    await invalidateTagProjectionQueries();
  };
  const invalidateProjectQueries = async () => {
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && key.startsWith("/api/projects");
      },
    });
    await queryClient.invalidateQueries({
      queryKey: ["projects-page-statuses"],
    });
    await invalidateAppointmentProjectionQueries();
    await queryClient.invalidateQueries({ queryKey: ["reports-vorlaufliste"] });
    await queryClient.invalidateQueries({ queryKey: ["reports-produktionsplanung"] });
  };
  const invalidateProjectNotesQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/projects', effectiveProjectId, 'notes'] });
    await queryClient.invalidateQueries({ queryKey: ["/api/projects/list"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/notes-preview"] });
    await invalidateAppointmentProjectionQueries();
  };
  
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState<number>(DEFAULT_PROJECT_TYPE);
  const [orderNumber, setOrderNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [plannedDateText, setPlannedDateText] = useState("");
  const [plannedWeek, setPlannedWeek] = useState("");
  const [descriptionMd, setDescriptionMd] = useState("");
  const [productSelections, setProductSelections] = useState<ProjectProductSelections>(createEmptyProjectProductSelections);
  const [dynamicProductSelections, setDynamicProductSelections] = useState<DynamicProjectProductSelections>({});
  const [articleListTouched, setArticleListTouched] = useState(false);
  const [extractedArticleListHtml, setExtractedArticleListHtml] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentExtractionOpen, setDocumentExtractionOpen] = useState(false);
  const [documentExtractionLoading, setDocumentExtractionLoading] = useState(false);
  const [documentExtractionData, setDocumentExtractionData] = useState<ExtractionDialogData | null>(null);
  const [documentExtractionFile, setDocumentExtractionFile] = useState<File | null>(initialDocumentExtractionFile ?? null);
  const [documentExtractionDecisions, setDocumentExtractionDecisions] = useState<DocumentExtractionDecisionState | null>(null);
  const [documentExtractionSelectedCustomer, setDocumentExtractionSelectedCustomer] = useState<Customer | null>(initialDraft?.customer ?? null);
  const [saveReviewRequest, setSaveReviewRequest] = useState<ProjectSaveReviewRequest | null>(null);
  const [isPreparingSaveReview, setIsPreparingSaveReview] = useState(false);
  const [noteSuggestionDialog, setNoteSuggestionDialog] = useState<{ templateTitle: string } | null>(null);
  const [noteRemovalDialog, setNoteRemovalDialog] = useState<{ templateTitle: string; noteId: number; noteVersion: number } | null>(null);
  const [suggestedProjectNoteDraft, setSuggestedProjectNoteDraft] = useState<ProjectNoteDraft | null>(null);
  const [pendingDraftReklamationTemplateTitle, setPendingDraftReklamationTemplateTitle] = useState<string | null>(null);
  const [draftProjectTags, setDraftProjectTags] = useState<TagRelationItem[]>([]);
  const [draftProjectNotes, setDraftProjectNotes] = useState<DraftProjectNote[]>([]);
  const [draftProjectAttachments, setDraftProjectAttachments] = useState<PendingProjectAttachmentItem[]>([]);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string>("");
  const [activeMainTab, setActiveMainTab] = useState<"details" | "appointments" | "journal">("details");
  const [didApplyInitialDraft, setDidApplyInitialDraft] = useState(false);
  const didApplyInitialDraftReklamationRef = useRef(false);
  const didInitializeCreateFormRef = useRef(false);
  const initializedEditProjectIdRef = useRef<number | null>(null);
  const hydratedEditProjectFormIdRef = useRef<number | null>(null);
  const draftNoteIdRef = useRef(-1);
  const draftAttachmentIdRef = useRef(-1);
  const workflowNoteSuggestionSeenRef = useRef(new Set<string>());
  const [userRole] = useState(() => getStoredUserRole());
  const isAdmin = userRole === "ADMIN";
  const isReader = isReaderRole(userRole);
  const isReadOnlyView = isReader;
  const canCreateFromDocumentExtraction = userRole === "ADMIN" || userRole === "DISPATCHER";
  const canManageProjectTags = !isReader && (isAdmin || userRole === "DISPATCHER");
  const canDeleteAttachments = !isReader && (isAdmin || userRole === "DISPATCHER");
  const matchesAttachmentFileSignature = (attachment: PendingProjectAttachmentItem, file: File) =>
    attachment.originalName === file.name && attachment.mimeType === (file.type || null) && attachment.file.size === file.size;
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
    name: string;
    orderNumber: string;
    amount: string;
    plannedDateText: string;
    plannedWeek: string;
    descriptionMd: string;
    productSelections: ProjectProductSelections;
    dynamicProductSelections: DynamicProjectProductSelections;
    extractedArticleListHtml: string;
    customerId: number | null;
    sidebarDraftSignature?: string | null;
  }) =>
    JSON.stringify({
      name: input.name.trim(),
      orderNumber: input.orderNumber.trim(),
      amount: input.amount.replace(",", ".").trim(),
      plannedDateText: input.plannedDateText.trim(),
      plannedWeek: input.plannedWeek.trim(),
      descriptionMd: input.descriptionMd,
      articleLines: buildProjectArticleLines(input.productSelections),
      dynamicSelections: Object.entries(input.dynamicProductSelections)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([slotId, selection]) => ({
          slotId,
          productId: selection.productId,
          componentId: selection.componentId,
          componentName: selection.componentName.trim(),
      })),
      extractedArticleListHtml: input.extractedArticleListHtml.trim(),
      customerId: input.customerId,
      sidebarDraftSignature: input.sidebarDraftSignature ?? null,
    });
  // Fetch project data if editing
  const { data: projectData, isLoading: projectLoading } = useQuery<{ project: Project; customer: Customer }>({
    queryKey: ['/api/projects', effectiveProjectId],
    enabled: isEditing,
  });
  const {
    data: assignedTags = [],
    isLoading: assignedTagsLoading,
    error: assignedTagsError,
  } = useQuery<TagRelationItem[]>({
    queryKey: ['/api/projects', effectiveProjectId, 'tags'],
    enabled: isEditing,
  });
  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: getTagCatalogQueryKey("project"),
    queryFn: () => fetchTagCatalog("project"),
  });
  const { data: noteTemplates = [] } = useQuery<NoteTemplate[]>({
    queryKey: ["/api/note-templates"],
    queryFn: () => fetchJson<NoteTemplate[]>("/api/note-templates"),
  });
  const documentExtractionReklamationNoteDraft = useMemo<ProjectNoteDraft>(() => {
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
  const openWorkflowNoteSuggestionDialog = (templateTitle: string) => {
    const suggestionKey = normalizeWorkflowNoteTitle(templateTitle);
    if (workflowNoteSuggestionSeenRef.current.has(suggestionKey)) {
      return false;
    }
    workflowNoteSuggestionSeenRef.current.add(suggestionKey);
    setNoteSuggestionDialog({ templateTitle });
    return true;
  };

  // Fetch customers for selection
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Fetch project notes
  const { data: projectNotes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ['/api/projects', effectiveProjectId, 'notes'],
    enabled: isEditing,
  });
  const createSidebarDraftSignature = useMemo(
    () => JSON.stringify({
      tagIds: draftProjectTags.map((item) => item.tag.id).sort((a, b) => a - b),
      notes: draftProjectNotes.map((note) => ({
        id: note.id,
        title: note.title,
        body: note.body,
        cardColor: note.cardColor,
        print: note.print,
        isPinned: note.isPinned,
      })),
      attachments: draftProjectAttachments.map((attachment) => ({
        id: attachment.id,
        originalName: attachment.originalName,
      })),
    }),
    [draftProjectAttachments, draftProjectNotes, draftProjectTags],
  );
  const emptyCreateSidebarDraftSignature = useMemo(
    () => JSON.stringify({ tagIds: [], notes: [], attachments: [] }),
    [],
  );
  const visibleProjectTags = isEditing ? assignedTags : draftProjectTags;
  const visibleProjectNotes = isEditing ? projectNotes : draftProjectNotes;
  const hasReklamationTag = visibleProjectTags.some((item) => isManagedComplaintTagName(item.tag.name));
  const availableComplaintTag = useMemo(
    () => availableTags.find((tag) => isManagedComplaintTagName(tag.name)) ?? null,
    [availableTags],
  );

  const masterDataScope = isAdmin ? "all" : "active";
  const productCategoriesUrl = `/api/admin/master-data/product-categories?active=${masterDataScope}`;
  const productsUrl = `/api/admin/master-data/products?active=${masterDataScope}`;
  const componentCategoriesUrl = `/api/admin/master-data/component-categories?active=${masterDataScope}`;
  const componentsUrl = `/api/admin/master-data/components?active=${masterDataScope}`;
  const projectOrderItemsUrl = effectiveProjectId ? `/api/projects/${effectiveProjectId}/order-items` : null;

  const { data: productCategories = [] } = useQuery<ProductCategory[]>({
    queryKey: [productCategoriesUrl],
    queryFn: () => fetchJson<ProductCategory[]>(productCategoriesUrl),
    staleTime: 0,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: [productsUrl],
    queryFn: () => fetchJson<Product[]>(productsUrl),
    staleTime: 0,
  });

  const { data: componentCategories = [] } = useQuery<ComponentCategory[]>({
    queryKey: [componentCategoriesUrl],
    queryFn: () => fetchJson<ComponentCategory[]>(componentCategoriesUrl),
    staleTime: 0,
  });

  const { data: components = [] } = useQuery<Component[]>({
    queryKey: [componentsUrl],
    queryFn: () => fetchJson<Component[]>(componentsUrl),
    staleTime: 0,
  });

  const { data: projectOrderItems = [], isFetched: projectOrderItemsFetched } = useQuery<ProjectOrderItem[]>({
    queryKey: projectOrderItemsUrl ? [projectOrderItemsUrl] : ["project-order-items-disabled"],
    enabled: Boolean(projectOrderItemsUrl),
  });
  const dynamicCategorySlots = useMemo<DynamicProjectCategorySlot[]>(
    () => buildDynamicProjectCategorySlots({ productCategories, componentCategories }),
    [componentCategories, productCategories],
  );

  useEffect(() => {
    setDynamicProductSelections((current) => {
      const next = createEmptyDynamicProjectProductSelections(dynamicCategorySlots);
      for (const slot of dynamicCategorySlots) {
        if (current[slot.slotId]) {
          next[slot.slotId] = { ...current[slot.slotId] };
        }
      }
      return next;
    });
  }, [dynamicCategorySlots]);


  // Initialize form when project data loads
  useEffect(() => {
    if (projectData && effectiveProjectId) {
      if (hydratedEditProjectFormIdRef.current === effectiveProjectId) {
        return;
      }
      hydratedEditProjectFormIdRef.current = effectiveProjectId;
      didInitializeCreateFormRef.current = false;
      const projectName = projectData.project.name.trim();
      setProjectType(projectData.project.type ?? DEFAULT_PROJECT_TYPE);
      setName(projectName);
      setOrderNumber(projectData.project.orderNumber ?? "");
      setAmount(projectData.project.amount != null ? String(projectData.project.amount) : "");
      setPlannedDateText(projectData.project.projectOrder?.plannedDateText ?? "");
      setPlannedWeek(projectData.project.projectOrder?.plannedWeek ?? "");
      setDescriptionMd(extractEditorDescriptionHtml(projectData.project.descriptionMd));
      setExtractedArticleListHtml("");
      setArticleListTouched(false);
      setCustomerId(projectData.project.customerId);
      setDocumentExtractionDecisions(null);
      setDocumentExtractionSelectedCustomer(null);
      setInitialFormSnapshot(
        buildFormSnapshot({
          name: projectName,
          orderNumber: projectData.project.orderNumber ?? "",
          amount: projectData.project.amount != null ? String(projectData.project.amount) : "",
          plannedDateText: projectData.project.projectOrder?.plannedDateText ?? "",
          plannedWeek: projectData.project.projectOrder?.plannedWeek ?? "",
          descriptionMd: extractEditorDescriptionHtml(projectData.project.descriptionMd),
          productSelections: createEmptyProjectProductSelections(),
          dynamicProductSelections: createEmptyDynamicProjectProductSelections(dynamicCategorySlots),
          extractedArticleListHtml: "",
          customerId: projectData.project.customerId,
          sidebarDraftSignature: null,
        }),
      );
    } else if (!isEditing) {
      hydratedEditProjectFormIdRef.current = null;
      if (didInitializeCreateFormRef.current) {
        return;
      }
      didInitializeCreateFormRef.current = true;
      setProjectType(DEFAULT_PROJECT_TYPE);
      setProductSelections(createEmptyProjectProductSelections());
      setDynamicProductSelections(createEmptyDynamicProjectProductSelections(dynamicCategorySlots));
      setArticleListTouched(false);
      setExtractedArticleListHtml("");
      setDocumentExtractionDecisions(null);
      setDocumentExtractionSelectedCustomer(null);
      setInitialFormSnapshot(
        buildFormSnapshot({
          name: "",
          orderNumber: "",
          amount: "",
          plannedDateText: "",
          plannedWeek: "",
          descriptionMd: "",
          productSelections: createEmptyProjectProductSelections(),
          dynamicProductSelections: createEmptyDynamicProjectProductSelections(dynamicCategorySlots),
          extractedArticleListHtml: "",
          customerId: null,
          sidebarDraftSignature: emptyCreateSidebarDraftSignature,
        }),
      );
    }
  }, [dynamicCategorySlots, emptyCreateSidebarDraftSignature, isEditing, projectData]);

  useEffect(() => {
    if (!isEditing || products.length === 0 || components.length === 0 || componentCategories.length === 0) return;
    if (projectOrderItemsUrl && !projectOrderItemsFetched) return;
    if (initializedEditProjectIdRef.current === effectiveProjectId) return;
    initializedEditProjectIdRef.current = effectiveProjectId ?? null;
    setProductSelections(mapProjectOrderItemsToSelections(projectOrderItems, products, components, componentCategories));
    setDynamicProductSelections(
      mapProjectOrderItemsToDynamicSelections(projectOrderItems, products, components, dynamicCategorySlots),
    );
  }, [componentCategories, components, dynamicCategorySlots, effectiveProjectId, isEditing, products, projectOrderItems, projectOrderItemsFetched, projectOrderItemsUrl]);

  useEffect(() => {
    if (!initialDocumentExtractionFile) {
      return;
    }
    setDocumentExtractionFile(initialDocumentExtractionFile);
    addDraftProjectAttachment(initialDocumentExtractionFile);
  }, [initialDocumentExtractionFile]);

  useEffect(() => {
    if (isEditing || !initialDraft || didApplyInitialDraft) return;
    const nextSelections = initialDraft.productSelections
      ? cloneProjectProductSelections(initialDraft.productSelections)
      : createEmptyProjectProductSelections();
    const nextDynamicSelections = createEmptyDynamicProjectProductSelections(dynamicCategorySlots);
    setName(initialDraft.name ?? "");
    setOrderNumber(initialDraft.orderNumber ?? "");
    setAmount(initialDraft.amount ?? "");
    setDescriptionMd(initialDraft.descriptionMd ?? "");
    setCustomerId(initialDraft.customerId ?? null);
    setDocumentExtractionSelectedCustomer(initialDraft.customer ?? null);
    setDocumentExtractionDecisions(initialDraft.documentExtractionDecisions ?? null);
    setProductSelections(nextSelections);
    setDynamicProductSelections(nextDynamicSelections);
    setArticleListTouched(false);
    setExtractedArticleListHtml(initialDraft.extractedArticleListHtml ?? "");
    setInitialFormSnapshot(
      buildFormSnapshot({
        name: initialDraft.name ?? "",
        orderNumber: initialDraft.orderNumber ?? "",
        amount: initialDraft.amount ?? "",
        plannedDateText: "",
        plannedWeek: "",
        descriptionMd: initialDraft.descriptionMd ?? "",
        productSelections: nextSelections,
        dynamicProductSelections: nextDynamicSelections,
        extractedArticleListHtml: initialDraft.extractedArticleListHtml ?? "",
        customerId: initialDraft.customerId ?? null,
        sidebarDraftSignature: emptyCreateSidebarDraftSignature,
      }),
    );
    setDidApplyInitialDraft(true);
  }, [didApplyInitialDraft, dynamicCategorySlots, emptyCreateSidebarDraftSignature, initialDraft, isEditing]);

  const selectedCustomer = customers.find(c => c.id === customerId)
    || projectData?.customer
    || (documentExtractionSelectedCustomer?.id === customerId ? documentExtractionSelectedCustomer : undefined);
  const selectedCustomerNumber = selectedCustomer?.customerNumber?.trim() ?? "";
  const projectNamePreview = name.trim();
  const projectEditContext = useMemo(
    () => (
      isEditing
        ? joinEditFormContext([
          projectNamePreview,
          orderNumber.trim() ? `Auftrag ${orderNumber.trim()}` : null,
        ])
        : null
    ),
    [isEditing, orderNumber, projectNamePreview],
  );
  const projectVersion = projectData?.project.version;
  const resolvedProjectEditForm = resolveProjectEditForm(projectType);
  const articleLines = buildProjectArticleLines(productSelections);
  useEffect(() => {
    if (!isEditing || !projectData || products.length === 0 || components.length === 0 || componentCategories.length === 0) return;
    setInitialFormSnapshot(
      buildFormSnapshot({
        name: projectData.project.name.trim(),
        orderNumber: projectData.project.orderNumber ?? "",
        amount: projectData.project.amount != null ? String(projectData.project.amount) : "",
        plannedDateText: projectData.project.projectOrder?.plannedDateText ?? "",
        plannedWeek: projectData.project.projectOrder?.plannedWeek ?? "",
        descriptionMd: extractEditorDescriptionHtml(projectData.project.descriptionMd),
        productSelections: mapProjectOrderItemsToSelections(projectOrderItems, products, components, componentCategories),
        dynamicProductSelections: mapProjectOrderItemsToDynamicSelections(projectOrderItems, products, components, dynamicCategorySlots),
        extractedArticleListHtml: "",
        customerId: projectData.project.customerId,
        sidebarDraftSignature: null,
      }),
    );
  }, [componentCategories, components, dynamicCategorySlots, isEditing, products, projectData, projectOrderItems]);

  // MS-68: Der Kunden-Contract nimmt nur Stammdaten; die Adresse läuft ausschließlich über das
  // Adress-Backend (Rechnungsadresse). Diese Helfer trennen beide Schreibwege sauber.
  const mapExtractionCustomerToStammdaten = (customer: ExtractionCustomerDraft) => ({
    customerNumber: customer.customerNumber.trim(),
    firstName: customer.firstName?.trim() || null,
    lastName: customer.lastName?.trim() || null,
    company: customer.company?.trim() || null,
    email: customer.email?.trim() || null,
    phone: customer.phone?.trim() || null,
  });

  const fetchBillingAddressForCustomer = async (customerId: number) => {
    const res = await fetch(`/api/customers/${customerId}/addresses`, { credentials: "include" });
    if (!res.ok) return null;
    const addresses = (await res.json()) as Array<{
      id: number;
      roleKey: string | null;
      version: number;
      addressLine1: string | null;
      addressLine2: string | null;
      postalCode: string | null;
      city: string | null;
      country: string | null;
    }>;
    return addresses.find((address) => address.roleKey === ADDRESS_ROLE_BILLING) ?? null;
  };

  const patchBillingAddress = async (
    customerId: number,
    billing: { id: number; version: number },
    fields: { addressLine1: string | null; addressLine2: string | null; postalCode: string | null; city: string | null; country: string | null },
  ) => {
    const res = await fetch(`/api/customers/${customerId}/addresses/${billing.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, version: billing.version }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.message ?? "Rechnungsadresse konnte nicht gespeichert werden.");
    }
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

  const createCustomerFromDraft = async (customerDraft: ExtractionCustomerDraft): Promise<Customer> => {
    const response = await fetch("/api/customers", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mapExtractionCustomerToStammdaten(customerDraft)),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.code === "CUSTOMER_NUMBER_CONFLICT" ? "Kundennummer ist bereits vergeben." : (payload?.message ?? "Kunde konnte nicht angelegt werden"));
    }
    const customer = payload as Customer;
    // Extrahierte Adresse in die frische Rechnungsadresse schreiben — über das Adress-Backend,
    // nicht über den Kunden-Contract. Ohne erkannte Adressdaten bleibt sie leer.
    const draftAddress = {
      addressLine1: customerDraft.addressLine1?.trim() || null,
      addressLine2: customerDraft.addressLine2?.trim() || null,
      postalCode: customerDraft.postalCode?.trim() || null,
      city: customerDraft.city?.trim() || null,
      country: customerDraft.country?.trim() || null,
    };
    if (Object.values(draftAddress).some((value) => value !== null)) {
      const billing = await fetchBillingAddressForCustomer(customer.id);
      if (billing) {
        await patchBillingAddress(customer.id, billing, draftAddress);
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/customers/list"] });
    return customer;
  };

  const updateExistingCustomerFromDraft = async (
    existingCustomer: Customer,
    customerDraft: ExtractionCustomerDraft,
  ): Promise<Customer> => {
    const addressKeys = ["addressLine1", "addressLine2", "postalCode", "city", "country"] as const;
    const splitBackfill = (source: Customer) => {
      const full = buildCustomerBackfillUpdatePayload(source, customerDraft);
      const stammdaten: Record<string, string | null> = {};
      const address: Partial<Record<(typeof addressKeys)[number], string | null>> = {};
      for (const [key, value] of Object.entries(full)) {
        if ((addressKeys as readonly string[]).includes(key)) {
          address[key as (typeof addressKeys)[number]] = value;
        } else {
          stammdaten[key] = value;
        }
      }
      return { stammdaten, address };
    };

    const initial = splitBackfill(existingCustomer);
    let resultCustomer = existingCustomer;

    // 1. Stammdaten-Ergänzung über den Kunden-Contract (mit Versions-Retry bei Konflikt).
    if (Object.keys(initial.stammdaten).length > 0) {
      const sendStammdaten = async (customer: Customer, fields: Record<string, string | null>) =>
        fetch(`/api/customers/${customer.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...fields, version: customer.version }),
        });

      let response = await sendStammdaten(existingCustomer, initial.stammdaten);
      if (response.status === 409) {
        const freshResponse = await fetch(`/api/customers/${existingCustomer.id}`, { method: "GET", credentials: "include" });
        if (!freshResponse.ok) {
          throw new Error("Kunde konnte vor der Ergänzung nicht neu geladen werden.");
        }
        const freshCustomer = (await freshResponse.json()) as Customer;
        const retry = splitBackfill(freshCustomer);
        resultCustomer = freshCustomer;
        if (Object.keys(retry.stammdaten).length > 0) {
          response = await sendStammdaten(freshCustomer, retry.stammdaten);
          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(payload?.message ?? "Kunde konnte nicht ergänzt werden.");
          }
          resultCustomer = payload as Customer;
        }
      } else {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.message ?? "Kunde konnte nicht ergänzt werden.");
        }
        resultCustomer = payload as Customer;
      }
    }

    // 2. Adress-Ergänzung über das Adress-Backend: leere Rechnungsadressfelder auffüllen.
    if (Object.keys(initial.address).length > 0) {
      const billing = await fetchBillingAddressForCustomer(existingCustomer.id);
      if (billing) {
        await patchBillingAddress(existingCustomer.id, billing, {
          addressLine1: initial.address.addressLine1 ?? billing.addressLine1 ?? null,
          addressLine2: initial.address.addressLine2 ?? billing.addressLine2 ?? null,
          postalCode: initial.address.postalCode ?? billing.postalCode ?? null,
          city: initial.address.city ?? billing.city ?? null,
          country: initial.address.country ?? billing.country ?? null,
        });
      }
    }

    await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/customers/list"] });
    return resultCustomer;
  };

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

  const resolveProjectByOrderNumber = async (value: string) => {
    const response = await fetch("/api/document-extraction/resolve-project-by-order-number", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderNumber: value.trim() }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message ?? "Auftragsnummer konnte nicht aufgelöst werden");
    }
    return (await response.json()) as ProjectOrderNumberResolutionResponse;
  };

  const confirmExistingProjectDuplicate = () => {
    if (!projectDuplicateResolution) return;
    setResolvedExistingProjectId(projectDuplicateResolution.project.id);
    setProjectDuplicateResolution(null);
    setDocumentExtractionOpen(false);
    toast({
      title: "Vorhandenes Projekt geöffnet",
      description: "Projekt mit dieser Auftragsnummer existiert bereits.",
    });
  };

  const runDocumentExtraction = async (file: File) => {
    setDocumentExtractionLoading(true);
    setDocumentExtractionFile(file);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/document-extraction/extract?scope=project_form", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Dokumentextraktion fehlgeschlagen");
      }
      addDraftProjectAttachment(file);
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

  const handleFieldSelection = (fieldKey: ProjectProductFieldKey, selectedValue: string) => {
    setArticleListTouched(true);
    setDocumentExtractionDecisions((current) => current ? { ...current, articleListReviewed: false } : current);
    if (!selectedValue) {
      setProductSelections((current) => ({ ...current, [fieldKey]: createEmptySelection() }));
      return;
    }

    const field = getProjectProductField(fieldKey);
    const numericSelectedId = Number(selectedValue);
    if (!Number.isFinite(numericSelectedId) || numericSelectedId <= 0) return;
    const product = field.source === "product"
      ? products.find((entry) => entry.id === numericSelectedId) ?? null
      : null;
    const component = field.source === "component"
      ? components.find((entry) => entry.id === numericSelectedId) ?? null
      : null;
    if (field.source === "product" && !product) return;
    if (field.source === "component" && !component) return;

    setProductSelections((current) => ({
      ...current,
      [fieldKey]: {
        productId: product?.id ?? null,
        componentId: component?.id ?? null,
        componentName: product?.name ?? component?.name ?? "",
        itemId: null,
        version: null,
      },
    }));
  };

  const handleDynamicFieldSelection = (slotId: string, selectedValue: string) => {
    setArticleListTouched(true);
    setDocumentExtractionDecisions((current) => current ? { ...current, articleListReviewed: false } : current);
    const slot = dynamicCategorySlots.find((entry) => entry.slotId === slotId);
    if (!slot) return;

    if (!selectedValue) {
      setDynamicProductSelections((current) => ({ ...current, [slotId]: createEmptySelection() }));
      return;
    }

    const numericSelectedId = Number(selectedValue);
    if (!Number.isFinite(numericSelectedId) || numericSelectedId <= 0) return;

    const product = slot.source === "product"
      ? products.find((entry) => entry.id === numericSelectedId && entry.categoryId === slot.categoryId) ?? null
      : null;
    const component = slot.source === "component"
      ? components.find((entry) => entry.id === numericSelectedId && entry.categoryId === slot.categoryId) ?? null
      : null;
    if (slot.source === "product" && !product) return;
    if (slot.source === "component" && !component) return;

    setDynamicProductSelections((current) => ({
      ...current,
      [slot.slotId]: {
        productId: product?.id ?? null,
        componentId: component?.id ?? null,
        componentName: product?.name ?? component?.name ?? "",
        itemId: null,
        version: null,
      },
    }));
  };

  const persistBufferedOrderItems = async (createdProjectId: number, createdOrderNumber: string) => {
    for (const field of PROJECT_PRODUCT_FIELDS) {
      const selection = productSelections[field.key];
      if (field.source === "product" && selection.productId == null) continue;
      if (field.source === "component" && selection.componentId == null) continue;
      await apiRequest("POST", `/api/projects/${createdProjectId}/order-items`, {
        projectId: createdProjectId,
        orderNumber: createdOrderNumber,
        productId: field.source === "product" ? selection.productId : null,
        componentId: field.source === "component" ? selection.componentId : null,
        quantity: 1,
      });
    }
    for (const slot of dynamicCategorySlots) {
      const selection = dynamicProductSelections[slot.slotId];
      if (!selection) continue;
      if (slot.source === "product" && selection.productId == null) continue;
      if (slot.source === "component" && selection.componentId == null) continue;
      await apiRequest("POST", `/api/projects/${createdProjectId}/order-items`, {
        projectId: createdProjectId,
        orderNumber: createdOrderNumber,
        productId: slot.source === "product" ? selection.productId : null,
        componentId: slot.source === "component" ? selection.componentId : null,
        quantity: 1,
      });
    }
    await queryClient.invalidateQueries({ queryKey: [`/api/projects/${createdProjectId}/order-items`] });
  };

  const handleCreateForField = async (fieldKey: ProjectProductFieldKey, input: ArticleCreateInput): Promise<void> => {
    const isProduct = isProductSelectionField(fieldKey);
    const apiUrl = isProduct
      ? "/api/admin/master-data/products"
      : "/api/admin/master-data/components";
    const payload = { name: input.name, shortCode: input.shortCode, categoryId: input.categoryId, description: input.description, isActive: true, version: 1 };
    const response = await apiRequest("POST", apiUrl, payload);
    const created = await response.json() as Product | Component;
    await queryClient.invalidateQueries({ queryKey: [isProduct ? productsUrl : componentsUrl] });
    const productId = isProduct ? (created as Product).id : null;
    const componentId = isProduct ? null : (created as Component).id;
    const itemName = created.name;
    if (isEditing && effectiveProjectId && projectData?.project.orderNumber) {
      const savedItemResponse = await apiRequest("POST", `/api/projects/${effectiveProjectId}/order-items`, {
        projectId: effectiveProjectId,
        orderNumber: projectData.project.orderNumber,
        productId,
        componentId,
        quantity: 1,
      });
      const savedItem = await savedItemResponse.json() as ProjectOrderItem;
      setProductSelections((current) => ({
        ...current,
        [fieldKey]: { productId, componentId, componentName: itemName, itemId: savedItem.id, version: savedItem.version },
      }));
      await queryClient.invalidateQueries({ queryKey: [`/api/projects/${effectiveProjectId}/order-items`] });
    } else {
      setProductSelections((current) => ({
        ...current,
        [fieldKey]: { productId, componentId, componentName: itemName, itemId: null, version: null },
      }));
    }
  };

  const handleCreateForSlot = async (slotId: string, input: ArticleCreateInput): Promise<void> => {
    const slot = dynamicCategorySlots.find((s) => s.slotId === slotId);
    if (!slot) return;
    const isProduct = slot.source === "product";
    const apiUrl = isProduct
      ? "/api/admin/master-data/products"
      : "/api/admin/master-data/components";
    const payload = { name: input.name, shortCode: input.shortCode, categoryId: input.categoryId, description: input.description, isActive: true, version: 1 };
    const response = await apiRequest("POST", apiUrl, payload);
    const created = await response.json() as Product | Component;
    await queryClient.invalidateQueries({ queryKey: [isProduct ? productsUrl : componentsUrl] });
    const productId = isProduct ? (created as Product).id : null;
    const componentId = isProduct ? null : (created as Component).id;
    const itemName = created.name;
    if (isEditing && effectiveProjectId && projectData?.project.orderNumber) {
      const savedItemResponse = await apiRequest("POST", `/api/projects/${effectiveProjectId}/order-items`, {
        projectId: effectiveProjectId,
        orderNumber: projectData.project.orderNumber,
        productId,
        componentId,
        quantity: 1,
      });
      const savedItem = await savedItemResponse.json() as ProjectOrderItem;
      setDynamicProductSelections((current) => ({
        ...current,
        [slotId]: { productId, componentId, componentName: itemName, itemId: savedItem.id, version: savedItem.version },
      }));
      await queryClient.invalidateQueries({ queryKey: [`/api/projects/${effectiveProjectId}/order-items`] });
    } else {
      setDynamicProductSelections((current) => ({
        ...current,
        [slotId]: { productId, componentId, componentName: itemName, itemId: null, version: null },
      }));
    }
  };

  const isFormDirty = buildFormSnapshot({
    name,
    orderNumber,
    amount,
    plannedDateText,
    plannedWeek,
    descriptionMd,
    productSelections,
    dynamicProductSelections,
    extractedArticleListHtml,
    customerId,
    sidebarDraftSignature: isEditing ? null : createSidebarDraftSignature,
  }) !== initialFormSnapshot;
  const handleRequestClose = () => {
    if (isFormDirty) {
      setCloseConfirmOpen(true);
      return;
    }
    onCancel?.();
  };

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; type: number; orderNumber?: string | null; amount?: string | null; customerId: number; descriptionMd?: string; projectOrder?: { amount?: string | null; plannedDateText?: string | null; plannedWeek?: string | null } }) => {
      const res = await apiRequest('POST', '/api/projects', data);
      return res.json();
    },
    onSuccess: () => {
      void invalidateProjectQueries();
      toast({ title: "Projekt erstellt" });
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "INACTIVE_ENTITY_ASSIGNMENT") {
        toast({
          title: "Speichern nicht möglich",
          description: "Der ausgewählte Kunde ist inaktiv. Bitte einen aktiven Kunden zuordnen.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Fehler beim Erstellen", variant: "destructive" });
    },
  });

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { version: number; type?: number; name?: string; orderNumber?: string | null; amount?: string | null; customerId?: number; descriptionMd?: string; projectOrder?: { amount?: string | null; plannedDateText?: string | null; plannedWeek?: string | null } }) => {
      const res = await apiRequest('PATCH', `/api/projects/${effectiveProjectId}`, data);
      return res.json();
    },
    onSuccess: () => {
      void invalidateProjectQueries();
      toast({ title: "Projekt gespeichert" });
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "INACTIVE_ENTITY_ASSIGNMENT") {
        toast({
          title: "Speichern nicht möglich",
          description: "Der ausgewählte Kunde ist inaktiv. Bitte einen aktiven Kunden zuordnen.",
          variant: "destructive",
        });
        return;
      }
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Speichern nicht möglich",
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    },
  });

  const addDraftProjectTag = (tagId: number) => {
    const tag = availableTags.find((entry) => entry.id === tagId);
    if (!tag) {
      toast({
        title: "Tag konnte nicht hinzugefügt werden",
        description: "Der ausgewählte Tag ist nicht verfügbar.",
        variant: "destructive",
      });
      return;
    }
    setDraftProjectTags((current) => {
      if (current.some((entry) => entry.tag.id === tagId)) {
        return current;
      }
      return [...current, { tag, relationVersion: 1 }];
    });
  };

  const removeDraftProjectTag = (item: TagRelationItem) => {
    setDraftProjectTags((current) => current.filter((entry) => entry.tag.id !== item.tag.id));
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

  const setDraftProjectReklamation = () => {
    const complaintTag = buildDraftComplaintTag();
    setDraftProjectTags((current) => {
      if (current.some((entry) => isManagedComplaintTagName(entry.tag.name))) {
        return current;
      }
      return [...current, { tag: complaintTag, relationVersion: 1 }];
    });
    setPendingDraftReklamationTemplateTitle("Reklamation");
  };

  const removeDraftProjectReklamation = () => {
    setDraftProjectTags((current) => current.filter((entry) => !isManagedComplaintTagName(entry.tag.name)));
    setPendingDraftReklamationTemplateTitle(null);
    clearWorkflowNoteSuggestionSeen("Reklamation");
    openProjectNoteRemovalForTag("Reklamation");
  };

  const toggleDraftProjectReklamation = () => {
    if (hasReklamationTag) {
      removeDraftProjectReklamation();
      return;
    }
    setDraftProjectReklamation();
  };

  const addDraftProjectAttachment = (file: File) => {
    setDraftProjectAttachments((current) => {
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

  const addDraftProjectNote = ({
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
    setDraftProjectNotes((current) => [
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
    if (
      pendingDraftReklamationTemplateTitle
      && normalizeWorkflowNoteTitle(title) === normalizeWorkflowNoteTitle(pendingDraftReklamationTemplateTitle)
    ) {
      setPendingDraftReklamationTemplateTitle(null);
    }
  };

  const addDraftProjectNoteIfMissing = (draft: ProjectNoteDraft) => {
    const alreadyExists = visibleProjectNotes.some(
      (note) => normalizeWorkflowNoteTitle(note.title) === normalizeWorkflowNoteTitle(draft.title),
    );
    if (alreadyExists) return;
    addDraftProjectNote(draft);
  };

  const openDraftReklamationNoteEditorFromTemplate = async () => {
    const templates = noteTemplates.length > 0
      ? noteTemplates
      : await queryClient.ensureQueryData({
        queryKey: ["/api/note-templates"],
        queryFn: () => fetchJson<NoteTemplate[]>("/api/note-templates"),
      });
    const template = findWorkflowNoteTemplate(templates, "Reklamation");
    if (!template) {
      toast({
        title: "Notizvorlage fehlt",
        description: "Die Notizvorlage „Reklamation“ wurde nicht gefunden.",
        variant: "destructive",
      });
      setPendingDraftReklamationTemplateTitle(null);
      return;
    }
    const draft = buildWorkflowNoteDraft(template);
    const alreadyExists = visibleProjectNotes.some(
      (note) => normalizeWorkflowNoteTitle(note.title) === normalizeWorkflowNoteTitle(draft.title),
    );
    if (!alreadyExists) {
      setSuggestedProjectNoteDraft(draft);
    }
    setPendingDraftReklamationTemplateTitle(null);
  };

  useEffect(() => {
    if (isEditing || !didApplyInitialDraft || didApplyInitialDraftReklamationRef.current) return;
    const initialReklamation = initialDraft?.documentExtractionReklamation;
    if (!initialReklamation?.enabled) return;
    didApplyInitialDraftReklamationRef.current = true;
    setDraftProjectReklamation();
    if (initialReklamation.noteDraft) {
      addDraftProjectNoteIfMissing(initialReklamation.noteDraft);
      setPendingDraftReklamationTemplateTitle(null);
    } else if (initialReklamation.createNote) {
      void openDraftReklamationNoteEditorFromTemplate();
    } else {
      setPendingDraftReklamationTemplateTitle(null);
    }
  }, [didApplyInitialDraft, initialDraft, isEditing]);

  const updateDraftProjectNote = (
    noteId: number,
    data: { title: string; body: string; cardColor?: string | null; print: boolean },
  ) => {
    const updatedAt = new Date();
    setDraftProjectNotes((current) => current.map((note) => (
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

  const toggleDraftProjectNotePin = (noteId: number, isPinned: boolean) => {
    setDraftProjectNotes((current) => current.map((note) => (
      note.id === noteId
        ? { ...note, isPinned, updatedAt: new Date() }
        : note
    )));
  };

  const deleteDraftProjectNote = (noteId: number) => {
    setDraftProjectNotes((current) => current.filter((note) => note.id !== noteId));
  };

  const openProjectNoteSuggestionForTag = (tagName: string) => {
    const action = computeTagAddedAction(
      tagName,
      effectiveProjectId ?? null,
      visibleProjectNotes.map((note) => ({ title: note.title })),
    );
    if (action.kind === "show_note_suggestion_dialog") {
      openWorkflowNoteSuggestionDialog(action.templateTitle);
    }
  };

  const openProjectNoteRemovalForTag = (tagName: string) => {
    const action = computeTagRemovedAction(
      tagName,
      visibleProjectNotes.map((note) => ({ title: note.title })),
    );
    if (action.kind !== "show_note_removal_dialog") {
      return;
    }
    clearWorkflowNoteSuggestionSeen(action.templateTitle);

    const matchingNote = visibleProjectNotes.find((note) => normalizeWorkflowNoteTitle(note.title) === normalizeWorkflowNoteTitle(action.templateTitle));
    if (!matchingNote || !Number.isInteger(matchingNote.version) || matchingNote.version < 1) {
      return;
    }
    setNoteRemovalDialog({
      templateTitle: action.templateTitle,
      noteId: matchingNote.id,
      noteVersion: matchingNote.version,
    });
  };

  const handleCreateProjectNoteFromSuggestion = async () => {
    if (!noteSuggestionDialog) return;
    const templates = noteTemplates.length > 0
      ? noteTemplates
      : await queryClient.ensureQueryData({
        queryKey: ["/api/note-templates"],
        queryFn: () => fetchJson<NoteTemplate[]>("/api/note-templates"),
      });
    const template = findWorkflowNoteTemplate(templates, noteSuggestionDialog.templateTitle);
    if (!template) {
      toast({
        title: "Notizvorlage fehlt",
        description: `Die Notizvorlage „${noteSuggestionDialog.templateTitle}“ wurde nicht gefunden.`,
        variant: "destructive",
      });
      return;
    }

    setSuggestedProjectNoteDraft(buildWorkflowNoteDraft(template));
    setNoteSuggestionDialog(null);
  };

  // Note mutations
  const getProjectNoteVersion = (noteId: number): number => {
    const note = projectNotes.find((entry) => entry.id === noteId);
    if (!note || !Number.isInteger(note.version) || note.version < 1) {
      throw new Error("422: {\"code\":\"VALIDATION_ERROR\"}");
    }
    return note.version;
  };

  const createNoteMutation = useMutation({
    mutationFn: async (data: { title: string; body: string; cardColor?: string | null; print: boolean; templateId?: number }) => {
      const res = await apiRequest('POST', `/api/projects/${effectiveProjectId}/notes`, data);
      return res.json();
    },
    onSuccess: () => {
      void invalidateProjectNotesQueries();
    },
    onError: (error: Error) => {
      toast({
        title: "Notiz konnte nicht angelegt werden",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, title, body, cardColor, print, version }: { noteId: number; title: string; body: string; cardColor?: string | null; print: boolean; version: number }) => {
      const res = await apiRequest("PUT", `/api/notes/${noteId}`, { title, body, cardColor, print, version });
      return res.json();
    },
    onSuccess: () => {
      void invalidateProjectNotesQueries();
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Notiz konnte nicht aktualisiert werden",
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Fehler beim Aktualisieren", variant: "destructive" });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned, version }: { noteId: number; isPinned: boolean; version: number }) => {
      const res = await apiRequest('PATCH', `/api/notes/${noteId}/pin`, { isPinned, version });
      return res.json();
    },
    onSuccess: () => {
      void invalidateProjectNotesQueries();
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Notiz konnte nicht aktualisiert werden",
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
      }
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async ({ noteId, version }: { noteId: number; version: number }) => {
      await apiRequest('DELETE', `/api/projects/${effectiveProjectId}/notes/${noteId}`, { version });
    },
    onSuccess: () => {
      void invalidateProjectNotesQueries();
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Notiz konnte nicht gelöscht werden",
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
      }
    },
  });

  const addProjectTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const response = await apiRequest('POST', `/api/projects/${effectiveProjectId}/tags`, { tagId });
      return response.json();
    },
    onSuccess: (_relation, tagId) => {
      const tagName = availableTags.find((tag) => tag.id === tagId)?.name;
      if (tagName) {
        openProjectNoteSuggestionForTag(tagName);
      }
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', effectiveProjectId, 'tags'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', effectiveProjectId] });
      void invalidateProjectQueries();
    },
    onError: (error) => {
      toast({
        title: "Tag-Zuweisung fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const removeProjectTagMutation = useMutation({
    mutationFn: async (item: TagRelationItem) => {
      await apiRequest('DELETE', `/api/projects/${effectiveProjectId}/tags/${item.tag.id}`, {
        version: item.relationVersion,
      });
    },
    onSuccess: (_data, item) => {
      const removedTemplate = computeTagAddedAction(item.tag.name, null, []);
      if (removedTemplate.kind === "show_note_suggestion_dialog") {
        clearWorkflowNoteSuggestionSeen(removedTemplate.templateTitle);
      }
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', effectiveProjectId, 'tags'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', effectiveProjectId] });
      void invalidateProjectQueries();
    },
    onError: (error) => {
      toast({
        title: "Tag konnte nicht entfernt werden",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const reklamationProjectMutation = useMutation({
    mutationFn: async (action: "set" | "remove") => {
      if (!projectVersion) throw new Error("Projektversion fehlt");
      const response = await apiRequest(
        action === "set" ? "POST" : "DELETE",
        `/api/projects/${effectiveProjectId}/reklamation`,
        { version: projectVersion },
      );
      return response.json() as Promise<{ kind: "updated" | "noop" }>;
    },
    onSuccess: (_result, action) => {
      if (action === "set") {
        openProjectNoteSuggestionForTag("Reklamation");
      } else {
        clearWorkflowNoteSuggestionSeen("Reklamation");
        openProjectNoteRemovalForTag("Reklamation");
      }
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', effectiveProjectId, 'tags'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', effectiveProjectId] });
      void invalidateProjectQueries();
      toast({ title: action === "set" ? "Reklamation gemeldet" : "Reklamation aufgehoben" });
    },
    onError: (error) => {
      toast({
        title: "Reklamation nicht möglich",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveProjectId) throw new Error("Projekt-ID fehlt");
      if (!projectVersion) throw new Error("Projektversion fehlt");
      await apiRequest("DELETE", `/api/projects/${effectiveProjectId}`, { version: projectVersion });
    },
    onSuccess: () => {
      void invalidateProjectQueries();
      toast({ title: "Projekt gelöscht" });
      if (onSaved && onSaved !== onCancel) {
        onSaved();
        return;
      }
      onCancel?.();
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "BUSINESS_CONFLICT") {
        toast({
          title: "Projekt kann nicht gelöscht werden",
          description: "Das Projekt hat zugeordnete Termine und kann deshalb nicht gelöscht werden. Bitte Termine zuerst entfernen oder neu zuordnen.",
          variant: "destructive",
        });
        return;
      }
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Projekt wurde zwischenzeitlich geändert",
          description: "Bitte neu laden und erneut versuchen.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Projekt konnte nicht gelöscht werden",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const checkAttachmentDuplicateByOriginalName = async (file: File) => {
    const duplicateResponse = await fetch("/api/attachments/duplicates/check-original-name", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ originalName: file.name }),
    });
    const duplicatePayload = await duplicateResponse.json().catch(() => null);
    if (!duplicateResponse.ok) {
      throw new Error(duplicatePayload?.message ?? "Duplikatprüfung fehlgeschlagen");
    }
    return duplicatePayload as {
      duplicate: boolean;
      summary: { customer: number; project: number; employee: number };
    };
  };

  const uploadProjectAttachment = async (targetProjectId: number, file: File) => {
    const uploadData = new FormData();
    uploadData.append("file", file);
    const uploadResponse = await fetch(`/api/projects/${targetProjectId}/attachments`, {
      method: "POST",
      credentials: "include",
      body: uploadData,
    });
    if (!uploadResponse.ok) {
      const uploadPayload = await uploadResponse.json().catch(() => null);
      throw new Error(uploadPayload?.message ?? "Projektanhang konnte nicht hochgeladen werden");
    }
  };

  const persistDraftProjectTags = async (targetProjectId: number) => {
    for (const item of draftProjectTags) {
      if (isManagedComplaintTagName(item.tag.name)) {
        continue;
      }
      await apiRequest("POST", `/api/projects/${targetProjectId}/tags`, { tagId: item.tag.id });
    }
  };

  const persistDraftProjectReklamation = async (targetProjectId: number, expectedVersion: number | undefined) => {
    if (!draftProjectTags.some((item) => isManagedComplaintTagName(item.tag.name))) {
      return;
    }
    if (typeof expectedVersion !== "number" || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new Error("Projektversion für Reklamationsworkflow fehlt.");
    }
    await apiRequest("POST", `/api/projects/${targetProjectId}/reklamation`, { version: expectedVersion });
  };

  const persistDraftProjectNotes = async (targetProjectId: number, additionalProjectNotes: ProjectNoteDraft[] = []) => {
    const notesToPersist = [
      ...draftProjectNotes.map((note) => ({
        title: note.title,
        body: note.body,
        cardColor: note.cardColor,
        print: note.print,
        templateId: note.templateId,
      })),
      ...additionalProjectNotes,
    ];
    for (const note of notesToPersist) {
      await apiRequest("POST", `/api/projects/${targetProjectId}/notes`, {
        title: note.title,
        body: note.body,
        cardColor: note.cardColor,
        print: note.print,
        templateId: note.templateId,
      });
    }
  };

  const persistDraftProjectAttachments = async (
    targetProjectId: number,
    extractionAttachmentDuplicateDecision: ExtractionAttachmentDuplicateDecision = "check",
  ) => {
    let attachmentLinked = false;
    for (const attachment of draftProjectAttachments) {
      const isExtractionAttachment = documentExtractionFile
        ? matchesAttachmentFileSignature(attachment, documentExtractionFile)
        : false;
      if (isExtractionAttachment) {
        if (extractionAttachmentDuplicateDecision === "skip") {
          toast({ title: "Dokumentverknüpfung übersprungen" });
          continue;
        }
        if (extractionAttachmentDuplicateDecision === "check") {
          const duplicateInfo = await checkAttachmentDuplicateByOriginalName(attachment.file);
          if (duplicateInfo.duplicate) {
            throw new Error("Duplikatentscheidung für das PDF fehlt.");
          }
        }
      }

      await uploadProjectAttachment(targetProjectId, attachment.file);
      if (isExtractionAttachment) {
        attachmentLinked = true;
      }
    }
    return attachmentLinked;
  };

  const persistCreateSidebarDrafts = async (
    targetProjectId: number,
    expectedVersion: number | undefined,
    options: Pick<ExecuteProjectSaveOptions, "additionalProjectNotes" | "extractionAttachmentDuplicateDecision"> = {},
  ) => {
    await persistDraftProjectReklamation(targetProjectId, expectedVersion);
    await persistDraftProjectTags(targetProjectId);
    await persistDraftProjectNotes(targetProjectId, options.additionalProjectNotes ?? []);
    return persistDraftProjectAttachments(
      targetProjectId,
      options.extractionAttachmentDuplicateDecision ?? "check",
    );
  };

  const persistEditAttachmentDrafts = async (
    targetProjectId: number,
    extractionAttachmentDuplicateDecision: ExtractionAttachmentDuplicateDecision,
  ) => {
    const attachmentLinked = await persistDraftProjectAttachments(targetProjectId, extractionAttachmentDuplicateDecision);
    setDraftProjectAttachments([]);
    setDocumentExtractionFile(null);
    return attachmentLinked;
  };

  const persistArticleList = async (targetProjectId: number, orderNumber: string) => {
    const items: InsertProjectOrderItem[] = [];

    for (const field of PROJECT_PRODUCT_FIELDS) {
      const sel = productSelections[field.key];
      if (field.source === "product" && sel.productId != null) {
        items.push({
          projectId: targetProjectId,
          orderNumber,
          productId: sel.productId,
          componentId: null,
          quantity: 1,
        });
      }
      if (field.source === "component" && sel.componentId != null) {
        items.push({
          projectId: targetProjectId,
          orderNumber,
          productId: null,
          componentId: sel.componentId,
          quantity: 1,
        });
      }
    }

    for (const slot of dynamicCategorySlots) {
      const sel = dynamicProductSelections[slot.slotId];
      if (!sel) continue;
      if (slot.source === "product" && sel.productId != null) {
        items.push({
          projectId: targetProjectId,
          orderNumber,
          productId: sel.productId,
          componentId: null,
          quantity: 1,
        });
      }
      if (slot.source === "component" && sel.componentId != null) {
        items.push({
          projectId: targetProjectId,
          orderNumber,
          productId: null,
          componentId: sel.componentId,
          quantity: 1,
        });
      }
    }

    const response = await apiRequest(
      "PUT",
      `/api/projects/${targetProjectId}/order-items`,
      { items },
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error((payload as { code?: string } | null)?.code ?? "Artikelliste konnte nicht gespeichert werden");
    }

    await queryClient.invalidateQueries({
      queryKey: [`/api/projects/${targetProjectId}/order-items`],
    });
  };

  const validateProjectSaveInput = (projectNameOverride?: string) => {
    if (isReadOnlyView) {
      toast({ title: "Nur Lesemodus", description: "Diese Rolle darf Projekte nicht bearbeiten.", variant: "destructive" });
      return null;
    }
    const storedProjectName = (projectNameOverride ?? name).trim();
    if (!storedProjectName) {
      toast({ title: "Projektname ist erforderlich", variant: "destructive" });
      return null;
    }
    const resolvedCustomerId = customerId;
    if (!resolvedCustomerId) {
      toast({ title: "Kunde muss ausgewählt werden", variant: "destructive" });
      return null;
    }
    if (!selectedCustomerNumber) {
      toast({ title: "Kundennummer des zugeordneten Kunden fehlt", variant: "destructive" });
      return null;
    }

    const normalizedOrderNumber = orderNumber.trim() || null;
    const normalizedAmountText = amount.replace(",", ".").trim();
    const parsedAmountNumber = normalizedAmountText.length === 0 ? null : Number(normalizedAmountText);
    const normalizedAmount = parsedAmountNumber == null ? null : parsedAmountNumber.toFixed(2);
    const amountIsValid =
      normalizedAmountText.length === 0 || /^-?\d+(?:\.\d{1,2})?$/.test(normalizedAmountText);
    if (!amountIsValid || (parsedAmountNumber != null && !Number.isFinite(parsedAmountNumber))) {
      toast({ title: "Betrag ist ungültig (max. 2 Nachkommastellen)", variant: "destructive" });
      return null;
    }
    if (!isEditing && normalizedOrderNumber === null) {
      toast({ title: "Auftragsnummer ist erforderlich", variant: "destructive" });
      return null;
    }
    const normalizedPlannedDateText = plannedDateText.trim() || null;
    const normalizedPlannedWeek = plannedWeek.trim() || null;
    if (normalizedPlannedWeek && normalizedPlannedWeek.length > 10) {
      toast({
        title: "Geplante Kalenderwoche ist zu lang",
        description: "Bitte maximal 10 Zeichen verwenden, zum Beispiel KW 14.",
        variant: "destructive",
      });
      return null;
    }
    const persistedDescriptionMd = buildPersistedProjectDescription(productSelections, descriptionMd);
    return {
      storedProjectName,
      normalizedOrderNumber,
      normalizedAmount,
      normalizedPlannedDateText,
      normalizedPlannedWeek,
      persistedDescriptionMd,
      customerId: resolvedCustomerId,
    };
  };

  const resolvePendingReklamationNoteDraft = async (): Promise<ProjectNoteDraft | null> => {
    if (isEditing || !pendingDraftReklamationTemplateTitle) return null;
    if (!draftProjectTags.some((item) => isManagedComplaintTagName(item.tag.name))) return null;
    const normalizedTemplateTitle = normalizeWorkflowNoteTitle(pendingDraftReklamationTemplateTitle);
    const hasExistingNote = visibleProjectNotes.some(
      (note) => normalizeWorkflowNoteTitle(note.title) === normalizedTemplateTitle,
    );
    if (hasExistingNote) return null;

    const templates = noteTemplates.length > 0
      ? noteTemplates
      : await queryClient.ensureQueryData({
        queryKey: ["/api/note-templates"],
        queryFn: () => fetchJson<NoteTemplate[]>("/api/note-templates"),
      });
    const template = findWorkflowNoteTemplate(templates, pendingDraftReklamationTemplateTitle);
    if (!template) {
      toast({
        title: "Notizvorlage fehlt",
        description: `Die Notizvorlage „${pendingDraftReklamationTemplateTitle}“ wurde nicht gefunden.`,
        variant: "destructive",
      });
      return null;
    }
    return buildWorkflowNoteDraft(template);
  };

  const resolveExtractionDuplicateAttachmentSummary = async (): Promise<ProjectSaveReviewDuplicateSummary | null> => {
    const extractionFile = documentExtractionFile;
    if (!extractionFile) return null;
    const extractionAttachment = draftProjectAttachments.find((attachment) =>
      matchesAttachmentFileSignature(attachment, extractionFile),
    );
    if (!extractionAttachment) return null;
    const duplicateInfo = await checkAttachmentDuplicateByOriginalName(extractionAttachment.file);
    return duplicateInfo.duplicate ? duplicateInfo.summary : null;
  };

  const buildProjectSaveReviewRequest = async (projectNameForReview: string): Promise<ProjectSaveReviewRequest> => ({
    missingArticleLabels: documentExtractionDecisions?.articleListReviewed
      ? []
      : collectMissingProjectArticleLabels({
        productSelections,
        dynamicSelections: dynamicProductSelections,
        dynamicSlots: dynamicCategorySlots,
        articleListTouched,
        extractedArticleListHtml,
      }),
    saunaModelName: resolveSaunaTitleSuggestion({
      projectName: projectNameForReview,
      productSelections,
    }),
    reklamationNoteDraft: documentExtractionDecisions?.reklamationReviewed
      ? null
      : await resolvePendingReklamationNoteDraft(),
    duplicateAttachmentSummary: await resolveExtractionDuplicateAttachmentSummary(),
  });

  const executeProjectSave = async (options: ExecuteProjectSaveOptions = {}) => {
    const validated = validateProjectSaveInput(options.nameOverride);
    if (!validated) return;
    const {
      storedProjectName,
      normalizedOrderNumber,
      normalizedAmount,
      normalizedPlannedDateText,
      normalizedPlannedWeek,
      persistedDescriptionMd,
      customerId: validatedCustomerId,
    } = validated;

    if (options.nameOverride && options.nameOverride.trim() !== name.trim()) {
      setName(storedProjectName);
    }

    let createdProjectId: number | null = null;
    let extractionAttachmentLinked = false;
    if (isEditing) {
      if (!projectVersion || !Number.isInteger(projectVersion) || projectVersion < 1) {
        toast({ title: "Projektversion fehlt, bitte neu laden", variant: "destructive" });
        throw new Error("validation");
      }
      await updateMutation.mutateAsync({
        version: projectVersion,
        type: resolvedProjectEditForm.normalizedType,
        name: storedProjectName,
        orderNumber: normalizedOrderNumber,
        amount: normalizedAmount,
        customerId: validatedCustomerId,
        descriptionMd: persistedDescriptionMd,
        projectOrder: {
          amount: normalizedAmount,
          plannedDateText: normalizedPlannedDateText,
          plannedWeek: normalizedPlannedWeek,
        },
      });
      if (effectiveProjectId && projectData?.project.orderNumber) {
        try {
          await persistArticleList(effectiveProjectId, projectData.project.orderNumber);
        } catch (error) {
          toast({
            title: "Projekt gespeichert, Artikelliste konnte nicht persistiert werden",
            description: error instanceof Error ? error.message : "Unbekannter Fehler",
            variant: "destructive",
          });
        }
      }
      if (effectiveProjectId && draftProjectAttachments.length > 0) {
        extractionAttachmentLinked = await persistEditAttachmentDrafts(
          effectiveProjectId,
          options.extractionAttachmentDuplicateDecision ?? "check",
        );
      }
    } else {
      let createdProject: Awaited<ReturnType<typeof createMutation.mutateAsync>>;
      try {
        createdProject = await createMutation.mutateAsync({
          name: storedProjectName,
          type: resolvedProjectEditForm.normalizedType,
          orderNumber: normalizedOrderNumber,
          amount: normalizedAmount,
          customerId: validatedCustomerId,
          descriptionMd: persistedDescriptionMd,
          projectOrder: {
            amount: normalizedAmount,
            plannedDateText: normalizedPlannedDateText,
            plannedWeek: normalizedPlannedWeek,
          },
        });
      } catch (error) {
        toast({
          title: "Projekt konnte nicht gespeichert werden",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        });
        return;
      }
      createdProjectId = createdProject.id;
      if (createdProject.projectOrder?.orderNumber) {
        try {
          await persistBufferedOrderItems(createdProject.id, createdProject.projectOrder.orderNumber);
        } catch (error) {
          toast({
            title: "Projekt gespeichert, Artikelliste konnte nicht vollständig persistiert werden",
            description: error instanceof Error ? error.message : "Unbekannter Fehler",
            variant: "destructive",
          });
        }
      }
      try {
        extractionAttachmentLinked = await persistCreateSidebarDrafts(createdProject.id, createdProject.version, {
          additionalProjectNotes: options.additionalProjectNotes ?? [],
          extractionAttachmentDuplicateDecision: options.extractionAttachmentDuplicateDecision ?? "check",
        });
        await queryClient.invalidateQueries({ queryKey: ['/api/projects', createdProject.id, 'tags'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/projects', createdProject.id, 'notes'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/projects', createdProject.id, 'attachments'] });
        setDraftProjectTags([]);
        setDraftProjectNotes([]);
        setDraftProjectAttachments([]);
        setPendingDraftReklamationTemplateTitle(null);
      } catch (error) {
        toast({
          title: "Projekt gespeichert, Sidebar-Daten konnten nicht vollständig persistiert werden",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        });
      } finally {
        setDocumentExtractionFile(null);
      }
    }
    setInitialFormSnapshot(buildFormSnapshot({
      name: storedProjectName,
      orderNumber,
      amount,
      plannedDateText,
      plannedWeek,
      descriptionMd,
      productSelections,
      dynamicProductSelections,
      extractedArticleListHtml,
      customerId,
      sidebarDraftSignature: isEditing ? null : emptyCreateSidebarDraftSignature,
    }));
    setArticleListTouched(false);

    if (onSaved && onSaved !== onCancel) {
      onSaved();
    }
    if (createdProjectId) {
      onProjectCreated?.(createdProjectId, { attachmentLinked: extractionAttachmentLinked });
    }
  };

  const handleSubmit = async () => {
    const validated = validateProjectSaveInput();
    if (!validated) return;
    setIsPreparingSaveReview(true);
    try {
      const reviewRequest = await buildProjectSaveReviewRequest(validated.storedProjectName);
      const hasArticleStep = reviewRequest.missingArticleLabels.length > 0;
      const hasTitleStep = reviewRequest.saunaModelName !== null;
      const hasAttachmentStep = reviewRequest.duplicateAttachmentSummary !== null;
      const hasReklamationStep = reviewRequest.reklamationNoteDraft !== null;

      if (hasArticleStep || hasTitleStep || hasReklamationStep || hasAttachmentStep) {
        setSaveReviewRequest(reviewRequest);
        return;
      }

      await executeProjectSave({ extractionAttachmentDuplicateDecision: "not-needed" });
    } catch (error) {
      toast({
        title: "Speichern-Prüfung fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIsPreparingSaveReview(false);
    }
  };

  const handleSaveReviewCancel = () => {
    if (isSubmitPending) return;
    setSaveReviewRequest(null);
  };

  const handleSaveReviewConfirm = (result: ProjectSaveReviewResult) => {
    const reviewRequest = saveReviewRequest;
    setSaveReviewRequest(null);
    if (reviewRequest?.reklamationNoteDraft) {
      setPendingDraftReklamationTemplateTitle(null);
    }
    void executeProjectSave({
      nameOverride: result.adoptSaunaTitle && reviewRequest?.saunaModelName
        ? reviewRequest.saunaModelName
        : undefined,
      additionalProjectNotes: result.reklamationNote ? [result.reklamationNote] : [],
      extractionAttachmentDuplicateDecision: reviewRequest?.duplicateAttachmentSummary
        ? (result.linkDuplicateAttachment ? "allow" : "skip")
        : "not-needed",
    });
  };

  const validateProjectDocumentExtractionTarget = async ({ orderNumber: extractedOrderNumber }: { orderNumber: string }) => {
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

  const applyProjectDocumentExtractionWorkflow = async (payload: ProjectDocumentExtractionWorkflowResult) => {
    try {
      const extractedOrderNumber = payload.orderNumber.trim();
      if (extractedOrderNumber.length > 0) {
        const projectResolution = await resolveProjectByOrderNumber(extractedOrderNumber);
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
      const hasDynamicValues = Object.values(dynamicProductSelections).some((selection) => selection.componentName.trim().length > 0);
      const hasExistingValues = name.trim().length > 0 || articleLines.length > 0 || hasDynamicValues || extractedArticleListHtml.trim().length > 0;
      if (hasExistingValues) {
        const confirmed = window.confirm("Titel oder Beschreibung sind bereits befüllt. Inhalte überschreiben?");
        if (!confirmed) return;
      }
      setName(payload.saunaModel.trim());
      setExtractedArticleListHtml(payload.articleListHtml.trim());
      setProductSelections(resolveSelectionsFromExtraction(
        {
          saunaModel: payload.saunaModel,
          categorizedItems: documentExtractionData?.categorizedItems ?? [],
        },
        products,
        components,
        componentCategories,
      ));
      setDynamicProductSelections(createEmptyDynamicProjectProductSelections(dynamicCategorySlots));
      setCustomerId(payload.customerId);
      setDocumentExtractionSelectedCustomer(payload.resolvedCustomer);
      if (extractedOrderNumber.length > 0) {
        const currentOrderNumber = orderNumber.trim();
        if (!currentOrderNumber) {
          setOrderNumber(extractedOrderNumber);
        } else if (currentOrderNumber !== extractedOrderNumber) {
          const shouldOverwrite = window.confirm(
            `Es ist bereits eine abweichende Auftragsnummer gesetzt (${currentOrderNumber}). Mit extrahierter Auftragsnummer (${extractedOrderNumber}) überschreiben?`,
          );
          if (shouldOverwrite) {
            setOrderNumber(extractedOrderNumber);
          }
        }
      }
      const extractedAmount = payload.amount.trim();
      if (extractedAmount.length > 0) {
        const currentAmount = amount.trim();
        if (!currentAmount) {
          setAmount(extractedAmount);
        } else if (currentAmount !== extractedAmount) {
          const shouldOverwrite = window.confirm(
            `Es ist bereits ein abweichender Betrag gesetzt (${currentAmount}). Mit extrahiertem Betrag (${extractedAmount}) überschreiben?`,
          );
          if (shouldOverwrite) {
            setAmount(extractedAmount);
          }
        }
      }
      if (payload.appendDocumentText && documentExtractionData?.documentText?.trim()) {
        const documentTextHtml = buildDocumentTextDescriptionHtml(documentExtractionData.documentText);
        if (documentTextHtml) {
          setDescriptionMd((current) => current.trim() ? `${current}\n${documentTextHtml}` : documentTextHtml);
        }
      }
      if (payload.acceptMissingArticleListAsReklamation) {
        setDraftProjectReklamation();
        if (payload.reklamationNote) {
          addDraftProjectNoteIfMissing(payload.reklamationNote);
          setPendingDraftReklamationTemplateTitle(null);
        } else if (payload.createReklamationNote) {
          await openDraftReklamationNoteEditorFromTemplate();
        } else {
          setPendingDraftReklamationTemplateTitle(null);
        }
      }
      setDocumentExtractionDecisions({
        articleListReviewed: false,
        reklamationReviewed: payload.acceptMissingArticleListAsReklamation,
      });
      setDocumentExtractionOpen(false);
      toast({
        title: "Dokumentdaten übernommen",
        description: "Projekt- und Kundendaten wurden vorbereitet.",
      });
    } catch (error) {
      toast({
        title: "Daten konnten nicht übernommen werden",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    }
  };

  if (projectLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Laden...</div>
      </div>
    );
  }

  const isSubmitPending = createMutation.isPending || updateMutation.isPending;
  const isProjectSaveBusy = isSubmitPending || isPreparingSaveReview;

  return (
    <Tabs
      value={isEditing ? activeMainTab : "details"}
      onValueChange={(value) => setActiveMainTab(value as "details" | "appointments" | "journal")}
      className="h-full"
    >
      <div className="flex h-full min-h-0 w-full flex-1">
      <EntityFormShell
        header={(
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex min-w-0 flex-col gap-3">
              <h2 className="text-2xl font-bold text-primary flex min-w-0 items-center gap-3">
                <FolderKanban className="w-6 h-6" />
                {isEditing ? "Projekt bearbeiten" : "Projekt anlegen"}
              </h2>
              <EditFormContextText>{projectEditContext}</EditFormContextText>
            </div>

            <Button
              type="button"
              size="lg"
              variant="ghost"
              onClick={handleRequestClose}
              data-testid="button-close-project"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        )}
        sidebar={(
          <div className="min-w-0 space-y-6 p-6" data-testid="project-form-sidebar">
            {isEditing ? (
              <div className="sub-panel space-y-3">
                <h3 className="text-sm font-bold tracking-wider text-primary">Daten anzeigen</h3>
                <TabsList className="w-full" data-testid="tabs-project-main">
                  <TabsTrigger value="details" className="flex-1 gap-1.5" data-testid="tab-project-details"><LayoutList className="w-4 h-4" />Details</TabsTrigger>
                  <TabsTrigger value="appointments" className="flex-1 gap-1.5" data-testid="tab-project-termine"><Calendar className="w-4 h-4" />Termine</TabsTrigger>
                  <TabsTrigger value="journal" className="flex-1 gap-1.5" data-testid="tab-project-journal"><ScrollText className="w-4 h-4" />Journal</TabsTrigger>
                </TabsList>
              </div>
            ) : null}
            {!isReadOnlyView && (isEditing || canManageProjectTags) ? (
              <div className="sub-panel space-y-3" data-testid="project-form-functions-panel">
                <h3 className="text-sm font-bold tracking-wider text-primary">Funktionen</h3>
                <div className="flex flex-col gap-2">
                  {canManageProjectTags ? (
                    <Button
                      type="button"
                      className="w-full justify-start gap-2 border bg-[var(--action-bg)] text-[var(--action-fg)] [border-color:var(--action-border)] transition-[background-color,border-color,box-shadow,color] hover:bg-[var(--action-bg-hover)] hover:[border-color:var(--action-border-hover)] hover:shadow-sm"
                      style={{
                        "--action-bg": `${MANAGED_COMPLAINT_TAG_COLOR}24`,
                        "--action-bg-hover": `${MANAGED_COMPLAINT_TAG_COLOR}33`,
                        "--action-border": `${MANAGED_COMPLAINT_TAG_COLOR}59`,
                        "--action-border-hover": `${MANAGED_COMPLAINT_TAG_COLOR}80`,
                        "--action-fg": MANAGED_COMPLAINT_TAG_COLOR,
                      } as CSSProperties}
                      onClick={() => {
                        if (!isEditing) {
                          toggleDraftProjectReklamation();
                          return;
                        }
                        reklamationProjectMutation.mutate(hasReklamationTag ? "remove" : "set");
                      }}
                      disabled={isEditing && reklamationProjectMutation.isPending}
                      data-testid={hasReklamationTag ? "button-remove-project-reklamation" : "button-set-project-reklamation"}
                    >
                      <ScrollText className="w-4 h-4" />
                      {isEditing && reklamationProjectMutation.isPending
                        ? "Reklamation..."
                        : hasReklamationTag
                          ? "Reklamation aufheben"
                          : "Reklamation melden"}
                    </Button>
                  ) : null}
                  {documentExtractionFileUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={openDocumentExtractionFileInTab}
                      data-testid="button-open-extraction-pdf-tab"
                    >
                      <FileText className="w-4 h-4" />
                      PDF in neuem Tab öffnen
                    </Button>
                  ) : null}
                  {isEditing ? (
                    <Button
                      type="button"
                      className="w-full justify-start gap-2 border bg-[var(--action-bg)] text-[var(--action-fg)] [border-color:var(--action-border)] transition-[background-color,border-color,box-shadow,color] hover:bg-[var(--action-bg-hover)] hover:[border-color:var(--action-border-hover)] hover:shadow-sm"
                      style={{
                        "--action-bg": "hsl(var(--destructive) / 0.14)",
                        "--action-bg-hover": "hsl(var(--destructive) / 0.22)",
                        "--action-border": "hsl(var(--destructive) / 0.35)",
                        "--action-border-hover": "hsl(var(--destructive) / 0.5)",
                        "--action-fg": "hsl(var(--destructive))",
                      } as CSSProperties}
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={deleteProjectMutation.isPending}
                      data-testid="button-delete-project"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleteProjectMutation.isPending ? "Löschen..." : "Löschen"}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <ProjectAppointmentsPanel
              projectId={effectiveProjectId}
              projectName={projectNamePreview}
              isEditing={isEditing}
              readOnly={isReadOnlyView}
              className="h-auto"
              onOpenAppointment={onOpenAppointment}
              onOpenCalendarWorkspace={onOpenCalendarWorkspace}
            />

            <ProjectAttachmentsPanel
              projectId={effectiveProjectId}
              customerId={customerId}
              isEditing={isEditing}
              readOnly={isReadOnlyView}
              canDelete={canDeleteAttachments}
              pendingProjectAttachments={draftProjectAttachments}
              onUploadPendingProjectAttachment={addDraftProjectAttachment}
              className="h-auto"
            />

            <TagPickerPanel
              assignedTags={visibleProjectTags}
              availableTags={availableTags}
              isLoading={isEditing ? assignedTagsLoading : false}
              loadErrorMessage={isEditing && assignedTagsError instanceof Error ? assignedTagsError.message : null}
              canEdit={!isReadOnlyView && canManageProjectTags}
              title="Tags"
              testIdPrefix="project-tag-picker"
              onAdd={(tagId) => {
                if (isEditing) {
                  addProjectTagMutation.mutate(tagId);
                  return;
                }
                addDraftProjectTag(tagId);
                const tagName = availableTags.find((tag) => tag.id === tagId)?.name;
                if (tagName) {
                  openProjectNoteSuggestionForTag(tagName);
                }
              }}
              onRemove={(item) => {
                if (isEditing) {
                  removeProjectTagMutation.mutate(item);
                  return;
                }
                removeDraftProjectTag(item);
              }}
              className="h-auto"
            />

            <NotesSection
              notes={visibleProjectNotes}
              isLoading={isEditing ? notesLoading : false}
              readOnly={isReadOnlyView}
              prefillDraft={suggestedProjectNoteDraft}
              onPrefillDraftConsumed={() => setSuggestedProjectNoteDraft(null)}
              onAdd={(data) => {
                if (isEditing) {
                  createNoteMutation.mutate(data);
                  return;
                }
                addDraftProjectNote(data);
              }}
              onUpdate={(noteId, data) => {
                if (isEditing) {
                  const version = getProjectNoteVersion(noteId);
                  updateNoteMutation.mutate({ noteId, ...data, version });
                  return;
                }
                updateDraftProjectNote(noteId, data);
              }}
              onTogglePin={(id, isPinned) => {
                if (isEditing) {
                  const version = getProjectNoteVersion(id);
                  togglePinMutation.mutate({ noteId: id, isPinned, version });
                  return;
                }
                toggleDraftProjectNotePin(id, isPinned);
              }}
              onDelete={(noteId) => {
                if (isEditing) {
                  const version = getProjectNoteVersion(noteId);
                  deleteNoteMutation.mutate({ noteId, version });
                  return;
                }
                deleteDraftProjectNote(noteId);
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
                onClick={handleRequestClose}
                data-testid="button-cancel-project"
              >
                Schließen
              </Button>
            </div>

            {!isReadOnlyView ? (
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isProjectSaveBusy}
                data-testid="button-save-project"
              >
                {isProjectSaveBusy ? "Speichern..." : "Speichern"}
              </Button>
            ) : null}
          </div>
        )}
      >
        {activeMainTab === "details" ? (
          <div className="w-full space-y-6" data-testid="project-form-main-column">
        {isEditing ? (
          <ProjectOrderForm
            name={name}
            orderNumber={orderNumber}
            amount={amount}
            plannedDateText={plannedDateText}
            plannedWeek={plannedWeek}
            isEditing={isEditing}
            readOnly={isReadOnlyView}
            onNameChange={setName}
            onOrderNumberChange={setOrderNumber}
            onAmountChange={setAmount}
            onPlannedDateTextChange={setPlannedDateText}
            onPlannedWeekChange={setPlannedWeek}
          />
        ) : (
          <ProjectOrderForm
            name={name}
            orderNumber={orderNumber}
            amount={amount}
            plannedDateText={plannedDateText}
            plannedWeek={plannedWeek}
            isEditing={isEditing}
            readOnly={isReadOnlyView}
            onNameChange={setName}
            onOrderNumberChange={setOrderNumber}
            onAmountChange={setAmount}
            onPlannedDateTextChange={setPlannedDateText}
            onPlannedWeekChange={setPlannedWeek}
          />
        )}

          <div className="space-y-4">
                <Tabs defaultValue="description" className="w-full" data-testid="project-description-tabs">
                  <TabsList className="grid w-full grid-cols-2 rounded-b-none">
                    <TabsTrigger value="description">Anmerkungen</TabsTrigger>
                    <TabsTrigger value="article-list">Artikelliste</TabsTrigger>
                  </TabsList>
                  <TabsContent value="description" className="mt-0">
                    <div
                      className="rounded-b-lg border border-border/60 border-t-0 bg-background/70 p-4"
                      data-testid="project-description-editor-panel"
                    >
                      <RichTextEditor
                        value={descriptionMd}
                        onChange={setDescriptionMd}
                        placeholder="Projektbeschreibung eingeben..."
                        readOnly={isReadOnlyView}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="article-list" className="mt-0">
                    <div
                      className="rounded-b-lg border border-border/60 border-t-0 bg-background/70"
                      data-testid="project-article-list-panel"
                    >
                      <ProjectProductFields
                        productSelections={productSelections}
                        dynamicSlots={dynamicCategorySlots}
                        dynamicSelections={dynamicProductSelections}
                        products={products}
                        components={components}
                        componentCategories={componentCategories}
                        productCategories={productCategories}
                        isAdmin={isAdmin}
                        readOnly={isReadOnlyView}
                        onSelectField={(fieldKey, selectedValue) => void handleFieldSelection(fieldKey, selectedValue)}
                        onSelectDynamic={(slotId, selectedValue) => void handleDynamicFieldSelection(slotId, selectedValue)}
                        onCreateForField={(fieldKey, input) => handleCreateForField(fieldKey, input)}
                        onCreateForSlot={(slotId, input) => handleCreateForSlot(slotId, input)}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {extractedArticleListHtml.trim().length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold tracking-wider text-primary">Extrahierte Artikelliste</h3>
                  <RichTextEditor
                    value={extractedArticleListHtml}
                    onChange={setExtractedArticleListHtml}
                    readOnly={isReadOnlyView}
                  />
                </div>
              ) : null}

              <div className="space-y-4">
                <RelationSlot
                  title="Kunde"
                  icon={<UserCircle className="w-4 h-4" />}
                  state={isReadOnlyView ? "readonly" : selectedCustomer ? "active" : "empty"}
                  onAdd={isReadOnlyView ? undefined : () => setCustomerDialogOpen(true)}
                  onRemove={isReadOnlyView ? undefined : () => setCustomerId(null)}
                  addLabel="Kunde auswählen"
                  emptyText="Kein Kunde ausgewählt"
                  testId="slot-customer-relation-project"
                  addActionTestId="button-select-customer"
                  removeActionTestId="button-change-customer"
                >
                  {selectedCustomer ? <CustomerDetailCard customer={selectedCustomer} testId="badge-customer" /> : null}
                </RelationSlot>
              </div>

              {!isEditing && !isReadOnlyView ? (
                <DocumentExtractionDropzone
                  onFileSelected={(file) => {
                    void runDocumentExtraction(file);
                  }}
                  isProcessing={documentExtractionLoading}
                />
              ) : null}

          </div>
        ) : activeMainTab === "appointments" ? (
          <div className="flex min-h-0 flex-1 flex-col" data-testid="project-appointments-list-panel">
            <AppointmentsListPage
              title="Termine"
              helpKey="appointments.list.projectForm"
              context={{ type: "project", projectId: effectiveProjectId ?? null }}
              onOpenAppointment={(appointmentId) => {
                onOpenAppointment?.({ projectId: effectiveProjectId ?? undefined, appointmentId });
              }}
              className="min-h-0 flex-1"
            />
          </div>
        ) : (
          <JournalRecordsView
            context={{ tableName: "project", recordId: effectiveProjectId }}
            pageSize={25}
            testIdPrefix="project-journal"
          />
        )}

      </EntityFormShell>

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
        canCreateCustomer={canCreateFromDocumentExtraction}
        onResolveCustomerByNumber={resolveCustomerByNumber}
        onCreateCustomer={createCustomerFromDraft}
        onUpdateExistingCustomer={updateExistingCustomerFromDraft}
        onOpenDocument={openDocumentExtractionFileInTab}
        onValidateProject={validateProjectDocumentExtractionTarget}
        onApply={applyProjectDocumentExtractionWorkflow}
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

      <ProjectSaveReviewDialog
        open={saveReviewRequest !== null}
        missingArticleLabels={saveReviewRequest?.missingArticleLabels ?? []}
        saunaModelName={saveReviewRequest?.saunaModelName}
        currentProjectName={name.trim()}
        reklamationNoteDraft={saveReviewRequest?.reklamationNoteDraft}
        duplicateAttachmentSummary={saveReviewRequest?.duplicateAttachmentSummary}
        isBusy={isSubmitPending}
        onOpenChange={(open) => {
          if (!open) {
            handleSaveReviewCancel();
          }
        }}
        onCancel={handleSaveReviewCancel}
        onConfirm={handleSaveReviewConfirm}
      />

      {/* Customer Selection Dialog */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <CustomersPage
            showCloseButton={false}
            tableOnly
            onSelectCustomer={(id) => {
              setCustomerId(id);
              setCustomerDialogOpen(false);
            }}
            onCancel={() => setCustomerDialogOpen(false)}
            title="Kunde auswählen"
          />
        </DialogContent>
      </Dialog>

      <WorkflowNoteSuggestionDialog
        open={noteSuggestionDialog !== null}
        templateTitle={noteSuggestionDialog?.templateTitle}
        targetLabel="dieses Projekt"
        onOpenChange={(open) => { if (!open) setNoteSuggestionDialog(null); }}
        onSkip={() => setNoteSuggestionDialog(null)}
        onConfirm={handleCreateProjectNoteFromSuggestion}
      />

      <WorkflowNoteRemovalDialog
        open={noteRemovalDialog !== null}
        description={`Soll die zugehörige Notiz „${noteRemovalDialog?.templateTitle ?? ""}“ aus diesem Projekt entfernt werden?`}
        onOpenChange={(open) => { if (!open) setNoteRemovalDialog(null); }}
        onKeep={() => setNoteRemovalDialog(null)}
        onConfirm={() => {
          if (!noteRemovalDialog) return;
          if (!isEditing) {
            deleteDraftProjectNote(noteRemovalDialog.noteId);
            setNoteRemovalDialog(null);
            return;
          }
          deleteNoteMutation.mutate({
            noteId: noteRemovalDialog.noteId,
            version: noteRemovalDialog.noteVersion,
          });
          setNoteRemovalDialog(null);
        }}
      />

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
                onCancel?.();
              }}
            >
              Verwerfen und schließen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
          <AlertDialogTitle>Projekt wirklich löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Diese Aktion ist endgültig. Das Projekt wird nur gelöscht, wenn keine Termine zugeordnet sind.
          </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDeleteConfirmOpen(false);
                deleteProjectMutation.mutate();
              }}
              data-testid="button-confirm-delete-project"
            >
              Projekt löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      </div>
    </Tabs>
  );
}

function extractApiCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const start = error.message.indexOf("{");
  if (start < 0) return null;
  const jsonPart = error.message.slice(start);
  try {
    const payload = JSON.parse(jsonPart) as { code?: unknown };
    return typeof payload.code === "string" ? payload.code : null;
  } catch {
    return null;
  }
}
