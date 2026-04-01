import type { ValidatedExtraction } from "./extractionValidator";
import type { AiExtractionResult } from "./aiExtractionService";

const PRICE_TOKEN_REGEX =
  /(?:EUR|eur|Euro|euro)\s*\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{2})\s*(?:EUR|eur|Euro|euro|€)|\d+(?:[.,]\d{2})\s*(?:EUR|eur|Euro|euro|€)|€\s*\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{2})?/g;
const PRICE_LINE_PREFIX_REGEX = /^\s*(preis|summe|gesamt|zwischensumme|brutto|netto)\b/i;
const PRICE_ONLY_LINE_REGEX = /^\s*[\d\s.,]+\s*(?:EUR|eur|Euro|euro|€)?\s*$/i;
const CUSTOMER_NUMBER_REGEX = /\b\d{4,}\b/;
const MODEL_LINE_REGEX = /\b(modell|sauna)\b/i;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function cleanLine(rawLine: string): string {
  return rawLine.replaceAll(PRICE_TOKEN_REGEX, " ").replace(/\s{2,}/g, " ").trim();
}

export function sanitizeProductTextBlock(text: string): string {
  const normalized = normalizeWhitespace(text);
  const lines = normalized
    .split("\n")
    .map((line) => cleanLine(line))
    .filter((line) => line.length > 0)
    .filter((line) => !PRICE_LINE_PREFIX_REGEX.test(line))
    .filter((line) => !PRICE_ONLY_LINE_REGEX.test(line));
  return normalizeWhitespace(lines.join("\n"));
}

function pickSaunaModel(text: string): string {
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  const candidate = lines.find((line) => MODEL_LINE_REGEX.test(line));
  if (candidate) return candidate.slice(0, 120);
  if (lines.length > 0) return lines[0].slice(0, 120);
  return "Produktinformationen aus Dokument";
}

function normalizeCustomerDraft(aiResult: Partial<AiExtractionResult> | null, sourceText: string) {
  const customer = aiResult?.customer ?? ({} as AiExtractionResult["customer"]);
  const customerNumberCandidate = String(customer.customerNumber ?? "").trim();
  const customerNumberFromText = sourceText.match(CUSTOMER_NUMBER_REGEX)?.[0] ?? "";
  const customerNumber = customerNumberCandidate || customerNumberFromText || "UNBEKANNT";
  const firstName = String(customer.firstName ?? "").trim() || null;
  const lastName = String(customer.lastName ?? "").trim() || null;
  const phone = String(customer.phone ?? "").trim() || null;

  return {
    customerNumber,
    firstName,
    lastName,
    company: String(customer.company ?? "").trim() || null,
    email: String(customer.email ?? "").trim() || null,
    phone,
    addressLine1: String(customer.addressLine1 ?? "").trim() || null,
    addressLine2: String(customer.addressLine2 ?? "").trim() || null,
    postalCode: String(customer.postalCode ?? "").trim() || null,
    city: String(customer.city ?? "").trim() || null,
    country: String(customer.country ?? "").trim() || null,
  };
}

export function buildFallbackExtraction(params: {
  sourceText: string;
  aiResult?: Partial<AiExtractionResult> | null;
  reason: string;
}): ValidatedExtraction {
  const sanitizedText = sanitizeProductTextBlock(params.sourceText);
  const lines = sanitizedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 40);

  const fallbackLines = lines.length > 0 ? lines : ["Produktinformationen konnten nur als Freitext extrahiert werden."];
  const articleItems = fallbackLines.map((line) => ({
    quantity: "1",
    description: line,
    category: "Artikel",
  }));
  const categorizedItems = [{ category: "Artikel", items: articleItems }];
  const articleListHtml = `<ul>${fallbackLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;

  return {
    customer: normalizeCustomerDraft(params.aiResult ?? null, params.sourceText),
    orderNumber: null,
    amount: null,
    saunaModel: pickSaunaModel(sanitizedText),
    articleItems,
    categorizedItems,
    articleListHtml,
    warnings: [
      "Strukturierte KI-Extraktion war unvollstaendig. Preisbereinigter Produkttext wurde als Fallback verwendet.",
      `Fallback-Grund: ${params.reason}`,
    ],
  };
}
