import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NotesSection } from "@/components/NotesSection";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Note } from "@shared/schema";

type CalendarWeekNotesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  yearNumber: number;
  weekNumber: number;
  tourId: number | null;
  title: string;
  readOnly?: boolean;
};

function extractApiCode(error: unknown): string | null {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      return parsed?.code ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

export function CalendarWeekNotesDialog({
  open,
  onOpenChange,
  yearNumber,
  weekNumber,
  tourId,
  title,
  readOnly,
}: CalendarWeekNotesDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const tourSegment = tourId === null ? "0" : String(tourId);
  const queryKey = ["calendarWeekNotes", yearNumber, weekNumber, tourId];
  const baseUrl = `/api/calendar-weeks/${yearNumber}/${weekNumber}/tours/${tourSegment}/notes`;

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(baseUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load calendar week notes");
      return res.json();
    },
    enabled: open,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createNoteMutation = useMutation({
    mutationFn: async (data: { title: string; body: string; cardColor?: string | null; print: boolean; templateId?: number }) => {
      const res = await apiRequest("POST", baseUrl, data);
      return res.json();
    },
    onSuccess: () => { void invalidate(); },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, title: noteTitle, body, cardColor, print, version }: { noteId: number; title: string; body: string; cardColor?: string | null; print: boolean; version: number }) => {
      const res = await apiRequest("PUT", `/api/notes/${noteId}`, { title: noteTitle, body, cardColor, print, version });
      return res.json();
    },
    onSuccess: () => { void invalidate(); },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({ title: "Notiz konnte nicht aktualisiert werden", description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.", variant: "destructive" });
      }
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned, version }: { noteId: number; isPinned: boolean; version: number }) => {
      const res = await apiRequest("PATCH", `/api/notes/${noteId}/pin`, { isPinned, version });
      return res.json();
    },
    onSuccess: () => { void invalidate(); },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async ({ noteId, version }: { noteId: number; version: number }) => {
      await apiRequest("DELETE", `${baseUrl}/${noteId}`, { version });
    },
    onSuccess: () => { void invalidate(); },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({ title: "Notiz konnte nicht gelöscht werden", description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.", variant: "destructive" });
      }
    },
  });

  const getNoteVersion = (noteId: number): number => {
    return notes.find((n) => n.id === noteId)?.version ?? 1;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notizen – {title}</DialogTitle>
        </DialogHeader>
        <NotesSection
          notes={notes}
          isLoading={isLoading}
          readOnly={readOnly}
          onAdd={(data) => createNoteMutation.mutate(data)}
          onUpdate={(noteId, data) => {
            const version = getNoteVersion(noteId);
            updateNoteMutation.mutate({ noteId, ...data, version });
          }}
          onTogglePin={(noteId, isPinned) => {
            const version = getNoteVersion(noteId);
            togglePinMutation.mutate({ noteId, isPinned, version });
          }}
          onDelete={(noteId) => {
            const version = getNoteVersion(noteId);
            deleteNoteMutation.mutate({ noteId, version });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
