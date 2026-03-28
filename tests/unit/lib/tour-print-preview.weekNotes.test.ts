/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - weekNotes werden von der API-Response in die List-Seite übertragen.
 * - Wochen ohne Notizen erhalten ein leeres weekNotes-Array.
 *
 * Fehlerfälle:
 * - weekNotes der falschen Woche werden zugeordnet.
 *
 * Ziel:
 * Absicherung, dass weekNotes korrekt von der API-Response in die List-Seite übertragen werden.
 * (Detailtests in tour-print-preview.model.test.ts)
 */
import { describe, expect, it } from "vitest";
import {
  buildTourPrintPages,
  type TourPrintPreviewResponse,
} from "../../../client/src/lib/tour-print-preview";

const weekNote = {
  id: 42,
  sourceType: "appointment" as const,
  title: "Wochen-Hinweis",
  body: "<p>Wichtig</p>",
  cardColor: "#ff9900",
  updatedAt: "2026-03-25T10:00:00.000Z",
};

const fixture: TourPrintPreviewResponse = {
  fromDate: "2026-03-23",
  toDate: "2026-04-05",
  weeks: [
    { weekStart: "2026-03-23", weekEnd: "2026-03-29", weekNotes: [weekNote] },
    { weekStart: "2026-03-30", weekEnd: "2026-04-05", weekNotes: [] },
  ],
  tour: { id: 1, name: "Tour 1", color: "#123456" },
  members: [],
  appointments: [],
};

describe("tour-print-preview: weekNotes in List-Seite", () => {
  it("überträgt weekNotes der ersten Woche korrekt in die List-Seite", () => {
    const [page] = buildTourPrintPages(fixture);
    expect(page.kind).toBe("list");
    expect(page.weeks[0].weekNotes).toHaveLength(1);
    expect(page.weeks[0].weekNotes[0].id).toBe(42);
  });

  it("gibt leeres weekNotes-Array für Wochen ohne Notizen zurück", () => {
    const [page] = buildTourPrintPages(fixture);
    expect(page.weeks[1].weekNotes).toEqual([]);
  });
});
