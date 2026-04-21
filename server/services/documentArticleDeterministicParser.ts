const START_MARKER = "Menge Art.Nr.";
const END_MARKER = "Gesamtbetrag";

const QUANTITY_LINE_REGEX = /^(\d+(?:[.,]\d+)?)\s+(.+)$/i;
const PRICE_TAX_LINE_REGEX =
  /(?:\b(?:mwst|e-?preis|g-?preis|gesamtbetrag|gesamt|summe|preis|brutto|netto|inkl\.)\b|€|\beur\b)/i;
const PRICE_ONLY_REGEX = /^\s*[\d.,\s%]+(?:€|eur)?\s*$/i;
const TOTAL_AMOUNT_REGEX = /gesamtbetrag\s+([\d.\s]+,\d{2})(?:\s*(?:€|eur))?/i;

export type DeterministicArticleItem = {
  quantity: string;
  description: string;
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

function normalizeQuantity(value: string): string {
  return value.trim();
}

export function parseDocumentArticleItemsDeterministically(sourceText: string): DeterministicArticleItem[] {
  const lines = normalizeLines(sourceText);
  const startIndex = lines.findIndex((line) => line.includes(START_MARKER));
  const endIndex = lines.findIndex((line, index) => index > startIndex && line.includes(END_MARKER));

  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error("Artikelbereich zwischen Start- und Endmarker konnte nicht eindeutig erkannt werden");
  }

  const segment = lines.slice(startIndex + 1, endIndex);
  const items: DeterministicArticleItem[] = [];
  let current: DeterministicArticleItem | null = null;

  const pushCurrent = () => {
    if (!current) return;
    const description = current.description.trim();
    if (description.length > 0) {
      items.push({
        quantity: current.quantity,
        description,
      });
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
            current.description = `${current.description} ${cleanedDimensionLine}`.trim();
          }
        }
        continue;
      }

      pushCurrent();
      const quantity = normalizeQuantity(quantityMatch[1]);
      const rest = rawRest.replace(/^(?:st(?:ue|u)ck|stück|stk\.?|x)\b/i, "").trim();
      const description = stripTrailingPricePart(rest);
      if (description.length === 0) {
        current = null;
        continue;
      }
      current = {
        quantity,
        description,
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

    current.description = `${current.description} ${cleaned}`.trim();
  }

  pushCurrent();

  const nonEmptyItems = items.filter(
    (item) => item.quantity.trim().length > 0 && item.description.trim().length > 0,
  );

  if (nonEmptyItems.length === 0) {
    throw new Error("Artikelbereich enthält keine auswertbaren Positionen");
  }

  return nonEmptyItems;
}

function normalizeEuroAmount(value: string): string | null {
  const normalized = value.replace(/\s+/g, "").replace(/\./g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{2})$/.test(normalized)) {
    return null;
  }
  return normalized;
}

export function parseDocumentTotalAmountDeterministically(sourceText: string): string | null {
  const lines = normalizeLines(sourceText);
  const totalLine = lines.find((line) => line.includes(END_MARKER));
  if (!totalLine) {
    return null;
  }

  const match = TOTAL_AMOUNT_REGEX.exec(totalLine);
  if (!match) {
    return null;
  }

  return normalizeEuroAmount(match[1] ?? "");
}
