import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { EntityFormShell } from "@/components/ui/entity-form-shell";
import { ProjectAppointmentsPanel } from "@/components/ProjectAppointmentsPanel";
import {
  ProjectAttachmentsPanel,
  type PendingProjectAttachmentItem,
} from "@/components/ProjectAttachmentsPanel";
import { ProjectOrderForm, ProjectProductFields, type ArticleCreateInput } from "@/components/ProjectOrderForm";
import { RichTextEditor } from "@/components/RichTextEditor";
import { DocumentExtractionDropzone } from "@/components/DocumentExtractionDropzone";
import {
  DocumentExtractionDialog,
  type ExtractionDialogData,
  type ExtractionCustomerDraft,
} from "@/components/DocumentExtractionDialog";
import {
  ProjectDuplicateResolutionDialog,
  type ProjectDuplicateLatestAppointment,
  type ProjectDuplicateResolution,
} from "@/components/ProjectDuplicateResolutionDialog";
import { CustomersPage } from "@/components/CustomersPage";
import { NotesSection } from "@/components/NotesSection";
import { TagPickerPanel, type TagRelationItem } from "@/components/TagPickerPanel";
import { CustomerDetailCard } from "@/components/ui/customer-detail-card";
import { EditFormContextText } from "@/components/ui/edit-form-context-text";
import { RelationSlot } from "@/components/ui/relation-slot";
import {
  FolderKanban,
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
  type DynamicProjectCategorySlot,
  type DynamicProjectProductSelections,
  type ProjectProductFieldKey,
  type ProjectProductSelections,
} from "@/lib/project-product-form";
import { useToast } from "@/hooks/use-toast";
import { computeTagAddedAction } from "@/hooks/useTagRuleEngine";
import { isManagedRemarksTagName } from "@shared/appointmentCancellation";
import { JournalRecordsView } from "@/components/JournalRecordsView";
import { getStoredUserRole, isReaderRole } from "@/lib/auth";
import type { Project, Customer, Note, NoteTemplate, Component, ComponentCategory, ProductCategory, ProjectOrderItem, InsertProjectOrderItem, Product, Tag } from "@shared/schema";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error((await res.text()) || `Request failed for ${url}`);
  return res.json() as Promise<T>;
}

