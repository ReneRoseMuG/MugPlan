/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekt- und Kundenformular verdrahten ihre Sidebar-Terminpanels explizit als readonly.
 * - Das gemeinsame Sidebar-Terminpanel reicht readonly bis zum Termin-Badge durch.
 * - Termin-Badges unterdruecken im readonly-Modus einen eventuell mitgegebenen Doppelklick-Handler.
 *
 * Fehlerfaelle:
 * - Projekt- oder Kunden-Sidebar bleiben implizit interaktiv.
 * - Ein spaeter hinzugefuegter Doppelklick-Handler bleibt trotz readonly aktiv.
 *
 * Ziel:
 * Die readonly-Termindarstellung in Projekt- und Kunden-Sidebars regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT02/FT05+ UI: entity appointment sidebar readonly wiring", () => {
  const allAppointmentsPanelSource = readFileSync(path.resolve(process.cwd(), "client/src/components/AllAppointmentsPanel.tsx"), "utf8");
  const terminInfoBadgeSource = readFileSync(path.resolve(process.cwd(), "client/src/components/ui/termin-info-badge.tsx"), "utf8");
  const projectPanelSource = readFileSync(path.resolve(process.cwd(), "client/src/components/ProjectAppointmentsPanel.tsx"), "utf8");
  const customerPanelSource = readFileSync(path.resolve(process.cwd(), "client/src/components/CustomerAppointmentsPanel.tsx"), "utf8");

  it("marks project and customer appointment sidebars as readonly", () => {
    expect(projectPanelSource).toContain("readOnly");
    expect(customerPanelSource).toContain("readOnly");
  });

  it("threads readonly through the shared sidebar panel into appointment badges", () => {
    expect(allAppointmentsPanelSource).toContain("readOnly?: boolean;");
    expect(allAppointmentsPanelSource).toContain("readOnly = false");
    expect(allAppointmentsPanelSource).toContain("readOnly={readOnly}");
  });

  it("disables double click interactions on readonly appointment badges", () => {
    expect(terminInfoBadgeSource).toContain("readOnly?: boolean;");
    expect(terminInfoBadgeSource).toContain("readOnly = false");
    expect(terminInfoBadgeSource).toContain("onDoubleClick={readOnly ? undefined : onDoubleClick}");
  });
});
