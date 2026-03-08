/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Auftragsnummer im Terminformular-Relationslot
 *
 * Abgedeckte Regeln:
 * - ProjectDetailCard zeigt im Termin-Relationslot eine 4-Felder-Kopfzeile (Kunde Nr., Projektname, Auftragsnummer, Betrag).
 * - Kundennummer wird direkt aus Prop gelesen (kein Parsing-Fallback).
 * - Projektbeschreibung wird ohne eigenes Label gerendert und Projektstatus sitzt als Badge-Footer im Slot.
 *
 * Fehlerfaelle:
 * - Kopfzeile zeigt Felder nicht getrennt.
 * - Projektnamen-Parsing beeinflusst Kundennummerdarstellung.
 * - Projektstatus bleibt als Textzeile statt im Footer-Badgebereich.
 *
 * Ziel:
 * Sicherstellen, dass der Projekt-Relationslot im Terminformular strukturierte Kopfdaten, unlabeled Beschreibung und Footer-Statusbadges anzeigt.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT02 project detail card order number", () => {
  it("renders split top row fields for customer, project name, order number and amount", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ui/project-detail-card.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("Kunde Nr.");
    expect(source).toContain("Projektname");
    expect(source).toContain("Auftragsnummer");
    expect(source).toContain("Betrag");
    expect(source).toContain("md:grid-cols-[118px,minmax(200px,1fr),118px,150px]");
    expect(source).toContain("const amountValue = formatProjectAmount(project.amount);");
  });

  it("renders description as full html and project statuses as footer badges", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ui/project-detail-card.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("const customerNumberValue = resolveValue(customerNumber);");
    expect(source).toContain("const projectNameValue = resolveValue(project.name);");
    expect(source).toContain('return new Intl.NumberFormat("de-DE", {');
    expect(source).not.toContain("parseProjectStoredName(");
    expect(source).toContain("dangerouslySetInnerHTML");
    expect(source).toContain("projectStatuses.map((status) => (");
    expect(source).toContain("<ProjectStatusInfoBadge");
    expect(source).not.toContain("Projekt Status");
    expect(source).not.toContain("Beschreibung");
  });
});
