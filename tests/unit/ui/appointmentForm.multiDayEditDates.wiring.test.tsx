/**
 * Test Scope:
 *
 * Feature: FT01 - Terminformular Datumsverdrahtung
 *
 * Abgedeckte Regeln:
 * - Edit-Formulare uebernehmen Start- und Enddatum ausschliesslich aus geladenen Termindetails.
 * - `initialDate` dient nur als Create-Default und nicht als Zwischenwert fuer bestehende Termine.
 *
 * Fehlerfaelle:
 * - Mehrtagestermine zeigen vor Detail-Load kurz ein falsches Enddatum.
 * - Edit-Formulare initialisieren Datumsfelder implizit mit "heute" oder dem Klickdatum.
 *
 * Ziel:
 * Regressionssicher absichern, dass bestehende Mehrtagestermine im Formular keine stillen Datumsdefaults erhalten.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01 UI: AppointmentForm multi-day edit date wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx"), "utf8");

  it("derives a create-only default date and keeps edit mode empty until detail load", () => {
    expect(source).toContain("const isEditing = Boolean(appointmentId);");
    expect(source).toContain("const createDefaultDate = initialDate ?? getBerlinTodayDateString();");
    expect(source).toContain('isEditing ? "" : createDefaultDate');
  });

  it("hydrates edit mode dates exclusively from appointmentDetail", () => {
    expect(source).toContain("setStartDate(appointmentDetail.startDate);");
    expect(source).toContain("setEndDate(appointmentDetail.endDate ?? appointmentDetail.startDate);");
    expect(source).toContain("setIsEndDateEnabled(Boolean(appointmentDetail.endDate));");
  });
});
