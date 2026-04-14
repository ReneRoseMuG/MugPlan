import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Note, NoteTemplate, Tag } from "@shared/schema";
import { RichTextEditor } from "@/components/RichTextEditor";
import { TagSelectionMenuContent } from "@/components/tags/tag-selection-menu-content";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ColorSelectButton } from "@/components/ui/color-select-button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { computeTagAddedAction } from "@/hooks/useTagRuleEngine";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { invalidateTagProjectionQueries } from "@/lib/tag-invalidation";
import { fetchTagCatalog, getTagCatalogQueryKey } from "@/lib/tags";

type CalendarWeekAppointmentTagPickerProps = {
  appointmentId: number;
  tags: Tag[];
  appointmentTags: Tag[];
  projectTags: Tag[];
  canEdit: boolean;
  testId: string;
  className?: string;
};

export function CalendarWeekAppointmentTagPicker({
  appointmentId,
  tags,
  appointmentTags,
  projectTags,
  canEdit,
  testId,
  className,
}: CalendarWeekAppointmentTagPickerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [noteSuggestionDialog, setNoteSuggestionDialog] = useState<{ templateTitle: string } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteVersion, setEditingNoteVersion] = useState<number>(1);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteCardColor, setNoteCardColor] = useState<string>("#f8fafc");
  const [notePrint, setNotePrint] = useState(false);
  const [cardColorLocked, setCardColorLocked] = useState(false);

  const appointmentNotesQueryKey = ["/api/appointments", appointmentId, "notes"] as const;
  const noteTemplatesQueryKey = ["/api/note-templates"] as const;

  const fetchAppointmentNotes = async (): Promise<Note[]> => {
    const response = await fetch(`/api/appointments/${appointmentId}/notes`, {
      credentials: "include",
    });
    if (!response.ok) {
      const message = (await response.text()) || "Terminnotizen konnten nicht geladen werden";
      throw new Error(message);
    }
    return response.json() as Promise<Note[]>;
  };

  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: getTagCatalogQueryKey("appointment"),
    queryFn: () => fetchTagCatalog("appointment"),
    enabled: pickerOpen,
    staleTime: 60_000,
  });
  const { data: appointmentNotes = [] } = useQuery<Note[]>({
    queryKey: appointmentNotesQueryKey,
    queryFn: fetchAppointmentNotes,
    enabled: Boolean(appointmentId),
    staleTime: 60_000,
  });
  const fetchNoteTemplates = async (): Promise<NoteTemplate[]> => {
    const response = await fetch("/api/note-templates", {
      credentials: "include",
    });
    if (!response.ok) {
      const message = (await response.text()) || "Notizvorlagen konnten nicht geladen werden";
      throw new Error(message);
    }
    return response.json() as Promise<NoteTemplate[]>;
  };
  const { data: noteTemplates = [] } = useQuery<NoteTemplate[]>({
    queryKey: noteTemplatesQueryKey,
    queryFn: fetchNoteTemplates,
    enabled: canEdit,
    staleTime: 60_000,
  });

  const excludedTagIds = useMemo(() => {
    const result = new Set<number>();
    appointmentTags.forEach((tag) => result.add(tag.id));
    projectTags.forEach((tag) => result.add(tag.id));
    return result;
  }, [appointmentTags, projectTags]);

  const addableTags = useMemo(
    () => availableTags.filter((tag) => !excludedTagIds.has(tag.id)),
    [availableTags, excludedTagIds],
  );

  const invalidateAfterTagMutation = async () => {
    await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
    await invalidateTagProjectionQueries();
    await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId, "tags"] });
  };

  const invalidateAfterNoteMutation = async () => {
    await queryClient.invalidateQueries({ queryKey: appointmentNotesQueryKey });
    await queryClient.invalidateQueries({ queryKey: ["/api/notes-preview"] });
    await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
  };

  const addTagMutation = useMutation({
    mutationFn: async ({ tagId }: { tagId: number; tagName: string }) => {
      await apiRequest("POST", `/api/appointments/${appointmentId}/tags`, { tagId });
    },
    onSuccess: async (_data, { tagName }) => {
      const existingNotes = appointmentNotes.length > 0
        ? appointmentNotes
        : await queryClient.ensureQueryData({
          queryKey: appointmentNotesQueryKey,
          queryFn: fetchAppointmentNotes,
        });
      const action = computeTagAddedAction(tagName, appointmentId, existingNotes.map((note) => ({ title: note.title })));
      if (action.kind === "show_note_suggestion_dialog") {
        setNoteSuggestionDialog({ templateTitle: action.templateTitle });
      }
      await invalidateAfterTagMutation();
      setPickerOpen(false);
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Tag-Zuweisung fehlgeschlagen",
        description: mutationError.message,
        variant: "destructive",
      });
    },
  });

  const createAppointmentNoteMutation = useMutation({
    mutationFn: async ({
      title,
      body,
      cardColor,
      print,
      templateId,
    }: {
      title: string;
      body: string;
      cardColor?: string | null;
      print: boolean;
      templateId?: number;
    }) => {
      const response = await apiRequest("POST", `/api/appointments/${appointmentId}/notes`, { title, body, cardColor, print, templateId });
      return response.json() as Promise<Note>;
    },
    onSuccess: async (createdNote) => {
      await invalidateAfterNoteMutation();
      setEditingNoteId(createdNote.id);
      setEditingNoteVersion(createdNote.version);
      setNoteTitle(createdNote.title);
      setNoteBody(createdNote.body ?? "");
      setNoteCardColor(createdNote.cardColor ?? "#f8fafc");
      setNotePrint(createdNote.print);
      setCardColorLocked(createdNote.cardColorLocked);
      setEditorOpen(true);
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Notiz konnte nicht angelegt werden",
        description: mutationError.message,
        variant: "destructive",
      });
    },
  });
  const updateAppointmentNoteMutation = useMutation({
    mutationFn: async ({
      noteId,
      version,
      title,
      body,
      cardColor,
      print,
    }: {
      noteId: number;
      version: number;
      title: string;
      body: string;
      cardColor?: string | null;
      print: boolean;
    }) => {
      const response = await apiRequest("PUT", `/api/notes/${noteId}`, { title, body, cardColor, print, version });
      return response.json() as Promise<Note>;
    },
    onSuccess: async (updatedNote) => {
      await invalidateAfterNoteMutation();
      setEditingNoteVersion(updatedNote.version);
      setEditorOpen(false);
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Notiz konnte nicht aktualisiert werden",
        description: mutationError.message,
        variant: "destructive",
      });
    },
  });

  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const handleCreateFromTemplate = async () => {
    if (!noteSuggestionDialog) return;
    const templates = noteTemplates.length > 0
      ? noteTemplates
      : await queryClient.ensureQueryData({
        queryKey: noteTemplatesQueryKey,
        queryFn: fetchNoteTemplates,
      });
    const template = templates.find((entry) => entry.title.trim().toLocaleLowerCase("de") === noteSuggestionDialog.templateTitle.trim().toLocaleLowerCase("de"));
    if (!template) {
      toast({
        title: "Notizvorlage fehlt",
        description: `Die Notizvorlage „${noteSuggestionDialog.templateTitle}“ wurde nicht gefunden.`,
        variant: "destructive",
      });
      return;
    }
    createAppointmentNoteMutation.mutate({
      title: template.title,
      body: template.body,
      cardColor: template.cardColor,
      print: template.print,
      templateId: template.id,
    });
    setNoteSuggestionDialog(null);
  };

  return (
    <>
      <div className={`flex h-7 w-full items-center gap-2 overflow-hidden ${className ?? ""}`.trim()} data-testid={testId}>
        <div className="min-w-0 flex-1">
          <EntityTagFooterRow tags={tags} testId={`${testId}-badges`} />
        </div>
        {canEdit ? (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <PlusActionButton
                className="mt-0.5 shrink-0"
                onClick={stopPropagation}
                onMouseDown={stopPropagation}
                onPointerDown={stopPropagation}
                onDoubleClick={stopPropagation}
                data-testid={`${testId}-button`}
                aria-label="Tag-Picker öffnen"
                title="Tag hinzufügen"
              />
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div data-testid={`${testId}-dialog`}>
                <TagSelectionMenuContent
                  tags={addableTags}
                  onAddTag={(tagId) => {
                    const selectedTag = availableTags.find((tag) => tag.id === tagId);
                    if (!selectedTag) return;
                    addTagMutation.mutate({ tagId, tagName: selectedTag.name });
                  }}
                  emptyText="Keine weiteren Tags verfügbar."
                  testIdPrefix={`${testId}-add`}
                  showVerboseLabels
                  pendingText={addTagMutation.isPending ? "Änderung wird gespeichert ..." : null}
                  title="Tag hinzufügen"
                />
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      <AlertDialog open={noteSuggestionDialog !== null} onOpenChange={(open) => { if (!open) setNoteSuggestionDialog(null); }}>
        <AlertDialogContent data-testid="dialog-note-suggestion">
          <AlertDialogHeader>
            <AlertDialogTitle>Notiz anlegen?</AlertDialogTitle>
            <AlertDialogDescription>
              {`Soll eine Notiz „${noteSuggestionDialog?.templateTitle ?? ""}" für diesen Termin angelegt werden?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-note-suggestion-skip">Überspringen</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-note-suggestion-confirm"
              onClick={() => { void handleCreateFromTemplate(); }}
            >
              Jetzt anlegen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Notiz bearbeiten</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`week-note-title-${appointmentId}`}>Titel *</Label>
              <Input
                id={`week-note-title-${appointmentId}`}
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Titel der Notiz..."
                data-testid="input-note-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Inhalt</Label>
              <RichTextEditor
                key={`week-note-editor-${editingNoteId ?? "new"}`}
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
                <Label htmlFor={`switch-note-print-${appointmentId}`} className="text-sm font-medium">Drucken</Label>
                <p className="text-xs text-slate-500">Bestimmt, ob die Notiz in Druckausgaben berücksichtigt wird.</p>
              </div>
              <Switch
                id={`switch-note-print-${appointmentId}`}
                checked={notePrint}
                onCheckedChange={setNotePrint}
                data-testid="switch-note-print"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)} data-testid="button-cancel-note">
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (!editingNoteId || !noteTitle.trim()) return;
                updateAppointmentNoteMutation.mutate({
                  noteId: editingNoteId,
                  version: editingNoteVersion,
                  title: noteTitle,
                  body: noteBody,
                  cardColor: noteCardColor,
                  print: notePrint,
                });
              }}
              disabled={!noteTitle.trim()}
              data-testid="button-save-note"
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
