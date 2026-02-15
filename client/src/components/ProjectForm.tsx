import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}


export function ProjectForm({ projectId, onCancel, onSaved, onOpenAppointment }: ProjectFormProps) {
  const { toast } = useToast();
  const isEditing = !!projectId;
  const invalidateProjectQueries = () => {
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && key.startsWith("/api/projects");
      },
    });
  };
  
  const [name, setName] = useState("");
  const [descriptionMd, setDescriptionMd] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [documentExtractionOpen, setDocumentExtractionOpen] = useState(false);
  const [documentExtractionLoading, setDocumentExtractionLoading] = useState(false);
  const [documentExtractionData, setDocumentExtractionData] = useState<ExtractionDialogData | null>(null);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string>("");

  const buildFormSnapshot = (input: { name: string; descriptionMd: string; customerId: number | null }) =>
    JSON.stringify({
      name: input.name.trim(),
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
      setName(projectData.project.name);
      setDescriptionMd(projectData.project.descriptionMd || "");
      setCustomerId(projectData.project.customerId);
      setInitialFormSnapshot(
        buildFormSnapshot({
          name: projectData.project.name,
          descriptionMd: projectData.project.descriptionMd || "",
          customerId: projectData.project.customerId,
        }),
      );
    } else if (!isEditing) {
      setInitialFormSnapshot(
        buildFormSnapshot({
          name: "",
          descriptionMd: "",
          customerId: null,
        }),
      );
    }
  }, [projectData, isEditing]);

  const selectedCustomer = customers.find(c => c.id === customerId) || projectData?.customer;

  const mapExtractionCustomerToPayload = (customer: ExtractionCustomerDraft) => ({
    customerNumber: customer.customerNumber.trim(),
    firstName: customer.firstName.trim(),
    lastName: customer.lastName.trim(),
    company: customer.company.trim() || null,
    email: customer.email.trim() || null,
    phone: customer.phone.trim(),
    addressLine1: customer.addressLine1.trim() || null,
    addressLine2: customer.addressLine2.trim() || null,
    postalCode: customer.postalCode.trim() || null,
    city: customer.city.trim() || null,
  });

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
      throw new Error(payload?.message ?? "Kundennummer konnte nicht aufgelÃ¶st werden");
    }
    return (await response.json()) as { resolution: "none" | "single" | "multiple"; count: number; customer: Customer | null };
  };

  const createCustomerFromDraft = async (customerDraft: ExtractionCustomerDraft) => {
    const payload = mapExtractionCustomerToPayload(customerDraft);
    const response = await apiRequest("POST", "/api/customers", payload);
    const created = (await response.json()) as Customer;
    await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    return created;
  };

  const runDocumentExtraction = async (file: File) => {
    setDocumentExtractionLoading(true);
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
    mutationFn: async (data: { name: string; customerId: number; descriptionMd?: string }) => {
      const res = await apiRequest('POST', '/api/projects', data);
      return res.json();
    },
    onSuccess: () => {
      invalidateProjectQueries();
      toast({ title: "Projekt erstellt" });
    },
    onError: () => {
      toast({ title: "Fehler beim Erstellen", variant: "destructive" });
    },
  });

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { name?: string; customerId?: number; descriptionMd?: string }) => {
      const res = await apiRequest('PATCH', `/api/projects/${projectId}`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateProjectQueries();
      toast({ title: "Projekt gespeichert" });
    },
    onError: () => {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    },
  });

  // Note mutations
  const createNoteMutation = useMutation({
    mutationFn: async (data: { title: string; body: string; templateId?: number }) => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/notes`, data);
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'notes'] });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: number; isPinned: boolean }) => {
      const res = await apiRequest('PATCH', `/api/notes/${noteId}/pin`, { isPinned });
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'notes'] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      await apiRequest('DELETE', `/api/projects/${projectId}/notes/${noteId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'notes'] });
    },
  });

  // Status mutations
  const addStatusMutation = useMutation({
    mutationFn: async (statusId: number) => {
      await apiRequest('POST', `/api/projects/${projectId}/statuses`, { statusId, expectedVersion: 0 });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'statuses'] });
    },
    onError: (error) => {
      if (error instanceof Error && error.message.includes("VERSION_CONFLICT")) {
        toast({ title: "Statusliste wurde zwischenzeitlich geÃ¤ndert, bitte neu laden.", variant: "destructive" });
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
    },
    onError: (error) => {
      if (error instanceof Error && error.message.includes("VERSION_CONFLICT")) {
        toast({ title: "Statusliste wurde zwischenzeitlich geÃ¤ndert, bitte neu laden.", variant: "destructive" });
      }
    },
  });

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Projektname ist erforderlich", variant: "destructive" });
      throw new Error("validation");
    }
    if (!customerId) {
      toast({ title: "Kunde muss ausgewÃ¤hlt werden", variant: "destructive" });
      throw new Error("validation");
    }

    if (isEditing) {
      await updateMutation.mutateAsync({ name, customerId, descriptionMd: descriptionMd || undefined });
    } else {
      await createMutation.mutateAsync({ name, customerId, descriptionMd: descriptionMd || undefined });
    }
    setInitialFormSnapshot(buildFormSnapshot({ name, descriptionMd, customerId }));

    if (onSaved && onSaved !== onCancel) {
      onSaved();
    }
  };

  const applyExtractedCustomer = async (customerDraft: ExtractionCustomerDraft) => {
    try {
      if (!customerDraft.customerNumber.trim()) {
        throw new Error("Kundennummer ist erforderlich");
      }
      if (!customerDraft.firstName.trim() || !customerDraft.lastName.trim() || !customerDraft.phone.trim()) {
        throw new Error("Vorname, Nachname und Telefon sind erforderlich");
      }

      if (customerId) {
        const confirmed = window.confirm("Der aktuell gewÃ¤hlte Kunde wird ersetzt. Fortfahren?");
        if (!confirmed) return;
      } else {
        const confirmed = window.confirm("Kunde mit den erkannten Daten Ã¼bernehmen?");
        if (!confirmed) return;
      }

      const resolution = await resolveCustomerByNumber(customerDraft.customerNumber);
      if (resolution.resolution === "multiple") {
        throw new Error("Dateninkonsistenz: Kundennummer ist mehrfach vorhanden. Prozess wurde abgebrochen.");
      }

      if (resolution.resolution === "single" && resolution.customer) {
        setCustomerId(resolution.customer.id);
        toast({ title: "Bestehender Kunde Ã¼bernommen" });
        return;
      }

      const created = await createCustomerFromDraft(customerDraft);
      setCustomerId(created.id);
      toast({ title: "Neuer Kunde angelegt und Ã¼bernommen" });
    } catch (error) {
      toast({
        title: "Kunde konnte nicht Ã¼bernommen werden",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    }
  };

  const applyExtractedProjectSuggestion = async (payload: {
    saunaModel: string;
    articleListHtml: string;
  }) => {
    try {
      const hasExistingValues = name.trim().length > 0 || descriptionMd.trim().length > 0;
      if (hasExistingValues) {
        const confirmed = window.confirm("Titel oder Beschreibung sind bereits befÃ¼llt. Inhalte Ã¼berschreiben?");
        if (!confirmed) return;
      }
      setName(payload.saunaModel.trim());
      setDescriptionMd(payload.articleListHtml.trim());
      toast({ title: "Projektvorschlag Ã¼bernommen" });
    } catch (error) {
      toast({
        title: "Projektvorschlag konnte nicht Ã¼bernommen werden",
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
      title={isEditing ? name || "Projekt bearbeiten" : "Neues Projekt"}
      icon={<FolderKanban className="w-6 h-6" />}
      onClose={handleRequestClose}
      onCancel={handleRequestClose}
      onSubmit={handleSubmit}
      saveLabel="Projekt speichern"
      testIdPrefix="project"
    >
      <div className="grid grid-cols-3 gap-6">
        {/* Linke Spalte: Projektdaten, Kunde, Beschreibung */}
        <div className="col-span-2 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  Projektdaten
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="projectName" data-testid="label-project-name">Projektname *</Label>
                  <Input 
                    id="projectName" 
                    placeholder="z.B. Renovierung BÃ¼rogebÃ¤ude" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-project-name"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <RelationSlot
                  title="Zugeordneter Kunde *"
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

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Beschreibung
                </h3>
                <RichTextEditor
                  value={descriptionMd}
                  onChange={setDescriptionMd}
                  placeholder="Projektbeschreibung eingeben..."
                />
              </div>

              <DocumentExtractionDropzone
                onFileSelected={runDocumentExtraction}
                isProcessing={documentExtractionLoading}
              />

              {/* Notizen - nur bei Bearbeitung */}
              {isEditing && (
                <NotesSection
                  notes={projectNotes}
                  isLoading={notesLoading}
                  onAdd={(data) => createNoteMutation.mutate(data)}
                  onTogglePin={(id, isPinned) => togglePinMutation.mutate({ noteId: id, isPinned })}
                  onDelete={(noteId) => deleteNoteMutation.mutate(noteId)}
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
                  onAdd={(statusId) => addStatusMutation.mutate(statusId)}
                  onRemove={(item) => removeStatusMutation.mutate(item)}
                />
              )}

              <ProjectAppointmentsPanel
                projectId={projectId}
                projectName={name}
                isEditing={isEditing}
                onOpenAppointment={onOpenAppointment}
              />

              {/* Dokumente - nur bei Bearbeitung */}
              {isEditing && (
                <ProjectAttachmentsPanel
                  projectId={projectId}
                  isEditing={isEditing}
                />
              )}
            </div>
      </div>

      <DocumentExtractionDialog
        open={documentExtractionOpen}
        onOpenChange={setDocumentExtractionOpen}
        data={documentExtractionData}
        isBusy={documentExtractionLoading}
        onApplyCustomer={applyExtractedCustomer}
        onApplyProject={({ saunaModel, articleListHtml }) =>
          applyExtractedProjectSuggestion({ saunaModel, articleListHtml })
        }
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
            title="Kunde auswÃ¤hlen"
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ã„nderungen verwerfen?</AlertDialogTitle>
            <AlertDialogDescription>
              Es gibt ungespeicherte Ã„nderungen. MÃ¶chten Sie das Formular wirklich schlieÃŸen?
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
              Verwerfen und schlieÃŸen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </EntityFormLayout>
  );
}

