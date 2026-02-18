/**
 * Test Scope:
 *
 * Feature: FT20 - Dokumentextraktion
 * Use Case: UC Fallback bei unvollstaendiger KI-Struktur
 *
 * Abgedeckte Regeln:
 * - Preisangaben werden aus dem Produkttext-Fallback entfernt.
 * - Fallback laesst optionale Kundenfelder null statt Platzhalterwerten.
 *
 * Fehlerfaelle:
 * - KI-Ausgabe ist unvollstaendig oder ungueltig.
 * - Dokument enthaelt nur preishaftige/rauschende Zeilen.
 *
 * Ziel:
 * Sicherstellen, dass bei KI-Qualitaetsproblemen weiterhin ein nutzbares Extraktionsergebnis bereitsteht.
 */
import { describe, expect, it } from "vitest";
import { buildFallbackExtraction, sanitizeProductTextBlock } from "../../../server/services/extractionFallback";

describe("FT20 unit: extraction fallback", () => {
  it("removes common EUR/price patterns from text block", () => {
    const input = [
      "Artikel 1 Sauna Ofen",
      "Preis: 1.299,00 EUR",
      "2x Holzbank 499,99 €",
      "Gesamt 1.798,99 EUR",
    ].join("\n");

    const sanitized = sanitizeProductTextBlock(input);

    expect(sanitized).toContain("Artikel 1 Sauna Ofen");
    expect(sanitized).toContain("2x Holzbank");
    expect(sanitized).not.toMatch(/EUR|€|1\.299,00|499,99|1\.798,99/);
  });

  it("builds resilient fallback extraction with non-empty essentials", () => {
    const fallback = buildFallbackExtraction({
      sourceText: "Modell: Fasssauna Deluxe\nArtikelposition: 2x Holzbank\nKundennummer 163214",
      reason: "validation_error",
    });

    expect(fallback.saunaModel.length).toBeGreaterThan(0);
    expect(fallback.articleItems.length).toBeGreaterThan(0);
    expect(fallback.articleItems[0].description.length).toBeGreaterThan(0);
    expect(fallback.articleListHtml.length).toBeGreaterThan(0);
    expect(fallback.customer.customerNumber.length).toBeGreaterThan(0);
    expect(fallback.customer.firstName).toBeNull();
    expect(fallback.customer.lastName).toBeNull();
    expect(fallback.customer.phone).toBeNull();
    expect(fallback.warnings.length).toBeGreaterThan(0);
  });
});
