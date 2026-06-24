import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DialogBaseInlineMessage } from "@/components/ui/dialog-base";
import { EntityFormShell } from "@/components/ui/entity-form-shell";
import { EditFormContextText } from "@/components/ui/edit-form-context-text";
import { Calendar, LayoutList, Mail, Phone, ScrollText, User, X } from "lucide-react";
import { NotesSection } from "@/components/NotesSection";
import { LinkedProjectsPanel } from "@/components/LinkedProjectsPanel";
import { CustomerAppointmentsPanel } from "@/components/CustomerAppointmentsPanel";
import { AppointmentsListPage, type AppointmentsListContext } from "@/components/AppointmentsListPage";
import { CustomerAttachmentsPanel, type PendingCustomerAttachmentItem } from "@/components/CustomerAttachmentsPanel";
import { CustomerAddressesPanel, type AddressCategory } from "@/components/CustomerAddressesPanel";
import { ADDRESS_ROLE_BILLING, buildAddressPersistPlan, type CustomerAddressDraft } from "@/lib/customer-addresses";
import { DocumentExtractionDropzone } from "@/components/DocumentExtractionDropzone";
import {
  DocumentExtractionDialog,
  type ExtractionCustomerDraft,
  type ExtractionDialogData,
} from "@/components/DocumentExtractionDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { fetchTagCatalog, getTagCatalogQueryKey } from "@/lib/tags";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { TagPickerPanel, type TagRelationItem } from "@/components/TagPickerPanel";
import { joinEditFormContext, resolveCustomerEditLabel } from "@/lib/edit-form-context";
import { invalidateTagProjectionQueries } from "@/lib/tag-invalidation";
import { JournalRecordsView } from "@/components/JournalRecordsView";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStoredUserRole, isReaderRole } from "@/lib/auth";
import { normalizeServerError, type NormalizedServerError } from "@/lib/error-normalization";
import type { Customer, Note, Tag } from "@shared/schema";

interface CustomerDataProps {
  customerId?: number | null;
  onCancel?: () => void;
  onSave?: () => void;
  onOpenProject?: (id: number) => void;
  onOpenAppointment?: (appointmentId: number, context: AppointmentsListContext) => void;
}

type CustomerSubmitPayload = {
  customerNumber: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
};

type CustomerDetail = Customer & { tags: Tag[] };
type DraftCustomerNote = Note & { templateId?: number };

type CustomerAddressApiItem = {
  id: number;
  customerId: number;
  categoryId: number;
  categoryName: string;
  roleKey: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  isSystemManaged: boolean;
  isEffectiveDelivery: boolean;
  version: number;
};

