/**
 * Test Scope:
 *
 * Feature: FT29 - Kontextuelle Terminanlage mit Feldsperren
 * Use Case: UC ReadOnly-Project/Customer im AppointmentForm
 *
 * Abgedeckte Regeln:
 * - AppointmentForm akzeptiert `readOnlyFields`.
 * - Projekt-Slot wird durch `isProjectReadOnly` auf readonly geschaltet.
 * - Add/Remove Aktionen des Projekt-Slots werden bei readonly deaktiviert.
 *
 * Fehlerfaelle:
 * - Projektwechsel bleibt trotz Kontextsperre interaktiv.
 * - ReadOnly-Prop ist ohne Wirkung auf Slot-Verdrahtung.
 *
 * Ziel:
 * Kontextsperre fuer Projektzuordnung im Terminformular regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT29 appointment form readonly fields wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx"), "utf8");

  it("adds readOnlyFields prop to appointment form interface", () => {
    expect(source).toContain("readOnlyFields?: Array<\"project\" | \"customer\">;");
  });

  it("derives project readonly state from lock and readOnlyFields", () => {
    expect(source).toContain("const isProjectReadOnly = isLocked || readOnlyFields?.includes(\"project\") === true;");
    expect(source).toContain("state={isProjectReadOnly ? \"readonly\" : selectedProject ? \"active\" : \"empty\"}");
  });

  it("disables project picker and remove actions when project is readonly", () => {
    expect(source).toContain("onAdd={isProjectReadOnly ? undefined : () => setProjectPickerOpen(true)}");
    expect(source).toContain("onRemove={isProjectReadOnly ? undefined : () => setSelectedProjectId(null)}");
  });
});
