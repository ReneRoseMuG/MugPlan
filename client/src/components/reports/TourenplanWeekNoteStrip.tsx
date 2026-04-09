import React from "react";
import type { TourenplanPrintMode, TourenplanWeekNote } from "@/components/reports/tourenplan-model";
import { stripHtmlToText } from "@/lib/printText";

type TourenplanWeekNoteStripProps = {
  note: TourenplanWeekNote;
  printMode: TourenplanPrintMode;
};

function resolveNoteBackground(cardColor: string | null, printMode: TourenplanPrintMode): string {
  if (printMode === "spardruck" || cardColor === null) {
    return "#ffffff";
  }
  return `${cardColor}1a`;
}

export function TourenplanWeekNoteStrip({ note, printMode }: TourenplanWeekNoteStripProps) {
  const accentColor = note.cardColor ?? "#cbd5e1";
  const background = resolveNoteBackground(note.cardColor, printMode);
  const title = note.title?.trim() ?? "";
  const body = stripHtmlToText(note.body);

  return (
    <div
      style={{
        borderLeft: `4px solid ${accentColor}`,
        background,
        breakInside: "avoid",
        padding: "4px 6px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {title.length > 0 && (
        <div
          style={{
            fontSize: "10px",
            fontWeight: 600,
            lineHeight: 1.4,
            color: "#0f172a",
            marginBottom: body.length > 0 ? 2 : 0,
          }}
        >
          {title}
        </div>
      )}
      {body.length > 0 && (
        <div
          style={{
            fontSize: "10px",
            lineHeight: 1.4,
            color: "#334155",
          }}
        >
          {body}
        </div>
      )}
    </div>
  );
}
