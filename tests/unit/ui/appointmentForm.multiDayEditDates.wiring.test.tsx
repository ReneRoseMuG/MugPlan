/**
 * Test Scope:
 *
 * Feature: FT01 - Terminformular Datumsverdrahtung
 *
 * Abgedeckte Regeln:
 * - Edit-Formulare uebernehmen Start- und Enddatum ausschliesslich aus geladenen Termindetails.
 * - Geladene Datumswerte werden vor dem Binding auf browserkonformes yyyy-MM-dd normalisiert.
 * - Der Enddatum-Sync darf initial leere Edit-States nicht ueber geladene Mehrtages-Enddaten drueberkopieren.
 * - `initialDate` dient nur als Create-Default und nicht als Zwischenwert fuer bestehende Termine.
 *
 * Fehlerfaelle:
 * - Mehrtagestermine zeigen vor Detail-Load kurz ein falsches Enddatum.
 * - Ein initial leerer Edit-State ueberschreibt geladene Mehrtages-Enddaten wieder mit leerem Wert.
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
    expect(source).toContain("const normalizedStartDate = normalizeDateInputValue(appointmentDetail.startDate);");
    expect(source).toContain("const normalizedEndDate = normalizeDateInputValue(appointmentDetail.endDate ?? appointmentDetail.startDate);");
    expect(source).toContain("const hasExplicitEndDate = normalizedEndDate.length > 0 && normalizedEndDate !== normalizedStartDate;");
    expect(source).toContain("setStartDate(normalizedStartDate);");
    expect(source).toContain("setEndDate(normalizedEndDate || normalizedStartDate);");
    expect(source).toContain("setIsEndDateEnabled(hasExplicitEndDate);");
  });

  it("normalizes incoming detail dates for browser date inputs", () => {
    expect(source).toContain("const normalizeDateInputValue = (value: string | null | undefined): string => {");
    expect(source).toContain('const isoMatch = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(trimmed);');
    expect(source).toContain('const localizedMatch = /^(\\d{2})\\.(\\d{2})\\.(\\d{4})$/.exec(trimmed);');
    expect(source).toContain('const year = parsed.getFullYear();');
    expect(source).toContain('const month = String(parsed.getMonth() + 1).padStart(2, "0");');
    expect(source).toContain('const day = String(parsed.getDate()).padStart(2, "0");');
    expect(source).toContain('return `${year}-${month}-${day}`;');
  });

  it("guards the end-date sync against empty initial edit state", () => {
    expect(source).toContain("if (!startDate) return;");
    expect(source).toContain("if (!isEndDateEnabled) {");
    expect(source).toContain("setEndDate(startDate);");
  });
});
