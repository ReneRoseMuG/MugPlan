import { z } from "zod";

const START_MARKER = "Menge Art.Nr.";
const POSTAL_CITY_REGEX = /^(\d{4,5})\s+(.+)$/;

type HeaderField = "orderNumber" | "customerNumber" | "mobile" | "phone";

export type DeterministicHeaderExtraction = {
  orderNumber: string | null;
  customerNumber: string;
  mobile: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  addressLine1: string | null;
  postalCode: string | null;
  city: string | null;
};

export type ProjectHeaderPartialExtraction = {
  header: DeterministicHeaderExtraction;
  warnings: string[];
};

const fieldAliases: Record<HeaderField, string[]> = {
  orderNumber: ["auftragnr", "auftragsnr", "auftragsnummer"],
  customerNumber: ["kundennr", "kundennummer"],
  mobile: ["kundenmobil", "kundemobil", "mobil"],
  phone: ["kundentel", "kundentelefon", "telefon", "tel", "kundenfon", "fon"],
};

const inlineLabelPatterns: Record<HeaderField, RegExp[]> = {
  orderNumber: [/^\s*(?:auftrag(?:s)?\s*[-.]?\s*nr\.?|auftragsnummer)\s*:?\s*(.*)\s*$/i],
  customerNumber: [/^\s*(?:kunden?\s*[-.]?\s*nr\.?|kundennummer)\s*:?\s*(.*)\s*$/i],
  mobile: [/^\s*(?:kunden?\s*-\s*mobil|kundenmobil|kundemobil|mobil(?:nummer)?)\s*:?\s*(.*)\s*$/i],
  phone: [
    /^\s*(?:kunden?\s*(?:-\s*)?(?:tel\.?|telefon|fon)|tel\.?|telefon|fon)\s*:?\s*(.*)\s*$/i,
  ],
};

function normalizeLine(value: string): string {
  return value.replace(/\r/g, "\n").trim();
}

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s\-_.:]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function classifyLabel(value: string): HeaderField | null {
  const normalized = normalizeLabel(value);
  for (const field of Object.keys(fieldAliases) as HeaderField[]) {
    if (fieldAliases[field].some((alias) => normalized.includes(alias))) {
      return field;
    }
  }
  return null;
}

function isGenericLabelLine(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return /:\s*$/.test(trimmed) || /\bnr\.?\s*$/i.test(trimmed) || /\bnummer\s*$/i.test(trimmed);
}

