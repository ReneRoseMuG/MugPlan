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
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ColorSelectEntityEditDialog } from "@/components/ui/color-select-entity-edit-dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const fallbackCardColor = "#f8fafc";

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
    <button
      type="button"
      className={`w-full rounded-lg border p-4 text-left shadow-sm ${!template.isActive ? "opacity-60" : ""}`}
      style={{ backgroundColor: template.cardColor ?? fallbackCardColor }}
      data-testid={`template-card-${template.id}`}
      onDoubleClick={onEdit}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
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
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            data-testid={`button-delete-template-${template.id}`}
          >
            Loeschen
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {!template.isActive && (
          <span className="inline-flex rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Inaktiv</span>
        )}
        {template.body && (
          <div
            className="text-sm text-slate-600 line-clamp-3"
            dangerouslySetInnerHTML={{ __html: template.body }}
            data-testid={`text-template-body-${template.id}`}
          />
        )}
        <p className="text-xs text-slate-500" data-testid={`text-template-date-${template.id}`}>
          Aktualisiert: {formatDate(template.updatedAt)}
        </p>
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
  const [useCardColor, setUseCardColor] = useState(false);
  const [formPrint, setFormPrint] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  const extractApiCode = (error: unknown): string | null => {
    if (!(error instanceof Error)) return null;
    const match = error.message.match(/"code"\s*:\s*"([A-Z_]+)"/);
    return match?.[1] ?? null;
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
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title?: string; body?: string; isActive?: boolean; sortOrder?: number; cardColor?: string | null; print?: boolean; version: number } }) => {
      return apiRequest("PUT", `/api/note-templates/${id}`, data);
    },
    onSuccess: () => {
      void invalidateNoteTemplateQueries();
      handleCloseDialog();
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Speichern nicht moeglich",
          description: "Datensatz wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, version }: { id: number; version: number }) => {
      return apiRequest("DELETE", `/api/note-templates/${id}`, { version });
    },
    onSuccess: () => {
      void invalidateNoteTemplateQueries();
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Loeschen nicht moeglich",
          description: "Datensatz wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
      }
    },
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormTitle("");
    setFormBody("");
    setFormCardColor(fallbackCardColor);
    setUseCardColor(false);
    setFormPrint(true);
    setFormSortOrder(0);
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const handleOpenEdit = (template: NoteTemplate) => {
    setEditingTemplate(template);
    setFormTitle(template.title);
    setFormBody(template.body);
    setFormCardColor(template.cardColor ?? fallbackCardColor);
    setUseCardColor(template.cardColor !== null);
    setFormPrint(template.print);
    setFormSortOrder(template.sortOrder ?? 0);
    setFormIsActive(template.isActive);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setFormTitle("");
    setFormBody("");
    setFormCardColor(fallbackCardColor);
    setUseCardColor(false);
    setFormPrint(true);
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
      cardColor: useCardColor ? formCardColor : null,
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
    if (window.confirm(`Wollen Sie die Notiz Vorlage ${template.title} wirklich loeschen?`)) {
      deleteMutation.mutate({ id: template.id, version: template.version });
    }
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
            Neue Vorlage
          </Button>
        )}
        contentSlot={(
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
        )}
      />

      <ColorSelectEntityEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingTemplate ? "Vorlage bearbeiten" : "Neue Vorlage"}
        icon={FileText}
        selectedColor={formCardColor}
        onColorChange={(color) => {
          setUseCardColor(true);
          setFormCardColor(color);
        }}
        onSave={handleSave}
        onCancel={handleCloseDialog}
        isSaving={createMutation.isPending || updateMutation.isPending}
        saveDisabled={!formTitle.trim()}
        maxWidth="max-w-lg"
        colorPickerTestId="button-template-color-picker"
        colorPickerDisabled={!useCardColor}
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
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-medium">Kartenfarbe</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUseCardColor((current) => !current)}
            data-testid="button-template-toggle-card-color"
          >
            {useCardColor ? "Farbe entfernen" : "Farbe aktivieren"}
          </Button>
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
            Aktiv <span className="text-xs">(nur durch Administrator aenderbar)</span>
          </Label>
        </div>
      </ColorSelectEntityEditDialog>
    </>
  );
}
