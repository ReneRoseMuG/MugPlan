/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Darstellungsmodus
 * Use Case: UC FT03 - Globale Wochenmodus-Auswahl beim Mitarbeiterfilter
 *
 * Abgedeckte Regeln:
 * - Der Kalenderfilter rendert die Wochenmodus-Auswahl nur fuer die Wochenansicht.
 * - Die Auswahl liest und schreibt das USER-Setting calendar.weekAppointmentDisplayMode.
 * - Die Drucksteuerung fuer die Wochenplanung sitzt als kompakter Block rechts im selben Footer.
 * - Leser erhalten keinen interaktiven Schreibpfad.
 *
 * Fehlerfaelle:
 * - Wochenmodus-Auswahl fehlt im Filterbereich der Wochenansicht.
 * - Die Wochenplanungs-Drucksteuerung faellt in ein separates Panel zurueck.
 * - Mojibake verfaelscht die Labels oder Optionswerte.
 * - Persistenz erfolgt weiter ueber terminbezogene Display-Mode-Pfade.
 *
 * Ziel:
 * Verdrahtung des globalen Wochenmodus und der kompakten Druckgruppe regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: calendar filter panel week display mode wiring", () => {
  const workspaceSource = readFileSync(path.resolve(process.cwd(), "client/src/components/CalendarWorkspace.tsx"), "utf8");
  const filterSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/ui/filter-panels/calendar-filter-panel.tsx"),
    "utf8",
  );
  const weekPanelSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanel.tsx"),
    "utf8",
  );
  const weekViewSource = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekView.tsx"), "utf8");

  it("wires week-only filter panel rendering from the workspace", () => {
    expect(workspaceSource).toContain('showWeekDisplayMode={activeView === "week"}');
  });

  it("reads and persists the week display mode as USER setting without mojibake", () => {
    expect(filterSource).toContain('useSetting("calendar.weekAppointmentDisplayMode")');
    expect(filterSource).toContain('key: "calendar.weekAppointmentDisplayMode"');
    expect(filterSource).toContain('scopeType: "USER"');
    expect(filterSource).toContain('data-testid="select-week-appointment-display-mode"');
    expect(filterSource).toContain('<Label className="text-xs">Darstellungsmodus</Label>');
    expect(filterSource).toContain('<SelectValue placeholder="Darstellungsmodus wählen" />');
    expect(filterSource).toContain('<SelectItem value="compact">Zentriert</SelectItem>');
    expect(filterSource).toContain('<SelectItem value="detail">Gefüllt</SelectItem>');
    expect(filterSource).toContain('<SelectItem value="split">Geteilt</SelectItem>');
    expect(filterSource).not.toContain("Darstellungsmodus wÃ");
    expect(filterSource).not.toContain("GefÃ");
  });

  it("renders a compact right-aligned week print control group", () => {
    expect(filterSource).toContain('layout="stack"');
    expect(filterSource).toContain('className="grid gap-4 lg:grid-cols-2"');
    expect(filterSource).toContain('className="grid min-w-0 gap-4 sm:grid-cols-2"');
    expect(filterSource).toContain('className="flex min-w-0 flex-col gap-1 lg:justify-self-end"');
    expect(filterSource).toContain('className="flex items-end gap-3"');
    expect(filterSource).toContain('<Label className="text-xs">Wochenplanung drucken</Label>');
    expect(filterSource).toContain('data-testid="select-tour-print-preview"');
    expect(filterSource).toContain('className="w-[10ch] bg-white"');
    expect(filterSource).toContain('data-testid="input-tour-print-week-count"');
    expect(filterSource).toContain('data-testid="button-open-tour-print-preview"');
  });

  it("keeps readers out of an interactive write path", () => {
    expect(filterSource).toContain('const canEditWeekDisplayMode = userRole === "ADMIN" || userRole === "DISPATCHER";');
    expect(filterSource).toContain("disabled={!canEditWeekDisplayMode}");
  });

  it("removes the per-appointment week display mode button and mutation path", () => {
    expect(weekPanelSource).not.toContain("button-week-display-mode-");
    expect(weekViewSource).not.toContain("/display-mode");
    expect(weekViewSource).not.toContain("displayModeCycle");
  });
});
