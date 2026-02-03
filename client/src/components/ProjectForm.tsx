import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EntityFormLayout } from "@/components/ui/entity-form-layout";
import { InfoBadge } from "@/components/ui/info-badge";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CustomerList } from "@/components/CustomerList";
import { NotesSection } from "@/components/NotesSection";
import { ProjectStatusSection } from "@/components/ProjectStatusSection";
import { 
  FolderKanban, 
  UserCircle, 
  FileText, 
  Calendar, 
  Paperclip, 
  Plus,
  Eye,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, Customer, Note, ProjectStatus, ProjectAttachment } from "@shared/schema";

interface ProjectFormProps {
  projectId?: number;
  onCancel?: () => void;
  onSaved?: () => void;
  onOpenAppointment?: (projectId: number) => void;
}

interface ProjectAppointmentSummary {
  id: number;
  projectId: number;
  startDate: string;
  endDate: string | null;
  startTimeHour: number | null;
  isLocked: boolean;
}

const appointmentsLogPrefix = "[ProjectForm-appointments]";

const getBerlinTodayDateString = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

function DocumentCard({ 
  attachment, 
  onPreview, 
  onDelete 
}: { 
  attachment: ProjectAttachment; 
  onPreview: () => void;
  onDelete: () => void;
}) {
  const isPdf = attachment.mimeType === "application/pdf";
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-border rounded-lg hover-elevate" data-testid={`document-card-${attachment.id}`}>
      <div className={`w-10 h-10 rounded flex items-center justify-center ${isPdf ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate" data-testid={`text-document-name-${attachment.id}`}>{attachment.originalName}</p>
        <p className="text-xs text-slate-400" data-testid={`text-document-size-${attachment.id}`}>{formatSize(attachment.fileSize)}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={onPreview} data-testid={`button-preview-${attachment.id}`}>
          <Eye className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" data-testid={`button-download-${attachment.id}`}>
          <Download className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete} data-testid={`button-delete-doc-${attachment.id}`}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function DocumentPreviewDialog({ 
  attachments, 
  currentIndex, 
  open, 
  onOpenChange,
  onNavigate
}: { 
  attachments: ProjectAttachment[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (index: number) => void;
}) {
  const attachment = attachments[currentIndex];
  if (!attachment) return null;
  
  const isPdf = attachment.mimeType === "application/pdf";
  const hasMultiple = attachments.length > 1;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span data-testid="text-preview-document-name">{attachment.originalName}</span>
            </DialogTitle>
            {hasMultiple && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => onNavigate(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  data-testid="button-prev-doc"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span data-testid="text-preview-page-indicator">{currentIndex + 1} / {attachments.length}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => onNavigate(currentIndex + 1)}
                  disabled={currentIndex === attachments.length - 1}
                  data-testid="button-next-doc"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-900 min-h-[500px] p-4">
          {isPdf ? (
            <div className="flex flex-col items-center justify-center text-slate-500 gap-4" data-testid="preview-pdf-container">
              <FileText className="w-24 h-24 text-red-400" />
              <p className="text-lg font-medium" data-testid="text-preview-pdf-label">PDF Vorschau</p>
              <p className="text-sm" data-testid="text-preview-pdf-name">{attachment.originalName}</p>
              <Button variant="outline" className="mt-4" data-testid="button-download-pdf">
                <Download className="w-4 h-4 mr-2" />
                PDF herunterladen
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 gap-4" data-testid="preview-image-container">
              <div className="w-[400px] h-[300px] bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center" data-testid="preview-image-placeholder">
                <span className="text-lg font-medium" data-testid="text-preview-image-label">Bildvorschau</span>
              </div>
              <p className="text-sm" data-testid="text-preview-image-name">{attachment.originalName}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectForm({ projectId, onCancel, onSaved, onOpenAppointment }: ProjectFormProps) {
  const { toast } = useToast();
  const isEditing = !!projectId;
  
  const [name, setName] = useState("");
  const [descriptionMd, setDescriptionMd] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [userRole] = useState(() =>
    window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER",
  );
  const fromDate = getBerlinTodayDateString();
  const appointmentsQueryKey = ['/api/projects', projectId, 'appointments', fromDate, userRole];

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

  // Fetch project attachments
  const { data: attachments = [], isLoading: attachmentsLoading } = useQuery<ProjectAttachment[]>({
    queryKey: ['/api/projects', projectId, 'attachments'],
    enabled: isEditing,
  });

  // Fetch project statuses assigned to this project
  const { data: assignedStatuses = [], isLoading: statusesLoading } = useQuery<ProjectStatus[]>({
    queryKey: ['/api/projects', projectId, 'statuses'],
    enabled: isEditing,
  });

  // Fetch all available project statuses
  const { data: allStatuses = [] } = useQuery<ProjectStatus[]>({
    queryKey: ['/api/project-status'],
  });

  const { data: projectAppointments = [], isLoading: appointmentsLoading } = useQuery<ProjectAppointmentSummary[]>({
    queryKey: appointmentsQueryKey,
    queryFn: async () => {
      if (!projectId) return [];
      const url = `/api/projects/${projectId}/appointments?fromDate=${fromDate}`;
      console.info(`${appointmentsLogPrefix} request`, { projectId, fromDate });
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "x-user-role": userRole,
        },
      });
      const payload = await response.json();
      console.info(`${appointmentsLogPrefix} response`, { status: response.status, count: payload?.length });
      if (!response.ok) {
        throw new Error(payload?.message ?? response.statusText);
      }
      return payload as ProjectAppointmentSummary[];
    },
    enabled: isEditing && Boolean(projectId),
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      console.info(`${appointmentsLogPrefix} delete request`, { appointmentId });
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "x-user-role": userRole,
        },
      });
      const payload = response.status === 204 ? null : await response.json();
      console.info(`${appointmentsLogPrefix} delete response`, { appointmentId, status: response.status });
      if (!response.ok) {
        throw new Error(payload?.message ?? response.statusText);
      }
      return appointmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsQueryKey });
      toast({ title: "Termin gelöscht" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Löschen fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    },
  });

  // Initialize form when project data loads
  useEffect(() => {
    if (projectData) {
      setName(projectData.project.name);
      setDescriptionMd(projectData.project.descriptionMd || "");
      setCustomerId(projectData.project.customerId);
    }
  }, [projectData]);

  const selectedCustomer = customers.find(c => c.id === customerId) || projectData?.customer;

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; customerId: number; descriptionMd?: string }) => {
      const res = await apiRequest('POST', '/api/projects', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'notes'] });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: number; isPinned: boolean }) => {
      const res = await apiRequest('PATCH', `/api/notes/${noteId}/pin`, { isPinned });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'notes'] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      await apiRequest('DELETE', `/api/projects/${projectId}/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'notes'] });
    },
  });

  // Status mutations
  const addStatusMutation = useMutation({
    mutationFn: async (statusId: number) => {
      await apiRequest('POST', `/api/projects/${projectId}/statuses`, { statusId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'statuses'] });
    },
  });

  const removeStatusMutation = useMutation({
    mutationFn: async (statusId: number) => {
      await apiRequest('DELETE', `/api/projects/${projectId}/statuses/${statusId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'statuses'] });
    },
  });

  // Attachment delete mutation
  const deleteAttachmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/project-attachments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'attachments'] });
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

    if (isEditing) {
      await updateMutation.mutateAsync({ name, customerId, descriptionMd: descriptionMd || undefined });
    } else {
      await createMutation.mutateAsync({ name, customerId, descriptionMd: descriptionMd || undefined });
    }

    if (onSaved && onSaved !== onCancel) {
      onSaved();
    }
  };

  const handlePreview = (index: number) => {
    setPreviewIndex(index);
    setPreviewOpen(true);
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
      onClose={onCancel}
      onCancel={onCancel}
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
                    placeholder="z.B. Renovierung Bürogebäude" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-project-name"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <UserCircle className="w-4 h-4" />
                  Zugeordneter Kunde *
                </h3>
                {selectedCustomer ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-border">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCircle className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200" data-testid="text-customer-name">
                          {selectedCustomer.fullName}
                        </p>
                        {selectedCustomer.company && (
                          <p className="text-sm text-slate-500" data-testid="text-customer-company">{selectedCustomer.company}</p>
                        )}
                        <p className="text-sm text-slate-400" data-testid="text-customer-phone">{selectedCustomer.phone}</p>
                      </div>
                      <Button variant="outline" className="ml-auto" onClick={() => setCustomerDialogOpen(true)} data-testid="button-change-customer">
                        Kunde ändern
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => setCustomerDialogOpen(true)} data-testid="button-select-customer">
                    <Plus className="w-4 h-4 mr-2" />
                    Kunde auswählen
                  </Button>
                )}
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
                <ProjectStatusSection
                  assignedStatuses={assignedStatuses}
                  availableStatuses={allStatuses}
                  isLoading={statusesLoading}
                  onAdd={(statusId) => addStatusMutation.mutate(statusId)}
                  onRemove={(statusId) => removeStatusMutation.mutate(statusId)}
                />
              )}

              <div className="sub-panel space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Termine
                </h3>
                {isEditing && onOpenAppointment && projectId && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onOpenAppointment(projectId)}
                    data-testid="button-new-appointment-from-project"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Neuer Termin
                  </Button>
                )}
                <div className="space-y-2">
                  {appointmentsLoading ? (
                    <p className="text-sm text-slate-400 text-center py-2">Termine werden geladen...</p>
                  ) : projectAppointments.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-2">Keine Termine ab heute</p>
                  ) : (
                    projectAppointments.map((appointment) => {
                      const timeLabel = appointment.startTimeHour !== null
                        ? `${String(appointment.startTimeHour).padStart(2, "0")}:00`
                        : null;
                      const label = timeLabel
                        ? `${appointment.startDate} • ${timeLabel}`
                        : appointment.startDate;
                      return (
                        <InfoBadge
                          key={appointment.id}
                          icon={<Calendar className="w-4 h-4" />}
                          label={label}
                          action="remove"
                          actionDisabled={appointment.isLocked}
                          onRemove={() => deleteAppointmentMutation.mutate(appointment.id)}
                          testId={`project-appointment-${appointment.id}`}
                          fullWidth
                        />
                      );
                    })
                  )}
                </div>
                {projectAppointments.some((appointment) => appointment.isLocked) && (
                  <p className="text-xs text-slate-400 text-center">
                    Gesperrte Termine können nur Admins löschen.
                  </p>
                )}
              </div>

              {/* Dokumente - nur bei Bearbeitung */}
              {isEditing && (
                <div className="sub-panel space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Dokumente ({attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {attachments.map((attachment, index) => (
                      <DocumentCard 
                        key={attachment.id} 
                        attachment={attachment} 
                        onPreview={() => handlePreview(index)}
                        onDelete={() => deleteAttachmentMutation.mutate(attachment.id)}
                      />
                    ))}
                    {attachments.length === 0 && !attachmentsLoading && (
                      <p className="text-sm text-slate-400 text-center py-2">Keine Dokumente</p>
                    )}
                  </div>
                  <Button variant="outline" className="w-full" data-testid="button-add-document">
                    <Plus className="w-4 h-4 mr-2" />
                    Dokument hinzufügen
                  </Button>
                </div>
              )}
            </div>
      </div>

      {/* Customer Selection Dialog */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <CustomerList
            mode="picker"
            selectedCustomerId={customerId}
            onSelectCustomer={(id) => {
              setCustomerId(id);
              setCustomerDialogOpen(false);
            }}
            onCancel={() => setCustomerDialogOpen(false)}
            title="Kunde auswählen"
          />
        </DialogContent>
      </Dialog>

      <DocumentPreviewDialog
        attachments={attachments}
        currentIndex={previewIndex}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onNavigate={setPreviewIndex}
      />
    </EntityFormLayout>
  );
}
