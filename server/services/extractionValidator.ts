import { z } from "zod";

const customerDraftSchema = z.object({
  customerNumber: z.string().trim().min(1),
  firstName: z.string().trim().nullable().optional(),
  lastName: z.string().trim().nullable().optional(),
  company: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  addressLine1: z.string().trim().nullable().optional(),
  addressLine2: z.string().trim().nullable().optional(),
  postalCode: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  country: z.string().trim().nullable().optional(),
});

const articleItemSchema = z.object({
  quantity: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.string().trim().min(1),
});

const aiExtractionOutputSchema = z.object({
  customer: customerDraftSchema,
  orderNumber: z.string().trim().nullable().optional(),
  amount: z.string().trim().nullable().optional(),
  saunaModel: z.string().trim().min(1),
  articleItems: z.array(articleItemSchema).min(1),
  warnings: z.array(z.string().trim()).optional(),
});

export type ValidatedExtraction = {
  customer: z.infer<typeof customerDraftSchema>;
  orderNumber: string | null;
  amount: string | null;
  saunaModel: string;
  articleItems: Array<z.infer<typeof articleItemSchema>>;
  categorizedItems: Array<{
    category: string;
    items: Array<z.infer<typeof articleItemSchema>>;
  }>;
  articleListHtml: string;
  warnings: string[];
};

type ExtractionScope = "project_form" | "appointment_form" | "customer_form";
type ExtractionFieldKey =
  | "customerNumber"
  | "firstName"
  | "lastName"
  | "company"
  | "phone"
  | "addressLine1"
  | "postalCode"
  | "city"
  | "country"
  | "orderNumber"
  | "amount"
  | "saunaModel";

export type ExtractionFieldReportRecognizedItem = {
  key: ExtractionFieldKey;
  label: string;
  section: "customer" | "project";
  value: string;
};

export type ExtractionFieldReportMissingItem = {
  key: ExtractionFieldKey;
  label: string;
  section: "customer" | "project";
  reason: string;
};

export type ExtractionFieldReport = {
  recognized: ExtractionFieldReportRecognizedItem[];
  missing: ExtractionFieldReportMissingItem[];
};

type ExtractionFieldConfig = {
  key: ExtractionFieldKey;
  label: string;
  section: "customer" | "project";
  scopes: ExtractionScope[];
};

const extractionFieldConfigs: ExtractionFieldConfig[] = [
  { key: "customerNumber", label: "Kundennummer", section: "customer", scopes: ["customer_form", "project_form", "appointment_form"] },
  { key: "firstName", label: "Vorname", section: "customer", scopes: ["customer_form", "project_form", "appointment_form"] },
  { key: "lastName", label: "Nachname", section: "customer", scopes: ["customer_form", "project_form", "appointment_form"] },
  { key: "company", label: "Firma", section: "customer", scopes: ["customer_form", "project_form", "appointment_form"] },
  { key: "phone", label: "Telefon", section: "customer", scopes: ["customer_form", "project_form", "appointment_form"] },
  { key: "addressLine1", label: "Strasse", section: "customer", scopes: ["customer_form", "project_form", "appointment_form"] },
  { key: "postalCode", label: "PLZ", section: "customer", scopes: ["customer_form", "project_form", "appointment_form"] },
  { key: "city", label: "Ort", section: "customer", scopes: ["customer_form", "project_form", "appointment_form"] },
  { key: "country", label: "Land", section: "customer", scopes: ["customer_form", "project_form", "appointment_form"] },
  { key: "orderNumber", label: "Auftragsnummer", section: "project", scopes: ["project_form", "appointment_form"] },
  { key: "amount", label: "Betrag", section: "project", scopes: ["project_form", "appointment_form"] },
  { key: "saunaModel", label: "Projektname", section: "project", scopes: ["project_form", "appointment_form"] },
];

function normalizeOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hasValue(value: string | null | undefined): value is string {
  return normalizeOptional(value) !== null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildCategorizedItems(
  items: Array<z.infer<typeof articleItemSchema>>,
): Array<{ category: string; items: Array<z.infer<typeof articleItemSchema>> }> {
  const map = new Map<string, Array<z.infer<typeof articleItemSchema>>>();
  for (const item of items) {
    const key = item.category.trim() || "Einzelteile";
    const current = map.get(key) ?? [];
    current.push(item);
    map.set(key, current);
  }
  return Array.from(map.entries()).map(([category, groupedItems]) => ({
    category,
    items: groupedItems,
  }));
}

function buildSemanticArticleHtml(items: Array<z.infer<typeof articleItemSchema>>): string {
  const listItems = items
    .map((item) => `<li>${escapeHtml(item.quantity)} ${escapeHtml(item.description)}</li>`)
    .join("");
  return `<ul>${listItems}</ul>`;
}

function readExtractionFieldValue(extraction: ValidatedExtraction, key: ExtractionFieldKey): string | null {
  switch (key) {
    case "customerNumber":
    case "firstName":
    case "lastName":
    case "company":
    case "phone":
    case "addressLine1":
    case "postalCode":
    case "city":
    case "country":
      return extraction.customer[key] ?? null;
    case "orderNumber":
      return extraction.orderNumber;
    case "amount":
      return extraction.amount;
    case "saunaModel":
      return extraction.saunaModel;
    default:
      return null;
  }
}

function buildMissingReason(extraction: ValidatedExtraction, key: ExtractionFieldKey): string {
  switch (key) {
    case "company":
      return "Keine Firmenzeile im Dokumentkopf erkannt.";
    case "firstName":
    case "lastName":
      if (
        hasValue(extraction.customer.company) &&
        !hasValue(extraction.customer.firstName) &&
        !hasValue(extraction.customer.lastName)
      ) {
        return "Firmenkunde ohne Personenname im Dokumentkopf.";
      }
      return "Kein Personenname im Dokumentkopf erkannt.";
    case "phone":
      return "Kein gueltiges Mobil- oder Telefonfeld erkannt.";
    case "addressLine1":
      return "Keine Strassenzeile erkannt.";
    case "postalCode":
    case "city":
      return "PLZ/Ort im Dokumentkopf nicht eindeutig erkannt.";
    case "country":
      return "Keine Laenderzeile im Dokumentkopf erkannt.";
    case "customerNumber":
      return "Kundennummer nicht erkannt.";
    case "orderNumber":
      return "Auftragsnummer nicht erkannt.";
    case "amount":
      return "Gesamtbetrag nicht erkannt.";
    case "saunaModel":
      return "Projektname bzw. Modellbezeichnung nicht eindeutig erkannt.";
    default:
      return "Feld konnte nicht erkannt werden.";
  }
}

export function buildExtractionFieldReport(
  extraction: ValidatedExtraction,
  scope: ExtractionScope,
): ExtractionFieldReport {
  const relevantFields = extractionFieldConfigs.filter((field) => field.scopes.includes(scope));
  const recognized: ExtractionFieldReportRecognizedItem[] = [];
  const missing: ExtractionFieldReportMissingItem[] = [];

  for (const field of relevantFields) {
    const value = normalizeOptional(readExtractionFieldValue(extraction, field.key));
    if (value) {
      recognized.push({
        key: field.key,
        label: field.label,
        section: field.section,
        value,
      });
      continue;
    }

    missing.push({
      key: field.key,
      label: field.label,
      section: field.section,
      reason: buildMissingReason(extraction, field.key),
    });
  }

  return { recognized, missing };
}

export function validateAndNormalizeExtraction(raw: unknown): ValidatedExtraction {
  const parsed = aiExtractionOutputSchema.parse(raw);

  const normalizedItems = parsed.articleItems.map((item) => ({
    quantity: item.quantity.trim(),
    description: item.description.trim(),
    category: item.category.trim() || "Einzelteile",
  }));

  const categorizedItems = buildCategorizedItems(normalizedItems);
  const articleListHtml = buildSemanticArticleHtml(normalizedItems);

  return {
    customer: {
      customerNumber: parsed.customer.customerNumber.trim(),
      firstName: normalizeOptional(parsed.customer.firstName),
      lastName: normalizeOptional(parsed.customer.lastName),
      company: normalizeOptional(parsed.customer.company),
      email: normalizeOptional(parsed.customer.email),
      phone: normalizeOptional(parsed.customer.phone),
      addressLine1: normalizeOptional(parsed.customer.addressLine1),
      addressLine2: normalizeOptional(parsed.customer.addressLine2),
      postalCode: normalizeOptional(parsed.customer.postalCode),
      city: normalizeOptional(parsed.customer.city),
      country: normalizeOptional(parsed.customer.country),
    },
    orderNumber: normalizeOptional(parsed.orderNumber),
    amount: normalizeOptional(parsed.amount),
    saunaModel: parsed.saunaModel.trim(),
    articleItems: normalizedItems,
    categorizedItems,
    articleListHtml,
    warnings: (parsed.warnings ?? []).map((warning) => warning.trim()).filter((warning) => warning.length > 0),
  };
}
