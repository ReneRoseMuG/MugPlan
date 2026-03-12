/**
 * Test Scope:
 *
 * Feature: FT15/FT16 - Projektstatus in Projekt-Sidebar
 *
 * Abgedeckte Regeln:
 * - ProjectStatusPanel reicht einen panel-spezifischen helpKey an SidebarChildPanel.
 * - Bei Query-Fehlern zeigt das Panel einen expliziten Fehlertext statt still leer zu bleiben.
 *
 * Fehlerfaelle:
 * - Fehler im Status-Load laufen still in einen leeren Picker.
 *
 * Ziel:
 * Den sichtbaren Fehlerpfad des Projektstatus-Panels regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT15/FT16 project status panel help key wiring", () => {
  it("keeps the panel help key and renders the load error message path", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "client/src/components/ProjectStatusPanel.tsx"),
      "utf8",
    );

    expect(source).toContain('helpKey="projects.sidebar.status"');
    expect(source).toContain("loadErrorMessage?: string | null;");
    expect(source).toContain('data-testid="text-project-status-load-error"');
    expect(source).toContain('Projektstatus konnten nicht geladen werden');
  });
});
