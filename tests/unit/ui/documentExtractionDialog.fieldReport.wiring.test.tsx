/**
 * Test Scope:
 *
 * Feature: FT21 - Dokumentextraktion Feldreport im Dialog
 * Use Case: UC Sichtbarer Erfolgs-/Fehlerreport vor der Datenuebernahme
 *
 * Abgedeckte Regeln:
 * - Der Dialog zeigt einen Erfolgsblock fuer erkannte Felder.
 * - Der Dialog zeigt einen Fehlerreport fuer fehlende Felder.
 * - Der Report steht zwischen Warnings und den editierbaren Bereichen.
 *
 * Fehlerfaelle:
 * - Report wird gar nicht gerendert.
 * - Reihenfolge im Dialog verschiebt Warnings oder Eingabebereiche ungewollt.
 *
 * Ziel:
 * Sicherstellen, dass der neue Report zentral im bestehenden Dialog verdrahtet ist.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT21 document extraction dialog field report wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/DocumentExtractionDialog.tsx");
  const source = readFileSync(filePath, "utf8");

  it("renders dedicated recognized and missing report sections", () => {
    expect(source).toContain("data-testid=\"document-extraction-report-recognized\"");
    expect(source).toContain("data-testid=\"document-extraction-report-missing\"");
    expect(source).toContain("Erfolgreich erkannt");
    expect(source).toContain("Nicht erkannt");
    expect(source).toContain("data.fieldReport.recognized.length > 0");
    expect(source).toContain("data.fieldReport.missing.length > 0");
  });

  it("keeps report order between warnings and editable sections", () => {
    const warningsIndex = source.indexOf("data.warnings.length > 0");
    const recognizedIndex = source.indexOf("data.fieldReport.recognized.length > 0");
    const missingIndex = source.indexOf("data.fieldReport.missing.length > 0");
    const customerSectionIndex = source.indexOf("showCustomerSection ? (");

    expect(warningsIndex).toBeGreaterThan(-1);
    expect(recognizedIndex).toBeGreaterThan(warningsIndex);
    expect(missingIndex).toBeGreaterThan(recognizedIndex);
    expect(customerSectionIndex).toBeGreaterThan(missingIndex);
  });
});
