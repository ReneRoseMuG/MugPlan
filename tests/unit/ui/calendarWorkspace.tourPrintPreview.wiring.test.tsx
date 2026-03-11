/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der CalendarWorkspace rendert das Druckpanel nur in der Wochenansicht.
 * - Die Druckvorschau nutzt den internen Dialogpfad mit heutigem Berlin-Startdatum.
 *
 * Fehlerfaelle:
 * - Druckpanel erscheint auch in der Monatsansicht.
 * - Wochenanzahl bleibt unnormalisiert oder die Vorschau nutzt kein fixes Heute-Startdatum.
 *
 * Ziel:
 * Die UI-Verdrahtung fuer das neue Tour-Druckpanel im Wochenkalender regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT31 UI: CalendarWorkspace tour print preview wiring", () => {
  const workspaceSource = readFileSync(path.resolve(process.cwd(), "client/src/components/CalendarWorkspace.tsx"), "utf8");

  it("renders the print panel only in week mode", () => {
    expect(workspaceSource).toContain('{activeView === "week" ? (');
    expect(workspaceSource).toContain("<CalendarWeekPrintPanel");
  });

  it("normalizes week count and opens the internal preview dialog", () => {
    expect(workspaceSource).toContain("normalizeTourPrintWeekCount(value)");
    expect(workspaceSource).toContain("<CalendarTourPrintPreviewDialog");
    expect(workspaceSource).toContain("fromDate={printFromDate}");
    expect(workspaceSource).toContain("const printFromDate = getBerlinTodayDateString();");
  });
});
