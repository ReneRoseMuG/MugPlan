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
  parseMasterDataArticleItemsDeterministicallyMock,
  parseDocumentArticleItemsDeterministicallyMock,
  parseDocumentTotalAmountDeterministicallyMock,
  isOrderNumberAlreadyImportedMock,
} = vi.hoisted(() => ({
  extractTextFromPdfBufferMock: vi.fn(),
  parseDocumentHeaderDeterministicallyMock: vi.fn(),
  parseMasterDataArticleItemsDeterministicallyMock: vi.fn(),
  parseDocumentArticleItemsDeterministicallyMock: vi.fn(),
  parseDocumentTotalAmountDeterministicallyMock: vi.fn(),
  isOrderNumberAlreadyImportedMock: vi.fn(),
}));

vi.mock("../../../server/services/documentTextExtractor", () => ({
  extractTextFromPdfBuffer: extractTextFromPdfBufferMock,
}));

vi.mock("../../../server/services/documentHeaderDeterministicParser", () => ({
  parseDocumentHeaderDeterministically: parseDocumentHeaderDeterministicallyMock,
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

vi.mock("../../../server/services/projectsService", () => ({
  isOrderNumberAlreadyImported: isOrderNumberAlreadyImportedMock,
}));

import { handleZodError } from "../../../server/controllers/validation";
import * as customersService from "../../../server/services/customersService";
import {
  DocumentExtractionDeterministicError,
  DocumentExtractionOrderConflictError,
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
    isOrderNumberAlreadyImportedMock.mockResolvedValue(false);
    parseDocumentTotalAmountDeterministicallyMock.mockReturnValue(null);
  });

  it("extractFromPdf maps new article parser output while keeping header-based customer data", async () => {
    extractTextFromPdfBufferMock.mockResolvedValue("doc text");
    parseDocumentHeaderDeterministicallyMock.mockReturnValue({
      orderNumber: "A-1",
      customerNumber: "K-1",
      mobile: null,
      firstName: "Max",
      lastName: "Mustermann",
      company: "Muster GmbH",
      addressLine1: "Musterstrasse 1",
      postalCode: "12345",
      city: "Leipzig",
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
    expect(result.orderNumber).toBe("A-1");
    expect(result.amount).toBeNull();
    expect(result.saunaModel).toBe("XL Sauna");
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
    expect(result.saunaModel).toBe("Nordic Sauna");
    expect(result.articleItems).toEqual([
      { quantity: "1", description: "Nordic Sauna - Panoramafenster", category: "Produkt" },
      { quantity: "2", description: "Bankset", category: "Komponente" },
    ]);
  });

  it("extractFromPdf returns extracted total amount when Gesamtbetrag is present", async () => {
    parseDocumentHeaderDeterministicallyMock.mockReturnValue({
      orderNumber: "A-2",
      customerNumber: "K-2",
      mobile: null,
      firstName: "Erika",
      lastName: "Muster",
      company: null,
      addressLine1: "Teststrasse 2",
      postalCode: "12345",
      city: "Leipzig",
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
    expect(result.articleItems).toEqual([
      { quantity: "1", description: "Sauna Modell Z", category: "Artikel" },
      { quantity: "2", description: "Ofenrohr Set", category: "Artikel" },
    ]);
  });

  it("falls back to the legacy article parser when the mining parser cannot derive a product", async () => {
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
    });
    parseMasterDataArticleItemsDeterministicallyMock.mockImplementation(() => {
      throw new Error("Produktmarker konnte nicht erkannt werden");
    });
    parseDocumentArticleItemsDeterministicallyMock.mockReturnValue([
      { quantity: "1", description: "Sauna Modell Z" },
      { quantity: "2", description: "Ofenrohr Set" },
    ]);

    const result = await extractFromPdf({
      scope: "project_form",
      fileBuffer: Buffer.from("dummy"),
    });

    expect(result.customer.customerNumber).toBe("K-3");
    expect(result.saunaModel).toBe("Sauna Modell Z");
    expect(result.articleItems).toEqual([
      { quantity: "1", description: "Sauna Modell Z", category: "Artikel" },
      { quantity: "2", description: "Ofenrohr Set", category: "Artikel" },
    ]);
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

  it("aborts extraction with order conflict when order number already exists", async () => {
    extractTextFromPdfBufferMock.mockResolvedValue("doc text");
    parseDocumentHeaderDeterministicallyMock.mockReturnValue({
      orderNumber: "A-1",
      customerNumber: "K-1",
      mobile: null,
      firstName: "Max",
      lastName: "Mustermann",
      company: "Muster GmbH",
      addressLine1: "Musterstrasse 1",
      postalCode: "12345",
      city: "Leipzig",
    });
    isOrderNumberAlreadyImportedMock.mockResolvedValueOnce(true);

    await expect(
      extractFromPdf({
        scope: "project_form",
        fileBuffer: Buffer.from("dummy"),
      }),
    ).rejects.toBeInstanceOf(DocumentExtractionOrderConflictError);
  });
});
