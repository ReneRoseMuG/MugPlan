import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { FileText } from "lucide-react";
import type { NoteTemplate } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { joinEditFormContext } from "@/lib/edit-form-context";
import { ColorSelectEntityEditDialog } from "@/components/ui/color-select-entity-edit-dialog";
import { ConfirmDialogBase, DialogBaseInlineMessage } from "@/components/ui/dialog-base";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { normalizeServerError, type NormalizedServerError } from "@/lib/error-normalization";
import { getReadableNoteTextColors } from "@/lib/note-colors";

const fallbackCardColor = "#f8fafc";

interface TemplateCardProps {
  template: NoteTemplate;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function TemplateCard({ template, onEdit, onDelete, isDeleting }: TemplateCardProps) {
  const templateTextColors = getReadableNoteTextColors(template.cardColor ?? fallbackCardColor);
  const deleteButtonClassName = templateTextColors.isLight
    ? "text-white hover:bg-white/15 hover:text-white"
    : undefined;

  return (
    <button
      type="button"
      className={`w-full rounded-lg border p-4 text-left shadow-sm ${!template.isActive ? "opacity-60" : ""}`}
      style={{ backgroundColor: template.cardColor ?? fallbackCardColor }}
      data-testid={`template-card-${template.id}`}
      onDoubleClick={onEdit}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: templateTextColors.primary }}
        >
          <FileText className="h-4 w-4" />
          <span>{template.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${template.print ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
            {template.print ? "Drucken" : "Nicht drucken"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isDeleting}
            className={deleteButtonClassName}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            data-testid={`button-delete-template-${template.id}`}
          >
            Löschen
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {!template.isActive && (
          <span className="inline-flex rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Inaktiv</span>
        )}
        {template.body && (
          <div
            className="text-sm line-clamp-3"
            style={{ color: templateTextColors.secondary }}
            dangerouslySetInnerHTML={{ __html: template.body }}
            data-testid={`text-template-body-${template.id}`}
          />
        )}
      </div>
    </button>
  );
}

export function NoteTemplatesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formCardColor, setFormCardColor] = useState(fallbackCardColor);
  const [formPrint, setFormPrint] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [pendingDeleteTemplate, setPendingDeleteTemplate] = useState<NoteTemplate | null>(null);
  const [mutationError, setMutationError] = useState<NormalizedServerError | null>(null);
  const templateEditContext = editingTemplate
    ? joinEditFormContext([formTitle.trim() || editingTemplate.title])
    : null;

  const showMutationError = (error: unknown, title: string) => {
    const normalized = normalizeServerError(error, { title });
    setMutationError(normalized);
    toast({
      title: normalized.title,
      description: normalized.description,
      variant: "destructive",
    });
  };

  const invalidateNoteTemplateQueries = async () => {
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const firstKey = query.queryKey[0];
        return typeof firstKey === "string" && firstKey.startsWith("/api/note-templates");
      },
    });
  };

  const { data: templates = [], isLoading } = useQuery<NoteTemplate[]>({
    queryKey: ["/api/note-templates?active=false"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; body: string; isActive: boolean; sortOrder: number; cardColor?: string | null; print: boolean }) => {
      return apiRequest("POST", "/api/note-templates", data);
    },
    onSuccess: () => {
      void invalidateNoteTemplateQueries();
      setMutationError(null);
      handleCloseDialog();
    },
    onError: (error) => {
      showMutationError(error, "Notizvorlage konnte nicht angelegt werden");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title?: string; body?: string; isActive?: boolean; sortOrder?: number; cardColor?: string | null; print?: boolean; version: number } }) => {
      return apiRequest("PUT", `/api/note-templates/${id}`, data);
    },
    onSuccess: () => {
      void invalidateNoteTemplateQueries();
      setMutationError(null);
      handleCloseDialog();
    },
    onError: (error) => {
      showMutationError(error, "Notizvorlage konnte nicht gespeichert werden");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, version }: { id: number; version: number }) => {
      return apiRequest("DELETE", `/api/note-templates/${id}`, { version });
    },
    onSuccess: () => {
      void invalidateNoteTemplateQueries();
      setMutationError(null);
      setPendingDeleteTemplate(null);
    },
    onError: (error) => {
      showMutationError(error, "Notizvorlage konnte nicht gelöscht werden");
    },
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormTitle("");
    setFormBody("");
    setFormCardColor(fallbackCardColor);
    setFormPrint(true);
    setFormSortOrder(0);
    setFormIsActive(true);
    setMutationError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (template: NoteTemplate) => {
    setEditingTemplate(template);
    setFormTitle(template.title);
    setFormBody(template.body);
    setFormCardColor(template.cardColor ?? fallbackCardColor);
    setFormPrint(template.print);
    setFormSortOrder(template.sortOrder ?? 0);
    setFormIsActive(template.isActive);
    setMutationError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setFormTitle("");
    setFormBody("");
    setFormCardColor(fallbackCardColor);
    setFormPrint(true);
    setFormSortOrder(0);
    setFormIsActive(true);
  };

  const handleSave = () => {
    if (!formTitle.trim()) return;
    setMutationError(null);

    const payload = {
      title: formTitle,
      body: formBody,
      sortOrder: formSortOrder,
      isActive: formIsActive,
      cardColor: formCardColor,
      print: formPrint,
    };

    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        data: { ...payload, version: editingTemplate.version },
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (template: NoteTemplate) => {
    setPendingDeleteTemplate(template);
  };

  return (
    <>
      <ListLayout
        title="Notiz Vorlagen"
        icon={<FileText className="w-5 h-5" />}
        helpKey="note-templates"
        isLoading={isLoading}
        hideHeader
        footerSlot={(
          <Button
            variant="outline"
            onClick={handleOpenCreate}
            disabled={createMutation.isPending}
            data-testid="button-new-template"
          >
            Vorlage anlegen
          </Button>
        )}
        contentSlot={(
          <>
            {mutationError ? (
              <DialogBaseInlineMessage className="mb-3" error={mutationError} />
            ) : null}
            <BoardView
              gridTestId="list-templates"
              gridCols="2"
              isEmpty={templates.length === 0}
              emptyState={(
                <p className="col-span-2 py-8 text-center text-sm text-slate-400">
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
          </>
        )}
      />

      <ColorSelectEntityEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingTemplate ? "Vorlage bearbeiten" : "Vorlage anlegen"}
        subtitle={templateEditContext}
        icon={FileText}
        selectedColor={formCardColor}
        onColorChange={setFormCardColor}
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
          <Label className="text-sm font-medium">Kartenfarbe</Label>
        </div>
        <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
          <div>
            <Label htmlFor="switch-template-print" className="text-sm font-medium">Drucken</Label>
            <p className="text-xs text-slate-500">Wird an neu erstellte Notizen aus dieser Vorlage vererbt.</p>
          </div>
          <Switch
            id="switch-template-print"
            checked={formPrint}
            onCheckedChange={setFormPrint}
            data-testid="switch-template-print"
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
            className="h-4 w-4 cursor-not-allowed"
            data-testid="checkbox-template-active"
          />
          <Label htmlFor="template-active" className="text-muted-foreground">
            Aktiv <span className="text-xs">(nur durch Administrator änderbar)</span>
          </Label>
        </div>
      </ColorSelectEntityEditDialog>
      <ConfirmDialogBase
        open={pendingDeleteTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteTemplate(null);
        }}
        icon={<FileText className="h-5 w-5" />}
        title="Notizvorlage löschen"
        description={
          pendingDeleteTemplate
            ? `Soll die Notizvorlage „${pendingDeleteTemplate.title}“ endgültig gelöscht werden? Bereits erstellte Notizen bleiben unverändert.`
            : undefined
        }
        confirmLabel="Löschen"
        pendingLabel="Löschen..."
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!pendingDeleteTemplate) return;
          setMutationError(null);
          deleteMutation.mutate({ id: pendingDeleteTemplate.id, version: pendingDeleteTemplate.version });
        }}
        testId="dialog-delete-note-template"
        variant="destructive"
      />
    </>
  );
}
