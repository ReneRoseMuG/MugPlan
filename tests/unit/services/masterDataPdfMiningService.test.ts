/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Mining-Analyse klammert Einzeltreffer und nicht-saunabezogene Dokumente aus.
 * - Produkte werden exakt nach normalisiertem Produktnamen konsolidiert.
 * - Komponenten werden pro Produktgruppe nach Namen dedupliziert.
 *
 * Fehlerfälle:
 * - Parser liefert nur einen Artikellisten-Eintrag.
 * - Artikelliste enthaelt keinen Sauna-Bezug.
 *
 * Ziel:
 * Sicherstellen, dass der neue Mining-Service nur relevante Rohdaten in konsolidierte Produktgruppen ueberfuehrt.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const extractTextFromPdfBufferMock = vi.fn();
const parseDocumentHeaderDeterministicallyMock = vi.fn();

vi.mock("../../../server/services/documentTextExtractor", () => ({
  extractTextFromPdfBuffer: extractTextFromPdfBufferMock,
}));

vi.mock("../../../server/services/documentHeaderDeterministicParser", () => ({
  parseDocumentHeaderDeterministically: parseDocumentHeaderDeterministicallyMock,
}));

describe("FT24 unit: master data pdf mining service", () => {
  beforeEach(() => {
    extractTextFromPdfBufferMock.mockReset();
    parseDocumentHeaderDeterministicallyMock.mockReset();
    parseDocumentHeaderDeterministicallyMock.mockReturnValue({ orderNumber: "A0218170A" });
  });

  it("skips single-entry and non-sauna article lists and consolidates matching product groups", async () => {
    extractTextFromPdfBufferMock
      .mockResolvedValueOnce([
        "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
        "1,00 Stück S1005721",
        "Ihre XL Sauna wie folgt konfiguriert:",
        "1 Stück XL Saunafass",
        "Beschreibung Sauna",
        "1 Stück Ofen",
        "Ofenbeschreibung",
        "Gesamtbetrag 1,00 EUR",
      ].join("\n"))
      .mockResolvedValueOnce([
        "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
        "1,00 Stück S1005721",
        "Ihre XL Sauna wie folgt konfiguriert:",
        "1 Stück XL Saunafass",
        "Beschreibung Sauna Variante",
        "1 Stück Ofen",
        "Andere Ofenbeschreibung",
        "1 Stück Einstiegsstufe",
        "Stufe aus Thermoholz",
        "Gesamtbetrag 1,00 EUR",
      ].join("\n"))
      .mockResolvedValueOnce([
        "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
        "1,00 Stück S1005721",
        "Ihre Zubehörwelt wie folgt konfiguriert:",
        "Gesamtbetrag 1,00 EUR",
      ].join("\n"))
      .mockResolvedValueOnce([
        "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
        "1,00 Stück S1005721",
        "Ihre Regalwelt wie folgt konfiguriert:",
        "1 Stück Holzregal",
        "Massivholz",
        "1 Stück Bank",
        "Ohne Ofenbezug",
        "Gesamtbetrag 1,00 EUR",
      ].join("\n"));

    const { analyzeMasterDataPdfMining } = await import("../../../server/services/masterDataPdfMiningService");

    const result = await analyzeMasterDataPdfMining([
      { fileName: "a.pdf", contentType: "application/pdf", buffer: Buffer.from("a") },
      { fileName: "b.pdf", contentType: "application/pdf", buffer: Buffer.from("b") },
      { fileName: "single.pdf", contentType: "application/pdf", buffer: Buffer.from("c") },
      { fileName: "nosauna.pdf", contentType: "application/pdf", buffer: Buffer.from("d") },
    ]);

    expect(result.documents).toHaveLength(2);
    expect(result.productGroups).toHaveLength(1);
    expect(result.productGroups[0]?.productName).toBe("XL Sauna");
    expect(result.productGroups[0]?.sourceFileNames).toEqual(["a.pdf", "b.pdf"]);
    expect(result.productGroups[0]?.articleItems.filter((item) => item.kind === "component").map((item) => item.name)).toEqual([
      "XL Saunafass",
      "Ofen",
      "Einstiegsstufe",
    ]);
    expect(result.skipped).toEqual([
      { fileName: "single.pdf", reason: "Artikelliste enthaelt nur einen Eintrag" },
      { fileName: "nosauna.pdf", reason: "Begriff Sauna kommt in der Artikelliste nicht vor" },
    ]);
  });
});
