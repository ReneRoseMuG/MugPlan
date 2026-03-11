/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der CalendarWorkspace verdrahtet die Wochenplanungs-Drucksteuerung direkt ueber das Filterpanel.
 * - Die Druckvorschau nutzt den internen Dialogpfad mit heutigem Berlin-Startdatum.
 *
 * Fehlerfaelle:
 * - Die Wochenansicht haengt weiter an einem separaten Druckpanel-Pfad.
 * - Wochenanzahl bleibt unnormalisiert oder die Vorschau nutzt kein fixes Heute-Startdatum.
 *
 * Ziel:
 * Die UI-Verdrahtung fuer die inline Drucksteuerung im Wochenkalender regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT31 UI: CalendarWorkspace tour print preview wiring", () => {
  const workspaceSource = readFileSync(path.resolve(process.cwd(), "client/src/components/CalendarWorkspace.tsx"), "utf8");

  it("wires the print controls through the shared filter panel", () => {
    expect(workspaceSource).toContain("<CalendarFilterPanel");
    expect(workspaceSource).toContain('showWeekDisplayMode={activeView === "week"}');
    expect(workspaceSource).toContain("selectedPrintTourId={selectedPrintTourId}");
    expect(workspaceSource).toContain("onSelectedPrintTourIdChange={setSelectedPrintTourId}");
    expect(workspaceSource).toContain("printWeekCount={printWeekCount}");
    expect(workspaceSource).toContain("onOpenPrintPreview={() => setIsPrintPreviewOpen(true)}");
    expect(workspaceSource).not.toContain("CalendarWeekPrintPanel");
  });

  it("normalizes week count and opens the internal preview dialog", () => {
    expect(workspaceSource).toContain("normalizeTourPrintWeekCount(value)");
    expect(workspaceSource).toContain("<CalendarTourPrintPreviewDialog");
    expect(workspaceSource).toContain("fromDate={printFromDate}");
    expect(workspaceSource).toContain("const printFromDate = getBerlinTodayDateString();");
  });
});
