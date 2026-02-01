import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  onTogglePin?: (id: number, isPinned: boolean) => void;
  onDelete?: (id: number) => void;
  title?: string;
}

function NoteCard({ 
  note, 
  onTogglePin,
  onDelete,
}: { 
  note: Note;
  onTogglePin?: (isPinned: boolean) => void;
  onDelete?: () => void;
}) {
  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "dd.MM.yyyy", { locale: de });
  };

  return (
    <div 
      className={`relative bg-white dark:bg-slate-800 border rounded-lg p-4 shadow-sm ${
        note.isPinned ? "border-primary/50 bg-primary/5" : "border-border"
      } ${note.color ? "border-l-4" : ""}`}
      style={note.color ? { borderLeftColor: note.color } : undefined}
      data-testid={`note-card-${note.id}`}
    >
      <div className="absolute top-2 right-2 flex gap-1">
        {onTogglePin && (
          <button
            onClick={() => onTogglePin(!note.isPinned)}
            className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
              note.isPinned 
                ? "text-primary hover:bg-primary/10" 
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
            data-testid={`button-pin-note-${note.id}`}
            title={note.isPinned ? "Anheften aufheben" : "Anheften"}
          >
            {note.isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            data-testid={`button-delete-note-${note.id}`}
            title="Notiz löschen"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 pr-16 mb-2" data-testid={`text-note-title-${note.id}`}>
        {note.title}
      </h4>
      {note.body && (
        <div 
          className="text-sm text-slate-600 dark:text-slate-400"
          dangerouslySetInnerHTML={{ __html: note.body }}
          data-testid={`text-note-body-${note.id}`}
        />
      )}
      <p className="text-xs text-slate-400 mt-2" data-testid={`text-note-date-${note.id}`}>
        {formatDate(note.updatedAt)}
      </p>
    </div>
  );
}

export function NotesSection({ 
  notes, 
  isLoading = false, 
  onAdd, 
  onTogglePin,
  onDelete,
  title = "Notizen" 
}: NotesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteBody, setNewNoteBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");

  const { data: templates = [], isLoading: templatesLoading } = useQuery<NoteTemplate[]>({
    queryKey: ["/api/note-templates"],
    enabled: dialogOpen,
  });

  const handleSave = () => {
    if (newNoteTitle.trim()) {
      const templateId = selectedTemplateId === "none" ? undefined : Number(selectedTemplateId);
      onAdd({ title: newNoteTitle, body: newNoteBody, templateId });
      setNewNoteTitle("");
      setNewNoteBody("");
      setSelectedTemplateId("none");
      setDialogOpen(false);
    }
  };

  const handleCancel = () => {
    setNewNoteTitle("");
    setNewNoteBody("");
    setSelectedTemplateId("none");
    setDialogOpen(false);
  };

  const handleTemplateChange = (value: string) => {
    setSelectedTemplateId(value);
    if (value === "none") return;
    const template = templates.find((item) => item.id === Number(value));
    if (template) {
      setNewNoteTitle(template.title);
      setNewNoteBody(template.body);
    }
  };

  const handleDelete = (note: Note) => {
    if (!onDelete) return;
    if (window.confirm(`Wollen Sie die Notiz ${note.title} wirklich löschen?`)) {
      onDelete(note.id);
    }
  };

  return (
    <div className="sub-panel space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          <StickyNote className="w-4 h-4" />
          {title} ({notes.length})
        </h3>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => setDialogOpen(true)}
          data-testid="button-new-note"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto" data-testid="list-notes">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          </div>
        ) : (
          <>
            {notes.map(note => (
              <NoteCard 
                key={note.id}
                note={note}
                onTogglePin={onTogglePin ? (isPinned) => onTogglePin(note.id, isPinned) : undefined}
                onDelete={onDelete ? () => handleDelete(note) : undefined}
              />
            ))}
            {notes.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">
                Keine Notizen vorhanden
              </p>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5" />
              Neue Notiz
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vorlage</Label>
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
            <div className="space-y-2">
              <Label htmlFor="note-title">Titel *</Label>
              <Input
                id="note-title"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Titel der Notiz..."
                data-testid="input-note-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Inhalt</Label>
              <RichTextEditor
                key={selectedTemplateId}
                value={newNoteBody}
                onChange={setNewNoteBody}
                placeholder="Notizinhalt eingeben..."
                className="min-h-[150px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-note">
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={!newNoteTitle.trim()} data-testid="button-save-note">
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
