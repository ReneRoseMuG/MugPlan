import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EntityFormLayout } from "@/components/ui/entity-form-layout";
import { ProjectAppointmentsPanel } from "@/components/ProjectAppointmentsPanel";
import { ProjectAttachmentsPanel } from "@/components/ProjectAttachmentsPanel";
import { ProjectStatusPanel } from "@/components/ProjectStatusPanel";
import { RichTextEditor } from "@/components/RichTextEditor";
import { DocumentExtractionDropzone } from "@/components/DocumentExtractionDropzone";
import {
  DocumentExtractionDialog,
  type ExtractionDialogData,
  type ExtractionCustomerDraft,
} from "@/components/DocumentExtractionDialog";
import { CustomersPage } from "@/components/CustomersPage";
import { NotesSection } from "@/components/NotesSection";
import { CustomerDetailCard } from "@/components/ui/customer-detail-card";
import { RelationSlot } from "@/components/ui/relation-slot";
import { 
  FolderKanban, 
  UserCircle, 
  FileText
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import type { Project, Customer, Note, ProjectStatus } from "@shared/schema";
import type { ProjectStatusRelationItem } from "@shared/routes";

interface ProjectFormProps {
  projectId?: number;
  onCancel?: () => void;
  onSaved?: () => void;
  onOpenAppointment?: (context: { projectId?: number; appointmentId?: number }) => void;
  onOpenCalendarWorkspace?: (ctx: { projectId: number }) => void;
}


export function ProjectForm({
  projectId,
  onCancel,
  onSaved,
  onOpenAppointment,
  onOpenCalendarWorkspace,
}: ProjectFormProps) {
  const { toast } = useToast();
  const isEditing = !!projectId;
  const invalidateAppointmentProjectionQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["calendarAppointments"],
    });
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return key === "appointments-list"
          || key === "projects-page-appointments"
          || key === "customers-page-appointments"
          || key === "employees-page-appointments"
          || key === "customerAppointments"
          || key === "projectAppointments";
      },
    });
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
  const [orderNumber, setOrderNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [descriptionMd, setDescriptionMd] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentExtractionOpen, setDocumentExtractionOpen] = useState(false);
  const [documentExtractionLoading, setDocumentExtractionLoading] = useState(false);
  const [documentExtractionData, setDocumentExtractionData] = useState<ExtractionDialogData | null>(null);
  const [documentExtractionFile, setDocumentExtractionFile] = useState<File | null>(null);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string>("");
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";
  const canManageProjectStatuses = isAdmin || userRole === "DISPATCHER";

  const buildFormSnapshot = (input: {
    name: string;
    orderNumber: string;
    amount: string;
    descriptionMd: string;
    customerId: number | null;
  }) =>
    JSON.stringify({
      name: input.name.trim(),
      orderNumber: input.orderNumber.trim(),
      amount: input.amount.replace(",", ".").trim(),
      descriptionMd: input.descriptionMd,
      customerId: input.customerId,
    });
  // Fetch project data if editing
  const { data: projectData, isLoading: projectLoading } = useQuery<{ project: Project; customer: Customer }>({
    queryKey: ['/api/projects', projectId],
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

  // Fetch project statuses assigned to this project
  const { data: assignedStatuses = [], isLoading: statusesLoading } = useQuery<ProjectStatusRelationItem[]>({
    queryKey: ['/api/projects', projectId, 'statuses'],
    enabled: isEditing,
  });

  // Fetch all available project statuses
  const { data: allStatuses = [] } = useQuery<ProjectStatus[]>({
    queryKey: ['/api/project-status'],
  });


  // Initialize form when project data loads
  useEffect(() => {
    if (projectData) {
      const projectName = projectData.project.name.trim();
      setName(projectName);
      setOrderNumber(projectData.project.orderNumber ?? "");
      setAmount(projectData.project.amount != null ? String(projectData.project.amount) : "");
      setDescriptionMd(projectData.project.descriptionMd || "");
      setCustomerId(projectData.project.customerId);
      setInitialFormSnapshot(
        buildFormSnapshot({
          name: projectName,
          orderNumber: projectData.project.orderNumber ?? "",
          amount: projectData.project.amount != null ? String(projectData.project.amount) : "",
          descriptionMd: projectData.project.descriptionMd || "",
          customerId: projectData.project.customerId,
        }),
      );
    } else if (!isEditing) {
      setInitialFormSnapshot(
        buildFormSnapshot({
          name: "",
          orderNumber: "",
          amount: "",
          descriptionMd: "",
          customerId: null,
        }),
      );
    }
  }, [projectData, isEditing]);

  const selectedCustomer = customers.find(c => c.id === customerId) || projectData?.customer;
  const selectedCustomerNumber = selectedCustomer?.customerNumber?.trim() ?? "";
  const projectNamePreview = name.trim();
  const projectVersion = projectData?.project.version;

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
  const isFormDirty = buildFormSnapshot({
    name,
    orderNumber,
    amount,
    descriptionMd,
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
    mutationFn: async (data: { name: string; orderNumber?: string | null; amount?: string | null; customerId: number; descriptionMd?: string }) => {
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
    mutationFn: async (data: { version: number; name?: string; orderNumber?: string | null; amount?: string | null; customerId?: number; descriptionMd?: string }) => {
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
    mutationFn: async (data: { title: string; body: string; templateId?: number }) => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/notes`, data);
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'notes'] });
      void invalidateAppointmentProjectionQueries();
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned, version }: { noteId: number; isPinned: boolean; version: number }) => {
      const res = await apiRequest('PATCH', `/api/notes/${noteId}/pin`, { isPinned, version });
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'notes'] });
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

  // Status mutations
  const addStatusMutation = useMutation({
    mutationFn: async (statusId: number) => {
      await apiRequest('POST', `/api/projects/${projectId}/statuses`, { statusId, expectedVersion: 0 });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'statuses'] });
      void invalidateProjectQueries();
    },
    onError: (error) => {
      if (error instanceof Error && error.message.includes("VERSION_CONFLICT")) {
        toast({ title: "Statusliste wurde zwischenzeitlich geändert, bitte neu laden.", variant: "destructive" });
      }
    },
  });

  const removeStatusMutation = useMutation({
    mutationFn: async (item: ProjectStatusRelationItem) => {
      await apiRequest('DELETE', `/api/projects/${projectId}/statuses/${item.status.id}`, {
        version: item.relationVersion,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'statuses'] });
      void invalidateProjectQueries();
    },
    onError: (error) => {
      if (error instanceof Error && error.message.includes("VERSION_CONFLICT")) {
        toast({ title: "Statusliste wurde zwischenzeitlich geändert, bitte neu laden.", variant: "destructive" });
      }
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
    if (isEditing) {
      if (!projectVersion || !Number.isInteger(projectVersion) || projectVersion < 1) {
        toast({ title: "Projektversion fehlt, bitte neu laden", variant: "destructive" });
        throw new Error("validation");
      }
      await updateMutation.mutateAsync({
        version: projectVersion,
        name: storedProjectName,
        orderNumber: normalizedOrderNumber,
        amount: normalizedAmount,
        customerId,
        descriptionMd: descriptionMd || undefined,
      });
    } else {
      const createdProject = await createMutation.mutateAsync({
        name: storedProjectName,
        orderNumber: normalizedOrderNumber,
        amount: normalizedAmount,
        customerId,
        descriptionMd: descriptionMd || undefined,
      });
      createdProjectId = createdProject.id;
    }
    setInitialFormSnapshot(buildFormSnapshot({ name, orderNumber, amount, descriptionMd, customerId }));

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

      const hasExistingValues = name.trim().length > 0 || descriptionMd.trim().length > 0;
      if (hasExistingValues) {
        const confirmed = window.confirm("Titel oder Beschreibung sind bereits befüllt. Inhalte überschreiben?");
        if (!confirmed) return;
      }
      setName(payload.saunaModel.trim());
      setDescriptionMd(payload.articleListHtml.trim());
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
      <div className="grid grid-cols-3 gap-6">
        {/* Linke Spalte: Projektdaten, Kunde, Beschreibung */}
        <div className="col-span-2 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-[minmax(220px,1fr),150px,150px] gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName" data-testid="label-project-name">Projektname *</Label>
                    <Input 
                      id="projectName" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      data-testid="input-project-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectOrderNumber" data-testid="label-project-order-number">Auftragsnummer</Label>
                    <Input
                      id="projectOrderNumber"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      readOnly={isEditing}
                      data-testid="input-project-order-number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectAmount" data-testid="label-project-amount">Betrag (EUR)</Label>
                    <Input
                      id="projectAmount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      inputMode="decimal"
                      placeholder="z. B. 14999.90"
                      data-testid="input-project-amount"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Beschreibung
                </h3>
                <RichTextEditor
                  value={descriptionMd}
                  onChange={setDescriptionMd}
                  placeholder="Projektbeschreibung eingeben..."
                />
              </div>

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

            {/* Rechte Spalte: Status, Termine und Dokumente */}
            <div className="space-y-6">
              {/* Status - nur bei Bearbeitung */}
              {isEditing && (
                <ProjectStatusPanel
                  assignedStatuses={assignedStatuses}
                  availableStatuses={allStatuses}
                  isLoading={statusesLoading}
                  className="h-auto"
                  canEdit={canManageProjectStatuses}
                  onAdd={(statusId) => {
                    if (!canManageProjectStatuses) return;
                    addStatusMutation.mutate(statusId);
                  }}
                  onRemove={(item) => {
                    if (!canManageProjectStatuses) return;
                    removeStatusMutation.mutate(item);
                  }}
                />
              )}

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
