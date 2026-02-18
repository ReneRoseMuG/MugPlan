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
  parseDocumentArticleItemsDeterministicallyMock,
} = vi.hoisted(() => ({
  extractTextFromPdfBufferMock: vi.fn(),
  parseDocumentHeaderDeterministicallyMock: vi.fn(),
  parseDocumentArticleItemsDeterministicallyMock: vi.fn(),
}));

vi.mock("../../../server/services/documentTextExtractor", () => ({
  extractTextFromPdfBuffer: extractTextFromPdfBufferMock,
}));

vi.mock("../../../server/services/documentHeaderDeterministicParser", () => ({
  parseDocumentHeaderDeterministically: parseDocumentHeaderDeterministicallyMock,
}));

vi.mock("../../../server/services/documentArticleDeterministicParser", () => ({
  parseDocumentArticleItemsDeterministically: parseDocumentArticleItemsDeterministicallyMock,
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
  });

  it("extractFromPdf returns normalized extraction and never persists customer data", async () => {
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
    parseDocumentArticleItemsDeterministicallyMock.mockReturnValue([
      { quantity: "1", description: "Sauna Modell X" },
    ]);

    const result = await extractFromPdf({
      scope: "project_form",
      fileBuffer: Buffer.from("dummy"),
    });

    expect(result.customer.customerNumber).toBe("K-1");
    expect(result.customer.firstName).toBe("Max");
    expect(result.customer.company).toBe("Muster GmbH");
    expect(result.customer.phone).toBeNull();
    expect(result.orderNumber).toBe("A-1");
    expect(result.saunaModel).toContain("Sauna");
    expect(result.articleItems).toHaveLength(1);
    expect(customersServiceMock.createCustomer).not.toHaveBeenCalled();
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
});
