const START_MARKER = "Menge Art.Nr.";
const END_MARKER = "Gesamtbetrag";

const QUANTITY_LINE_REGEX = /^(\d+(?:[.,]\d+)?)\s+(.+)$/i;
const PRICE_TAX_LINE_REGEX =
  /(?:\b(?:mwst|e-?preis|g-?preis|gesamtbetrag|gesamt|summe|preis|brutto|netto|inkl\.)\b|€|\beur\b)/i;
const PRICE_ONLY_REGEX = /^\s*[\d.,\s%]+(?:€|eur)?\s*$/i;
const ARTICLE_NUMBER_REGEX = /^([A-Z]\d[\w-]*)\s*(.*)$/i;
const PRODUCT_MARKER_REGEX = /^Ihre\s+(.+?)\s+wie\s+folgt\s+konfiguriert:$/i;

export type MasterDataArticleItem = {
  kind: "product" | "component";
  quantity: string;
  articleNumber: string | null;
  name: string;
  description: string | null;
};

export type MasterDataDocumentParseResult = {
  productName: string;
  productDescription: string | null;
  articleItems: MasterDataArticleItem[];
};

type DraftItem = {
  quantity: string;
  articleNumber: string | null;
  headline: string | null;
  detailLines: string[];
};

function normalizeLines(sourceText: string): string[] {
  return sourceText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function stripTrailingPricePart(value: string): string {
  return value
    .replace(/\s+\d{1,2}\s*%\s+.*$/i, "")
    .replace(/\s*[-–]?\s*\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d+)?(?:,-)?\s*(?:€|eur)\b.*$/i, "")
    .trim();
}

function isPriceOrTaxLine(value: string): boolean {
  if (PRICE_ONLY_REGEX.test(value)) return true;
  if (/\d{1,2}\s*%/.test(value) && /(€|eur|euro|mwst|brutto|netto)/i.test(value)) return true;
  return PRICE_TAX_LINE_REGEX.test(value);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : null;
}

function parseArticleNumberAndHeadline(value: string): { articleNumber: string | null; headline: string | null } {
  const match = ARTICLE_NUMBER_REGEX.exec(value);
  if (!match) {
    return {
      articleNumber: null,
      headline: normalizeOptional(value),
    };
  }

  return {
    articleNumber: normalizeOptional(match[1]),
    headline: normalizeOptional(match[2]),
  };
}

function normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isSaunaText(value: string | null | undefined): boolean {
  return Boolean(value) && /sauna/i.test(value ?? "");
}

function extractDraftItems(sourceText: string): DraftItem[] {
  const lines = normalizeLines(sourceText);
  const startIndex = lines.findIndex((line) => line.includes(START_MARKER));
  const endIndex = lines.findIndex((line, index) => index > startIndex && line.includes(END_MARKER));

  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error("Artikelbereich zwischen Start- und Endmarker konnte nicht eindeutig erkannt werden");
  }

  const segment = lines.slice(startIndex + 1, endIndex);
  const items: DraftItem[] = [];
  let current: DraftItem | null = null;

  const pushCurrent = () => {
    if (!current) return;
    if (current.headline || current.detailLines.length > 0 || current.articleNumber) {
      items.push(current);
    }
    current = null;
  };

  for (const line of segment) {
    if (line.startsWith("(Brutto)")) {
      continue;
    }

    const quantityMatch = QUANTITY_LINE_REGEX.exec(line);
    if (quantityMatch) {
      const rawRest = quantityMatch[2].trim();
      if (rawRest.startsWith("%")) {
        continue;
      }

      if (/^x\d/i.test(rawRest)) {
        if (current) {
          const cleanedDimensionLine = stripTrailingPricePart(line);
          if (cleanedDimensionLine.length > 0) {
            current.detailLines.push(cleanedDimensionLine);
          }
        }
        continue;
      }

      pushCurrent();

      const quantity = normalizeWhitespace(quantityMatch[1]);
      const rest = stripTrailingPricePart(
        rawRest.replace(/^(?:st(?:ue|u)ck|stück|stk\.?|x)\b/i, "").trim(),
      );
      const parsed = parseArticleNumberAndHeadline(rest);
      current = {
        quantity,
        articleNumber: parsed.articleNumber,
        headline: parsed.headline,
        detailLines: [],
      };
      continue;
    }

    if (isPriceOrTaxLine(line)) {
      continue;
    }

    if (!current) {
      continue;
    }

    const cleaned = stripTrailingPricePart(line);
    if (cleaned.length === 0 || isPriceOrTaxLine(cleaned)) {
      continue;
    }

    current.detailLines.push(cleaned);
  }

  pushCurrent();

  return items.filter((item) => item.articleNumber || item.headline || item.detailLines.length > 0);
}

function toDescription(lines: string[]): string | null {
  return normalizeOptional(lines.join(" "));
}

function deriveProductIndex(items: DraftItem[]): number {
  return items.findIndex((item) => item.detailLines.some((line) => PRODUCT_MARKER_REGEX.test(line)));
}

function deriveProductName(item: DraftItem): string | null {
  for (const line of item.detailLines) {
    const match = PRODUCT_MARKER_REGEX.exec(line);
    if (match?.[1]) {
      return normalizeOptional(match[1]);
    }
  }
  return null;
}

function deriveProductDescription(items: DraftItem[], productIndex: number): string | null {
  const ownDetail = items[productIndex]?.detailLines.find((line) => !PRODUCT_MARKER_REGEX.test(line));
  if (ownDetail) return normalizeOptional(ownDetail);

  for (let index = productIndex + 1; index < items.length; index += 1) {
    const candidate = items[index];
    const combined = normalizeOptional([candidate.headline, ...candidate.detailLines].filter(Boolean).join(" "));
    if (isSaunaText(combined)) {
      return combined;
    }
  }

  return null;
}

export function parseMasterDataArticleItemsDeterministically(sourceText: string): MasterDataDocumentParseResult {
  const items = extractDraftItems(sourceText);
  if (items.length === 0) {
    throw new Error("Artikelbereich enthaelt keine auswertbaren Positionen");
  }

  const productIndex = deriveProductIndex(items);
  if (productIndex < 0) {
    throw new Error("Produktmarker konnte nicht erkannt werden");
  }

  const productName = deriveProductName(items[productIndex]);
  if (!productName) {
    throw new Error("Produktname konnte nicht erkannt werden");
  }

  const articleItems = items.map((item, index) => {
    if (index === productIndex) {
      const detailWithoutMarker = item.detailLines.filter((line) => !PRODUCT_MARKER_REGEX.test(line));
      return {
        kind: "product" as const,
        quantity: item.quantity,
        articleNumber: item.articleNumber,
        name: productName,
        description: toDescription(detailWithoutMarker),
      };
    }

    const name = normalizeName(item.headline ?? item.articleNumber ?? "");
    const description = toDescription(item.detailLines);
    return {
      kind: "component" as const,
      quantity: item.quantity,
      articleNumber: item.articleNumber,
      name,
      description,
    };
  }).filter((item) => item.name.length > 0);

  if (articleItems.length === 0) {
    throw new Error("Artikelbereich enthaelt keine auswertbaren Positionen");
  }

  return {
    productName,
    productDescription: deriveProductDescription(items, productIndex),
    articleItems,
  };
}
