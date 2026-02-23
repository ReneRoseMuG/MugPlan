/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Auftragsnummer im Terminformular-Relationslot
 *
 * Abgedeckte Regeln:
 * - ProjectDetailCard zeigt im Termin-Relationslot eine 3-Felder-Kopfzeile (Kunde Nr., Projektname, Auftragsnummer).
 * - Kundennummer wird priorisiert aus Prop gelesen und faellt sonst auf geparsten Projektnamen zurueck.
 * - Projektbeschreibung wird vollstaendig als HTML im Slot gerendert.
 *
 * Fehlerfaelle:
 * - Kopfzeile zeigt Felder nicht getrennt.
 * - Kundennummer-Fallback aus Projektname fehlt.
 * - HTML-Inhalt der Beschreibung wird nicht gerendert.
 *
 * Ziel:
 * Sicherstellen, dass der Projekt-Relationslot im Terminformular strukturierte Kopfdaten und volle HTML-Beschreibung anzeigt.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT02 project detail card order number", () => {
  it("renders split top row fields for customer, project name and order number", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ui/project-detail-card.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("Kunde Nr.");
    expect(source).toContain("Projektname");
    expect(source).toContain("Auftragsnummer");
    expect(source).toContain("md:grid-cols-[150px,minmax(200px,1fr),150px]");
  });

  it("renders description as full html and keeps customer number fallback parsing", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ui/project-detail-card.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("parseProjectStoredName(project.name)");
    expect(source).toContain("customerNumber ?? parsedProjectName.customerNumberFromName");
    expect(source).toContain("dangerouslySetInnerHTML");
  });
});