export function CustomerData({ customerId, onCancel, onSave, onOpenProject, onOpenAppointment }: CustomerDataProps) {
  const { toast } = useToast();
  const userRole = getStoredUserRole();
  const isReadOnlyView = isReaderRole(userRole);
  const isAdmin = userRole === "ADMIN";
  const canManageCustomerTags = !isReadOnlyView && (isAdmin || userRole === "DISPATCHER");
  const canDeleteAttachments = !isReadOnlyView && (isAdmin || userRole === "DISPATCHER");
  const invalidateAppointmentProjectionQueries = async () => {
    await invalidateTagProjectionQueries();
  };
  const invalidateCustomerNotesQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'notes'] });
    await queryClient.invalidateQueries({ queryKey: ["/api/customers/list"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/notes-preview"] });
    await invalidateAppointmentProjectionQueries();
  };
  
  const [formData, setFormData] = useState({
    customerNumber: "",
    firstName: "",
    lastName: "",
    company: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    city: "",
    country: "",
    isActive: true,
  });
  const [documentExtractionOpen, setDocumentExtractionOpen] = useState(false);
  const [documentExtractionLoading, setDocumentExtractionLoading] = useState(false);
  const [documentExtractionData, setDocumentExtractionData] = useState<ExtractionDialogData | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<"details" | "appointments" | "journal">("details");
  const [mutationError, setMutationError] = useState<NormalizedServerError | null>(null);
  const [draftCustomerTags, setDraftCustomerTags] = useState<TagRelationItem[]>([]);
  const [draftCustomerNotes, setDraftCustomerNotes] = useState<DraftCustomerNote[]>([]);
  const [draftCustomerAttachments, setDraftCustomerAttachments] = useState<PendingCustomerAttachmentItem[]>([]);
  const draftCustomerNoteIdRef = useRef(-1);
  const draftCustomerAttachmentIdRef = useRef(-1);
  const [extraAddressDrafts, setExtraAddressDrafts] = useState<CustomerAddressDraft[]>([]);

  const isEditMode = !!customerId;
  const normalizeOptionalInput = (value: string): string | null => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const { data: customer, isLoading } = useQuery<CustomerDetail>({
    queryKey: ['/api/customers', customerId],
    enabled: isEditMode,
  });
  const {
    data: customerTagRelations = [],
    isLoading: customerTagsLoading,
    error: customerTagsError,
  } = useQuery<TagRelationItem[]>({
    queryKey: ['/api/customers', customerId, 'tags'],
    enabled: isEditMode && Boolean(customerId),
  });
  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: getTagCatalogQueryKey("customer"),
    queryFn: () => fetchTagCatalog("customer"),
  });

  const { data: notes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ['/api/customers', customerId, 'notes'],
    enabled: isEditMode && !!customerId,
  });
  const { data: customerAddressesData } = useQuery<CustomerAddressApiItem[]>({
    queryKey: ['/api/customers', customerId, 'addresses'],
    queryFn: async () => (await apiRequest("GET", `/api/customers/${customerId}/addresses`)).json(),
    enabled: isEditMode && !!customerId,
  });
  const { data: addressCategories = [] } = useQuery<AddressCategory[]>({
    queryKey: ["/api/address-categories"],
    queryFn: async () => (await apiRequest("GET", "/api/address-categories")).json(),
  });
  const visibleCustomerTags = isEditMode ? customerTagRelations : draftCustomerTags;
  const visibleCustomerNotes = isEditMode ? notes : draftCustomerNotes;
  const customerEditContext = useMemo(
    () => (
      isEditMode
        ? joinEditFormContext([
          resolveCustomerEditLabel({
            fullName: customer?.fullName,
            firstName: formData.firstName,
            lastName: formData.lastName,
            company: formData.company,
            customerNumber: formData.customerNumber,
          }),
          formData.customerNumber.trim() ? `Nr. ${formData.customerNumber.trim()}` : null,
        ])
        : null
    ),
    [
      customer?.fullName,
      formData.company,
      formData.customerNumber,
      formData.firstName,
      formData.lastName,
      isEditMode,
    ],
  );

  const showMutationError = (error: unknown, title: string) => {
    const normalized = normalizeServerError(error, { title });
    setMutationError(normalized);
    toast({
      title: normalized.title,
      description: normalized.description,
      variant: "destructive",
    });
  };

  const createNoteMutation = useMutation({
    mutationFn: async ({ title, body, cardColor, print, templateId }: { title: string; body: string; cardColor?: string | null; print: boolean; templateId?: number }) => {
      const res = await apiRequest('POST', `/api/customers/${customerId}/notes`, { title, body, cardColor, print, templateId });
      return res.json();
    },
    onSuccess: () => {
      setMutationError(null);
      void invalidateCustomerNotesQueries();
    },
    onError: (error: Error) => {
      showMutationError(error, "Notiz konnte nicht angelegt werden");
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, title, body, cardColor, print, version }: { noteId: number; title: string; body: string; cardColor?: string | null; print: boolean; version: number }) => {
      const res = await apiRequest("PUT", `/api/notes/${noteId}`, { title, body, cardColor, print, version });
      return res.json();
    },
    onSuccess: () => {
      setMutationError(null);
      void invalidateCustomerNotesQueries();
    },
    onError: (error: Error) => {
      showMutationError(error, "Notiz konnte nicht aktualisiert werden");
    },
  });

  const getNoteVersion = (noteId: number): number => {
    const note = notes.find((entry) => entry.id === noteId);
    if (!note || !Number.isInteger(note.version) || note.version < 1) {
      throw new Error("422: {\"code\":\"VALIDATION_ERROR\"}");
    }
    return note.version;
  };

  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned, version }: { noteId: number; isPinned: boolean; version: number }) => {
      const res = await apiRequest('PATCH', `/api/notes/${noteId}/pin`, { isPinned, version });
      return res.json();
    },
    onSuccess: () => {
      setMutationError(null);
      void invalidateCustomerNotesQueries();
    },
    onError: (error: Error) => {
      showMutationError(error, "Notiz konnte nicht aktualisiert werden");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async ({ noteId, version }: { noteId: number; version: number }) => {
      await apiRequest('DELETE', `/api/customers/${customerId}/notes/${noteId}`, { version });
    },
    onSuccess: () => {
      setMutationError(null);
      void invalidateCustomerNotesQueries();
    },
    onError: (error: Error) => {
      showMutationError(error, "Notiz konnte nicht gelöscht werden");
    },
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        customerNumber: customer.customerNumber || "",
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        company: customer.company || "",
        email: customer.email || "",
        phone: customer.phone || "",
        addressLine1: customer.addressLine1 || "",
        addressLine2: customer.addressLine2 || "",
        postalCode: customer.postalCode || "",
        city: customer.city || "",
        country: customer.country || "",
        isActive: customer.isActive ?? true,
      });
    }
  }, [customer]);

  useEffect(() => {
    if (!customerAddressesData) return;
    // Weitere Adressen (alles außer der Rechnungsadresse) als bearbeitbare Entwürfe übernehmen.
    setExtraAddressDrafts(
      customerAddressesData
        .filter((item) => item.roleKey !== ADDRESS_ROLE_BILLING)
        .map((item) => ({
          localId: `addr-existing-${item.id}`,
          id: item.id,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          roleKey: item.roleKey,
          addressLine1: item.addressLine1 ?? "",
          addressLine2: item.addressLine2 ?? "",
          postalCode: item.postalCode ?? "",
          city: item.city ?? "",
          country: item.country ?? "",
          version: item.version,
          pendingDelete: false,
          dirty: false,
        })),
    );
  }, [customerAddressesData]);

  useEffect(() => {
    if (isEditMode) {
      setDraftCustomerTags([]);
      setDraftCustomerNotes([]);
      setDraftCustomerAttachments([]);
      draftCustomerNoteIdRef.current = -1;
      draftCustomerAttachmentIdRef.current = -1;
    }
  }, [isEditMode, customerId]);

  const createMutation = useMutation({
    mutationFn: async (data: CustomerSubmitPayload) => {
      const res = await apiRequest('POST', '/api/customers', data);
      return res.json();
    },
    onSuccess: () => {
      setMutationError(null);
      void queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      void queryClient.invalidateQueries({ queryKey: ["/api/customers/list"] });
      void invalidateAppointmentProjectionQueries();
      toast({ title: "Kunde angelegt", description: "Der Kunde wurde erfolgreich angelegt." });
    },
    onError: (error: Error) => {
      showMutationError(error, "Kunde konnte nicht angelegt werden");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CustomerSubmitPayload & { isActive: boolean }) => {
      if (!customer || !Number.isInteger(customer.version) || customer.version < 1) {
        throw new Error("422: {\"code\":\"VALIDATION_ERROR\"}");
      }
      const payload = {
        ...data,
        version: customer.version,
        isActive: isAdmin ? data.isActive : undefined,
      };
      const res = await apiRequest('PATCH', `/api/customers/${customerId}`, payload);
      return res.json();
    },
    onSuccess: () => {
      setMutationError(null);
      void queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] });
      void queryClient.invalidateQueries({ queryKey: ["/api/customers/list"] });
      void invalidateAppointmentProjectionQueries();
      toast({ title: "Gespeichert", description: "Die Kundendaten wurden erfolgreich aktualisiert." });
    },
    onError: (error: Error) => {
      showMutationError(error, "Kunde konnte nicht gespeichert werden");
    },
  });
  const addCustomerTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const response = await apiRequest('POST', `/api/customers/${customerId}/tags`, { tagId });
      return response.json();
    },
    onSuccess: async () => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'tags'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/customers/list'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects/list'] });
      await invalidateAppointmentProjectionQueries();
    },
    onError: (error: Error) => {
      showMutationError(error, "Tag konnte nicht zugewiesen werden");
    },
  });
  const removeCustomerTagMutation = useMutation({
    mutationFn: async (item: TagRelationItem) => {
      await apiRequest('DELETE', `/api/customers/${customerId}/tags/${item.tag.id}`, { version: item.relationVersion });
    },
    onSuccess: async () => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'tags'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/customers/list'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects/list'] });
      await invalidateAppointmentProjectionQueries();
    },
    onError: (error: Error) => {
      showMutationError(error, "Tag konnte nicht entfernt werden");
    },
  });
  const addDraftCustomerTag = (tagId: number) => {
    const selectedTag = availableTags.find((tag) => tag.id === tagId);
    if (!selectedTag) return;
    setDraftCustomerTags((current) => {
      if (current.some((item) => item.tag.id === tagId)) {
        return current;
      }
      return [...current, { tag: selectedTag, relationVersion: 1 }];
    });
  };

  const removeDraftCustomerTag = (item: TagRelationItem) => {
    setDraftCustomerTags((current) => current.filter((entry) => entry.tag.id !== item.tag.id));
  };

  const addDraftCustomerNote = ({
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
    const nextId = draftCustomerNoteIdRef.current;
    draftCustomerNoteIdRef.current -= 1;
    const timestamp = new Date();
    setDraftCustomerNotes((current) => [
      ...current,
      {
        id: nextId,
        title,
        body,
        cardColor: cardColor ?? null,
        print,
        cardColorLocked: false,
        isPinned: false,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        templateId,
      },
    ]);
  };

  const updateDraftCustomerNote = (
    noteId: number,
    data: { title: string; body: string; cardColor?: string | null; print: boolean },
  ) => {
    setDraftCustomerNotes((current) =>
      current.map((note) =>
        note.id === noteId
          ? {
              ...note,
              ...data,
              cardColor: data.cardColor ?? null,
              updatedAt: new Date(),
            }
          : note,
      ),
    );
  };

  const toggleDraftCustomerNotePin = (noteId: number, isPinned: boolean) => {
    setDraftCustomerNotes((current) =>
      current.map((note) => (note.id === noteId ? { ...note, isPinned, updatedAt: new Date() } : note)),
    );
  };

  const deleteDraftCustomerNote = (noteId: number) => {
    setDraftCustomerNotes((current) => current.filter((note) => note.id !== noteId));
  };

  const addDraftCustomerAttachment = (file: File) => {
    const nextId = draftCustomerAttachmentIdRef.current;
    draftCustomerAttachmentIdRef.current -= 1;
    setDraftCustomerAttachments((current) => [
      ...current,
      {
        id: nextId,
        originalName: file.name,
        mimeType: file.type || null,
        file,
      },
    ]);
  };

  const uploadCustomerAttachment = async (targetCustomerId: number, file: File) => {
    const uploadData = new FormData();
    uploadData.append("file", file);
    const uploadResponse = await fetch(`/api/customers/${targetCustomerId}/attachments`, {
      method: "POST",
      credentials: "include",
      body: uploadData,
    });
    if (!uploadResponse.ok) {
      const uploadPayload = await uploadResponse.json().catch(() => null);
      throw new Error(uploadPayload?.message ?? "Kundenanhang konnte nicht hochgeladen werden");
    }
  };

  const persistDraftCustomerTags = async (targetCustomerId: number) => {
    for (const item of draftCustomerTags) {
      await apiRequest("POST", `/api/customers/${targetCustomerId}/tags`, { tagId: item.tag.id });
    }
  };

  const persistDraftCustomerNotes = async (targetCustomerId: number) => {
    for (const note of draftCustomerNotes) {
      await apiRequest("POST", `/api/customers/${targetCustomerId}/notes`, {
        title: note.title,
        body: note.body,
        cardColor: note.cardColor,
        print: note.print,
        templateId: note.templateId,
      });
    }
  };

  const persistDraftCustomerAttachments = async (targetCustomerId: number) => {
    for (const attachment of draftCustomerAttachments) {
      await uploadCustomerAttachment(targetCustomerId, attachment.file);
    }
  };

  const persistExtraAddressDrafts = async (targetCustomerId: number) => {
    const plan = buildAddressPersistPlan(extraAddressDrafts);
    for (const draft of plan.toCreate) {
      await apiRequest("POST", `/api/customers/${targetCustomerId}/addresses`, {
        categoryId: draft.categoryId,
        addressLine1: draft.addressLine1,
        addressLine2: draft.addressLine2 || null,
        postalCode: draft.postalCode,
        city: draft.city,
        country: draft.country,
      });
    }
    for (const draft of plan.toUpdate) {
      await apiRequest("PATCH", `/api/customers/${targetCustomerId}/addresses/${draft.id}`, {
        categoryId: draft.categoryId,
        addressLine1: draft.addressLine1,
        addressLine2: draft.addressLine2 || null,
        postalCode: draft.postalCode,
        city: draft.city,
        country: draft.country,
        version: draft.version,
      });
    }
    for (const entry of plan.toDelete) {
      await apiRequest("DELETE", `/api/customers/${targetCustomerId}/addresses/${entry.id}`, { version: entry.version });
    }
  };

  const persistCreateSidebarDrafts = async (targetCustomerId: number) => {
    await persistDraftCustomerTags(targetCustomerId);
    await persistDraftCustomerNotes(targetCustomerId);
    await persistDraftCustomerAttachments(targetCustomerId);
  };

  const handleSubmit = async () => {
    if (isReadOnlyView) {
      toast({
        title: "Nur Lesemodus",
        description: "Diese Rolle darf Kunden nicht bearbeiten.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.customerNumber.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte fuellen Sie die Kundennummer aus.",
        variant: "destructive",
      });
      return;
    }

    const trimmedEmail = formData.email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie eine gueltige E-Mail-Adresse ein.",
        variant: "destructive",
      });
      return;
    }

    setMutationError(null);

    const submitData: CustomerSubmitPayload & { isActive: boolean } = {
      customerNumber: formData.customerNumber.trim(),
      firstName: normalizeOptionalInput(formData.firstName),
      lastName: normalizeOptionalInput(formData.lastName),
      company: normalizeOptionalInput(formData.company),
      email: normalizeOptionalInput(formData.email),
      phone: normalizeOptionalInput(formData.phone),
      addressLine1: normalizeOptionalInput(formData.addressLine1),
      addressLine2: normalizeOptionalInput(formData.addressLine2),
      postalCode: normalizeOptionalInput(formData.postalCode),
      city: normalizeOptionalInput(formData.city),
      country: normalizeOptionalInput(formData.country),
      isActive: formData.isActive,
    };

    if (isEditMode) {
      await updateMutation.mutateAsync(submitData);
      if (customerId) {
        try {
          await persistExtraAddressDrafts(customerId);
          await queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'addresses'] });
          await invalidateAppointmentProjectionQueries();
        } catch (error) {
          toast({
            title: "Adressen konnten nicht vollständig gespeichert werden",
            description: error instanceof Error ? error.message : "Unbekannter Fehler",
            variant: "destructive",
          });
        }
      }
    } else {
      const createdCustomer = await createMutation.mutateAsync(submitData);
      try {
        await persistCreateSidebarDrafts(createdCustomer.id);
        await persistExtraAddressDrafts(createdCustomer.id);
        await queryClient.invalidateQueries({ queryKey: ['/api/customers', createdCustomer.id, 'tags'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/customers', createdCustomer.id, 'notes'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/customers', createdCustomer.id, 'attachments'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/customers', createdCustomer.id, 'addresses'] });
        await invalidateAppointmentProjectionQueries();
        setDraftCustomerTags([]);
        setDraftCustomerNotes([]);
        setDraftCustomerAttachments([]);
      } catch (error) {
        toast({
          title: "Kunde gespeichert, Sidebar-Daten konnten nicht vollständig persistiert werden",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        });
      }
    }

    if (onSave && onSave !== onCancel) {
      onSave();
    }
  };

  const handleAddNote = ({ title, body, cardColor, print, templateId }: { title: string; body: string; cardColor?: string | null; print: boolean; templateId?: number }) => {
    if (!isEditMode) {
      addDraftCustomerNote({ title, body, cardColor, print, templateId });
      return;
    }
    if (!customerId) return;
    createNoteMutation.mutate({ title, body, cardColor, print, templateId });
  };

  const handleTogglePin = (noteId: number, isPinned: boolean) => {
    if (!isEditMode) {
      toggleDraftCustomerNotePin(noteId, isPinned);
      return;
    }
    const version = getNoteVersion(noteId);
    togglePinMutation.mutate({ noteId, isPinned, version });
  };

  const handleDeleteNote = (noteId: number) => {
    if (!isEditMode) {
      deleteDraftCustomerNote(noteId);
      return;
    }
    if (!customerId) return;
    const version = getNoteVersion(noteId);
    deleteNoteMutation.mutate({ noteId, version });
  };

  const handleUpdateNote = (noteId: number, data: { title: string; body: string; cardColor?: string | null; print: boolean }) => {
    if (!isEditMode) {
      updateDraftCustomerNote(noteId, data);
      return;
    }
    if (!customerId) return;
    const version = getNoteVersion(noteId);
    updateNoteMutation.mutate({ noteId, ...data, version });
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

  const runDocumentExtractionCustomer = async (file: File) => {
    setDocumentExtractionLoading(true);
    try {
      const multipart = new FormData();
      multipart.append("file", file);
      const response = await fetch("/api/document-extraction/extract?scope=customer_form", {
        method: "POST",
        credentials: "include",
        body: multipart,
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

  const applyExtractedCustomerDraft = async ({ customer }: { customer: ExtractionCustomerDraft }) => {
    try {
      if (!customer.customerNumber.trim()) {
        throw new Error("Kundennummer ist erforderlich.");
      }
      const resolution = await resolveCustomerByNumber(customer.customerNumber);
      if (resolution.resolution === "multiple") {
        throw new Error("Dateninkonsistenz: Kundennummer ist mehrfach vorhanden. Prozess wurde abgebrochen.");
      }
      if (resolution.resolution === "single") {
        if (!resolution.customer) {
          throw new Error("Dateninkonsistenz: Vorhandener Kunde konnte nicht geladen werden.");
        }
        const existingCustomer = resolution.customer;
        setFormData((prev) => ({
          ...prev,
          customerNumber: existingCustomer.customerNumber?.trim() ?? customer.customerNumber.trim(),
          firstName: (existingCustomer.firstName ?? "").trim(),
          lastName: (existingCustomer.lastName ?? "").trim(),
          company: (existingCustomer.company ?? "").trim(),
          email: (existingCustomer.email ?? "").trim(),
          phone: (existingCustomer.phone ?? "").trim(),
          addressLine1: (existingCustomer.addressLine1 ?? "").trim(),
          addressLine2: (existingCustomer.addressLine2 ?? "").trim(),
          postalCode: (existingCustomer.postalCode ?? "").trim(),
          city: (existingCustomer.city ?? "").trim(),
          country: (existingCustomer.country ?? "").trim(),
        }));
        setDocumentExtractionOpen(false);
        toast({
          title: "Kundendaten übernommen",
          description: "Kunde mit dieser Kundennummer existiert bereits.",
        });
        return;
      }
      setFormData((prev) => ({
        ...prev,
        customerNumber: customer.customerNumber.trim(),
        firstName: (customer.firstName ?? "").trim(),
        lastName: (customer.lastName ?? "").trim(),
        company: (customer.company ?? "").trim(),
        email: (customer.email ?? "").trim(),
        phone: (customer.phone ?? "").trim(),
        addressLine1: (customer.addressLine1 ?? "").trim(),
        addressLine2: (customer.addressLine2 ?? "").trim(),
        postalCode: (customer.postalCode ?? "").trim(),
        city: (customer.city ?? "").trim(),
        country: (customer.country ?? "").trim(),
      }));
      setDocumentExtractionOpen(false);
      toast({ title: "Kundendaten übernommen" });
    } catch (error) {
      toast({
        title: "Kundendaten konnten nicht übernommen werden",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    }
  };

  if (isEditMode && isLoading) {
    return (
      <div className="h-full p-6 overflow-auto">
        <Card className="max-w-6xl mx-auto">
          <CardHeader className="border-b border-border">
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSubmitPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Tabs
      value={isEditMode ? activeMainTab : "details"}
      onValueChange={(value) => setActiveMainTab(value as "details" | "appointments" | "journal")}
      className="h-full"
    >
      <div className="flex h-full min-h-0 w-full flex-1">
      <EntityFormShell
        mainClassName="bg-[hsl(var(--color-cream))]"
        header={(
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex min-w-0 flex-col gap-3">
              <h2 className="text-2xl font-bold text-primary flex min-w-0 items-center gap-3">
                <User className="w-6 h-6" />
                {isEditMode ? "Kunde bearbeiten" : "Neuer Kunde"}
              </h2>
              <EditFormContextText>{customerEditContext}</EditFormContextText>
            </div>

            {onCancel ? (
              <Button
                type="button"
                size="lg"
                variant="ghost"
                onClick={onCancel}
                data-testid="button-close-customer"
              >
                <X className="w-6 h-6" />
              </Button>
            ) : null}
          </div>
        )}
        sidebar={(
          <div className="min-w-0 space-y-6 p-6" data-testid="customer-form-sidebar">
            {isEditMode ? (
              <div className="sub-panel space-y-3">
                <h3 className="text-sm font-bold tracking-wider text-primary">Daten anzeigen</h3>
                <TabsList className="w-full" data-testid="tabs-customer-main">
                  <TabsTrigger value="details" className="flex-1 gap-1.5" data-testid="tab-customer-details"><LayoutList className="w-4 h-4" />Details</TabsTrigger>
                  <TabsTrigger value="appointments" className="flex-1 gap-1.5" data-testid="tab-customer-termine"><Calendar className="w-4 h-4" />Termine</TabsTrigger>
                  <TabsTrigger value="journal" className="flex-1 gap-1.5" data-testid="tab-customer-journal"><ScrollText className="w-4 h-4" />Journal</TabsTrigger>
                </TabsList>
              </div>
            ) : null}
            <LinkedProjectsPanel
              customerId={customerId}
              customerNumber={formData.customerNumber}
              onOpenProject={onOpenProject}
            />

            <CustomerAppointmentsPanel customerId={customerId} className="h-auto" />

            <CustomerAttachmentsPanel
              customerId={customerId}
              isEditing={isEditMode}
              canDelete={canDeleteAttachments}
              readOnly={isReadOnlyView}
              pendingCustomerAttachments={isEditMode ? undefined : draftCustomerAttachments}
              onUploadPendingCustomerAttachment={!isEditMode && !isReadOnlyView ? addDraftCustomerAttachment : undefined}
              className="h-auto"
            />

            <TagPickerPanel
              assignedTags={visibleCustomerTags}
              availableTags={availableTags}
              isLoading={isEditMode ? customerTagsLoading : false}
              loadErrorMessage={isEditMode && customerTagsError instanceof Error ? customerTagsError.message : null}
              canEdit={canManageCustomerTags}
              title="Tags"
              testIdPrefix="customer-tag-picker"
              onAdd={isReadOnlyView ? undefined : (tagId) => {
                if (isEditMode) {
                  addCustomerTagMutation.mutate(tagId);
                  return;
                }
                addDraftCustomerTag(tagId);
              }}
              onRemove={isReadOnlyView ? undefined : (item) => {
                if (isEditMode) {
                  removeCustomerTagMutation.mutate(item);
                  return;
                }
                removeDraftCustomerTag(item);
              }}
              className="h-auto"
            />

            <NotesSection
              notes={visibleCustomerNotes}
              isLoading={isEditMode ? notesLoading : false}
              readOnly={isReadOnlyView}
              onAdd={handleAddNote}
              onUpdate={handleUpdateNote}
              onTogglePin={handleTogglePin}
              onDelete={handleDeleteNote}
            />
          </div>
        )}
        footer={(
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              {onCancel ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  data-testid="button-cancel-customer"
                >
                  Schließen
                </Button>
              ) : null}
            </div>

            {!isReadOnlyView ? (
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitPending}
                data-testid="button-save-customer"
              >
                {isSubmitPending ? "Speichern..." : "Speichern"}
              </Button>
            ) : null}
          </div>
        )}
      >
        {activeMainTab === "details" ? (
          <div className="w-full space-y-6" data-testid="customer-form-main-column">
              {mutationError ? (
                <DialogBaseInlineMessage error={mutationError} />
              ) : null}

              <div className="sub-panel space-y-4">
                <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Stammdaten
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="customerNumber" data-testid="label-customernumber">Kundennummer *</Label>
                  <Input 
                    id="customerNumber" 
                    value={formData.customerNumber}
                    onChange={(e) => setFormData({ ...formData, customerNumber: e.target.value })}
                    readOnly={isEditMode || isReadOnlyView}
                    className="max-w-[200px]"
                    data-testid="input-customernumber"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" data-testid="label-firstname">Vorname</Label>
                    <Input 
                      id="firstName" 
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      readOnly={isReadOnlyView}
                      data-testid="input-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" data-testid="label-lastname">Nachname</Label>
                    <Input 
                      id="lastName" 
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      readOnly={isReadOnlyView}
                      data-testid="input-lastname"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" data-testid="label-company">Firma</Label>
                  <Input 
                    id="company" 
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    readOnly={isReadOnlyView}
                    data-testid="input-company"
                  />
                </div>
              </div>

              <div className="sub-panel space-y-4">
                <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Kontakt
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="phone" data-testid="label-phone">Telefon</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    readOnly={isReadOnlyView}
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" data-testid="label-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    E-Mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    readOnly={isReadOnlyView}
                    data-testid="input-email"
                  />
                </div>
              </div>

              <CustomerAddressesPanel
                billing={{
                  addressLine1: formData.addressLine1,
                  addressLine2: formData.addressLine2,
                  postalCode: formData.postalCode,
                  city: formData.city,
                  country: formData.country,
                }}
                onBillingChange={(fields) => setFormData((prev) => ({ ...prev, ...fields }))}
                extraDrafts={extraAddressDrafts}
                onExtraDraftsChange={setExtraAddressDrafts}
                categories={addressCategories}
                isReadOnly={isReadOnlyView}
              />

              {!isEditMode && !isReadOnlyView ? (
                <DocumentExtractionDropzone
                  onFileSelected={(file) => {
                    void runDocumentExtractionCustomer(file);
                  }}
                  isProcessing={documentExtractionLoading}
                />
              ) : null}

              {isEditMode && isAdmin && !isReadOnlyView && (
                <div className="sub-panel space-y-4">
                  <h3 className="text-sm font-bold tracking-wider text-primary">
                    Status
                  </h3>
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="isActive" 
                      checked={formData.isActive}
                      disabled={!isAdmin}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked === true }))}
                      data-testid="checkbox-active" 
                    />
                    <Label htmlFor="isActive" className="text-slate-500" data-testid="label-active">
                      Kunde ist aktiv {isAdmin ? "" : "(nur durch Administrator änderbar)"}
                    </Label>
                  </div>
                </div>
              )}

          </div>
        ) : activeMainTab === "appointments" ? (
          <div className="flex min-h-0 flex-1 flex-col" data-testid="customer-appointments-list-panel">
            <AppointmentsListPage
              title="Termine"
              helpKey="appointments.list.customerForm"
              context={{ type: "customer", customerId: customerId ?? null }}
              onOpenAppointment={onOpenAppointment}
              className="min-h-0 flex-1"
            />
          </div>
        ) : (
          <JournalRecordsView
            context={{ tableName: "customer", recordId: customerId }}
            pageSize={25}
            testIdPrefix="customer-journal"
          />
        )}


      </EntityFormShell>

      <DocumentExtractionDialog
        open={documentExtractionOpen}
        onOpenChange={setDocumentExtractionOpen}
        data={documentExtractionData}
        isBusy={documentExtractionLoading}
        showProjectSection={false}
        customerApplyLabel="Kundendaten übernehmen"
        onApplyCustomer={applyExtractedCustomerDraft}
      />
      </div>
    </Tabs>
  );
}
