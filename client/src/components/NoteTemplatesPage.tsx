import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { FileText, X, Pencil } from "lucide-react";
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
        <Button
          size="icon"
          variant="ghost"
          onClick={onEdit}
          className="w-6 h-6"
          data-testid={`button-edit-template-${template.id}`}
          title="Bearbeiten"
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          className="w-6 h-6"
          data-testid={`button-delete-template-${template.id}`}
          title="Löschen"
        >
          <X className="w-4 h-4" />
        </Button>
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
    queryKey: ["/api/note-templates?active=false"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; body: string; isActive: boolean }) => {
      return apiRequest("POST", "/api/note-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/note-templates?active=false"] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title?: string; body?: string; isActive?: boolean } }) => {
      return apiRequest("PUT", `/api/note-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/note-templates?active=false"] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/note-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/note-templates?active=false"] });
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
    <>
      <CardListLayout
        title="Notiz Vorlagen"
        icon={<FileText className="w-5 h-5" />}
        helpKey="note-templates"
        isLoading={isLoading}
        gridTestId="list-templates"
        gridCols="2"
        primaryAction={{
          label: "Neue Vorlage",
          onClick: handleOpenCreate,
          isPending: createMutation.isPending,
          testId: "button-new-template",
        }}
        isEmpty={templates.length === 0}
        emptyState={
          <p className="text-sm text-slate-400 text-center py-8 col-span-2">
            Keine Vorlagen vorhanden
          </p>
        }
      >
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onEdit={() => handleOpenEdit(template)}
            onDelete={() => handleDelete(template.id)}
          />
        ))}
      </CardListLayout>

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
                disabled={true}
                className="w-4 h-4 cursor-not-allowed"
                data-testid="checkbox-template-active"
              />
              <Label htmlFor="template-active" className="text-muted-foreground">
                Aktiv <span className="text-xs">(nur durch Administrator änderbar)</span>
              </Label>
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
    </>
  );
}
