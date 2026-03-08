import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StickyNote, Plus, Pin, PinOff, X } from "lucide-react";
import type { Note, NoteTemplate } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface NotesSectionProps {
  notes: Note[];
  isLoading?: boolean;
  onAdd: (data: { title: string; body: string; templateId?: number }) => void;
  onUpdate?: (id: number, data: { title: string; body: string }) => void;
  onTogglePin?: (id: number, isPinned: boolean) => void;
  onDelete?: (id: number) => void;
  title?: string;
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
  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const parsed = typeof date === "string" ? new Date(date) : date;
    return format(parsed, "dd.MM.yyyy", { locale: de });
  };

  return (
    <div
      className={`relative rounded-lg border p-4 shadow-sm ${
        note.isPinned ? "border-primary/50 bg-primary/5" : "border-border bg-white dark:bg-slate-800"
      } ${note.color ? "border-l-4" : ""} ${onEdit ? "cursor-pointer" : ""}`}
      style={note.color ? { borderLeftColor: note.color } : undefined}
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
                ? "text-primary hover:bg-primary/10"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            data-testid={`button-delete-note-${note.id}`}
            title="Notiz loeschen"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <h4 className="mb-2 pr-16 text-sm font-medium text-slate-800 dark:text-slate-200" data-testid={`text-note-title-${note.id}`}>
        {note.title}
      </h4>
      {note.body ? (
        <div
          className="text-sm text-slate-600 dark:text-slate-400"
          dangerouslySetInnerHTML={{ __html: note.body }}
          data-testid={`text-note-body-${note.id}`}
        />
      ) : null}
      <p className="mt-2 text-xs text-slate-400" data-testid={`text-note-date-${note.id}`}>
        {formatDate(note.updatedAt)}
      </p>
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
}: NotesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  const { data: templates = [], isLoading: templatesLoading } = useQuery<NoteTemplate[]>({
    queryKey: ["/api/note-templates"],
    enabled: dialogOpen && editingNoteId === null,
  });

  const resetDialogState = () => {
    setNoteTitle("");
    setNoteBody("");
    setSelectedTemplateId("none");
    setEditingNoteId(null);
    setDialogOpen(false);
  };

  const handleOpenCreate = () => {
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteBody("");
    setSelectedTemplateId("none");
    setDialogOpen(true);
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteBody(note.body ?? "");
    setSelectedTemplateId("none");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!noteTitle.trim()) return;
    if (editingNoteId !== null) {
      onUpdate?.(editingNoteId, { title: noteTitle, body: noteBody });
      resetDialogState();
      return;
    }
    const templateId = selectedTemplateId === "none" ? undefined : Number(selectedTemplateId);
    onAdd({ title: noteTitle, body: noteBody, templateId });
    resetDialogState();
  };

  const handleTemplateChange = (value: string) => {
    setSelectedTemplateId(value);
    if (value === "none") return;
    const template = templates.find((item) => item.id === Number(value));
    if (!template) return;
    setNoteTitle(template.title);
    setNoteBody(template.body);
  };

  const handleDelete = (note: Note) => {
    if (!onDelete) return;
    if (window.confirm(`Wollen Sie die Notiz ${note.title} wirklich loeschen?`)) {
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
        <Button size="icon" variant="ghost" onClick={handleOpenCreate} data-testid="button-new-note">
          <Plus className="h-4 w-4" />
        </Button>
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
                onEdit={onUpdate ? () => handleOpenEdit(note) : undefined}
                onTogglePin={onTogglePin ? (isPinned) => onTogglePin(note.id, isPinned) : undefined}
                onDelete={onDelete ? () => handleDelete(note) : undefined}
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
              {isEditMode ? "Notiz bearbeiten" : "Neue Notiz"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!isEditMode ? (
              <div className="space-y-2">
                <Label>Vorlage</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger data-testid="select-note-template" disabled={templatesLoading}>
                    <SelectValue placeholder={templatesLoading ? "Vorlagen laden..." : "Vorlage auswaehlen (optional)"} />
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
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetDialogState} data-testid="button-cancel-note">
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={!noteTitle.trim()} data-testid="button-save-note">
              {isEditMode ? "Aktualisieren" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
