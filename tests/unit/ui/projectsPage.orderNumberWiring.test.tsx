/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Auftragsnummer in Projektliste
 *
 * Abgedeckte Regeln:
 * - ProjectsPage verdrahtet den Auftragsnummer-Filter in das Projektfilterpanel.
 * - Auftragsnummer wird in Tabellen- und Board-Ansicht angezeigt.
 *
 * Fehlerfaelle:
 * - Filter ist vorhanden, aber nicht mit State verbunden.
 * - Auftragsnummer erscheint nur in einer der beiden Ansichten.
 *
 * Ziel:
 * Sicherstellen, dass die Projektliste den neuen Auftragsnummer-Use-Case vollstaendig abdeckt.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT02 projects page order number wiring", () => {
  it("wires order number filter handlers", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectsPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("orderNumber={filters.orderNumber}");
    expect(source).toContain("onOrderNumberChange={(value) => setFilter(\"orderNumber\", value)}");
    expect(source).toContain("onOrderNumberClear={() => setFilter(\"orderNumber\", \"\")}");
  });

  it("renders order number in table and board views", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectsPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("header: \"Auftragsnummer\"");
    expect(source).toContain("<span className=\"font-semibold\">Auftrag:</span>");
    expect(source).toContain("project.orderNumber?.trim() || \"-\"");
  });
});
