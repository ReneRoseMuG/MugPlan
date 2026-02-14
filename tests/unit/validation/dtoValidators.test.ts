import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const {
  extractStructuredDataMock,
  extractTextFromPdfBufferMock,
  validateAndNormalizeExtractionMock,
} = vi.hoisted(() => ({
  extractStructuredDataMock: vi.fn(),
  extractTextFromPdfBufferMock: vi.fn(),
  validateAndNormalizeExtractionMock: vi.fn(),
}));

vi.mock("../../../server/services/aiExtractionService", () => ({
  createExtractionProvider: () => ({
    extractStructuredData: extractStructuredDataMock,
  }),
}));

vi.mock("../../../server/services/documentTextExtractor", () => ({
  extractTextFromPdfBuffer: extractTextFromPdfBufferMock,
}));

vi.mock("../../../server/services/extractionValidator", () => ({
  validateAndNormalizeExtraction: validateAndNormalizeExtractionMock,
}));

vi.mock("../../../server/services/customersService", () => ({
  getCustomersByCustomerNumber: vi.fn(),
  createCustomer: vi.fn(),
}));

import { handleZodError } from "../../../server/controllers/validation";
import * as customersService from "../../../server/services/customersService";
import { extractFromPdf } from "../../../server/services/documentProcessingService";

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

describe("PKG-04 Validation & DTO: document extraction does not persist implicitly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extractFromPdf returns normalized extraction and never persists customer data", async () => {
    extractTextFromPdfBufferMock.mockReturnValue("doc text");
    extractStructuredDataMock.mockResolvedValue({
      customer: {
        customerNumber: "K-1",
        firstName: "Max",
        lastName: "Mustermann",
        phone: "0123",
      },
      saunaModel: "Model A",
      articleItems: [],
      warnings: [],
    });
    validateAndNormalizeExtractionMock.mockReturnValue({
      customer: {
        customerNumber: "K-1",
        firstName: "Max",
        lastName: "Mustermann",
        company: null,
        email: null,
        phone: "0123",
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        city: null,
      },
      saunaModel: "Model A",
      articleItems: [],
      categorizedItems: [],
      articleListHtml: "<p>ok</p>",
      warnings: [],
    });

    const result = await extractFromPdf({
      scope: "project_form",
      fileBuffer: Buffer.from("dummy"),
    });

    expect(result).toMatchObject({
      saunaModel: "Model A",
    });
    expect(extractTextFromPdfBufferMock).toHaveBeenCalledOnce();
    expect(extractStructuredDataMock).toHaveBeenCalledOnce();
    expect(validateAndNormalizeExtractionMock).toHaveBeenCalledOnce();
    expect(customersServiceMock.createCustomer).not.toHaveBeenCalled();
  });

  it("does not persist when provider returns invalid JSON error", async () => {
    extractTextFromPdfBufferMock.mockReturnValue("doc text");
    extractStructuredDataMock.mockRejectedValue(new Error("KI-Provider lieferte kein valides JSON"));

    await expect(
      extractFromPdf({
        scope: "appointment_form",
        fileBuffer: Buffer.from("dummy"),
      }),
    ).rejects.toThrow("KI-Provider lieferte kein valides JSON");

    expect(validateAndNormalizeExtractionMock).not.toHaveBeenCalled();
    expect(customersServiceMock.createCustomer).not.toHaveBeenCalled();
  });
});
