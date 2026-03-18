import React from "react";

import {
  resolvePrintNoteAccentColor,
  resolvePrintNoteTintColor,
  stripHtmlToText,
  type TourPrintPreviewNote,
} from "@/lib/tour-print-preview";

type CalendarTourPrintNoteBlockProps = {
  note: TourPrintPreviewNote;
  appointmentId: number;
  noteIndex: number;
};

export function CalendarTourPrintNoteBlock({
  note,
  appointmentId,
  noteIndex,
}: CalendarTourPrintNoteBlockProps) {
  const text = stripHtmlToText(note.body);

  return (
    <article
      className="rounded-md border px-2.5 py-2"
      style={{
        borderColor: resolvePrintNoteAccentColor(note),
        backgroundColor: resolvePrintNoteTintColor(note),
      }}
      data-testid={`tour-print-note-${appointmentId}-${noteIndex}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{note.title}</p>
      {text ? <p className="mt-1 text-[11px] leading-4 text-slate-700">{text}</p> : null}
    </article>
  );
}
