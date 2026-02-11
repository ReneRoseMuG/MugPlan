import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EntityFormLayout } from "@/components/ui/entity-form-layout";
import { ProjectAppointmentsPanel } from "@/components/ProjectAppointmentsPanel";
import { ProjectAttachmentsPanel } from "@/components/ProjectAttachmentsPanel";
import { ProjectStatusPanel } from "@/components/ProjectStatusPanel";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CustomerList } from "@/components/CustomerList";
import { NotesSection } from "@/components/NotesSection";
import { 
  FolderKanban, 
  UserCircle, 
  FileText, 
  Plus
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
    queryClient.invalidateQueries({
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
  const { data: assignedStatuses = [], isLoading: statusesLoading } = useQuery<ProjectStatus[]>({
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
    setInitialFormSnapshot(buildFormSnapshot({ name, descriptionMd, customerId }));

    if (onSaved && onSaved !== onCancel) {
      onSaved();
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
                <ProjectStatusPanel
                  assignedStatuses={assignedStatuses}
                  availableStatuses={allStatuses}
                  isLoading={statusesLoading}
                  onAdd={(statusId) => addStatusMutation.mutate(statusId)}
                  onRemove={(statusId) => removeStatusMutation.mutate(statusId)}
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

      {/* Customer Selection Dialog */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <CustomerList
            mode="picker"
            selectedCustomerId={customerId}
            showCloseButton={false}
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

    </EntityFormLayout>
  );
}
