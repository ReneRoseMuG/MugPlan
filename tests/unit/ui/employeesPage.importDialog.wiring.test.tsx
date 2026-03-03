/**
 * Test Scope:
 *
 * Feature: FT23 - Mitarbeiter CSV-Import
 * Use Case: UC23 - Mitarbeiter-Import aus Mitarbeiterliste per Dialog
 *
 * Abgedeckte Regeln:
 * - EmployeesPage rendert einen Admin-Import-Button und verwendet EmployeeImportPanel im Dialog.
 * - Dialog-Open/Close verdrahtet einen expliziten Reset-Mechanismus fuer temporaere Importzustande.
 * - Erfolgsfall schliesst den Dialog nicht implizit.
 *
 * Fehlerfaelle:
 * - Import-UI bleibt im Listenlayout sichtbar statt im Dialog.
 * - Dialog wird bei Erfolg automatisch geschlossen.
 *
 * Ziel:
 * Verdrahtung der neuen Import-Dialogstruktur in der Mitarbeiterverwaltung regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT23 UI: employees import dialog wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/EmployeesPage.tsx"), "utf8");

  it("wires admin import action and EmployeeImportPanel dialog", () => {
    expect(source).toContain("button-open-employee-import-dialog");
    expect(source).toContain("<Dialog open={isImportDialogOpen} onOpenChange={handleImportDialogOpenChange}>");
    expect(source).toContain("<EmployeeImportPanel resetSignal={importResetSignal} />");
  });

  it("resets import state on dialog open and close", () => {
    expect(source).toContain("const [importResetSignal, setImportResetSignal] = useState(0)");
    expect(source).toContain("setImportResetSignal((current) => current + 1);");
    expect(source).toContain("const handleImportDialogOpenChange = (nextOpen: boolean) => {");
  });

  it("keeps dialog open on success by avoiding close callback wiring", () => {
    expect(source).not.toContain("onImportSuccess");
    expect(source).toContain("<EmployeeImportPanel resetSignal={importResetSignal} />");
  });
});
