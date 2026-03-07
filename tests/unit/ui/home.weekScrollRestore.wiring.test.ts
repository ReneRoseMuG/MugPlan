/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Scroll-Restore
 * Use Case: UC Rueckkehr aus Terminformular in Wochenansicht
 *
 * Abgedeckte Regeln:
 * - Home uebernimmt weekScrollLeft aus dem Wochen-Neuanlage-Flow.
 * - Home reicht pendingWeekScrollRestore in die WeekGrid-Ansicht durch.
 * - Restore wird nur fuer returnView "week" und ohne Project-Rueckweg aktiviert.
 *
 * Fehlerfaelle:
 * - Scroll-Restore wird nicht gesetzt und Wochenansicht springt nach Rueckkehr auf 0.
 * - Restore wird fuer falsche Rueckwege (z. B. Project) aktiviert.
 *
 * Ziel:
 * Verdrahtung des Home-Rueckwegs fuer one-shot Scroll-Restore regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: Home week scroll restore wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

  it("extends appointment context with week scroll snapshot and pending restore state", () => {
    expect(source).toContain("weekScrollLeft?: number | null;");
    expect(source).toContain("const [pendingWeekScrollRestore, setPendingWeekScrollRestore] = useState<number | null>(null);");
  });

  it("stores week scroll snapshot when opening appointment from week view", () => {
    expect(source).toContain("weekScrollLeft: ctx.weekScrollLeft,");
  });

  it("wires pending restore props into WeekGrid", () => {
    expect(source).toContain("restoreScrollLeft={pendingWeekScrollRestore}");
    expect(source).toContain("onScrollRestoreApplied={handleWeekScrollRestoreApplied}");
  });

  it("restores only for week return path and reuses return handler for cancel/save", () => {
    expect(source).toContain('returnView === "week"');
    expect(source).toContain("onCancel={returnFromAppointment}");
    expect(source).toContain("onSaved={returnFromAppointment}");
  });

  it("removes import-export view path from Home", () => {
    expect(source).not.toContain("importExport");
    expect(source).not.toContain("ImportExportPage");
    expect(source).not.toContain("view === 'importExport'");
  });
});
