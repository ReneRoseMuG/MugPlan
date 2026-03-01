/**
 * Test Scope:
 *
 * Feature: FT15/FT16 - Projektstatus in Projekt-Sidebar
 * Use Case: UC Statuspanel mit eigenem Hilfe-Trigger
 *
 * Abgedeckte Regeln:
 * - ProjectStatusPanel reicht einen panel-spezifischen helpKey an SidebarChildPanel.
 * - Der Key ist vom Picker-HelpKey getrennt.
 *
 * Fehlerfaelle:
 * - Statuspanel nutzt keinen HelpKey und zeigt kein HelpIcon.
 * - Statuspanel nutzt denselben Key wie ein anderer Kontext.
 *
 * Ziel:
 * Die Help-Icon-Verdrahtung des Projektstatus-Sidebar-Panels regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT15/FT16 project status panel help key wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/ProjectStatusPanel.tsx"),
    "utf8",
  );

  it("sets a dedicated sidebar help key", () => {
    expect(source).toContain("helpKey=\"projects.sidebar.status\"");
  });
});

