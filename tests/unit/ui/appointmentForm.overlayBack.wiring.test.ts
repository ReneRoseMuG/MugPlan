/**
 * Test Scope:
 *
 * Feature: FT01/FT04 - Terminformular als Listen-Overlay
 *
 * Abgedeckte Regeln:
 * - AppointmentForm unterstuetzt einen expliziten Zurueck-Button fuer Overlay-Kontexte.
 * - Der Zurueck-Pfad nutzt dieselbe bestehende Close-/Dirty-State-Logik wie das normale Schliessen.
 * - EntityFormLayout kann optional eine linke Header-Aktion fuer Form-Navigation rendern.
 *
 * Fehlerfaelle:
 * - Overlay-Kontexte haben keinen sichtbaren Zurueck-Button im Formular-Header.
 * - Zurueck und Schliessen laufen ueber unterschiedliche Close-Pfade.
 *
 * Ziel:
 * Header-Navigation und gemeinsame Close-Logik fuer das neue Terminformular-Overlay regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01/FT04 UI: appointment form overlay back wiring", () => {
  const appointmentFormSource = readFileSync(path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx"), "utf8");
  const layoutSource = readFileSync(path.resolve(process.cwd(), "client/src/components/ui/entity-form-layout.tsx"), "utf8");

  it("adds explicit overlay navigation props and shared close action to AppointmentForm", () => {
    expect(appointmentFormSource).toContain("onBack?: () => void;");
    expect(appointmentFormSource).toContain("showBackButton?: boolean;");
    expect(appointmentFormSource).toContain("showBackButton = false");
    expect(appointmentFormSource).toContain("const closeAction = onBack ?? onCancel;");
    expect(appointmentFormSource).toContain("closeAction?.();");
  });

  it("renders a visible back button in the entity form header for overlay mode", () => {
    expect(appointmentFormSource).toContain("headerStartAction={showBackButton ? (");
    expect(appointmentFormSource).toContain("data-testid=\"button-back-appointment\"");
    expect(appointmentFormSource).toContain("Zurueck");
    expect(appointmentFormSource).toContain("<ArrowLeft className=\"h-4 w-4\" />");
  });

  it("extends EntityFormLayout with an optional left header action slot", () => {
    expect(layoutSource).toContain("headerStartAction?: ReactNode;");
    expect(layoutSource).toContain("headerStartAction,");
    expect(layoutSource).toContain("{headerStartAction}");
  });
});
