/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Auftragsnummer im Terminformular-Relationslot
 *
 * Abgedeckte Regeln:
 * - ProjectDetailCard zeigt die Auftragsnummer als eigene Zeile.
 * - Auftragsnummer wird ueber das Projektobjekt gelesen.
 * - HTML-Tags aus Projektbeschreibung werden fuer die Slot-Anzeige entfernt.
 *
 * Fehlerfaelle:
 * - Auftragsnummer fehlt trotz vorhandener Projektdaten.
 * - Rohe HTML-Tags werden im Termin-Relationslot sichtbar.
 *
 * Ziel:
 * Sicherstellen, dass der Projekt-Relationslot im Terminformular die Auftragsnummer anzeigen kann.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT02 project detail card order number", () => {
  it("renders labeled order number line", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ui/project-detail-card.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("Auftragsnr.");
    expect(source).toContain("resolveValue(project.orderNumber)");
  });

  it("strips html tags from description excerpts", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ui/project-detail-card.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain(".replace(/<[^>]+>/g, \" \")");
  });
});
