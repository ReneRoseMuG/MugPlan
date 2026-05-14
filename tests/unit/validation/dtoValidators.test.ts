/**
 * Test Scope:
 *
 * Feature: FT21 - Deterministische Dokumentextraktion
 * Use Case: UC DTO-Validierung und Service-Verhalten ohne KI
 *
 * Abgedeckte Regeln:
 * - Zod-Validierungsfehler werden korrekt als API-Validierungsantwort abgebildet.
 * - Extraktionsservice persistiert keine Kunden implizit.
 * - Deterministische Parserfehler werden als kontrollierter Fehler propagiert.
 * - Extrahierte Auftragsummen werden in den zentralen Extract-Output uebernommen.
 * - Projekt- und Termin-Extract bevorzugen den Mining-Parser; customer_form bleibt beim Legacy-Parser.
 * - Der Extract-Output enthaelt einen scope-spezifischen Feldreport.
 * - Explizite Laenderzeilen werden als `country` in den Customer-Extract uebernommen.
 * - project_form darf bei unlesbarer Kundenadresse mit Warnhinweis partiell erfolgreich bleiben.
 * - Bereits importierte Auftragsnummern fuehren nicht zum Abbruch der Extraktion –
 *   die Konfliktbehandlung (Edit-Modus-Wechsel) liegt im Client.
 *
 * Fehlerfaelle:
 * - Ungueltige DTO-Payload.
 * - Fehler in Header- oder Artikelparser.
 *
 * Ziel:
 * Sicherstellen, dass die FT21-Extraktion stabil ohne KI funktioniert und keine Seiteneffekte erzeugt.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const {
  extractTextFromPdfBufferMock,
  parseDocumentHeaderDeterministicallyMock,
  parseDocumentHeaderForProjectExtractionMock,
  parseMasterDataArticleItemsDeterministicallyMock,
  parseDocumentArticleItemsDeterministicallyMock,
  parseDocumentTotalAmountDeterministicallyMock,
} = vi.hoisted(() => ({
  extractTextFromPdfBufferMock: vi.fn(),
  parseDocumentHeaderDeterministicallyMock: vi.fn(),
  parseDocumentHeaderForProjectExtractionMock: vi.fn(),
  parseMasterDataArticleItemsDeterministicallyMock: vi.fn(),
  parseDocumentArticleItemsDeterministicallyMock: vi.fn(),
  parseDocumentTotalAmountDeterministicallyMock: vi.fn(),
}));

vi.mock("../../../server/services/documentTextExtractor", () => ({
  extractTextFromPdfBuffer: extractTextFromPdfBufferMock,
}));

vi.mock("../../../server/services/documentHeaderDeterministicParser", () => ({
  parseDocumentHeaderDeterministically: parseDocumentHeaderDeterministicallyMock,
  parseDocumentHeaderForProjectExtraction: parseDocumentHeaderForProjectExtractionMock,
}));

vi.mock("../../../server/services/documentArticleMasterDataParser", () => ({
  parseMasterDataArticleItemsDeterministically: parseMasterDataArticleItemsDeterministicallyMock,
}));

vi.mock("../../../server/services/documentArticleDeterministicParser", () => ({
  parseDocumentArticleItemsDeterministically: parseDocumentArticleItemsDeterministicallyMock,
  parseDocumentTotalAmountDeterministically: parseDocumentTotalAmountDeterministicallyMock,
}));

vi.mock("../../../server/services/customersService", () => ({
  getCustomersByCustomerNumber: vi.fn(),
  createCustomer: vi.fn(),
}));

import { handleZodError } from "../../../server/controllers/validation";
import * as customersService from "../../../server/services/customersService";
import {
  DocumentExtractionDeterministicError,
  extractFromPdf,
} from "../../../server/services/documentProcessingService";

const customersServiceMock = vi.mocked(customersService);

describe("PKG-04 Validation & DTO: handleZodError", () => {
  it("maps invalid payload errors to 400 validation response", () => {
    const schema = z.object({
      version: z.number().int().min(1),
    });
    const parseResult = schema.safeParse({ version: 0 });
    expect(parseResult.success).toBe(false);

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    const handled = handleZodError((parseResult as any).error, res);

    expect(handled).toBe(true);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
        field: "version",
      }),
    );
  });

  it("returns false for non-zod errors", () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    const handled = handleZodError(new Error("other"), res);

    expect(handled).toBe(false);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("FT21 Validation & DTO: deterministic extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseDocumentHeaderDeterministicallyMock.mockReset();
    parseDocumentHeaderForProjectExtractionMock.mockReset();
    parseMasterDataArticleItemsDeterministicallyMock.mockReset();
    parseDocumentArticleItemsDeterministicallyMock.mockReset();
    extractTextFromPdfBufferMock.mockReset();
    parseDocumentTotalAmountDeterministicallyMock.mockReturnValue(null);
    parseDocumentHeaderForProjectExtractionMock.mockImplementation((sourceText: string) => ({
      header: parseDocumentHeaderDeterministicallyMock(sourceText),
      warnings: [],
    }));
  });

  it("extractFromPdf maps new article parser output while keeping header-based customer data", async () => {
    extractTextFromPdfBufferMock.mockResolvedValue("doc text");
    parseDocumentHeaderForProjectExtractionMock.mockReturnValue({
      header: {
        orderNumber: "A-1",
        customerNumber: "K-1",
        mobile: null,
        firstName: "Max",
        lastName: "Mustermann",
        company: "Muster GmbH",
        addressLine1: "Musterstrasse 1",
        postalCode: "12345",
        city: "Leipzig",
        country: "Deutschland",
      },
      warnings: [],
    });
    parseMasterDataArticleItemsDeterministicallyMock.mockReturnValue({
      productName: "XL Sauna",
      productDescription: "Sauna Modell X mit Ofen",
      articleItems: [
        {
          kind: "product",
          quantity: "1",
          articleNumber: "S1001",
          name: "XL Sauna",
          description: "Sauna Modell X mit Ofen",
        },
        {
          kind: "component",
          quantity: "1",
          articleNumber: "S1002",
          name: "Ofen",
          description: "Bio-Kombiofen",
        },
      ],
    });

    const result = await extractFromPdf({
      scope: "project_form",
      fileBuffer: Buffer.from("dummy"),
    });

    expect(result.customer.customerNumber).toBe("K-1");
    expect(result.customer.firstName).toBe("Max");
    expect(result.customer.company).toBe("Muster GmbH");
    expect(result.customer.phone).toBeNull();
    expect(result.customer.country).toBe("Deutschland");
    expect(result.orderNumber).toBe("A-1");
    expect(result.amount).toBeNull();
    expect(result.saunaModel).toBe("XL Sauna");
    expect(result.fieldReport.recognized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "customerNumber", value: "K-1" }),
        expect.objectContaining({ key: "orderNumber", value: "A-1" }),
        expect.objectContaining({ key: "saunaModel", value: "XL Sauna" }),
      ]),
    );
    expect(result.articleItems).toEqual([
      { quantity: "1", description: "XL Sauna - Sauna Modell X mit Ofen", category: "Produkt" },
      { quantity: "1", description: "Ofen - Bio-Kombiofen", category: "Komponente" },
    ]);
    expect(customersServiceMock.createCustomer).not.toHaveBeenCalled();
  });

  it("extractFromPdf maps appointment_form through the mining parser as well", async () => {
    extractTextFromPdfBufferMock.mockResolvedValue("doc text");
    parseDocumentHeaderDeterministicallyMock.mockReturnValue({
      orderNumber: "A-9",
      customerNumber: "K-9",
      mobile: "0170123456",
      firstName: "Anna",
      lastName: "Beispiel",
      company: null,
      addressLine1: "Beispielweg 9",
      postalCode: "10115",
      city: "Berlin",
      country: "Deutschland",
    });
    parseMasterDataArticleItemsDeterministicallyMock.mockReturnValue({
      productName: "Nordic Sauna",
      productDescription: "Panoramafenster",
      articleItems: [
        {
          kind: "product",
          quantity: "1",
          articleNumber: "P100",
          name: "Nordic Sauna",
          description: "Panoramafenster",
        },
        {
          kind: "component",
          quantity: "2",
          articleNumber: "C200",
          name: "Bankset",
          description: null,
        },
      ],
    });

    const result = await extractFromPdf({
      scope: "appointment_form",
      fileBuffer: Buffer.from("dummy"),
    });

    expect(result.customer.phone).toBe("0170123456");
    expect(result.customer.country).toBe("Deutschland");
    expect(result.saunaModel).toBe("Nordic Sauna");
    expect(result.articleItems).toEqual([
      { quantity: "1", description: "Nordic Sauna - Panoramafenster", category: "Produkt" },
      { quantity: "2", description: "Bankset", category: "Komponente" },
    ]);
  });

  it("extractFromPdf returns extracted total amount when Gesamtbetrag is present", async () => {
    parseDocumentHeaderForProjectExtractionMock.mockReturnValue({
      header: {
        orderNumber: "A-2",
        customerNumber: "K-2",
        mobile: null,
        firstName: "Erika",
        lastName: "Muster",
        company: null,
        addressLine1: "Teststrasse 2",
        postalCode: "12345",
        city: "Leipzig",
        country: "Deutschland",
      },
      warnings: [],
    });
    parseMasterDataArticleItemsDeterministicallyMock.mockReturnValue({
      productName: "Sauna Modell Y",
      productDescription: "Sauna Modell Y",
      articleItems: [
        {
          kind: "product",
          quantity: "1",
          articleNumber: "S2001",
          name: "Sauna Modell Y",
          description: null,
        },
      ],
    });
    parseDocumentTotalAmountDeterministicallyMock.mockReturnValue("17136.00");
    extractTextFromPdfBufferMock.mockResolvedValue([
      "Menge Art.Nr. / Bezeichnung",
      "1 Stueck Sauna Modell Y",
      "Gesamtbetrag 17.136,00 EUR",
    ].join("\n"));

    const result = await extractFromPdf({
      scope: "project_form",
      fileBuffer: Buffer.from("dummy"),
    });

    expect(result.amount).toBe("17136.00");
  });

  it("keeps customer_form on the legacy article parser path", async () => {
    extractTextFromPdfBufferMock.mockResolvedValue("doc text");
    parseDocumentHeaderDeterministicallyMock.mockReturnValue({
      orderNumber: "A-3",
      customerNumber: "K-3",
      mobile: null,
      firstName: "Erika",
      lastName: "Muster",
      company: null,
      addressLine1: "Teststrasse 3",
      postalCode: "12345",
      city: "Leipzig",
      country: "Deutschland",
    });
    parseDocumentArticleItemsDeterministicallyMock.mockReturnValue([
      { quantity: "1", description: "Sauna Modell Z" },
      { quantity: "2", description: "Ofenrohr Set" },
    ]);

    const result = await extractFromPdf({
      scope: "customer_form",
      fileBuffer: Buffer.from("dummy"),
    });

    expect(parseMasterDataArticleItemsDeterministicallyMock).not.toHaveBeenCalled();
    expect(result.customer.customerNumber).toBe("K-3");
    expect(result.saunaModel).toBe("Sauna Modell Z");
    expect(result.fieldReport.recognized.some((item) => item.key === "saunaModel")).toBe(false);
    expect(result.fieldReport.missing.some((item) => item.key === "orderNumber")).toBe(false);
    expect(result.articleItems).toEqual([
      { quantity: "1", description: "Sauna Modell Z", category: "Artikel" },
      { quantity: "2", description: "Ofenrohr Set", category: "Artikel" },
    ]);
  });

  it("keeps project extraction usable without articles when the mining parser cannot derive a product", async () => {
    extractTextFromPdfBufferMock.mockResolvedValue("doc text");
    parseDocumentHeaderDeterministicallyMock.mockReturnValue({
      orderNumber: "A-3",
      customerNumber: "K-3",
      mobile: null,
      firstName: "Erika",
      lastName: "Muster",
      company: null,
      addressLine1: "Teststrasse 3",
      postalCode: "12345",
      city: "Leipzig",
      country: "Deutschland",
    });
    parseMasterDataArticleItemsDeterministicallyMock.mockImplementation(() => {
      throw new Error("Produktmarker konnte nicht erkannt werden");
    });

    const result = await extractFromPdf({
      scope: "project_form",
      fileBuffer: Buffer.from("dummy"),
    });

    expect(result.customer.customerNumber).toBe("K-3");
    expect(result.saunaModel).toBe("Projektinformationen aus Dokument");
    expect(result.articleItems).toEqual([]);
    expect(result.articleListHtml).toBe("");
    expect(result.fieldReport.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "articleListMissing", section: "project" }),
      ]),
    );
    expect(parseDocumentArticleItemsDeterministicallyMock).toHaveBeenCalledWith("doc text");
  });

  it("throws deterministic extraction error when parser fails", async () => {
    extractTextFromPdfBufferMock.mockResolvedValue("doc text");
    parseDocumentHeaderDeterministicallyMock.mockImplementation(() => {
      throw new Error("Kundennummer fehlt im Dokumentkopf");
    });

    await expect(
      extractFromPdf({
        scope: "appointment_form",
        fileBuffer: Buffer.from("dummy"),
      }),
    ).rejects.toBeInstanceOf(DocumentExtractionDeterministicError);

    expect(customersServiceMock.createCustomer).not.toHaveBeenCalled();
  });

  it("returns project data with warning when customer address is only partially readable", async () => {
    extractTextFromPdfBufferMock.mockResolvedValue("doc text");
    parseDocumentHeaderForProjectExtractionMock.mockReturnValue({
      header: {
        orderNumber: "A-21",
        customerNumber: "K-21",
        mobile: "00352-621222479",
        firstName: "Tom",
        lastName: "Voosen",
        company: null,
        addressLine1: null,
        postalCode: "7419",
        city: "Brouch",
        country: "Luxemburg",
      },
      warnings: [
        "Kundendaten konnten nur teilweise erkannt werden. Projektdaten koennen trotzdem uebernommen werden.",
      ],
    });
    parseMasterDataArticleItemsDeterministicallyMock.mockReturnValue({
      productName: "Exklusiv 3",
      productDescription: "gespiegelte Version",
      articleItems: [
        {
          kind: "product",
          quantity: "1",
          articleNumber: "S1005733",
          name: "Exklusiv 3",
          description: "gespiegelte Version",
        },
      ],
    });

    const result = await extractFromPdf({
      scope: "project_form",
      fileBuffer: Buffer.from("dummy"),
    });

    expect(result.orderNumber).toBe("A-21");
    expect(result.customer.customerNumber).toBe("K-21");
    expect(result.customer.addressLine1).toBeNull();
    expect(result.customer.postalCode).toBe("7419");
    expect(result.customer.city).toBe("Brouch");
    expect(result.customer.country).toBe("Luxemburg");
    expect(result.warnings).toEqual([
      "Kundendaten konnten nur teilweise erkannt werden. Projektdaten koennen trotzdem uebernommen werden.",
    ]);
    expect(result.fieldReport.recognized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "orderNumber", value: "A-21" }),
        expect.objectContaining({ key: "postalCode", value: "7419" }),
        expect.objectContaining({ key: "country", value: "Luxemburg" }),
      ]),
    );
    expect(result.fieldReport.missing).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "addressLine1", reason: "Keine Strassenzeile erkannt." }),
      ]),
    );
  });

  it("resolves successfully when order number already exists – conflict is handled by the client", async () => {
    extractTextFromPdfBufferMock.mockResolvedValue("doc text");
    parseDocumentHeaderForProjectExtractionMock.mockReturnValue({
      header: {
        orderNumber: "A-1",
        customerNumber: "K-1",
        mobile: null,
        firstName: "Max",
        lastName: "Mustermann",
        company: "Muster GmbH",
        addressLine1: "Musterstrasse 1",
        postalCode: "12345",
        city: "Leipzig",
        country: "Deutschland",
      },
      warnings: [],
    });
    parseMasterDataArticleItemsDeterministicallyMock.mockReturnValue({
      productName: "XL Sauna",
      productDescription: "Sauna Modell X",
      articleItems: [
        { kind: "product", quantity: "1", articleNumber: "S1001", name: "XL Sauna", description: "Sauna Modell X" },
      ],
    });

    const result = await extractFromPdf({
      scope: "project_form",
      fileBuffer: Buffer.from("dummy"),
    });

    expect(result.orderNumber).toBe("A-1");
  });
});
