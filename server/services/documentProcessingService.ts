import type { Customer, InsertCustomer } from "@shared/schema";
import { createExtractionProvider, type ExtractionScope } from "./aiExtractionService";
import { extractTextFromPdfBuffer } from "./documentTextExtractor";
import { validateAndNormalizeExtraction } from "./extractionValidator";
import * as customersService from "./customersService";

export type DocumentExtractionResult = ReturnType<typeof validateAndNormalizeExtraction>;

export type CustomerNumberResolution =
  | { resolution: "none"; count: 0; customer: null }
  | { resolution: "single"; count: 1; customer: Customer }
  | { resolution: "multiple"; count: number; customer: null };

const extractionProvider = createExtractionProvider();

function normalizeCustomerNumber(customerNumber: string): string {
  return customerNumber.trim();
}

export async function extractFromPdf(params: {
  scope: ExtractionScope;
  fileBuffer: Buffer;
}): Promise<DocumentExtractionResult> {
  const extractedText = extractTextFromPdfBuffer(params.fileBuffer);
  const aiResult = await extractionProvider.extractStructuredData({
    scope: params.scope,
    text: extractedText,
  });
  return validateAndNormalizeExtraction(aiResult);
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
