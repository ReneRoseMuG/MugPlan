import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileText, Plus, X, Pencil } from "lucide-react";
import type { NoteTemplate } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TemplateCardProps {
  template: NoteTemplate;
  onEdit: () => void;
  onDelete: () => void;
}

function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "dd.MM.yyyy", { locale: de });
  };

  return (
    <div 
      className={`relative bg-white dark:bg-slate-800 border rounded-lg p-4 shadow-sm ${
        template.isActive ? "border-border" : "border-slate-300 opacity-60"
      }`}
      data-testid={`template-card-${template.id}`}
    >
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          onClick={onEdit}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-primary/10 text-slate-400 hover:text-primary transition-colors"
          data-testid={`button-edit-template-${template.id}`}
          title="Bearbeiten"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-destructive/10 text-slate-400 hover:text-destructive transition-colors"
          data-testid={`button-delete-template-${template.id}`}
          title="Löschen"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 pr-16" data-testid={`text-template-title-${template.id}`}>
          {template.title}
        </h4>
        {!template.isActive && (
          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">Inaktiv</span>
        )}
      </div>
      {template.body && (
        <div 
          className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3"
          dangerouslySetInnerHTML={{ __html: template.body }}
          data-testid={`text-template-body-${template.id}`}
        />
      )}
      <p className="text-xs text-slate-400 mt-2" data-testid={`text-template-date-${template.id}`}>
        Aktualisiert: {formatDate(template.updatedAt)}
      </p>
    </div>
  );
}

export function NoteTemplatesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const { data: templates = [], isLoading } = useQuery<NoteTemplate[]>({
    queryKey: ["/api/note-templates", { active: "false" }],
    queryFn: async () => {
      const response = await fetch("/api/note-templates?active=false");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; body: string; isActive: boolean }) => {
      return apiRequest("POST", "/api/note-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/note-templates"] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title?: string; body?: string; isActive?: boolean } }) => {
      return apiRequest("PUT", `/api/note-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/note-templates"] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/note-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/note-templates"] });
    },
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormTitle("");
    setFormBody("");
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const handleOpenEdit = (template: NoteTemplate) => {
    setEditingTemplate(template);
    setFormTitle(template.title);
    setFormBody(template.body);
    setFormIsActive(template.isActive);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setFormTitle("");
    setFormBody("");
    setFormIsActive(true);
  };

  const handleSave = () => {
    if (!formTitle.trim()) return;

    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        data: { title: formTitle, body: formBody, isActive: formIsActive },
      });
    } else {
      createMutation.mutate({ title: formTitle, body: formBody, isActive: formIsActive });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Möchten Sie diese Vorlage wirklich löschen?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Notiz Vorlagen ({templates.length})
        </h3>
        <Button onClick={handleOpenCreate} data-testid="button-new-template">
          <Plus className="w-4 h-4 mr-2" />
          Neue Vorlage
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="list-templates">
        {isLoading ? (
          <>
            <div className="animate-pulse h-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="animate-pulse h-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          </>
        ) : (
          <>
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => handleOpenEdit(template)}
                onDelete={() => handleDelete(template.id)}
              />
            ))}
            {templates.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8 col-span-2">
                Keine Vorlagen vorhanden
              </p>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {editingTemplate ? "Vorlage bearbeiten" : "Neue Vorlage"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-title">Titel *</Label>
              <Input
                id="template-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Titel der Vorlage..."
                data-testid="input-template-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Inhalt</Label>
              <RichTextEditor
                value={formBody}
                onChange={setFormBody}
                placeholder="Vorlagen-Inhalt eingeben..."
                className="min-h-[150px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="template-active"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="w-4 h-4"
                data-testid="checkbox-template-active"
              />
              <Label htmlFor="template-active">Aktiv</Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseDialog} data-testid="button-cancel-template">
              Abbrechen
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formTitle.trim() || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-template"
            >
              {createMutation.isPending || updateMutation.isPending ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
