import React from "react";
import { stripHtmlToText, type TourPrintPreviewNote } from "@/lib/tour-print-preview";

type Props = {
  notes: TourPrintPreviewNote[];
};

export function CalendarTourPrintTourNoteBlock({ notes }: Props) {
  if (notes.length === 0) return null;
  return (
    <div
      className="mb-3 flex gap-0 overflow-hidden rounded border border-slate-200"
      data-testid="tour-print-week-note-block"
    >
      <div className="w-1 flex-shrink-0 bg-slate-400" />
      <div className="px-3 py-2">
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Tournotiz</p>
        {notes.map((n) => (
          <p key={n.id} className="text-[11px] leading-relaxed text-slate-700">
            {stripHtmlToText(n.body)}
          </p>
        ))}
      </div>
    </div>
  );
}
