/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der FT04-Kaskadendialog verwendet die fachlich geschärften Titel und Untertitel für Hinzufügen und Abziehen.
 * - Die Preview-Zeilen zeigen Datum im Format dd.mm.yy sowie Auftragsnummer und Projektname in einer Zeile.
 * - Kundenkontext erscheint nur, wenn ein Kunde verfuegbar ist.
 *
 * Fehlerfälle:
 * - Der Dialog bleibt bei generischer Kaskaden-Sprache oder ASCII-Ersatztexten.
 * - Die Preview zeigt weiterhin missverstaendliche Mitarbeiterinfos oder verliert die Projektzeile.
 *
 * Ziel:
 * Die sichtbare FT04-Dialogverdrahtung für die selektive Tour-Mitarbeiter-Kaskade regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT04 UI: TourEmployeeCascadeDialog wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/TourEmployeeCascadeDialog.tsx");
  const source = readFileSync(filePath, "utf8");

  it("uses the sharpened add and remove dialog copy", () => {
    expect(source).toContain('const title = mode === "add" ? "Mitarbeiter zu Tour-Terminen hinzufügen" : "Mitarbeiter von Tour-Terminen abziehen";');
    expect(source).toContain("Wählen Sie die zukünftigen Termine aus, für die");
    expect(source).toContain("Wählen Sie die zukünftigen Termine aus, von denen");
    expect(source).toContain('"Bestätigen"');
  });

  it("formats preview rows with short dates, project line and optional customer context", () => {
    expect(source).toContain("function formatShortDate(dateValue: string): string");
    expect(source).toContain("return `${day}.${month}.${year.slice(-2)}`;");
    expect(source).toContain("function formatCustomerLabel(item: PreviewItem): string");
    expect(source).toContain("if (!item.customerNumber) return null;");
    expect(source).toContain("function formatProjectLabel(item: PreviewItem): string | null");
    expect(source).toContain("if (orderNumber && projectName) return `${orderNumber} - ${projectName}`;");
    expect(source).not.toContain("Mitarbeiter:");
  });
});
