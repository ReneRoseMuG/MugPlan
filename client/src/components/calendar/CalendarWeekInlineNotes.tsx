import { X } from "lucide-react";
import { stripHtmlToText } from "@/lib/printText";
import { getReadableNoteTextColors } from "@/lib/note-colors";

export type CalendarWeekInlineNoteSource = "appointment" | "project";

export type CalendarWeekInlineNote = {
  id: number;
  version: number;
  sourceType: CalendarWeekInlineNoteSource;
  parentId: number;
  title: string;
  body: string;
  cardColor: string | null;
  cardColorLocked: boolean;
  isPinned: boolean;
  print: boolean;
  updatedAt: string;
};

type CalendarWeekInlineNotesProps = {
  appointmentId: number;
  notes: CalendarWeekInlineNote[];
  testIdBase: "week-appointment" | "week-spanning-tile";
  canMutate: boolean;
  onEditNote?: (note: CalendarWeekInlineNote) => void;
  onDeleteNote?: (note: CalendarWeekInlineNote) => void;
};

export function CalendarWeekInlineNotes({
  appointmentId,
  notes,
  testIdBase,
  canMutate,
  onEditNote,
  onDeleteNote,
}: CalendarWeekInlineNotesProps) {
  if (notes.length === 0) {
    return null;
  }

  const listTestId = `${testIdBase}-inline-notes-${appointmentId}`;
  const noteTestIdPrefix = `${testIdBase}-inline-note`;

  return (
    <div className="mt-1 space-y-1" data-testid={listTestId}>
      {notes.map((note) => {
        const noteText = stripHtmlToText(note.body);
        const noteTextColors = getReadableNoteTextColors(note.cardColor ?? "#f8fafc");
        const canEdit = canMutate && typeof onEditNote === "function";
        const canDelete = canMutate && typeof onDeleteNote === "function";
        return (
          <div
            key={`${note.sourceType}-${note.id}`}
            className={`relative rounded-md border px-2 py-1 text-[10px] leading-snug shadow-sm ${canEdit ? "cursor-pointer" : ""}`}
            style={{
              backgroundColor: note.cardColor ?? "#f8fafc",
              borderColor: "rgba(15,23,42,0.14)",
              color: noteTextColors.primary,
            }}
            data-testid={`${noteTestIdPrefix}-${appointmentId}-${note.id}`}
            onDoubleClick={canEdit
              ? (event) => {
                  event.stopPropagation();
                  onEditNote(note);
                }
              : undefined}
          >
            {canDelete ? (
              <button
                type="button"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteNote(note);
                }}
                onDoubleClick={(event) => event.stopPropagation()}
                data-testid={`${noteTestIdPrefix}-delete-${appointmentId}-${note.sourceType}-${note.id}`}
                aria-label="Notiz löschen"
                title="Notiz löschen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <div className={`flex min-w-0 items-center gap-1 ${canDelete ? "pr-5" : ""}`}>
              <span className="min-w-0 truncate font-semibold">{note.title}</span>
            </div>
            {noteText ? (
              <div className="mt-0.5 line-clamp-2" style={{ color: noteTextColors.secondary }}>{noteText}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
