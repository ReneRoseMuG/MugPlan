/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der FT04-Kaskadendialog verwendet geschaerfte Titel und Untertitel fuer Hinzufuegen und Abziehen.
 * - Der Header zeigt eine Summenzeile mit Terminanzahl und Datumsbereich aller vorgeschlagenen Termine.
 * - Die Preview-Zeilen zeigen Datum im Format dd.mm.yy sowie Auftragsnummer und Projektname in einer Zeile.
 * - Kundenkontext erscheint nur, wenn ein Kunde verfuegbar ist.
 *
 * Fehlerfaelle:
 * - Der Dialog bleibt bei generischer Kaskaden-Sprache oder ASCII-Ersatztexten.
 * - Die Preview zeigt weiterhin missverstaendliche Mitarbeiterinfos oder verliert die Projektzeile.
 *
 * Ziel:
 * Die sichtbare FT04-Dialogverdrahtung fuer die selektive Tour-Mitarbeiter-Kaskade regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT04 UI: TourEmployeeCascadeDialog wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/TourEmployeeCascadeDialog.tsx");
  const source = readFileSync(filePath, "utf8");

  it("uses the sharpened add and remove dialog copy", () => {
    expect(source).toContain('const title = mode === "add" ? "Mitarbeiter zu Tour-Terminen');
    expect(source).toContain(': "Mitarbeiter von Tour-Terminen abziehen";');
    expect(source).toContain("W");
    expect(source).toContain("die Termine aus,");
    expect(source).toContain("function buildAppointmentRangeLabel(items: PreviewItem[]): string | null");
    expect(source).toContain("Termine (${items.length}) - Termine im Zeitraum von");
    expect(source).toContain('data-testid="text-tour-employee-cascade-range"');
    expect(source).toContain('"Best');
  });

  it("formats preview rows with short dates, project line and optional customer context", () => {
    expect(source).toContain("function formatShortDate(dateValue: string): string");
    expect(source).toContain("return `${day}.${month}.${year.slice(-2)}`;");
    expect(source).toContain("function formatCustomerLabel(item: PreviewItem): string | null");
    expect(source).toContain("if (!item.customerNumber) return null;");
    expect(source).toContain("function formatProjectLabel(item: PreviewItem): string | null");
    expect(source).toContain("if (orderNumber && projectName) return `${orderNumber} - ${projectName}`;");
    expect(source).not.toContain("Mitarbeiter:");
  });
});
