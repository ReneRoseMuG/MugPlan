import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Mail, Phone, Route, Users, X } from "lucide-react";
import { AppointmentsListPage, type AppointmentsListContext } from "@/components/AppointmentsListPage";
import { EmployeeAttachmentsPanel, type PendingEmployeeAttachmentItem } from "@/components/EmployeeAttachmentsPanel";
import { NotesSection } from "@/components/NotesSection";
import { TagPickerPanel, type TagRelationItem } from "@/components/TagPickerPanel";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { EntityFormShell } from "@/components/ui/entity-form-shell";
import { TeamInfoBadge } from "@/components/ui/team-info-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { invalidateTagProjectionQueries } from "@/lib/tag-invalidation";
import { fetchTagCatalog, getTagCatalogQueryKey } from "@/lib/tags";
import { useToast } from "@/hooks/use-toast";
import type { Employee, Note, Tag, Team, Tour } from "@shared/schema";

interface EmployeeWithRelations {
  employee: Employee;
  team: Team | null;
  tour: Tour | null;
}

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

interface EmployeeFormProps {
  employeeId?: number;
  onCancel?: () => void;
  onSaved?: () => void;
  onOpenAppointment?: (appointmentId: number, context: AppointmentsListContext) => void;
}

type EmployeeTagDraftItem = TagRelationItem;
type DraftEmployeeNote = Note & { templateId?: number };
type EmployeeWeekPlanItem = {
  assignmentId: number;
  tourId: number;
  tourName: string;
  tourColor: string | null;
  isoYear: number;
  isoWeek: number;
  weekStartDate: string;
  weekEndDate: string;
  isLocked: boolean;
  members: Array<{
    assignmentId: number;
    employeeId: number;
    fullName: string;
  }>;
};

function extractApiCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const match = error.message.match(/"code"\s*:\s*"([A-Z_]+)"/);
  return match?.[1] ?? null;
}

