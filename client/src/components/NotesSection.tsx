import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EditFormContextText } from "@/components/ui/edit-form-context-text";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelpIcon } from "@/components/ui/help/help-icon";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ColorSelectButton } from "@/components/ui/color-select-button";
import { StickyNote, Plus, Pin, PinOff, X } from "lucide-react";
import type { Note, NoteTemplate } from "@shared/schema";

const fallbackCardColor = "#f8fafc";

interface NoteInput {
  title: string;
  body: string;
  cardColor?: string | null;
  print: boolean;
  templateId?: number;
}

interface NotesSectionProps {
  notes: Note[];
  isLoading?: boolean;
  onAdd: (data: NoteInput) => void;
  onUpdate?: (id: number, data: Omit<NoteInput, "templateId">) => void;
  onTogglePin?: (id: number, isPinned: boolean) => void;
  onDelete?: (id: number) => void;
  title?: string;
  readOnly?: boolean;
  prefillDraft?: NoteInput | null;
  onPrefillDraftConsumed?: () => void;
}

function NoteCard({
  note,
  onEdit,
  onTogglePin,
  onDelete,
}: {
  note: Note;
  onEdit?: () => void;
  onTogglePin?: (isPinned: boolean) => void;
  onDelete?: () => void;
}) {
  const hasCustomCardColor = note.cardColor !== null;
  const titleClassName = hasCustomCardColor ? "text-white" : "text-slate-800 dark:text-slate-200";
  const bodyClassName = hasCustomCardColor ? "text-white/90" : "text-slate-600 dark:text-slate-400";
  const iconButtonClassName = hasCustomCardColor
    ? "text-white/80 hover:bg-white/15 hover:text-white"
    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600";

  return (
    <div
      className={`relative rounded-lg border p-4 shadow-sm ${onEdit ? "cursor-pointer" : ""}`}
      style={{ backgroundColor: note.cardColor ?? fallbackCardColor }}
      data-testid={`note-card-${note.id}`}
      onDoubleClick={onEdit}
    >
      <div className="absolute top-2 right-2 flex gap-1">
        {onTogglePin ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onTogglePin(!note.isPinned);
            }}
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
              note.isPinned
                ? hasCustomCardColor
                  ? "text-white hover:bg-white/15"
                  : "text-primary hover:bg-primary/10"
                : iconButtonClassName
            }`}
            data-testid={`button-pin-note-${note.id}`}
            title={note.isPinned ? "Anheften aufheben" : "Anheften"}
          >
            {note.isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${iconButtonClassName}`}
            data-testid={`button-delete-note-${note.id}`}
            title="Notiz löschen"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="mb-2 flex items-center gap-2 pr-16">
        <h4 className={`text-sm font-medium ${titleClassName}`} data-testid={`text-note-title-${note.id}`}>
          {note.title}
        </h4>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${note.print ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}
          data-testid={`badge-note-print-${note.id}`}
        >
          {note.print ? "Drucken" : "Nicht drucken"}
        </span>
      </div>
      {note.body ? (
        <div
          className={`text-sm ${bodyClassName}`}
          dangerouslySetInnerHTML={{ __html: note.body }}
          data-testid={`text-note-body-${note.id}`}
        />
      ) : null}
    </div>
  );
}

