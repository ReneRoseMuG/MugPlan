/**
 * Test Scope:
 *
 * Feature: FT04 - Tourenverwaltung
 * Use Case: UC Tour bearbeiten mit Sidebar-Termine-Panel
 *
 * Abgedeckte Regeln:
 * - TourEditDialog bindet das TourAppointmentsPanel in den bestehenden Dialogaufbau ein.
 * - Die Footer-Action fuer die Tabelle ist mit button-open-tour-appointments-view verdrahtet.
 * - Unterhalb ist ein zusaetzlicher (derzeit funktionsloser) Kalender-Button verdrahtet.
 * - TourAppointmentsTableDialog ist ueber lokalen Open-State angeschlossen.
 *
 * Fehlerfaelle:
 * - Sidebar-Panel wird nicht eingebunden.
 * - Erwartete Action-Buttons fehlen im Tour-Panel.
 *
 * Ziel:
 * Die UI-Verdrahtung fuer die wiederverwendete Sidebar-Termine-Struktur im Tour-Dialog regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT04 TourEditDialog appointments sidebar wiring", () => {
  const tourDialogPath = path.resolve(process.cwd(), "client/src/components/ui/tour-edit-dialog.tsx");
  const tourPanelPath = path.resolve(process.cwd(), "client/src/components/TourAppointmentsPanel.tsx");
  const dialogSource = readFileSync(tourDialogPath, "utf8");
  const panelSource = readFileSync(tourPanelPath, "utf8");

  it("wires TourAppointmentsPanel and TourAppointmentsTableDialog in tour edit dialog", () => {
    expect(dialogSource).toContain("import { TourAppointmentsPanel } from \"@/components/TourAppointmentsPanel\";");
    expect(dialogSource).toContain("import { TourAppointmentsTableDialog } from \"@/components/TourAppointmentsTableDialog\";");
    expect(dialogSource).toContain("const [tourAppointmentsTableOpen, setTourAppointmentsTableOpen] = useState(false);");
    expect(dialogSource).toContain("<TourAppointmentsPanel");
    expect(dialogSource).toContain("onOpenTourAppointmentsView={() => setTourAppointmentsTableOpen(true)}");
    expect(dialogSource).toContain("<TourAppointmentsTableDialog");
  });

  it("exposes expected footer actions in tour appointments panel", () => {
    expect(panelSource).toContain("data-testid=\"button-open-tour-appointments-view\"");
    expect(panelSource).toContain("Tabelle anzeigen");
    expect(panelSource).toContain("data-testid=\"button-open-tour-calendar-view\"");
    expect(panelSource).toContain("Kalender anzeigen");
  });
});
