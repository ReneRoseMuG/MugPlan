/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Auftragsnummer in der Projekt-Detailkarte
 *
 * Abgedeckte Regeln:
 * - ProjectDetailCard zeigt die aktuelle 3-Felder-Kopfzeile (Projektname, Auftragsnummer, Betrag).
 * - Projektbeschreibung wird ohne eigenes Label gerendert.
 * - Projektstatus sitzt als Badge-Footer in der Karte.
 *
 * Fehlerfaelle:
 * - Kopfzeile zeigt die aktuellen Felder nicht getrennt.
 * - Projektstatus bleibt als Textzeile statt im Footer-Badgebereich.
 *
 * Ziel:
 * Sicherstellen, dass die Projekt-Detailkarte die aktuelle Kopfstruktur, unlabeled Beschreibung und Footer-Statusbadges anzeigt.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT02 project detail card order number", () => {
  it("renders split top row fields for project name, order number and amount", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ui/project-detail-card.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("Projektname");
    expect(source).toContain("Auftragsnummer");
    expect(source).toContain("Betrag");
    expect(source).toContain("md:grid-cols-[minmax(200px,1fr),118px,150px]");
    expect(source).toContain("const amountValue = formatProjectAmount(project.amount);");
  });

  it("renders description as full html and project statuses as footer badges", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ui/project-detail-card.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("const projectNameValue = resolveValue(project.name);");
    expect(source).toContain("const orderNumberValue = resolveValue(project.orderNumber);");
    expect(source).toContain('return new Intl.NumberFormat("de-DE", {');
    expect(source).toContain("dangerouslySetInnerHTML");
    expect(source).toContain("projectStatuses.map((status) => (");
    expect(source).toContain("<ProjectStatusInfoBadge");
    expect(source).not.toContain("Projekt Status");
    expect(source).not.toContain("Beschreibung");
  });
});
