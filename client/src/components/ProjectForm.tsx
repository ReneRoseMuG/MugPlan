import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ComponentDropdown } from "@/components/ui/component-dropdown";
import { EntityFormLayout } from "@/components/ui/entity-form-layout";
import { ProductSelectionDropdown } from "@/components/ui/product-selection-dropdown";
import { ProjectAppointmentsPanel } from "@/components/ProjectAppointmentsPanel";
import { ProjectAttachmentsPanel } from "@/components/ProjectAttachmentsPanel";
import { ProjectOrderForm, ProjectProductFields } from "@/components/ProjectOrderForm";
import { RichTextEditor } from "@/components/RichTextEditor";
import { DocumentExtractionDropzone } from "@/components/DocumentExtractionDropzone";
import {
  DocumentExtractionDialog,
  type ExtractionDialogData,
  type ExtractionCustomerDraft,
} from "@/components/DocumentExtractionDialog";
import { CustomersPage } from "@/components/CustomersPage";
import { NotesSection } from "@/components/NotesSection";
import { TagPickerPanel, type TagRelationItem } from "@/components/TagPickerPanel";
import { CustomerDetailCard } from "@/components/ui/customer-detail-card";
import { RelationSlot } from "@/components/ui/relation-slot";
import { 
  FolderKanban, 
  UserCircle
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
import { invalidateTagProjectionQueries } from "@/lib/tag-invalidation";
import { DEFAULT_PROJECT_TYPE, resolveProjectEditForm } from "@/lib/project-edit-form";
import {
  buildDynamicProjectCategorySlots,
  buildPersistedProjectDescription,
  buildProjectArticleLines,
  cloneProjectProductSelections,
  createEmptyProjectProductSelections,
  createEmptyDynamicProjectProductSelections,
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
import type { Project, Customer, Note, Component, ComponentCategory, ProductCategory, ProjectOrderItem, Product, Tag } from "@shared/schema";

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
  onProjectCreated?: (projectId: number) => void;
}


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
  const isEditing = !!projectId;
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
  const [componentDialogField, setComponentDialogField] = useState<ProjectProductFieldKey | null>(null);
  const [dynamicDialogSlotId, setDynamicDialogSlotId] = useState<string | null>(null);
  const [extractedArticleListHtml, setExtractedArticleListHtml] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentExtractionOpen, setDocumentExtractionOpen] = useState(false);
  const [documentExtractionLoading, setDocumentExtractionLoading] = useState(false);
  const [documentExtractionData, setDocumentExtractionData] = useState<ExtractionDialogData | null>(null);
  const [documentExtractionFile, setDocumentExtractionFile] = useState<File | null>(initialDocumentExtractionFile ?? null);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string>("");
  const [didApplyInitialDraft, setDidApplyInitialDraft] = useState(false);
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";
  const canManageProjectTags = isAdmin || userRole === "DISPATCHER";

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
    });
  // Fetch project data if editing
  const { data: projectData, isLoading: projectLoading } = useQuery<{ project: Project; customer: Customer }>({
    queryKey: ['/api/projects', projectId],
    enabled: isEditing,
  });
  const {
    data: assignedTags = [],
    isLoading: assignedTagsLoading,
    error: assignedTagsError,
  } = useQuery<TagRelationItem[]>({
    queryKey: ['/api/projects', projectId, 'tags'],
    enabled: isEditing,
  });
  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: ['/api/tags'],
    enabled: isEditing,
  });

  // Fetch customers for selection
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Fetch project notes
  const { data: projectNotes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ['/api/projects', projectId, 'notes'],
    enabled: isEditing,
  });

  const masterDataScope = isAdmin ? "all" : "active";
  const productCategoriesUrl = `/api/admin/master-data/product-categories?active=${masterDataScope}`;
  const productsUrl = `/api/admin/master-data/products?active=${masterDataScope}`;
  const componentCategoriesUrl = `/api/admin/master-data/component-categories?active=${masterDataScope}`;
  const componentsUrl = `/api/admin/master-data/components?active=${masterDataScope}`;
  const projectOrderItemsUrl = projectId ? `/api/projects/${projectId}/order-items` : null;

  const { data: productCategories = [] } = useQuery<ProductCategory[]>({
    queryKey: [productCategoriesUrl],
    enabled: true,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: [productsUrl],
    enabled: true,
  });

  const { data: componentCategories = [] } = useQuery<ComponentCategory[]>({
    queryKey: [componentCategoriesUrl],
    enabled: true,
  });

  const { data: components = [] } = useQuery<Component[]>({
    queryKey: [componentsUrl],
    enabled: true,
  });

  const { data: projectOrderItems = [] } = useQuery<ProjectOrderItem[]>({
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
    if (projectData) {
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
        }),
      );
    } else if (!isEditing) {
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
        }),
      );
    }
  }, [dynamicCategorySlots, isEditing, projectData]);

  useEffect(() => {
    if (!isEditing || products.length === 0 || components.length === 0 || componentCategories.length === 0) return;
    setProductSelections(mapProjectOrderItemsToSelections(projectOrderItems, products, components, componentCategories));
    setDynamicProductSelections(
      mapProjectOrderItemsToDynamicSelections(projectOrderItems, products, components, dynamicCategorySlots),
    );
  }, [componentCategories, components, dynamicCategorySlots, isEditing, products, projectOrderItems]);

  useEffect(() => {
    if (!isEditing && initialDocumentExtractionFile) {
      setDocumentExtractionFile(initialDocumentExtractionFile);
    }
  }, [initialDocumentExtractionFile, isEditing]);

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
      }),
    );
    setDidApplyInitialDraft(true);
  }, [didApplyInitialDraft, dynamicCategorySlots, initialDraft, isEditing]);

  const selectedCustomer = customers.find(c => c.id === customerId) || projectData?.customer;
  const selectedCustomerNumber = selectedCustomer?.customerNumber?.trim() ?? "";
  const projectNamePreview = name.trim();
  const projectVersion = projectData?.project.version;
  const resolvedProjectEditForm = resolveProjectEditForm(projectType);
  const articleLines = buildProjectArticleLines(productSelections);
  const selectedComponentDialogField = componentDialogField ? getProjectProductField(componentDialogField) : null;
  const selectedComponentDialogCategory =
    selectedComponentDialogField && selectedComponentDialogField.source === "component"
      ? selectedComponentDialogField.categoryName
      : null;
  const selectedDynamicDialogSlot = dynamicDialogSlotId
    ? dynamicCategorySlots.find((slot) => slot.slotId === dynamicDialogSlotId) ?? null
    : null;
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
      }),
    );
  }, [componentCategories, components, dynamicCategorySlots, isEditing, products, projectData, projectOrderItems]);

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
      const extraction = payload as {
        customer: ExtractionCustomerDraft;
        orderNumber: string | null;
        amount: string | null;
        saunaModel: string;
        articleItems: ExtractionDialogData["articleItems"];
        categorizedItems: ExtractionDialogData["categorizedItems"];
        articleListHtml: string;
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
        },
        orderNumber: extraction.orderNumber ?? null,
        amount: extraction.amount ?? null,
        saunaModel: extraction.saunaModel ?? "",
        articleItems: extraction.articleItems ?? [],
        categorizedItems: extraction.categorizedItems ?? [],
        articleListHtml: extraction.articleListHtml ?? "",
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

  const upsertExistingProjectSelection = async (fieldKey: ProjectProductFieldKey, selectedValue: string) => {
    if (!projectId || !projectData?.project.orderNumber) return;
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

    const response = await apiRequest("POST", `/api/projects/${projectId}/order-items`, {
      projectId,
      orderNumber: projectData.project.orderNumber,
      productId: product?.id ?? null,
      componentId: component?.id ?? null,
      specificationId: null,
      quantity: 1,
    });
    const savedItem = await response.json() as ProjectOrderItem;
    setProductSelections((current) => ({
      ...current,
      [fieldKey]: {
        productId: product?.id ?? null,
        componentId: component?.id ?? null,
        componentName: product?.name ?? component?.name ?? "",
        itemId: savedItem.id,
        version: savedItem.version,
      },
    }));
    await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/order-items`] });
  };

  const upsertExistingDynamicSelection = async (slot: DynamicProjectCategorySlot, selectedValue: string) => {
    if (!projectId || !projectData?.project.orderNumber) return;
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

    const response = await apiRequest("POST", `/api/projects/${projectId}/order-items`, {
      projectId,
      orderNumber: projectData.project.orderNumber,
      productId: product?.id ?? null,
      componentId: component?.id ?? null,
      specificationId: null,
      quantity: 1,
    });
    const savedItem = await response.json() as ProjectOrderItem;
    setDynamicProductSelections((current) => ({
      ...current,
      [slot.slotId]: {
        productId: product?.id ?? null,
        componentId: component?.id ?? null,
        componentName: product?.name ?? component?.name ?? "",
        itemId: savedItem.id,
        version: savedItem.version,
      },
    }));
    await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/order-items`] });
  };

  const handleFieldSelection = async (fieldKey: ProjectProductFieldKey, selectedValue: string) => {
    if (!selectedValue) return;
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

    if (isEditing && projectId) {
      try {
        await upsertExistingProjectSelection(fieldKey, selectedValue);
        toast({ title: `${getProjectProductField(fieldKey).label} übernommen` });
      } catch (error) {
        toast({
          title: "Komponente konnte nicht übernommen werden",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        });
      }
      return;
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

  const handleDynamicFieldSelection = async (slotId: string, selectedValue: string) => {
    const slot = dynamicCategorySlots.find((entry) => entry.slotId === slotId);
    if (!slot || !selectedValue) return;
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

    if (isEditing && projectId) {
      try {
        await upsertExistingDynamicSelection(slot, selectedValue);
        toast({ title: `${slot.label} uebernommen` });
      } catch (error) {
        toast({
          title: `${slot.label} konnte nicht uebernommen werden`,
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        });
      }
      return;
    }

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
        specificationId: null,
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
        specificationId: null,
        quantity: 1,
      });
    }
    await queryClient.invalidateQueries({ queryKey: [`/api/projects/${createdProjectId}/order-items`] });
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
          title: "Speichern nicht moeglich",
          description: "Der ausgewaehlte Kunde ist inaktiv. Bitte einen aktiven Kunden zuordnen.",
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
      const res = await apiRequest('PATCH', `/api/projects/${projectId}`, data);
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
          title: "Speichern nicht moeglich",
          description: "Der ausgewaehlte Kunde ist inaktiv. Bitte einen aktiven Kunden zuordnen.",
          variant: "destructive",
        });
        return;
      }
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Speichern nicht moeglich",
          description: "Datensatz wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    },
  });

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
      const res = await apiRequest('POST', `/api/projects/${projectId}/notes`, data);
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'notes'] });
      void queryClient.invalidateQueries({ queryKey: ["/api/projects/list"] });
      void invalidateAppointmentProjectionQueries();
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, title, body, cardColor, print, version }: { noteId: number; title: string; body: string; cardColor?: string | null; print: boolean; version: number }) => {
      const res = await apiRequest("PUT", `/api/notes/${noteId}`, { title, body, cardColor, print, version });
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'notes'] });
      void queryClient.invalidateQueries({ queryKey: ["/api/projects/list"] });
      void invalidateAppointmentProjectionQueries();
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Notiz konnte nicht aktualisiert werden",
          description: "Datensatz wurde zwischenzeitlich geaendert. Bitte neu laden.",
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
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'notes'] });
      void queryClient.invalidateQueries({ queryKey: ["/api/projects/list"] });
      void invalidateAppointmentProjectionQueries();
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Notiz konnte nicht aktualisiert werden",
          description: "Datensatz wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
      }
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async ({ noteId, version }: { noteId: number; version: number }) => {
      await apiRequest('DELETE', `/api/projects/${projectId}/notes/${noteId}`, { version });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'notes'] });
      void queryClient.invalidateQueries({ queryKey: ["/api/projects/list"] });
      void invalidateAppointmentProjectionQueries();
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Notiz konnte nicht geloescht werden",
          description: "Datensatz wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
      }
    },
  });

  const addProjectTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/tags`, { tagId });
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tags'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
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
      await apiRequest('DELETE', `/api/projects/${projectId}/tags/${item.tag.id}`, {
        version: item.relationVersion,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tags'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
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
      if (!projectId) throw new Error("Projekt-ID fehlt");
      if (!projectVersion) throw new Error("Projektversion fehlt");
      await apiRequest("DELETE", `/api/projects/${projectId}`, { version: projectVersion });
    },
    onSuccess: () => {
      void invalidateProjectQueries();
      toast({ title: "Projekt geloescht" });
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
          title: "Projekt kann nicht geloescht werden",
          description: "Projekt kann nicht geloescht werden, weil Termine vorhanden sind.",
          variant: "destructive",
        });
        return;
      }
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Projekt wurde zwischenzeitlich geaendert",
          description: "Bitte neu laden und erneut versuchen.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Projekt konnte nicht geloescht werden",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Projektname ist erforderlich", variant: "destructive" });
      throw new Error("validation");
    }
    if (!customerId) {
      toast({ title: "Kunde muss ausgewählt werden", variant: "destructive" });
      throw new Error("validation");
    }
    if (!selectedCustomerNumber) {
      toast({ title: "Kundennummer des zugeordneten Kunden fehlt", variant: "destructive" });
      throw new Error("validation");
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

    let createdProjectId: number | null = null;
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
    } else {
      const createdProject = await createMutation.mutateAsync({
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
    }));

    if (createdProjectId && documentExtractionFile) {
      try {
        const duplicateResponse = await fetch("/api/attachments/duplicates/check-original-name", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ originalName: documentExtractionFile.name }),
        });
        const duplicatePayload = await duplicateResponse.json().catch(() => null);
        if (!duplicateResponse.ok) {
          throw new Error(duplicatePayload?.message ?? "Duplikatpruefung fehlgeschlagen");
        }

        const duplicateInfo = duplicatePayload as {
          duplicate: boolean;
          summary: { customer: number; project: number; employee: number };
        };
        if (duplicateInfo.duplicate) {
          const confirmed = window.confirm(
            `Dateiname bereits vorhanden (Kunde: ${duplicateInfo.summary.customer}, Projekt: ${duplicateInfo.summary.project}, Mitarbeiter: ${duplicateInfo.summary.employee}). Trotzdem verknuepfen?`,
          );
          if (!confirmed) {
            toast({ title: "Dokumentverknuepfung uebersprungen" });
            setDocumentExtractionFile(null);
            if (onSaved && onSaved !== onCancel) {
              onSaved();
            }
            return;
          }
        }

        const uploadData = new FormData();
        uploadData.append("file", documentExtractionFile);
        const uploadResponse = await fetch(`/api/projects/${createdProjectId}/attachments`, {
          method: "POST",
          credentials: "include",
          body: uploadData,
        });
        if (!uploadResponse.ok) {
          const uploadPayload = await uploadResponse.json().catch(() => null);
          throw new Error(uploadPayload?.message ?? "Dokumentverknuepfung fehlgeschlagen");
        }
        await queryClient.invalidateQueries({ queryKey: ["/api/projects", createdProjectId, "attachments"] });
        toast({ title: "Projekt angelegt und Dokument verknuepft" });
      } catch (error) {
        toast({
          title: "Projekt angelegt, aber Dokumentverknuepfung fehlgeschlagen",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        });
      } finally {
        setDocumentExtractionFile(null);
      }
    }

    if (onSaved && onSaved !== onCancel) {
      onSaved();
    }
    if (createdProjectId) {
      onProjectCreated?.(createdProjectId);
    }
  };

  const resolveOrCreateCustomerForExtraction = async (customerDraft: ExtractionCustomerDraft): Promise<Customer | null> => {
    const extractedCustomerNumber = customerDraft.customerNumber.trim();
    if (!extractedCustomerNumber) {
      throw new Error("Kundennummer ist erforderlich.");
    }
    if (customerId && selectedCustomer) {
      const selectedNumber = selectedCustomer.customerNumber.trim();
      if (selectedNumber === extractedCustomerNumber) {
        return selectedCustomer;
      }
      const overwriteCustomer = window.confirm(
        `Es ist bereits ein abweichender Kunde ausgewählt (${selectedNumber}). Mit Kunde ${extractedCustomerNumber} ersetzen?`,
      );
      if (!overwriteCustomer) {
        return null;
      }
    }
    const resolution = await resolveCustomerByNumber(extractedCustomerNumber);
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

  const applyExtractedData = async (payload: {
    saunaModel: string;
    orderNumber: string;
    amount: string;
    articleListHtml: string;
    customer: ExtractionCustomerDraft;
  }) => {
    try {
      const resolvedCustomer = await resolveOrCreateCustomerForExtraction(payload.customer);
      if (!resolvedCustomer) {
        return;
      }
      const mergedCustomer = await tryPatchExistingCustomerFromExtraction(resolvedCustomer, payload.customer);
      setCustomerId(mergedCustomer.id);

      const hasDynamicValues = Object.values(dynamicProductSelections).some((selection) => selection.componentName.trim().length > 0);
      const hasExistingValues = name.trim().length > 0 || articleLines.length > 0 || hasDynamicValues || extractedArticleListHtml.trim().length > 0;
      if (hasExistingValues) {
        const confirmed = window.confirm("Titel oder Beschreibung sind bereits befüllt. Inhalte überschreiben?");
        if (!confirmed) return;
      }
      setName(payload.saunaModel.trim());
      setExtractedArticleListHtml(payload.articleListHtml.trim());
      if (products.length > 0 && components.length > 0 && componentCategories.length > 0 && documentExtractionData) {
        setProductSelections(
          resolveSelectionsFromExtraction(
            {
              saunaModel: payload.saunaModel.trim(),
              categorizedItems: documentExtractionData.categorizedItems,
            },
            products,
            components,
            componentCategories,
          ),
        );
      }
      const extractedOrderNumber = payload.orderNumber.trim();
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
      toast({ title: "Daten übernommen" });
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

  return (
    <EntityFormLayout
      title={isEditing ? "Projektdaten bearbeiten" : "Neues Projekt"}
      icon={<FolderKanban className="w-6 h-6" />}
      onClose={handleRequestClose}
      onCancel={handleRequestClose}
      onSubmit={handleSubmit}
      saveLabel="Projekt speichern"
      testIdPrefix="project"
      footerActions={isEditing ? (
        <Button
          variant="destructive"
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={deleteProjectMutation.isPending}
          data-testid="button-delete-project"
        >
          {deleteProjectMutation.isPending ? "Projekt löschen..." : "Projekt löschen"}
        </Button>
      ) : undefined}
    >
      <div className="space-y-6">
        {isEditing ? (
          <ProjectOrderForm
            name={name}
            orderNumber={orderNumber}
            amount={amount}
            plannedDateText={plannedDateText}
            plannedWeek={plannedWeek}
            isEditing={isEditing}
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
            onNameChange={setName}
            onOrderNumberChange={setOrderNumber}
            onAmountChange={setAmount}
            onPlannedDateTextChange={setPlannedDateText}
            onPlannedWeekChange={setPlannedWeek}
          />
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Linke Spalte: Beschreibung und Kunde */}
          <div className="col-span-2 min-w-0 space-y-6">
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
                        onOpenComponentDialog={setComponentDialogField}
                        onOpenDynamicDialog={setDynamicDialogSlotId}
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
                  />
                </div>
              ) : null}

              <div className="space-y-4">
                <RelationSlot
                  title="Kunde"
                  icon={<UserCircle className="w-4 h-4" />}
                  state={selectedCustomer ? "active" : "empty"}
                  onAdd={() => setCustomerDialogOpen(true)}
                  onRemove={() => setCustomerId(null)}
                  addLabel="Kunde auswählen"
                  emptyText="Kein Kunde ausgewählt"
                  testId="slot-customer-relation-project"
                  addActionTestId="button-select-customer"
                  removeActionTestId="button-change-customer"
                >
                  {selectedCustomer ? <CustomerDetailCard customer={selectedCustomer} testId="badge-customer" /> : null}
                </RelationSlot>
              </div>

              {!isEditing ? (
                <DocumentExtractionDropzone
                  onFileSelected={(file) => {
                    void runDocumentExtraction(file);
                  }}
                  isProcessing={documentExtractionLoading}
                />
              ) : null}

              {/* Notizen - nur bei Bearbeitung */}
              {isEditing && (
                <NotesSection
                  notes={projectNotes}
                  isLoading={notesLoading}
                  onAdd={(data) => createNoteMutation.mutate(data)}
                  onUpdate={(noteId, data) => {
                    const version = getProjectNoteVersion(noteId);
                    updateNoteMutation.mutate({ noteId, ...data, version });
                  }}
                  onTogglePin={(id, isPinned) => {
                    const version = getProjectNoteVersion(id);
                    togglePinMutation.mutate({ noteId: id, isPinned, version });
                  }}
                  onDelete={(noteId) => {
                    const version = getProjectNoteVersion(noteId);
                    deleteNoteMutation.mutate({ noteId, version });
                  }}
                />
              )}
          </div>

          {/* Rechte Spalte: Termine und Dokumente */}
          <div className="min-w-0 space-y-6">
              <ProjectAppointmentsPanel
                projectId={projectId}
                projectName={projectNamePreview}
                isEditing={isEditing}
                className="h-auto"
                onOpenAppointment={onOpenAppointment}
                onOpenCalendarWorkspace={onOpenCalendarWorkspace}
              />

              {/* Dokumente - nur bei Bearbeitung */}
              {isEditing && (
                <ProjectAttachmentsPanel
                  projectId={projectId}
                  isEditing={isEditing}
                  className="h-auto"
                />
              )}

              {isEditing ? (
                <TagPickerPanel
                  assignedTags={assignedTags}
                  availableTags={availableTags}
                  isLoading={assignedTagsLoading}
                  loadErrorMessage={assignedTagsError instanceof Error ? assignedTagsError.message : null}
                  canEdit={canManageProjectTags}
                  title="Tags"
                  addDialogTitle="Tag zu Projekt hinzufügen"
                  testIdPrefix="project-tag-picker"
                  onAdd={(tagId) => addProjectTagMutation.mutate(tagId)}
                  onRemove={(item) => removeProjectTagMutation.mutate(item)}
                  className="h-auto"
                />
              ) : null}
          </div>
        </div>
      </div>

      <DocumentExtractionDialog
        open={documentExtractionOpen}
        onOpenChange={setDocumentExtractionOpen}
        data={documentExtractionData}
        isBusy={documentExtractionLoading}
        dataApplyLabel="Daten übernehmen"
        onApplyData={applyExtractedData}
      />

      {componentDialogField && isProductSelectionField(componentDialogField) ? (
        <ProductSelectionDropdown
          products={products}
          selectedProductId={String(productSelections[componentDialogField].productId ?? "")}
          onSelect={(productId) => {
            void handleFieldSelection(componentDialogField, productId);
          }}
          dialogMode
          open
          onOpenChange={(open) => {
            if (!open) {
              setComponentDialogField(null);
            }
          }}
        />
      ) : null}

      {selectedDynamicDialogSlot?.source === "product" ? (
        <ProductSelectionDropdown
          products={products.filter((product) => product.categoryId === selectedDynamicDialogSlot.categoryId)}
          selectedProductId={String(dynamicProductSelections[selectedDynamicDialogSlot.slotId]?.productId ?? "")}
          onSelect={(productId) => {
            void handleDynamicFieldSelection(selectedDynamicDialogSlot.slotId, productId);
          }}
          label={selectedDynamicDialogSlot.label}
          placeholder={`${selectedDynamicDialogSlot.label} auswaehlen`}
          testId={`select-project-product-${selectedDynamicDialogSlot.slotId}`}
          dialogMode
          open
          onOpenChange={(open) => {
            if (!open) {
              setDynamicDialogSlotId(null);
            }
          }}
          title={`${selectedDynamicDialogSlot.label} auswaehlen`}
        />
      ) : null}

      {selectedComponentDialogCategory && componentDialogField && !isProductSelectionField(componentDialogField) ? (
        <ComponentDropdown
          components={components}
          categories={componentCategories}
          targetCategory={selectedComponentDialogCategory}
          selectedComponentId={String(productSelections[componentDialogField].componentId ?? "")}
          onSelect={(componentId) => {
            void handleFieldSelection(componentDialogField, componentId);
          }}
          dialogMode
          open
          onOpenChange={(open) => {
            if (!open) {
              setComponentDialogField(null);
            }
          }}
        />
      ) : null}

      {selectedDynamicDialogSlot?.source === "component" ? (
        <ComponentDropdown
          components={components}
          categories={componentCategories}
          targetCategory={selectedDynamicDialogSlot.categoryName}
          targetCategoryId={selectedDynamicDialogSlot.categoryId}
          selectedComponentId={String(dynamicProductSelections[selectedDynamicDialogSlot.slotId]?.componentId ?? "")}
          onSelect={(componentId) => {
            void handleDynamicFieldSelection(selectedDynamicDialogSlot.slotId, componentId);
          }}
          dialogMode
          open
          onOpenChange={(open) => {
            if (!open) {
              setDynamicDialogSlotId(null);
            }
          }}
          title={`${selectedDynamicDialogSlot.label} auswaehlen`}
          testId={`select-component-${selectedDynamicDialogSlot.slotId}`}
        />
      ) : null}

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
          <AlertDialogTitle>Projekt wirklich loeschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Diese Aktion ist endgueltig. Das Projekt wird nur geloescht, wenn keine Termine zugeordnet sind.
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

    </EntityFormLayout>
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