function hasVisibleProjectDescriptionContent(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0;
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
    extractedArticleListHtml?: string;
    productSelections?: ProjectProductSelections;
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
  const [extractedArticleListHtml, setExtractedArticleListHtml] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentExtractionOpen, setDocumentExtractionOpen] = useState(false);
  const [documentExtractionLoading, setDocumentExtractionLoading] = useState(false);
  const [documentExtractionData, setDocumentExtractionData] = useState<ExtractionDialogData | null>(null);
  const [documentExtractionFile, setDocumentExtractionFile] = useState<File | null>(initialDocumentExtractionFile ?? null);
  const [noteSuggestionDialog, setNoteSuggestionDialog] = useState<{ templateTitle: string } | null>(null);
  const [suggestedProjectNoteDraft, setSuggestedProjectNoteDraft] = useState<ProjectNoteDraft | null>(null);
  const [draftProjectTags, setDraftProjectTags] = useState<TagRelationItem[]>([]);
  const [draftProjectNotes, setDraftProjectNotes] = useState<DraftProjectNote[]>([]);
  const [draftProjectAttachments, setDraftProjectAttachments] = useState<PendingProjectAttachmentItem[]>([]);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string>("");
  const [activeMainTab, setActiveMainTab] = useState<"details" | "journal">("details");
  const [didApplyInitialDraft, setDidApplyInitialDraft] = useState(false);
  const didInitializeCreateFormRef = useRef(false);
  const initializedEditProjectIdRef = useRef<number | null>(null);
  const hydratedEditProjectFormIdRef = useRef<number | null>(null);
  const draftNoteIdRef = useRef(-1);
  const draftAttachmentIdRef = useRef(-1);
  const [userRole] = useState(() => getStoredUserRole());
  const isAdmin = userRole === "ADMIN";
  const isReader = isReaderRole(userRole);
  const isReadOnlyView = isReader;
  const canManageProjectTags = !isReader && (isAdmin || userRole === "DISPATCHER");
  const canDeleteAttachments = !isReader && (isAdmin || userRole === "DISPATCHER");
  const matchesAttachmentFileSignature = (attachment: PendingProjectAttachmentItem, file: File) =>
    attachment.originalName === file.name && attachment.mimeType === (file.type || null) && attachment.file.size === file.size;

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
      setCustomerId(projectData.project.customerId);
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
      setExtractedArticleListHtml("");
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
    setCustomerId(initialDraft.customerId ?? null);
    setProductSelections(nextSelections);
    setDynamicProductSelections(nextDynamicSelections);
    setExtractedArticleListHtml(initialDraft.extractedArticleListHtml ?? "");
    setInitialFormSnapshot(
      buildFormSnapshot({
        name: initialDraft.name ?? "",
        orderNumber: initialDraft.orderNumber ?? "",
        amount: initialDraft.amount ?? "",
        plannedDateText: "",
        plannedWeek: "",
        descriptionMd: "",
        productSelections: nextSelections,
        dynamicProductSelections: nextDynamicSelections,
        extractedArticleListHtml: initialDraft.extractedArticleListHtml ?? "",
        customerId: initialDraft.customerId ?? null,
        sidebarDraftSignature: emptyCreateSidebarDraftSignature,
      }),
    );
    setDidApplyInitialDraft(true);
  }, [didApplyInitialDraft, dynamicCategorySlots, emptyCreateSidebarDraftSignature, initialDraft, isEditing]);

  const selectedCustomer = customers.find(c => c.id === customerId) || projectData?.customer;
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

  const handleFieldSelection = (fieldKey: ProjectProductFieldKey, selectedValue: string) => {
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

    if (fieldKey === "saunaModel" && product) {
      const previousProductId = productSelections.saunaModel.productId;
      const nextSaunaModelName = product.name.trim();
      const projectName = name.trim();
      const isChangedSelection = previousProductId !== product.id;

      if (isChangedSelection && nextSaunaModelName.length > 0 && projectName !== nextSaunaModelName) {
        const shouldAdoptProjectName = window.confirm(
          "Sauna-Modell geändert, soll ich den Namen des Projekts anpassen?",
        );
        if (shouldAdoptProjectName) {
          setName(nextSaunaModelName);
        }
      }
    }

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
  };

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

  const normalizeTemplateTitle = (value: string) => value.trim().toLocaleLowerCase("de").replace(/ß/g, "ss");

  const openProjectNoteSuggestionForTag = (tagName: string) => {
    const action = computeTagAddedAction(
      tagName,
      effectiveProjectId ?? null,
      visibleProjectNotes.map((note) => ({ title: note.title })),
    );
    if (action.kind === "show_note_suggestion_dialog") {
      setNoteSuggestionDialog({ templateTitle: action.templateTitle });
    }
  };

  const handleCreateProjectNoteFromSuggestion = async () => {
    if (!noteSuggestionDialog) return;
    const templates = noteTemplates.length > 0
      ? noteTemplates
      : await queryClient.ensureQueryData({
        queryKey: ["/api/note-templates"],
        queryFn: () => fetchJson<NoteTemplate[]>("/api/note-templates"),
      });
    const template = templates.find((entry) => normalizeTemplateTitle(entry.title) === normalizeTemplateTitle(noteSuggestionDialog.templateTitle));
    if (!template) {
      toast({
        title: "Notizvorlage fehlt",
        description: `Die Notizvorlage „${noteSuggestionDialog.templateTitle}“ wurde nicht gefunden.`,
        variant: "destructive",
      });
      return;
    }

    setSuggestedProjectNoteDraft({
      title: template.title,
      body: template.body,
      cardColor: template.cardColor,
      print: template.print,
      templateId: template.id,
    });
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
    onSuccess: () => {
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
          description: "Projekt kann nicht gelöscht werden, weil Termine vorhanden sind.",
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
      await apiRequest("POST", `/api/projects/${targetProjectId}/tags`, { tagId: item.tag.id });
    }
  };

  const persistDraftProjectNotes = async (targetProjectId: number) => {
    for (const note of draftProjectNotes) {
      await apiRequest("POST", `/api/projects/${targetProjectId}/notes`, {
        title: note.title,
        body: note.body,
        cardColor: note.cardColor,
        print: note.print,
        templateId: note.templateId,
      });
    }
  };

  const persistDraftProjectAttachments = async (targetProjectId: number) => {
    let attachmentLinked = false;
    for (const attachment of draftProjectAttachments) {
      const isExtractionAttachment = documentExtractionFile
        ? matchesAttachmentFileSignature(attachment, documentExtractionFile)
        : false;
      if (isExtractionAttachment) {
        const duplicateInfo = await checkAttachmentDuplicateByOriginalName(attachment.file);
        if (duplicateInfo.duplicate) {
          const confirmed = window.confirm(
            `Dateiname bereits vorhanden (Kunde: ${duplicateInfo.summary.customer}, Projekt: ${duplicateInfo.summary.project}, Mitarbeiter: ${duplicateInfo.summary.employee}). Trotzdem verknüpfen?`,
          );
          if (!confirmed) {
            toast({ title: "Dokumentverknüpfung übersprungen" });
            continue;
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

  const persistCreateSidebarDrafts = async (targetProjectId: number) => {
    await persistDraftProjectTags(targetProjectId);
    await persistDraftProjectNotes(targetProjectId);
    return persistDraftProjectAttachments(targetProjectId);
  };

  const ensureManagedRemarksTagForProject = async (
    targetProjectId: number,
    descriptionHtml: string,
  ) => {
    if (!hasVisibleProjectDescriptionContent(descriptionHtml)) {
      return;
    }

    const remarksTag = availableTags.find((entry) => isManagedRemarksTagName(entry.name));
    if (!remarksTag) {
      return;
    }

    await apiRequest("POST", `/api/projects/${targetProjectId}/tags`, { tagId: remarksTag.id });
    await queryClient.invalidateQueries({ queryKey: ['/api/projects', targetProjectId, 'tags'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/projects', targetProjectId] });
    await invalidateProjectQueries();
  };

  const persistEditAttachmentDrafts = async (targetProjectId: number) => {
    const attachmentLinked = await persistDraftProjectAttachments(targetProjectId);
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

  const handleSubmit = async () => {
    if (isReadOnlyView) {
      toast({ title: "Nur Lesemodus", description: "Diese Rolle darf Projekte nicht bearbeiten.", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Projektname ist erforderlich", variant: "destructive" });
      return;
    }
    if (!customerId) {
      toast({ title: "Kunde muss ausgewählt werden", variant: "destructive" });
      return;
    }
    if (!selectedCustomerNumber) {
      toast({ title: "Kundennummer des zugeordneten Kunden fehlt", variant: "destructive" });
      return;
    }

    const storedProjectName = name.trim();
    const normalizedOrderNumber = orderNumber.trim() || null;
    const normalizedAmountText = amount.replace(",", ".").trim();
    const parsedAmountNumber = normalizedAmountText.length === 0 ? null : Number(normalizedAmountText);
    const normalizedAmount = parsedAmountNumber == null ? null : parsedAmountNumber.toFixed(2);
    const amountIsValid =
      normalizedAmountText.length === 0 || /^-?\d+(?:\.\d{1,2})?$/.test(normalizedAmountText);
    if (!amountIsValid || (parsedAmountNumber != null && !Number.isFinite(parsedAmountNumber))) {
      toast({ title: "Betrag ist ungueltig (max. 2 Nachkommastellen)", variant: "destructive" });
      throw new Error("validation");
    }
    if (!isEditing && normalizedOrderNumber === null) {
      toast({ title: "Auftragsnummer ist erforderlich", variant: "destructive" });
      return;
    }

    let createdProjectId: number | null = null;
    let extractionAttachmentLinked = false;
    const normalizedPlannedDateText = plannedDateText.trim() || null;
    const normalizedPlannedWeek = plannedWeek.trim() || null;
    const persistedDescriptionMd = buildPersistedProjectDescription(productSelections, descriptionMd);
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
        customerId,
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
        extractionAttachmentLinked = await persistEditAttachmentDrafts(effectiveProjectId);
      }
      if (effectiveProjectId) {
        await ensureManagedRemarksTagForProject(effectiveProjectId, persistedDescriptionMd);
      }
    } else {
      let createdProject: Awaited<ReturnType<typeof createMutation.mutateAsync>>;
      try {
        createdProject = await createMutation.mutateAsync({
          name: storedProjectName,
          type: resolvedProjectEditForm.normalizedType,
          orderNumber: normalizedOrderNumber,
          amount: normalizedAmount,
          customerId,
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
        extractionAttachmentLinked = await persistCreateSidebarDrafts(createdProject.id);
        await ensureManagedRemarksTagForProject(createdProject.id, persistedDescriptionMd);
        await queryClient.invalidateQueries({ queryKey: ['/api/projects', createdProject.id, 'tags'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/projects', createdProject.id, 'notes'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/projects', createdProject.id, 'attachments'] });
        setDraftProjectTags([]);
        setDraftProjectNotes([]);
        setDraftProjectAttachments([]);
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
      sidebarDraftSignature: isEditing ? null : emptyCreateSidebarDraftSignature,
    }));

    if (onSaved && onSaved !== onCancel) {
      onSaved();
    }
    if (createdProjectId) {
      onProjectCreated?.(createdProjectId, { attachmentLinked: extractionAttachmentLinked });
    }
  };

  const applyExtractedData = async (payload: {
    saunaModel: string;
    orderNumber: string;
    amount: string;
    articleListHtml: string;
    customer: ExtractionCustomerDraft;
  }) => {
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
            `Es ist bereits ein abweichender Betrag gesetzt (${currentAmount}). Mit extrahiertem Betrag (${extractedAmount}) ueberschreiben?`,
          );
          if (shouldOverwrite) {
            setAmount(extractedAmount);
          }
        }
      }
      setDocumentExtractionOpen(false);
      if (customerId && selectedCustomer) {
        toast({
          title: "Auftragsdaten übernommen",
          description: "Der aktuell ausgewählte Kunde bleibt unverändert.",
        });
      } else {
        toast({
          title: "Auftragsdaten übernommen",
          description: "Zum Speichern muss noch ein Kunde ausgewählt werden.",
        });
      }
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
                  <TabsTrigger value="journal" className="flex-1 gap-1.5" data-testid="tab-project-journal"><ScrollText className="w-4 h-4" />Journal</TabsTrigger>
                </TabsList>
              </div>
            ) : null}
            {isEditing && !isReadOnlyView ? (
              <div className="sub-panel space-y-3" data-testid="project-form-functions-panel">
                <h3 className="text-sm font-bold tracking-wider text-primary">Funktionen</h3>
                <div className="flex flex-col gap-2">
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
                disabled={isSubmitPending}
                data-testid="button-save-project"
              >
                {isSubmitPending ? "Speichern..." : "Speichern"}
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
        ) : (
          <JournalRecordsView
            context={{ tableName: "project", recordId: effectiveProjectId }}
            pageSize={25}
            testIdPrefix="project-journal"
          />
        )}

      </EntityFormShell>

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
        dataApplyLabel="Auftragsdaten übernehmen"
        showCustomerSection={false}
        onApplyData={applyExtractedData}
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

      <AlertDialog open={noteSuggestionDialog !== null} onOpenChange={(open) => { if (!open) setNoteSuggestionDialog(null); }}>
        <AlertDialogContent data-testid="dialog-note-suggestion">
          <AlertDialogHeader>
            <AlertDialogTitle>Notiz anlegen?</AlertDialogTitle>
            <AlertDialogDescription>
              {`Soll eine Notiz „${noteSuggestionDialog?.templateTitle ?? ""}" für dieses Projekt angelegt werden?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-note-suggestion-skip" onClick={() => setNoteSuggestionDialog(null)}>Überspringen</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-note-suggestion-confirm"
              onClick={() => { void handleCreateProjectNoteFromSuggestion(); }}
            >
              Jetzt anlegen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                void deleteProjectMutation.mutateAsync();
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
