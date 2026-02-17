/**
 * Test Scope:
 *
 * Feature: FT21 - Deterministische Dokumentextraktion
 * Use Case: UC Artikellisten-Parsing ohne KI
 *
 * Abgedeckte Regeln:
 * - Positionen starten nur bei Mengenmuster am Zeilenanfang.
 * - Mehrzeilige Beschreibungen werden pro Position zusammengefuehrt.
 * - Preis- und Steuerzeilen werden ignoriert.
 * - Leere Positionen werden verworfen.
 *
 * Fehlerfaelle:
 * - Markerbereich fehlt.
 * - Keine auswertbaren Positionen im Bereich.
 *
 * Ziel:
 * Deterministische Extraktion der Artikelliste zwischen Start- und Endmarker absichern.
 */
import { describe, expect, it } from "vitest";
import { parseDocumentArticleItemsDeterministically } from "../../../server/services/documentArticleDeterministicParser";

const SAMPLE_TEXT = [
  "Fasssauna.de - Header",
  "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
  "(Brutto) (Brutto)",
  "1,00 Stueck S1005795",
  "Ihre Palkkio Sauna wie folgt konfiguriert:",
  "19 % 14.750,00 EUR 14.750,00 EUR",
  "1 Stueck Palkkio Saunafass mit Runddach",
  "2,25m tiefes Palkkio Saunafass mit Runddach aus Thermoholz.",
  "1,00 Steckdose im Vorraum extra 19 % 0,00 EUR 0,00 EUR",
  "Gesamtbetrag 14.750,00 EUR",
].join("\n");

describe("FT21 deterministic article parser", () => {
  it("extracts item count and merges multiline descriptions", () => {
    const items = parseDocumentArticleItemsDeterministically(SAMPLE_TEXT);

    expect(items).toHaveLength(3);
    expect(items[0].quantity).toBe("1,00");
    expect(items[0].description).toContain("S1005795");
    expect(items[0].description).toContain("Ihre Palkkio Sauna wie folgt konfiguriert");
    expect(items[1].description).toContain("Palkkio Saunafass mit Runddach");
    expect(items[1].description).toContain("2,25m tiefes Palkkio");
  });

  it("removes price and tax content from descriptions", () => {
    const items = parseDocumentArticleItemsDeterministically(SAMPLE_TEXT);
    const allDescriptions = items.map((item) => item.description).join(" ");

    expect(allDescriptions).not.toMatch(/EUR|€|MwSt|Brutto|Netto/i);
    expect(allDescriptions).not.toMatch(/\d{1,2}\s*%/);
    expect(items.every((item) => item.description.trim().length > 0)).toBe(true);
  });

  it("throws when marker range is missing", () => {
    expect(() => parseDocumentArticleItemsDeterministically("kein marker text")).toThrow(
      "Artikelbereich zwischen Start- und Endmarker",
    );
  });
});

