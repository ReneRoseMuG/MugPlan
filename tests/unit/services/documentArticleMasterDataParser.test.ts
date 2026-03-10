/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Alternativparser trennt Positionsname und Beschreibung.
 * - Produktname wird aus dem Marker "Ihre ... wie folgt konfiguriert" erkannt.
 * - Vorgelagerte reine Artikelnummer bleibt am Produkt und erzeugt keine Zusatzkomponente.
 *
 * Fehlerfälle:
 * - Fehlender Produktmarker im Artikelbereich.
 *
 * Ziel:
 * Sicherstellen, dass der Stammdaten-Mining-Parser WaWi-Artikellisten produktzentriert aufbereitet.
 */
import { describe, expect, it } from "vitest";
import { parseMasterDataArticleItemsDeterministically } from "../../../server/services/documentArticleMasterDataParser";

const SAMPLE_TEXT = [
  "Header",
  "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
  "(Brutto) (Brutto)",
  "1,00 Stück S1005725",
  "Ihre XL Sauna wie folgt konfiguriert:",
  "19 % 10.900,00 EUR 10.900,00 EUR",
  "1 Stück XL Saunafass mit Runddach und Vorraum",
  "3,19m langes XL Saunafass aus Thermoholz mit 3,69m langem Runddach.",
  "1 Stück Vorraum-Runddach in schwarz",
  "Runddach aus Aluminium in anthrazit/schwarz.",
  "Gesamtbetrag 10.900,00 EUR",
].join("\n");

describe("FT24 unit: master data article parser", () => {
  it("extracts product name from marker and keeps component descriptions separate", () => {
    const result = parseMasterDataArticleItemsDeterministically(SAMPLE_TEXT);

    expect(result.productName).toBe("XL Sauna");
    expect(result.productDescription).toContain("XL Saunafass");
    expect(result.articleItems).toHaveLength(3);
    expect(result.articleItems[0]).toMatchObject({
      kind: "product",
      articleNumber: "S1005725",
      name: "XL Sauna",
    });
    expect(result.articleItems[1]).toMatchObject({
      kind: "component",
      name: "XL Saunafass mit Runddach und Vorraum",
      description: "3,19m langes XL Saunafass aus Thermoholz mit 3,69m langem Runddach.",
    });
    expect(result.articleItems[2]).toMatchObject({
      kind: "component",
      name: "Vorraum-Runddach in schwarz",
      description: "Runddach aus Aluminium in anthrazit/schwarz.",
    });
  });

  it("throws when no product marker exists", () => {
    expect(() => parseMasterDataArticleItemsDeterministically([
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
      "1 Stück Regal",
      "Holzregal",
      "Gesamtbetrag 100,00 EUR",
    ].join("\n"))).toThrow("Produktmarker");
  });
});
