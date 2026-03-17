/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - MonitoringPage speichert den Schalter "alle Termine" sofort gegen die Admin-Konfiguration statt nur lokal.
 * - Die Anzeige nutzt fuer Formfelder weiterhin Query-Cache plus lokalen Draft und blendet den Horizont bei Bedarf aus.
 *
 * Fehlerfaelle:
 * - "Alle Termine" springt nach View-Wechsel auf den alten Serverwert zurueck, weil das Toggle nicht persistiert wird.
 * - Vorlaufhorizont bleibt sichtbar, obwohl "alle Termine" den Zeitraum ueberschreibt.
 *
 * Ziel:
 * Die FT31-Admin-Verdrahtung fuer sofort persistierten "alle Termine"-Toggle und stabile Konfigurationsdarstellung absichern.
 */

import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT31 unit: monitoring page config draft wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/MonitoringPage.tsx"), "utf8");

  it("derives visible values from query-backed config or local draft instead of mount defaults", () => {
    expect(source).toContain("const [draftConfig, setDraftConfig] = useState<MonitoringConfigDraft | null>(null);");
    expect(source).toContain("const resolvedConfig = draftConfig ?? (configQuery.data");
    expect(source).toContain("const allAppointments = resolvedConfig.allAppointments;");
    expect(source).toContain("const horizonDays = resolvedConfig.horizonDays;");
    expect(source).toContain("const minimumEmployees = resolvedConfig.minimumEmployees;");
  });

  it("persists the all-appointments switch immediately and labels it accordingly", () => {
    expect(source).toContain("const handleToggleAllAppointments = async (checked: boolean) => {");
    expect(source).toContain("showSuccessToast: false,");
    expect(source).toContain("void handleToggleAllAppointments(checked);");
    expect(source).toContain("data-testid=\"switch-monitoring-all-appointments\"");
    expect(source).toContain(">alle Termine</span>");
  });

  it("resets the draft after successful saves, keeps input changes in the draft and hides the horizon while all-appointments is active", () => {
    expect(source).toContain("setDraftConfig(null);");
    expect(source).toContain("horizonDays: event.target.value,");
    expect(source).toContain("minimumEmployees: event.target.value,");
    expect(source).toContain("{!allAppointments ? (");
  });
});
