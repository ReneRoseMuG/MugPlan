/**
 * Test Scope:
 *
 * Feature: FT01/FT04 - Terminformular als Listen-Overlay
 *
 * Abgedeckte Regeln:
 * - Home fuehrt einen dedizierten Overlay-State fuer Listen-Oeffnungen des Terminformulars.
 * - Standalone-, Mitarbeiter- und Tour-Terminlisten oeffnen das Formular als Overlay statt als Vollansicht.
 * - Das Overlay wird als fullscreen Ebene im aktuellen View gerendert und ueber Zurueck/Save geschlossen.
 *
 * Fehlerfaelle:
 * - Listen-Doppelklick wechselt weiterhin in die Vollansicht `appointment`.
 * - Overlay-Ebene oder ihr Close-Pfad fehlen fuer einzelne Listenkontexte.
 *
 * Ziel:
 * Den neuen Listen-Overlay-Flow fuer das Terminformular in Home regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01/FT04 UI: home appointment overlay wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

  it("defines a dedicated overlay state with origin-aware typing", () => {
    expect(source).toContain("type AppointmentOverlayOrigin = \"appointmentsList\" | \"employeeAppointments\" | \"tourAppointments\";");
    expect(source).toContain("type AppointmentOverlayState = AppointmentContextState & {");
    expect(source).toContain("const [appointmentOverlayContext, setAppointmentOverlayContext] = useState<AppointmentOverlayState | null>(null);");
  });

  it("opens the overlay from standalone, employee and tour appointment lists", () => {
    expect(source).toContain("origin: \"appointmentsList\"");
    expect(source).toContain("origin: \"employeeAppointments\"");
    expect(source).toContain("origin: \"tourAppointments\"");
    expect(source).toMatch(/view === "appointmentsList"[\s\S]*setAppointmentOverlayContext\(/);
  });

  it("renders the appointment form as fullscreen overlay with back button and close handlers", () => {
    expect(source).toContain("data-testid=\"appointment-form-overlay\"");
    expect(source).toContain("showBackButton");
    expect(source).toContain("onBack={() => {");
    expect(source).toContain("onSaved={() => {");
    expect(source).toContain("setAppointmentOverlayContext(null);");
  });
});
