/**
 * Test Scope:
 *
 * Feature: FT02 - Projektdarstellung im Kundenformular
 * Use Case: UC Verknuepfte Projekte zeigen Kundennummer und Auftragsnummer
 *
 * Abgedeckte Regeln:
 * - LinkedProjectCard parst den gespeicherten Projektnamen fuer isolierten Titel + Kundennummer.
 * - Kundennummer wird als eigene Zeile gerendert.
 * - Auftragsnummer wird unter der Kundennummer als eigene Zeile gerendert.
 *
 * Fehlerfaelle:
 * - Auftragsnummer fehlt in der Sidebar-Ansicht Verknuepfte Projekte.
 * - Projekttitel zeigt weiterhin den kompletten Prefix statt isoliertem Namen.
 *
 * Ziel:
 * Sicherstellen, dass die Sidebar-Karten im Kundenformular Kundennummer und Auftragsnummer strukturiert anzeigen.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT02 linked project card customer and order number wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/LinkedProjectCard.tsx");
  const source = readFileSync(filePath, "utf8");

  it("parses stored project name and renders isolated project title", () => {
    expect(source).toContain("parseProjectStoredName(project.name)");
    expect(source).toContain("{parsedName.isolatedProjectName || project.name}");
  });

  it("renders customer number and order number on separate lines", () => {
    expect(source).toContain("K: {customerNumberLabel}");
    expect(source).toContain("Auftragsnr.: {orderNumberLabel}");
    expect(source).toContain("text-linked-project-customer-number");
    expect(source).toContain("text-linked-project-order-number");
  });

  it("maps project status relation payload to colored badge fields", () => {
    expect(source).toContain("useQuery<ProjectStatusRelationItem[]>");
    expect(source).toContain("entry.status.title");
    expect(source).toContain("getProjectStatusColor(entry.status)");
  });
});