export function NotesSection({
  notes,
  isLoading = false,
  onAdd,
  onUpdate,
  onTogglePin,
  onDelete,
  title = "Notizen",
  readOnly = false,
  prefillDraft = null,
  onPrefillDraftConsumed,
}: NotesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteCardColor, setNoteCardColor] = useState<string>(fallbackCardColor);
  const [notePrint, setNotePrint] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [cardColorLocked, setCardColorLocked] = useState(false);

  const { data: templates = [], isLoading: templatesLoading } = useQuery<NoteTemplate[]>({
    queryKey: ["/api/note-templates"],
    enabled: dialogOpen && editingNoteId === null,
  });

  const resetDialogState = () => {
    setNoteTitle("");
    setNoteBody("");
    setNoteCardColor(fallbackCardColor);
    setNotePrint(false);
    setSelectedTemplateId("none");
    setEditingNoteId(null);
    setCardColorLocked(false);
    setDialogOpen(false);
  };

  const handleOpenCreate = () => {
    if (readOnly) return;
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteBody("");
    setNoteCardColor(fallbackCardColor);
    setNotePrint(false);
    setSelectedTemplateId("none");
    setCardColorLocked(false);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!prefillDraft || dialogOpen || readOnly) return;
    setEditingNoteId(null);
    setNoteTitle(prefillDraft.title);
    setNoteBody(prefillDraft.body);
    setNoteCardColor(prefillDraft.cardColor ?? fallbackCardColor);
    setNotePrint(prefillDraft.print);
    setSelectedTemplateId(prefillDraft.templateId ? String(prefillDraft.templateId) : "none");
    setCardColorLocked(prefillDraft.cardColor !== null && prefillDraft.cardColor !== undefined);
    setDialogOpen(true);
    onPrefillDraftConsumed?.();
    // dialogOpen must not retrigger the prefill when the user closes the dialog manually.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPrefillDraftConsumed, prefillDraft, readOnly]);

  const handleOpenEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteBody(note.body ?? "");
    setNoteCardColor(note.cardColor ?? fallbackCardColor);
    setNotePrint(note.print);
    setSelectedTemplateId("none");
    setCardColorLocked(note.cardColorLocked);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!noteTitle.trim()) return;
    const payload = {
      title: noteTitle,
      body: noteBody,
      cardColor: noteCardColor,
      print: notePrint,
    };
    if (editingNoteId !== null) {
      onUpdate?.(editingNoteId, payload);
      resetDialogState();
      return;
    }
    const templateId = selectedTemplateId === "none" ? undefined : Number(selectedTemplateId);
    onAdd({ ...payload, templateId });
    resetDialogState();
  };

  const handleTemplateChange = (value: string) => {
    setSelectedTemplateId(value);
    if (value === "none") {
      setCardColorLocked(false);
      return;
    }
    const template = templates.find((item) => item.id === Number(value));
    if (!template) return;
    setNoteTitle(template.title);
    setNoteBody(template.body);
    setNotePrint(template.print);
    setCardColorLocked(template.cardColor !== null);
    setNoteCardColor(template.cardColor ?? fallbackCardColor);
  };

  const handleDelete = (note: Note) => {
    if (!onDelete) return;
    if (window.confirm(`Wollen Sie die Notiz ${note.title} wirklich löschen?`)) {
      onDelete(note.id);
    }
  };

  const isEditMode = editingNoteId !== null;

  return (
    <div className="sub-panel space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-wider text-primary">
          <StickyNote className="h-4 w-4" />
          {title} ({notes.length})
        </h3>
        {!readOnly ? (
          <Button size="icon" variant="ghost" onClick={handleOpenCreate} data-testid="button-new-note">
            <Plus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="max-h-[400px] space-y-2 overflow-y-auto" data-testid="list-notes">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-20 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-20 rounded-lg bg-slate-200 dark:bg-slate-700" />
          </div>
        ) : (
          <>
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={!readOnly && onUpdate ? () => handleOpenEdit(note) : undefined}
                onTogglePin={!readOnly && onTogglePin ? (isPinned) => onTogglePin(note.id, isPinned) : undefined}
                onDelete={!readOnly && onDelete ? () => handleDelete(note) : undefined}
              />
            ))}
            {notes.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Keine Notizen vorhanden</p>
            ) : null}
          </>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetDialogState();
            return;
          }
          setDialogOpen(true);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              {isEditMode ? "Notiz bearbeiten" : "Notiz anlegen"}
            </DialogTitle>
            <EditFormContextText className="pl-7">
              {isEditMode ? (noteTitle.trim() || null) : null}
            </EditFormContextText>
          </DialogHeader>

          <div className="space-y-4">
            {!isEditMode ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Vorlage</Label>
                  <HelpIcon helpKey="note-templates" size="sm" />
                </div>
                <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger data-testid="select-note-template" disabled={templatesLoading}>
                    <SelectValue placeholder={templatesLoading ? "Vorlagen laden..." : "Vorlage auswählen (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine Vorlage</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={String(template.id)}>
                        {template.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="note-title">Titel *</Label>
              <Input
                id="note-title"
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Titel der Notiz..."
                data-testid="input-note-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Inhalt</Label>
              <RichTextEditor
                key={`${editingNoteId ?? "new"}-${selectedTemplateId}`}
                value={noteBody}
                onChange={setNoteBody}
                placeholder="Notizinhalt eingeben..."
                className="min-h-[150px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Kartenfarbe</Label>
              <ColorSelectButton
                color={noteCardColor}
                onChange={setNoteCardColor}
                testId="button-note-card-color-picker"
                disabled={cardColorLocked}
                label="Kartenfarbe"
              />
              {cardColorLocked ? (
                <p className="text-xs text-slate-500" data-testid="text-note-card-color-locked">
                  Die Kartenfarbe stammt aus der Vorlage und kann für diese Notiz nicht geändert werden.
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
              <div>
                <Label htmlFor="switch-note-print" className="text-sm font-medium">Drucken</Label>
                <p className="text-xs text-slate-500">Bestimmt, ob die Notiz in Druckausgaben berücksichtigt wird.</p>
              </div>
              <Switch
                id="switch-note-print"
                checked={notePrint}
                onCheckedChange={setNotePrint}
                data-testid="switch-note-print"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetDialogState} data-testid="button-cancel-note">
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={!noteTitle.trim()} data-testid="button-save-note">
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
