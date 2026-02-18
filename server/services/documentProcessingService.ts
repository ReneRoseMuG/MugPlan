import type { Customer, InsertCustomer } from "@shared/schema";
import type { ExtractionScope } from "./aiExtractionService";
import { extractTextFromPdfBuffer } from "./documentTextExtractor";
import { validateAndNormalizeExtraction } from "./extractionValidator";
import { parseDocumentHeaderDeterministically } from "./documentHeaderDeterministicParser";
import { parseDocumentArticleItemsDeterministically } from "./documentArticleDeterministicParser";
import * as customersService from "./customersService";

export type DocumentExtractionResult = ReturnType<typeof validateAndNormalizeExtraction>;

export type CustomerNumberResolution =
  | { resolution: "none"; count: 0; customer: null }
  | { resolution: "single"; count: 1; customer: Customer }
  | { resolution: "multiple"; count: number; customer: null };

export class DocumentExtractionDeterministicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentExtractionDeterministicError";
  }
}

function normalizeCustomerNumber(customerNumber: string): string {
  return customerNumber.trim();
}

function deriveSaunaModel(descriptions: string[]): string {
  const byKeyword = descriptions.find((description) => /\b(sauna|modell)\b/i.test(description));
  if (byKeyword) return byKeyword.slice(0, 120);
  if (descriptions.length > 0) return descriptions[0].slice(0, 120);
  return "Produktinformationen aus Dokument";
}

export async function extractFromPdf(params: {
  scope: ExtractionScope;
  fileBuffer: Buffer;
}): Promise<DocumentExtractionResult> {
  const extractedText = await extractTextFromPdfBuffer(params.fileBuffer);

  try {
    const header = parseDocumentHeaderDeterministically(extractedText);
    const articleItems = parseDocumentArticleItemsDeterministically(extractedText);

    return validateAndNormalizeExtraction({
      customer: {
        customerNumber: header.customerNumber,
        firstName: header.firstName,
        lastName: header.lastName,
        company: header.company,
        email: null,
        phone: header.mobile,
        addressLine1: header.addressLine1,
        addressLine2: null,
        postalCode: header.postalCode,
        city: header.city,
      },
      orderNumber: header.orderNumber,
      saunaModel: deriveSaunaModel(articleItems.map((item) => item.description)),
      articleItems: articleItems.map((item) => ({
        quantity: item.quantity,
        description: item.description,
        category: "Artikel",
      })),
      warnings: [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new DocumentExtractionDeterministicError(message);
  }
}

export async function resolveCustomerByNumber(customerNumber: string): Promise<CustomerNumberResolution> {
  const normalizedCustomerNumber = normalizeCustomerNumber(customerNumber);
  const matches = await customersService.getCustomersByCustomerNumber(normalizedCustomerNumber);
  if (matches.length === 0) {
    return { resolution: "none", count: 0, customer: null };
  }
  if (matches.length === 1) {
    return { resolution: "single", count: 1, customer: matches[0] };
  }
  return { resolution: "multiple", count: matches.length, customer: null };
}

export async function checkCustomerDuplicate(customerNumber: string): Promise<{ duplicate: boolean; count: number }> {
  const resolution = await resolveCustomerByNumber(customerNumber);
  return {
    duplicate: resolution.count > 0,
    count: resolution.count,
  };
}

export async function createCustomerFromExtractionDraft(customerDraft: InsertCustomer): Promise<Customer> {
  return customersService.createCustomer(customerDraft);
}
