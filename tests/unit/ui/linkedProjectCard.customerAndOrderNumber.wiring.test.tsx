/**
 * Test Scope:
 *
 * Feature: FT02 - Projektdarstellung im Kundenformular
 * Use Case: UC Verknuepfte Projekte zeigen Kundennummer und Auftragsnummer
 *
 * Abgedeckte Regeln:
 * - LinkedProjectCard rendert den Projektnamen direkt und erhaelt Kundennummer als explizite Prop.
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

  it("uses explicit customer number prop and renders project title directly", () => {
    expect(source).toContain("customerNumber: string | null;");
    expect(source).toContain("const customerNumberLabel = customerNumber?.trim() || \"-\";");
    expect(source).toContain("{project.name}");
    expect(source).not.toContain("parseProjectStoredName(");
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