function normalizeCandidateValue(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeFieldValue(field: HeaderField, value: string): string {
  const normalized = normalizeCandidateValue(value);
  if (field === "customerNumber") {
    return normalized.replace(/\s+/g, "");
  }
  return normalized;
}

function looksLikeDateValue(value: string): boolean {
  const normalized = value.trim();
  if (normalized.length === 0) return false;
  return /^(?:\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{2,4})$/.test(normalized);
}

function isValidFieldValue(field: HeaderField, value: string): boolean {
  const normalized = normalizeFieldValue(field, value);
  if (normalized.length === 0) return false;

  switch (field) {
    case "customerNumber":
      return /^\d{4,}$/.test(normalized);
    case "orderNumber":
      return /^(?=.*\d)[A-Za-z0-9][A-Za-z0-9/-]{3,}$/.test(normalized);
    case "mobile": {
      if (looksLikeDateValue(normalized)) return false;
      if (!/^[+\d\s\-/.()]+$/.test(normalized)) return false;
      const digitsOnly = normalized.replace(/\D/g, "");
      return digitsOnly.length >= 7;
    }
    case "phone": {
      if (looksLikeDateValue(normalized)) return false;
      if (!/^[+\d\s\-/.()]+$/.test(normalized)) return false;
      const digitsOnly = normalized.replace(/\D/g, "");
      return digitsOnly.length >= 7;
    }
    default:
      return false;
  }
}

function extractInlineFieldValue(line: string): { field: HeaderField; value: string } | null {
  for (const field of Object.keys(inlineLabelPatterns) as HeaderField[]) {
    for (const pattern of inlineLabelPatterns[field]) {
      const match = pattern.exec(line);
      if (!match) continue;
      const value = normalizeFieldValue(field, match[1] ?? "");
      return { field, value };
    }
  }
  return null;
}

function extractHeaderLines(sourceText: string): string[] {
  return sourceText
    .split("\n")
    .map((line) => normalizeLine(line))
    .filter((line) => line.length > 0);
}

function extractAddressRegionLines(sourceText: string): string[] {
  const allLines = extractHeaderLines(sourceText);
  const startMarkerIndex = allLines.findIndex((line) => line.includes(START_MARKER));
  const end = startMarkerIndex >= 0 ? startMarkerIndex : allLines.length;
  return allLines.slice(0, end);
}

function findNextValidValue(
  lines: string[],
  field: HeaderField,
  fromIndex: number,
  maxLookahead = 12,
): { value: string; index: number } | null {
  const end = Math.min(lines.length, fromIndex + maxLookahead);
  for (let i = fromIndex; i < end; i += 1) {
    const candidate = lines[i]?.trim() ?? "";
    if (candidate.length === 0) continue;
    if (classifyLabel(candidate) || isGenericLabelLine(candidate)) continue;
    if (!isValidFieldValue(field, candidate)) continue;
    return { value: normalizeFieldValue(field, candidate), index: i };
  }
  return null;
}

function collectLabelValues(lines: string[]): Record<HeaderField, string[]> {
  const collected: Record<HeaderField, string[]> = {
    orderNumber: [],
    customerNumber: [],
    mobile: [],
    phone: [],
  };

  const consumedInlineLineIndexes = new Set<number>();
  for (let i = 0; i < lines.length; i += 1) {
    const inlineFieldValue = extractInlineFieldValue(lines[i] ?? "");
    if (!inlineFieldValue) continue;
    if (!isValidFieldValue(inlineFieldValue.field, inlineFieldValue.value)) continue;
    collected[inlineFieldValue.field].push(normalizeFieldValue(inlineFieldValue.field, inlineFieldValue.value));
    consumedInlineLineIndexes.add(i);
  }

  let index = 0;
  while (index < lines.length) {
    if (consumedInlineLineIndexes.has(index)) {
      index += 1;
      continue;
    }

    const firstField = classifyLabel(lines[index]);
    if (!firstField) {
      index += 1;
      continue;
    }

    const block: Array<{ field: HeaderField | null; lineIndex: number }> = [];
    let scan = index;
    while (scan < lines.length) {
      if (consumedInlineLineIndexes.has(scan)) break;
      const field = classifyLabel(lines[scan]);
      if (!field && !isGenericLabelLine(lines[scan])) break;
      block.push({ field, lineIndex: scan });
      scan += 1;
    }

    if (block.length > 1) {
      let valueCursor = scan;
      for (const entry of block) {
        if (!entry.field) continue;
        const next = findNextValidValue(lines, entry.field, valueCursor, 18);
        if (!next) continue;
        collected[entry.field].push(next.value);
        valueCursor = next.index + 1;
      }
      index = valueCursor;
      continue;
    }

    for (const entry of block) {
      if (!entry.field) continue;
      const next = findNextValidValue(lines, entry.field, entry.lineIndex + 1, 6);
      if (next) collected[entry.field].push(next.value);
    }

    index = scan;
  }

  return collected;
}

function looksLikeStreet(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  const hasTrailingHouseNumber = /\d+\s*[A-Za-z]?(?:\s*[A-Za-z])?(?:[/-]\d+)?\s*$/.test(trimmed);
  return hasTrailingHouseNumber || /\b(str|strasse|straße|weg|platz|allee|gasse)\b/i.test(trimmed);
}

function findAddressBlock(
  lines: string[],
): { identityLineA: string | null; identityLineB: string | null; streetLine: string; postalCityLine: string } | null {
  for (let postalIndex = 0; postalIndex < lines.length; postalIndex += 1) {
    const postalCityLine = lines[postalIndex] ?? "";
    if (!POSTAL_CITY_REGEX.test(postalCityLine)) continue;

    const streetLine = lines[postalIndex - 1] ?? "";
    if (!looksLikeStreet(streetLine)) continue;

    return {
      identityLineA: lines[postalIndex - 2] ?? null,
      identityLineB: lines[postalIndex - 3] ?? null,
      streetLine,
      postalCityLine,
    };
  }

  return null;
}

function findPostalCityContext(
  lines: string[],
): { identityLineA: string | null; identityLineB: string | null; streetLine: string | null; postalCityLine: string } | null {
  for (let postalIndex = 0; postalIndex < lines.length; postalIndex += 1) {
    const postalCityLine = lines[postalIndex] ?? "";
    if (!POSTAL_CITY_REGEX.test(postalCityLine)) continue;

    return {
      identityLineA: lines[postalIndex - 2] ?? null,
      identityLineB: lines[postalIndex - 3] ?? null,
      streetLine: lines[postalIndex - 1] ?? null,
      postalCityLine,
    };
  }

  return null;
}

function normalizeIdentityLine(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNameToken(token: string): string {
  return token
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/^[`'´.,;:!?()[\]{}]+/g, "")
    .replace(/[`'´.,;:!?()[\]{}]+$/g, "")
    .replace(/^[\u0300-\u036f]+|[\u0300-\u036f]+$/g, "");
}

function isValidNameToken(token: string): boolean {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'`´-]*$/.test(token);
}

function parseSlashSeparatedSurnameLine(value: string): string | null {
  if (!value.includes("/")) return null;

  const segments = value
    .split(/\s*\/\s*/)
    .map((segment) =>
      segment
        .split(/\s+/)
        .map((token) => normalizeNameToken(token))
        .filter((token) => token.length > 0),
    )
    .filter((segment) => segment.length > 0);

  if (segments.length < 2) return null;
  if (!segments.every((segment) => segment.every((token) => isValidNameToken(token)))) return null;

  return segments.map((segment) => segment.join(" ")).join(" / ");
}

function parsePersonLine(value: string | null): { firstName: string | null; lastName: string } | null {
  const normalized = normalizeIdentityLine(value);
  if (!normalized) return null;
  if (looksLikeCompany(normalized)) return null;

  const withoutSalutation = normalized.replace(/^(herr|frau|familie)\b[:\s]*/i, "").trim();
  if (withoutSalutation.length === 0) return null;

  const tokens = withoutSalutation
    .split(/\s+/)
    .map((token) => normalizeNameToken(token))
    .filter((token) => token.length > 0);
  if (tokens.length >= 2 && tokens.every((token) => isValidNameToken(token))) {
    return {
      firstName: tokens[0],
      lastName: tokens.slice(1).join(" "),
    };
  }

  const slashSeparatedSurname = parseSlashSeparatedSurnameLine(withoutSalutation);
  if (slashSeparatedSurname) {
    return {
      firstName: null,
      lastName: slashSeparatedSurname,
    };
  }

  return null;
}

function looksLikeCompany(value: string | null): boolean {
  const normalized = normalizeIdentityLine(value);
  if (!normalized) return false;
  return /\b(gmbh|ag|ug|kg|gbr|e\.?k\.?|ohg|mbh|&\s*co)\b/i.test(normalized);
}

function pickSingleValue(values: string[]): string | null {
  const unique = Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0];
  return null;
}

function pickFirstValue(values: string[]): string | null {
  const unique = Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
  if (unique.length === 0) return null;
  return unique[0];
}

function pickPreferredPhone(mobileValues: string[], phoneValues: string[]): string | null {
  const mobile = pickFirstValue(mobileValues);
  if (mobile) return mobile;
  return pickFirstValue(phoneValues);
}

export function parseDocumentHeaderDeterministically(sourceText: string): DeterministicHeaderExtraction {
  const allLines = extractHeaderLines(sourceText);
  const addressRegionLines = extractAddressRegionLines(sourceText);

  if (allLines.length === 0) {
    throw new Error("Dokumentkopf enthaelt keine auswertbaren Zeilen");
  }

  const labelValues = collectLabelValues(allLines);
  const customerNumberCandidates = Array.from(
    new Set(labelValues.customerNumber.map((value) => value.trim()).filter((value) => value.length > 0)),
  );
  if (customerNumberCandidates.length === 0) {
    throw new Error("Kundennummer fehlt im Dokumentkopf");
  }
  if (customerNumberCandidates.length > 1) {
    throw new Error("Mehrfache Kundennummern im Dokumentkopf erkannt");
  }

  const mobile = pickPreferredPhone(labelValues.mobile, labelValues.phone);

  const orderNumber = pickSingleValue(labelValues.orderNumber);

  const addressBlock = findAddressBlock(addressRegionLines);
  if (!addressBlock) {
    throw new Error("Adressmuster (Name, Strasse, PLZ Ort) konnte im Dokumentkopf nicht erkannt werden");
  }

  const personA = parsePersonLine(addressBlock.identityLineA);
  const personB = parsePersonLine(addressBlock.identityLineB);
  const person = personA ?? personB;

  const companyA = looksLikeCompany(addressBlock.identityLineA) ? normalizeIdentityLine(addressBlock.identityLineA) : null;
  const companyB = looksLikeCompany(addressBlock.identityLineB) ? normalizeIdentityLine(addressBlock.identityLineB) : null;
  const company = companyA ?? companyB;

  const street = addressBlock.streetLine.trim();
  const postalCityMatch = POSTAL_CITY_REGEX.exec(addressBlock.postalCityLine.trim());

  const parsed = {
    orderNumber,
    customerNumber: customerNumberCandidates[0],
    mobile,
    firstName: person?.firstName?.trim() ?? null,
    lastName: person?.lastName?.trim() ?? null,
    company,
    addressLine1: street.length > 0 ? street : null,
    postalCode: postalCityMatch?.[1]?.trim() ?? null,
    city: postalCityMatch?.[2]?.trim() ?? null,
  };

  const requiredSchema = z.object({
    customerNumber: z.string().trim().min(1),
    firstName: z.string().trim().nullable(),
    lastName: z.string().trim().nullable(),
    company: z.string().trim().nullable(),
    mobile: z.string().trim().nullable(),
  });

  requiredSchema.parse(parsed);
  return parsed;
}

export function parseDocumentHeaderForProjectExtraction(sourceText: string): ProjectHeaderPartialExtraction {
  try {
    return {
      header: parseDocumentHeaderDeterministically(sourceText),
      warnings: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Adressmuster")) {
      throw error;
    }

    const allLines = extractHeaderLines(sourceText);
    if (allLines.length === 0) {
      throw error;
    }

    const labelValues = collectLabelValues(allLines);
    const customerNumber = pickSingleValue(labelValues.customerNumber) ?? "";
    if (customerNumber.length === 0) {
      throw error;
    }

    const mobile = pickPreferredPhone(labelValues.mobile, labelValues.phone);
    const orderNumber = pickSingleValue(labelValues.orderNumber);
    const postalContext = findPostalCityContext(extractAddressRegionLines(sourceText));
    const personA = parsePersonLine(postalContext?.identityLineA ?? null);
    const personB = parsePersonLine(postalContext?.identityLineB ?? null);
    const person = personA ?? personB;
    const companyA = looksLikeCompany(postalContext?.identityLineA ?? null)
      ? normalizeIdentityLine(postalContext?.identityLineA ?? null)
      : null;
    const companyB = looksLikeCompany(postalContext?.identityLineB ?? null)
      ? normalizeIdentityLine(postalContext?.identityLineB ?? null)
      : null;
    const postalCityMatch = postalContext ? POSTAL_CITY_REGEX.exec(postalContext.postalCityLine.trim()) : null;

    return {
      header: {
        orderNumber,
        customerNumber,
        mobile,
        firstName: person?.firstName?.trim() ?? null,
        lastName: person?.lastName?.trim() ?? null,
        company: companyA ?? companyB,
        addressLine1: null,
        postalCode: postalCityMatch?.[1]?.trim() ?? null,
        city: postalCityMatch?.[2]?.trim() ?? null,
      },
      warnings: [
        "Kundendaten konnten nur teilweise erkannt werden. Projektdaten koennen trotzdem uebernommen werden.",
      ],
    };
  }
}