export function EmployeeForm({ employeeId, onCancel, onSaved, onOpenAppointment }: EmployeeFormProps) {
  const { toast } = useToast();
  const isEditing = Boolean(employeeId);
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";
  const canManageEmployeeTags = isAdmin || userRole === "DISPATCHER";
  const canManageEmployeeNotes = isAdmin || userRole === "DISPATCHER";
  const canDeleteAttachments = isAdmin || userRole === "DISPATCHER";
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const [draftEmployeeTags, setDraftEmployeeTags] = useState<EmployeeTagDraftItem[]>([]);
  const [draftEmployeeNotes, setDraftEmployeeNotes] = useState<DraftEmployeeNote[]>([]);
  const [draftEmployeeAttachments, setDraftEmployeeAttachments] = useState<PendingEmployeeAttachmentItem[]>([]);
  const [activeTab, setActiveTab] = useState("stammdaten");
  const draftEmployeeNoteIdRef = useRef(-1);

  const invalidateEmployees = () => {
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === "/api/employees";
      },
    });
  };

  const invalidateEmployeeTagQueries = async () => {
    invalidateEmployees();
    if (employeeId) {
      await queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId, "tags"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId] });
    }
    await invalidateTagProjectionQueries();
  };

  const invalidateEmployeeNotesQueries = async () => {
    invalidateEmployees();
    if (employeeId) {
      await queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId, "notes"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId] });
    }
  };

  const { data: employeeDetails, isLoading: employeeDetailsLoading } = useQuery<EmployeeWithRelations>({
    queryKey: ["/api/employees", employeeId],
    queryFn: () => fetch(`/api/employees/${employeeId}`).then((response) => response.json()),
    enabled: isEditing,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "active" }],
    queryFn: () => fetch("/api/employees?scope=active").then((response) => response.json()),
  });

  const { data: activeEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "active" }],
    queryFn: () => fetch("/api/employees?scope=active").then((response) => response.json()),
    enabled: isAdmin,
  });

  const { data: inactiveEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "inactive" }],
    queryFn: () => fetch("/api/employees?scope=inactive").then((response) => response.json()),
    enabled: isAdmin,
  });

  const {
    data: employeeTagRelations = [],
    isLoading: employeeTagsLoading,
    error: employeeTagsError,
  } = useQuery<TagRelationItem[]>({
    queryKey: ["/api/employees", employeeId, "tags"],
    enabled: isEditing && Boolean(employeeId),
  });

  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: getTagCatalogQueryKey("employee"),
    queryFn: () => fetchTagCatalog("employee"),
  });
  const { data: employeeNotes = [], isLoading: employeeNotesLoading } = useQuery<Note[]>({
    queryKey: ["/api/employees", employeeId, "notes"],
    enabled: isEditing && Boolean(employeeId),
  });
  const { data: employeeWeekPlans = [], isLoading: employeeWeekPlansLoading } = useQuery<EmployeeWeekPlanItem[]>({
    queryKey: ["/api/employees", employeeId, "week-plans"],
    queryFn: async () => {
      const response = await fetch(`/api/employees/${employeeId}/week-plans`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Wochenplanung konnte nicht geladen werden");
      }
      return response.json();
    },
    enabled: isEditing && Boolean(employeeId),
  });
  const visibleEmployeeTags = isEditing ? employeeTagRelations : draftEmployeeTags;
  const visibleEmployeeNotes = isEditing ? employeeNotes : draftEmployeeNotes;

  useEffect(() => {
    if (!employeeDetails) return;
    setFormData({
      firstName: employeeDetails.employee.firstName,
      lastName: employeeDetails.employee.lastName,
      phone: employeeDetails.employee.phone ?? "",
      email: employeeDetails.employee.email ?? "",
    });
  }, [employeeDetails]);

  useEffect(() => {
    if (!isEditing) {
      setDraftEmployeeTags([]);
      setDraftEmployeeNotes([]);
      setDraftEmployeeAttachments([]);
      draftEmployeeNoteIdRef.current = -1;
    }
  }, [isEditing]);

  const allEmployees = useMemo(() => {
    if (!isAdmin) return employees;
    const byId = new Map<number, Employee>();
    for (const employee of activeEmployees) byId.set(employee.id, employee);
    for (const employee of inactiveEmployees) byId.set(employee.id, employee);
    return Array.from(byId.values());
  }, [isAdmin, employees, activeEmployees, inactiveEmployees]);

  const teamMembers = useMemo(() => {
    if (!employeeDetails?.team?.id) return [];
    return allEmployees
      .filter((employee) => employee.teamId === employeeDetails.team?.id)
      .map((employee) => ({ id: employee.id, fullName: employee.fullName }));
  }, [allEmployees, employeeDetails?.team?.id]);

  const createMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; phone?: string; email?: string }) => {
      const response = await apiRequest("POST", "/api/employees", data);
      return response.json() as Promise<Employee>;
    },
    onSuccess: () => {
      invalidateEmployees();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { firstName?: string; lastName?: string; phone?: string | null; email?: string | null; version: number };
    }) => {
      return apiRequest("PUT", `/api/employees/${id}`, data);
    },
    onSuccess: () => {
      invalidateEmployees();
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Speichern nicht möglich",
          description: "Mitarbeiter wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      if (code === "FORBIDDEN") {
        toast({
          title: "Speichern nicht möglich",
          description: "Änderung nicht erlaubt.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Speichern fehlgeschlagen", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive, version }: { id: number; isActive: boolean; version: number }) => {
      return apiRequest("PATCH", `/api/employees/${id}/active`, { isActive, version });
    },
    onSuccess: () => {
      invalidateEmployees();
      if (employeeId) {
        void queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId] });
      }
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Aktiv-Status nicht möglich",
          description: "Mitarbeiter wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      if (code === "FORBIDDEN") {
        toast({
          title: "Aktiv-Status nicht möglich",
          description: "Nur Admin darf den Aktiv-Status ändern.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Aktiv-Status konnte nicht geändert werden", variant: "destructive" });
    },
  });

  const removeFromAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, version }: { appointmentId: number; version: number }) => {
      return apiRequest("DELETE", `/api/appointments/${appointmentId}/employees/${employeeId}`, { version });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["appointments-list"] });
      if (employeeId) {
        void queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId] });
      }
      toast({ title: "Mitarbeiter wurde vom Termin entfernt" });
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Entfernen fehlgeschlagen",
          description: "Termin wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Entfernen fehlgeschlagen", variant: "destructive" });
    },
  });

  const addEmployeeTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const response = await apiRequest("POST", `/api/employees/${employeeId}/tags`, { tagId });
      return response.json();
    },
    onSuccess: async () => {
      await invalidateEmployeeTagQueries();
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "FORBIDDEN" ? "Tag kann nicht zugewiesen werden" : "Tag-Zuweisung fehlgeschlagen",
        description: code === "FORBIDDEN" ? "Keine Berechtigung für Tag-Änderungen." : error.message,
        variant: "destructive",
      });
    },
  });

  const removeEmployeeTagMutation = useMutation({
    mutationFn: async (item: TagRelationItem) => {
      await apiRequest("DELETE", `/api/employees/${employeeId}/tags/${item.tag.id}`, { version: item.relationVersion });
    },
    onSuccess: async () => {
      await invalidateEmployeeTagQueries();
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "VERSION_CONFLICT" ? "Tag wurde zwischenzeitlich geändert" : "Tag konnte nicht entfernt werden",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createEmployeeNoteMutation = useMutation({
    mutationFn: async ({
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
      const response = await apiRequest("POST", `/api/employees/${employeeId}/notes`, { title, body, cardColor, print, templateId });
      return response.json();
    },
    onSuccess: async () => {
      await invalidateEmployeeNotesQueries();
    },
    onError: (error: Error) => {
      toast({ title: "Notiz konnte nicht angelegt werden", description: error.message, variant: "destructive" });
    },
  });

  const updateEmployeeNoteMutation = useMutation({
    mutationFn: async ({
      noteId,
      title,
      body,
      cardColor,
      print,
      version,
    }: {
      noteId: number;
      title: string;
      body: string;
      cardColor?: string | null;
      print: boolean;
      version: number;
    }) => {
      const response = await apiRequest("PUT", `/api/notes/${noteId}`, { title, body, cardColor, print, version });
      return response.json();
    },
    onSuccess: async () => {
      await invalidateEmployeeNotesQueries();
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
      toast({ title: "Notiz konnte nicht aktualisiert werden", description: error.message, variant: "destructive" });
    },
  });

  const toggleEmployeeNotePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned, version }: { noteId: number; isPinned: boolean; version: number }) => {
      const response = await apiRequest("PATCH", `/api/notes/${noteId}/pin`, { isPinned, version });
      return response.json();
    },
    onSuccess: async () => {
      await invalidateEmployeeNotesQueries();
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
      toast({ title: "Notiz konnte nicht aktualisiert werden", description: error.message, variant: "destructive" });
    },
  });

  const deleteEmployeeNoteMutation = useMutation({
    mutationFn: async ({ noteId, version }: { noteId: number; version: number }) => {
      await apiRequest("DELETE", `/api/employees/${employeeId}/notes/${noteId}`, { version });
    },
    onSuccess: async () => {
      await invalidateEmployeeNotesQueries();
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
      toast({ title: "Notiz konnte nicht gelöscht werden", description: error.message, variant: "destructive" });
    },
  });

  const addDraftEmployeeTag = (tagId: number) => {
    const selectedTag = availableTags.find((tag) => tag.id === tagId);
    if (!selectedTag) return;
    setDraftEmployeeTags((current) => {
      if (current.some((item) => item.tag.id === tagId)) {
        return current;
      }
      return [...current, { tag: selectedTag, relationVersion: 1 }];
    });
  };

  const removeDraftEmployeeTag = (item: TagRelationItem) => {
    setDraftEmployeeTags((current) => current.filter((entry) => entry.tag.id !== item.tag.id));
  };

  const addDraftEmployeeNote = ({
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
    const nextId = draftEmployeeNoteIdRef.current;
    draftEmployeeNoteIdRef.current -= 1;
    const timestamp = new Date();
    setDraftEmployeeNotes((current) => [
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

  const updateDraftEmployeeNote = (
    noteId: number,
    data: { title: string; body: string; cardColor?: string | null; print: boolean },
  ) => {
    setDraftEmployeeNotes((current) =>
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

  const toggleDraftEmployeeNotePin = (noteId: number, isPinned: boolean) => {
    setDraftEmployeeNotes((current) =>
      current.map((note) => (note.id === noteId ? { ...note, isPinned, updatedAt: new Date() } : note)),
    );
  };

  const deleteDraftEmployeeNote = (noteId: number) => {
    setDraftEmployeeNotes((current) => current.filter((note) => note.id !== noteId));
  };

  const addDraftEmployeeAttachment = (file: File) => {
    setDraftEmployeeAttachments((current) => [
      ...current,
      {
        id: -Date.now() - current.length,
        originalName: file.name,
        mimeType: file.type || null,
        file,
      },
    ]);
  };

  const uploadEmployeeAttachment = async (targetEmployeeId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`/api/employees/${targetEmployeeId}/attachments`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || response.statusText);
    }
  };

  const persistDraftEmployeeTags = async (targetEmployeeId: number) => {
    for (const item of draftEmployeeTags) {
      await apiRequest("POST", `/api/employees/${targetEmployeeId}/tags`, { tagId: item.tag.id });
    }
  };

  const persistDraftEmployeeNotes = async (targetEmployeeId: number) => {
    for (const note of draftEmployeeNotes) {
      await apiRequest("POST", `/api/employees/${targetEmployeeId}/notes`, {
        title: note.title,
        body: note.body,
        cardColor: note.cardColor,
        print: note.print,
        templateId: note.templateId,
      });
    }
  };

  const persistDraftEmployeeAttachments = async (targetEmployeeId: number) => {
    for (const attachment of draftEmployeeAttachments) {
      await uploadEmployeeAttachment(targetEmployeeId, attachment.file);
    }
  };

  const persistCreateSidebarDrafts = async (targetEmployeeId: number) => {
    await persistDraftEmployeeTags(targetEmployeeId);
    await persistDraftEmployeeNotes(targetEmployeeId);
    await persistDraftEmployeeAttachments(targetEmployeeId);
  };

  const getEmployeeNoteVersion = (noteId: number): number => {
    const note = employeeNotes.find((entry) => entry.id === noteId);
    if (!note || !Number.isInteger(note.version) || note.version < 1) {
      throw new Error("422: {\"code\":\"VALIDATION_ERROR\"}");
    }
    return note.version;
  };

  const handleSubmit = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast({
        title: "Pflichtfelder fehlen",
        description: "Vorname und Nachname sind erforderlich.",
        variant: "destructive",
      });
      return;
    }

    if (isEditing && employeeId && employeeDetails) {
      const version = employeeDetails.employee.version;
      if (!Number.isInteger(version) || (version ?? 0) < 1) {
        toast({
          title: "Speichern nicht möglich",
          description: "Mitarbeiterdaten sind unvollständig. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      await updateMutation.mutateAsync({
        id: employeeId,
        data: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          version,
        },
      });
    } else {
      const createdEmployee = await createMutation.mutateAsync({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
      });
      try {
        await persistCreateSidebarDrafts(createdEmployee.id);
        await queryClient.invalidateQueries({ queryKey: ["/api/employees", createdEmployee.id, "tags"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/employees", createdEmployee.id, "notes"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/employees", createdEmployee.id, "attachments"] });
        setDraftEmployeeTags([]);
        setDraftEmployeeNotes([]);
        setDraftEmployeeAttachments([]);
      } catch (error) {
        toast({
          title: "Mitarbeiter gespeichert, Sidebar-Daten konnten nicht vollständig persistiert werden",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        });
      }
    }

    if (onSaved && onSaved !== onCancel) {
      onSaved();
    }
  };

  const handleToggleActive = (checked: boolean) => {
    if (!isAdmin || !employeeDetails?.employee || !employeeId) return;
    toggleActiveMutation.mutate({
      id: employeeId,
      isActive: checked,
      version: employeeDetails.employee.version,
    });
  };

  const handleAddNote = ({
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
    if (!isEditing) {
      addDraftEmployeeNote({ title, body, cardColor, print, templateId });
      return;
    }
    if (!employeeId) return;
    createEmployeeNoteMutation.mutate({ title, body, cardColor, print, templateId });
  };

  const handleUpdateNote = (noteId: number, data: { title: string; body: string; cardColor?: string | null; print: boolean }) => {
    if (!isEditing) {
      updateDraftEmployeeNote(noteId, data);
      return;
    }
    const version = getEmployeeNoteVersion(noteId);
    updateEmployeeNoteMutation.mutate({ noteId, ...data, version });
  };

  const handleTogglePin = (noteId: number, isPinned: boolean) => {
    if (!isEditing) {
      toggleDraftEmployeeNotePin(noteId, isPinned);
      return;
    }
    const version = getEmployeeNoteVersion(noteId);
    toggleEmployeeNotePinMutation.mutate({ noteId, isPinned, version });
  };

  const handleDeleteNote = (noteId: number) => {
    if (!isEditing) {
      deleteDraftEmployeeNote(noteId);
      return;
    }
    if (!employeeId) return;
    const version = getEmployeeNoteVersion(noteId);
    deleteEmployeeNoteMutation.mutate({ noteId, version });
  };

  const title = isEditing ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter";
  const isSubmitPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex h-full min-h-0 w-full flex-1">
      <EntityFormShell
        mainClassName="bg-[hsl(var(--color-cream))]"
        contentMaxWidth={activeTab === "termine" ? 99999 : undefined}
        header={(
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <h2 className="text-2xl font-bold text-primary flex min-w-0 items-center gap-3">
                <Users className="w-6 h-6" />
                {title}
              </h2>
            </div>

            {onCancel ? (
              <Button
                type="button"
                size="lg"
                variant="ghost"
                onClick={onCancel}
                data-testid="button-close-employee"
              >
                <X className="w-6 h-6" />
              </Button>
            ) : null}
          </div>
        )}
        sidebar={(
          <div className="min-w-0 space-y-6 p-6" data-testid="employee-form-sidebar">
            <EmployeeAttachmentsPanel
              employeeId={employeeId}
              isEditing={isEditing}
              canDelete={canDeleteAttachments}
              pendingEmployeeAttachments={isEditing ? undefined : draftEmployeeAttachments}
              onUploadPendingEmployeeAttachment={isEditing ? undefined : addDraftEmployeeAttachment}
              className="h-auto"
            />

            <TagPickerPanel
              assignedTags={visibleEmployeeTags}
              availableTags={availableTags}
              isLoading={isEditing ? employeeTagsLoading : false}
              loadErrorMessage={isEditing && employeeTagsError instanceof Error ? employeeTagsError.message : null}
              canEdit={canManageEmployeeTags}
              title="Tags"
              testIdPrefix="employee-tag-picker"
              onAdd={(tagId) => {
                if (isEditing) {
                  addEmployeeTagMutation.mutate(tagId);
                  return;
                }
                addDraftEmployeeTag(tagId);
              }}
              onRemove={(item) => {
                if (isEditing) {
                  removeEmployeeTagMutation.mutate(item);
                  return;
                }
                removeDraftEmployeeTag(item);
              }}
              className="h-auto"
            />

            <NotesSection
              notes={visibleEmployeeNotes}
              isLoading={isEditing ? employeeNotesLoading : false}
              onAdd={handleAddNote}
              onUpdate={handleUpdateNote}
              onTogglePin={handleTogglePin}
              onDelete={handleDeleteNote}
              readOnly={!canManageEmployeeNotes}
            />

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2 text-sm text-slate-600">
                <Users className="w-4 h-4" />
                Team
              </h4>
              {isEditing && employeeDetails?.team ? (
                <TeamInfoBadge
                  id={employeeDetails.team.id}
                  name={employeeDetails.team.name}
                  color={employeeDetails.team.color}
                  members={teamMembers}
                  action="none"
                  fullWidth
                  testId="badge-employee-team"
                />
              ) : (
                <div className="px-3 py-2 border border-border bg-slate-50 rounded-md">
                  <p className="text-sm text-slate-400 italic">Keinem Team zugewiesen</p>
                </div>
              )}
            </div>
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
                  data-testid="button-cancel-employee"
                >
                  Schließen
                </Button>
              ) : null}
            </div>

            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitPending}
              data-testid="button-save-employee"
            >
              {isSubmitPending ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        )}
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className={`flex min-h-0 flex-col space-y-4 ${activeTab === "wochenplanung" ? "" : "h-full"}`}
          data-testid="employee-form-main-column"
        >
          <TabsList>
            <TabsTrigger value="stammdaten" data-testid="tab-employee-stammdaten">Stammdaten</TabsTrigger>
            <TabsTrigger value="termine" data-testid="tab-employee-termine">Termine</TabsTrigger>
            {isEditing ? (
              <TabsTrigger value="wochenplanung" data-testid="tab-employee-wochenplanung">Wochenplanung</TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="stammdaten" className="min-h-[620px]">
            <div className="w-full space-y-6 min-h-0">
              <div className="sub-panel space-y-4">
                <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Stammdaten
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Vorname *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(event) => setFormData((prev) => ({ ...prev, firstName: event.target.value }))}
                      placeholder="Vorname..."
                      data-testid="input-employee-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nachname *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(event) => setFormData((prev) => ({ ...prev, lastName: event.target.value }))}
                      placeholder="Nachname..."
                      data-testid="input-employee-lastname"
                    />
                  </div>
                </div>
              </div>

              <div className="sub-panel space-y-4">
                <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Kontakt
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Telefon
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                      placeholder="Telefonnummer..."
                      data-testid="input-employee-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      E-Mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="E-Mail-Adresse..."
                      data-testid="input-employee-email"
                    />
                  </div>
                </div>
              </div>

              {isAdmin && isEditing && employeeDetails ? (
                <div className="sub-panel space-y-4">
                  <h3 className="text-sm font-bold tracking-wider text-primary">
                    Status
                  </h3>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="employee-is-active"
                      checked={employeeDetails.employee.isActive}
                      onCheckedChange={(checked) => handleToggleActive(checked === true)}
                    />
                    <Label htmlFor="employee-is-active" className="text-muted-foreground text-sm">
                      Aktiv
                    </Label>
                  </div>
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="termine" className="flex min-h-0 flex-1 flex-col">
            {employeeId ? (
              <AppointmentsListPage
                title="Termine"
                helpKey="appointments.list.employeeForm"
                context={{ type: "employee", employeeId }}
                onOpenAppointment={onOpenAppointment}
                onRemoveEmployee={(appointmentId, version) => removeFromAppointmentMutation.mutate({ appointmentId, version })}
                className="min-h-0 flex-1"
              />
            ) : (
              <p className="py-4 text-sm text-slate-400">
                Nach dem Speichern des Mitarbeiters werden Termine angezeigt.
              </p>
            )}
          </TabsContent>

          {isEditing ? (
            <TabsContent value="wochenplanung" className="mt-0 w-full flex-none">
              {employeeWeekPlansLoading ? (
                <p className="py-4 text-sm text-slate-400">Wochenplanung wird geladen...</p>
              ) : employeeWeekPlans.length > 0 ? (
                <div className="grid auto-rows-max content-start items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {employeeWeekPlans.map((weekPlan) => (
                    <ColoredEntityCard
                      key={`${weekPlan.assignmentId}-${weekPlan.tourId}-${weekPlan.isoYear}-${weekPlan.isoWeek}`}
                      title={`KW ${String(weekPlan.isoWeek).padStart(2, "0")} / ${weekPlan.isoYear}`}
                      icon={<Route className="w-4 h-4" />}
                      borderColor={weekPlan.tourColor}
                      testId={`card-employee-week-plan-${weekPlan.assignmentId}`}
                      footerVisibility="visible"
                      footer={(
                        <div className="space-y-1 text-xs text-slate-500">
                          <div>{weekPlan.weekStartDate} - {weekPlan.weekEndDate}</div>
                          <div>{weekPlan.isLocked ? "Schreibgeschützt ab Wochenstart" : weekPlan.tourName}</div>
                        </div>
                      )}
                    >
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {weekPlan.tourName}
                        </div>
                        {weekPlan.members.map((member) => (
                          <EmployeeInfoBadge
                            key={member.assignmentId}
                            id={member.employeeId}
                            fullName={member.fullName}
                            tourName={weekPlan.tourName}
                            action="none"
                            size="sm"
                            fullWidth
                            showPreview={false}
                            testId={`badge-employee-week-plan-member-${member.assignmentId}`}
                          />
                        ))}
                      </div>
                    </ColoredEntityCard>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-sm text-slate-400">
                  Dieser Mitarbeiter ist aktuell keiner Wochenplanung zugeordnet.
                </p>
              )}
            </TabsContent>
          ) : null}
        </Tabs>

        {isEditing && employeeDetailsLoading ? (
          <div className="mt-6 text-sm text-muted-foreground">
            Daten werden geladen...
          </div>
        ) : null}
      </EntityFormShell>
    </div>
  );
}
