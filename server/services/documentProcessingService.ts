import type { Customer, InsertCustomer } from "@shared/schema";
import type { ExtractionScope } from "./aiExtractionService";
import { extractTextFromPdfBuffer } from "./documentTextExtractor";
import {
  buildExtractionFieldReport,
  type ExtractionFieldReport,
  type ValidatedExtraction,
  validateAndNormalizeExtraction,
} from "./extractionValidator";
import { parseDocumentHeaderDeterministically } from "./documentHeaderDeterministicParser";
import {
  parseDocumentArticleItemsDeterministically,
  parseDocumentTotalAmountDeterministically,
} from "./documentArticleDeterministicParser";
import { parseMasterDataArticleItemsDeterministically } from "./documentArticleMasterDataParser";
import * as customersService from "./customersService";
import * as projectsService from "./projectsService";

export type DocumentExtractionResult = ValidatedExtraction & {
  fieldReport: ExtractionFieldReport;
};

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

export class DocumentExtractionOrderConflictError extends Error {
  readonly code = "ORDER_NUMBER_ALREADY_IMPORTED";

  constructor(message: string) {
    super(message);
    this.name = "DocumentExtractionOrderConflictError";
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

function buildExtractionDescription(name: string, description: string | null): string {
  const normalizedName = name.trim();
  const normalizedDescription = description?.trim() ?? "";
  if (!normalizedDescription) return normalizedName;
  if (normalizedDescription.toLowerCase().startsWith(normalizedName.toLowerCase())) {
    return normalizedDescription;
  }
  return `${normalizedName} - ${normalizedDescription}`;
}

function buildLegacyExtractionContent(extractedText: string): {
  saunaModel: string;
  articleItems: Array<{ quantity: string; description: string; category: string }>;
} {
  const articleItems = parseDocumentArticleItemsDeterministically(extractedText);
  return {
    saunaModel: deriveSaunaModel(articleItems.map((item) => item.description)),
    articleItems: articleItems.map((item) => ({
      quantity: item.quantity,
      description: item.description,
      category: "Artikel",
    })),
  };
}

function buildMiningExtractionContent(extractedText: string): {
  saunaModel: string;
  articleItems: Array<{ quantity: string; description: string; category: string }>;
} {
  const parsed = parseMasterDataArticleItemsDeterministically(extractedText);
  return {
    saunaModel: parsed.productName.trim(),
    articleItems: parsed.articleItems.map((item) => ({
      quantity: item.quantity,
      description: buildExtractionDescription(item.name, item.description),
      category: item.kind === "product" ? "Produkt" : "Komponente",
    })),
  };
}

function buildExtractionContentFromDocument(
  scope: ExtractionScope,
  extractedText: string,
): {
  saunaModel: string;
  articleItems: Array<{ quantity: string; description: string; category: string }>;
} {
  const preferMiningParser = scope === "project_form" || scope === "appointment_form";
  if (!preferMiningParser) {
    return buildLegacyExtractionContent(extractedText);
  }

  try {
    return buildMiningExtractionContent(extractedText);
  } catch {
    return buildLegacyExtractionContent(extractedText);
  }
}

export async function extractFromPdf(params: {
  scope: ExtractionScope;
  fileBuffer: Buffer;
}): Promise<DocumentExtractionResult> {
  const extractedText = await extractTextFromPdfBuffer(params.fileBuffer);

  try {
    const header = parseDocumentHeaderDeterministically(extractedText);
    const extractionContent = buildExtractionContentFromDocument(params.scope, extractedText);
    const amount = parseDocumentTotalAmountDeterministically(extractedText);

    const extraction = validateAndNormalizeExtraction({
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
      amount,
      saunaModel: extractionContent.saunaModel,
      articleItems: extractionContent.articleItems,
      warnings: [],
    });

    return {
      ...extraction,
      fieldReport: buildExtractionFieldReport(extraction, params.scope),
    };
  } catch (error) {
    if (error instanceof DocumentExtractionOrderConflictError) {
      throw error;
    }
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

export async function resolveProjectByOrderNumber(orderNumber: string) {
  const normalizedOrderNumber = orderNumber.trim();
  const matches = await projectsService.getProjectsByOrderNumber(normalizedOrderNumber);
  if (matches.length === 0) {
    return { resolution: "none", count: 0, project: null };
  }
  if (matches.length === 1) {
    return { resolution: "single", count: 1, project: matches[0] };
  }
  return { resolution: "multiple", count: matches.length, project: null };
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
