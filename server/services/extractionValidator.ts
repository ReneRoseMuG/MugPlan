import { z } from "zod";

const customerDraftSchema = z.object({
  customerNumber: z.string().trim().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  company: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  phone: z.string().trim().min(1),
  addressLine1: z.string().trim().nullable().optional(),
  addressLine2: z.string().trim().nullable().optional(),
  postalCode: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
});

const articleItemSchema = z.object({
  quantity: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.string().trim().min(1),
});

const aiExtractionOutputSchema = z.object({
  customer: customerDraftSchema,
  saunaModel: z.string().trim().min(1),
  articleItems: z.array(articleItemSchema).min(1),
  warnings: z.array(z.string().trim()).optional(),
});

export type ValidatedExtraction = {
  customer: z.infer<typeof customerDraftSchema>;
  saunaModel: string;
  articleItems: Array<z.infer<typeof articleItemSchema>>;
  categorizedItems: Array<{
    category: string;
    items: Array<z.infer<typeof articleItemSchema>>;
  }>;
  articleListHtml: string;
  warnings: string[];
};

function normalizeOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function buildSemanticArticleHtml(
  categories: Array<{ category: string; items: Array<z.infer<typeof articleItemSchema>> }>,
): string {
  const topLevelItems = categories
    .map((category) => {
      const nestedItems = category.items
        .map((item) => `<li>${escapeHtml(item.quantity)} ${escapeHtml(item.description)}</li>`)
        .join("");
      return `<li><strong>${escapeHtml(category.category)}</strong><ul>${nestedItems}</ul></li>`;
    })
    .join("");
  return `<ul>${topLevelItems}</ul>`;
}

export function validateAndNormalizeExtraction(raw: unknown): ValidatedExtraction {
  const parsed = aiExtractionOutputSchema.parse(raw);

  const normalizedItems = parsed.articleItems.map((item) => ({
    quantity: item.quantity.trim(),
    description: item.description.trim(),
    category: item.category.trim() || "Einzelteile",
  }));

  const categorizedItems = buildCategorizedItems(normalizedItems);
  const articleListHtml = buildSemanticArticleHtml(categorizedItems);

  return {
    customer: {
      customerNumber: parsed.customer.customerNumber.trim(),
      firstName: parsed.customer.firstName.trim(),
      lastName: parsed.customer.lastName.trim(),
      company: normalizeOptional(parsed.customer.company),
      email: normalizeOptional(parsed.customer.email),
      phone: parsed.customer.phone.trim(),
      addressLine1: normalizeOptional(parsed.customer.addressLine1),
      addressLine2: normalizeOptional(parsed.customer.addressLine2),
      postalCode: normalizeOptional(parsed.customer.postalCode),
      city: normalizeOptional(parsed.customer.city),
    },
    saunaModel: parsed.saunaModel.trim(),
    articleItems: normalizedItems,
    categorizedItems,
    articleListHtml,
    warnings: (parsed.warnings ?? []).map((warning) => warning.trim()).filter((warning) => warning.length > 0),
  };
}
