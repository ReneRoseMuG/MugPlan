/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - weekNotes werden aus den Wochendaten in die Wochenseiten übernommen.
 * - Wochen ohne Notizen erhalten ein leeres weekNotes-Array.
 * - weekNotes sind im TourPrintPreviewPage-Modell korrekt zugänglich.
 *
 * Fehlerfälle:
 * - weekNotes fehlen in den generierten Wochenseiten.
 * - weekNotes der falschen Woche werden zugeordnet.
 *
 * Ziel:
 * Absicherung, dass weekNotes korrekt von der API-Response in die Druckseiten übertragen werden.
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

describe("tour-print-preview: weekNotes in Wochenseiten", () => {
  it("überträgt weekNotes der ersten Woche korrekt in die erste Wochenseite", () => {
    const pages = buildTourPrintPages(fixture);
    const week1 = pages.find((p) => p.kind === "week" && p.weekIndex === 0);
    expect(week1).toBeDefined();
    if (week1?.kind !== "week") throw new Error("wrong kind");
    expect(week1.weekNotes).toHaveLength(1);
    expect(week1.weekNotes[0].id).toBe(42);
    expect(week1.weekNotes[0].title).toBe("Wochen-Hinweis");
  });

  it("gibt leeres weekNotes-Array für Wochen ohne Notizen zurück", () => {
    const pages = buildTourPrintPages(fixture);
    const week2 = pages.find((p) => p.kind === "week" && p.weekIndex === 1);
    expect(week2).toBeDefined();
    if (week2?.kind !== "week") throw new Error("wrong kind");
    expect(week2.weekNotes).toEqual([]);
  });
});
