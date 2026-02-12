import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { FileText, Pencil } from "lucide-react";
import type { NoteTemplate } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { ColorSelectEntityEditDialog } from "@/components/ui/color-select-entity-edit-dialog";

interface TemplateCardProps {
  template: NoteTemplate;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function TemplateCard({ template, onEdit, onDelete, isDeleting }: TemplateCardProps) {
  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "dd.MM.yyyy", { locale: de });
  };

  return (
    <div data-testid={`template-card-${template.id}`}>
      <ColoredEntityCard
        testId={`template-${template.id}`}
        title={template.title}
        icon={<FileText className="w-4 h-4" />}
        borderColor={template.color ?? undefined}
        className={!template.isActive ? "opacity-60" : ""}
        onDelete={onDelete}
        isDeleting={isDeleting}
        footer={
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            data-testid={`button-edit-template-${template.id}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        }
      >
        <div className="space-y-2">
          {!template.isActive && (
            <span className="inline-flex text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">Inaktiv</span>
          )}
          {template.body && (
            <div
              className="text-sm text-slate-600 line-clamp-3"
              dangerouslySetInnerHTML={{ __html: template.body }}
              data-testid={`text-template-body-${template.id}`}
            />
          )}
          <p className="text-xs text-slate-400" data-testid={`text-template-date-${template.id}`}>
            Aktualisiert: {formatDate(template.updatedAt)}
          </p>
        </div>
      </ColoredEntityCard>
    </div>
  );
}

export function NoteTemplatesPage() {
  const defaultColor = "#94a3b8";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formColor, setFormColor] = useState(defaultColor);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  const { data: templates = [], isLoading } = useQuery<NoteTemplate[]>({
    queryKey: ["/api/note-templates?active=false"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; body: string; isActive: boolean; sortOrder: number; color?: string }) => {
      return apiRequest("POST", "/api/note-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/note-templates?active=false"] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title?: string; body?: string; isActive?: boolean; sortOrder?: number; color?: string } }) => {
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
    setFormColor(defaultColor);
    setFormSortOrder(0);
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const handleOpenEdit = (template: NoteTemplate) => {
    setEditingTemplate(template);
    setFormTitle(template.title);
    setFormBody(template.body);
    setFormColor(template.color ?? defaultColor);
    setFormSortOrder(template.sortOrder ?? 0);
    setFormIsActive(template.isActive);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setFormTitle("");
    setFormBody("");
    setFormColor(defaultColor);
    setFormSortOrder(0);
    setFormIsActive(true);
  };

  const handleSave = () => {
    if (!formTitle.trim()) return;

    const payload = {
      title: formTitle,
      body: formBody,
      sortOrder: formSortOrder,
      isActive: formIsActive,
      color: formColor,
    };

    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        data: payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (template: NoteTemplate) => {
    if (window.confirm(`Wollen Sie die Notiz Vorlage ${template.title} wirklich löschen?`)) {
      deleteMutation.mutate(template.id);
    }
  };

  return (
    <>
      <ListLayout
        title="Notiz Vorlagen"
        icon={<FileText className="w-5 h-5" />}
        helpKey="note-templates"
        isLoading={isLoading}
        footerSlot={(
          <Button
            variant="outline"
            onClick={handleOpenCreate}
            disabled={createMutation.isPending}
            data-testid="button-new-template"
          >
            Neue Vorlage
          </Button>
        )}
        contentSlot={(
          <BoardView
            gridTestId="list-templates"
            gridCols="2"
            isEmpty={templates.length === 0}
            emptyState={(
              <p className="text-sm text-slate-400 text-center py-8 col-span-2">
                Keine Vorlagen vorhanden
              </p>
            )}
          >
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => handleOpenEdit(template)}
                onDelete={() => handleDelete(template)}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </BoardView>
        )}
      />

      <ColorSelectEntityEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingTemplate ? "Vorlage bearbeiten" : "Neue Vorlage"}
        icon={FileText}
        selectedColor={formColor}
        onColorChange={setFormColor}
        onSave={handleSave}
        onCancel={handleCloseDialog}
        isSaving={createMutation.isPending || updateMutation.isPending}
        saveDisabled={!formTitle.trim()}
        maxWidth="max-w-lg"
        colorPickerTestId="button-template-color-picker"
        saveTestId="button-save-template"
        cancelTestId="button-cancel-template"
      >
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
        <div className="space-y-2">
          <Label htmlFor="template-sort-order">Sortierreihenfolge</Label>
          <Input
            id="template-sort-order"
            type="number"
            min="0"
            value={formSortOrder}
            onChange={(e) => setFormSortOrder(Number(e.target.value) || 0)}
            data-testid="input-template-sort-order"
          />
          <p className="text-xs text-slate-500">Niedrigere Werte werden zuerst angezeigt.</p>
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
        <p className="text-xs text-muted-foreground">Farbe</p>
      </ColorSelectEntityEditDialog>
    </>
  );
}
