import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { StickyNote, Plus, X } from "lucide-react";

export interface Note {
  id: string;
  text: string;
  createdAt: string;
}

interface NotesSectionProps {
  notes: Note[];
  onAdd: (text: string) => void;
  onDelete: (id: string) => void;
  title?: string;
}

function NoteCard({ 
  note, 
  onDelete 
}: { 
  note: Note;
  onDelete: () => void;
}) {
  return (
    <div 
      className="relative bg-white dark:bg-slate-800 border border-border rounded-lg p-4 shadow-sm" 
      data-testid={`note-card-${note.id}`}
    >
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-destructive/10 text-slate-400 hover:text-destructive transition-colors"
        data-testid={`button-delete-note-${note.id}`}
      >
        <X className="w-4 h-4" />
      </button>
      <div 
        className="text-sm text-slate-700 dark:text-slate-300 pr-6"
        dangerouslySetInnerHTML={{ __html: note.text }}
        data-testid={`text-note-${note.id}`}
      />
      <p className="text-xs text-slate-400 mt-2" data-testid={`text-note-date-${note.id}`}>
        {note.createdAt}
      </p>
    </div>
  );
}

export function NotesSection({ notes, onAdd, onDelete, title = "Notizen" }: NotesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  const handleSave = () => {
    if (newNoteText.trim()) {
      onAdd(newNoteText);
      setNewNoteText("");
      setDialogOpen(false);
    }
  };

  const handleCancel = () => {
    setNewNoteText("");
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
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
        {notes.map(note => (
          <NoteCard 
            key={note.id}
            note={note}
            onDelete={() => onDelete(note.id)} 
          />
        ))}
        {notes.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">
            Keine Notizen vorhanden
          </p>
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
          
          <RichTextEditor
            value={newNoteText}
            onChange={setNewNoteText}
            placeholder="Notiz eingeben..."
            className="min-h-[150px]"
          />

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-note">
              Abbrechen
            </Button>
            <Button onClick={handleSave} data-testid="button-save-note">
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
