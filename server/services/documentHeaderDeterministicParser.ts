import { z } from "zod";

const START_MARKER = "Menge Art.Nr.";
const SALUTATION_REGEX = /^(frau|herr|familie)\b/i;
const STREET_REGEX = /\d+[a-zA-Z-\/]*\s*$/;
const POSTAL_CITY_REGEX = /^(\d{4,5})\s+(.+)$/;

type HeaderField = "orderNumber" | "customerNumber" | "mobile";

export type DeterministicHeaderExtraction = {
  orderNumber: string | null;
  customerNumber: string;
  mobile: string;
  firstName: string;
  lastName: string;
  addressLine1: string | null;
  postalCode: string | null;
  city: string | null;
};

const fieldAliases: Record<HeaderField, string[]> = {
  orderNumber: ["auftragnr", "auftragsnr", "auftragsnummer"],
  customerNumber: ["kundennr", "kundennummer"],
  mobile: ["kundenmobil", "kundemobil", "mobil"],
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

function nextNonEmpty(lines: string[], fromIndex: number, maxLookahead = 12): string | null {
  const end = Math.min(lines.length, fromIndex + maxLookahead);
  for (let i = fromIndex; i < end; i += 1) {
    const candidate = lines[i]?.trim() ?? "";
    if (candidate.length > 0 && !classifyLabel(candidate)) {
      return candidate;
    }
  }
  return null;
}

function collectLabelValues(lines: string[]): Record<HeaderField, string[]> {
  const collected: Record<HeaderField, string[]> = {
    orderNumber: [],
    customerNumber: [],
    mobile: [],
  };

  let index = 0;
  while (index < lines.length) {
    const firstField = classifyLabel(lines[index]);
    if (!firstField) {
      index += 1;
      continue;
    }

    const block: Array<{ field: HeaderField | null; lineIndex: number }> = [];
    let scan = index;
    while (scan < lines.length) {
      const field = classifyLabel(lines[scan]);
      if (!field && !isGenericLabelLine(lines[scan])) break;
      block.push({ field, lineIndex: scan });
      scan += 1;
    }

    const blockValues: string[] = [];
    let valueScan = scan;
    while (valueScan < lines.length && blockValues.length < block.length) {
      const candidate = lines[valueScan]?.trim() ?? "";
      if (candidate.length > 0 && !classifyLabel(candidate)) {
        blockValues.push(candidate);
      }
      valueScan += 1;
    }

    if (block.length > 1 && blockValues.length === block.length) {
      for (let i = 0; i < block.length; i += 1) {
        const field = block[i].field;
        if (field) {
          collected[field].push(blockValues[i]);
        }
      }
      index = valueScan;
      continue;
    }

    for (const entry of block) {
      if (!entry.field) continue;
      const value = nextNonEmpty(lines, entry.lineIndex + 1, 4);
      if (value && !isGenericLabelLine(value)) {
        collected[entry.field].push(value);
      }
    }

    index = scan;
  }

  return collected;
}

function looksLikeName(value: string): boolean {
  const tokens = value.split(/\s+/).filter((token) => token.length > 0);
  if (tokens.length < 2) return false;
  return /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\-]+$/.test(tokens[0]) &&
    /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\-]+$/.test(tokens[tokens.length - 1]);
}

function looksLikeStreet(value: string): boolean {
  return STREET_REGEX.test(value) || /\b(str|strasse|straße|weg|platz|allee|gasse)\b/i.test(value);
}

function findAddressBlock(lines: string[]): string[] {
  for (let i = 0; i < lines.length; i += 1) {
    if (!SALUTATION_REGEX.test(lines[i])) continue;
    const name = lines[i + 1] ?? "";
    const street = lines[i + 2] ?? "";
    const postalCity = lines[i + 3] ?? "";
    if (looksLikeName(name) && looksLikeStreet(street) && POSTAL_CITY_REGEX.test(postalCity)) {
      return lines.slice(i, Math.min(lines.length, i + 5));
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const name = lines[i] ?? "";
    const street = lines[i + 1] ?? "";
    const postalCity = lines[i + 2] ?? "";
    if (looksLikeName(name) && looksLikeStreet(street) && POSTAL_CITY_REGEX.test(postalCity)) {
      return lines.slice(i, Math.min(lines.length, i + 4));
    }
  }

  return [];
}

function parseName(nameLine: string): { firstName: string; lastName: string } {
  const tokens = nameLine.split(/\s+/).filter((token) => token.length > 0);
  if (tokens.length < 2) {
    throw new Error("Vorname/Nachname konnten nicht deterministisch extrahiert werden");
  }
  return {
    firstName: tokens[0],
    lastName: tokens.slice(1).join(" "),
  };
}

function pickSingleValue(values: string[]): string | null {
  const unique = Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0];
  return null;
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

  const mobile = pickSingleValue(labelValues.mobile);
  if (!mobile) {
    throw new Error("Mobilnummer fehlt im Dokumentkopf");
  }

  const orderNumber = pickSingleValue(labelValues.orderNumber);

  const addressBlock = findAddressBlock(addressRegionLines);
  if (addressBlock.length === 0) {
    throw new Error("Adressblock konnte im Dokumentkopf nicht deterministisch erkannt werden");
  }

  const startsWithSalutation = SALUTATION_REGEX.test(addressBlock[0] ?? "");
  const nameLine = startsWithSalutation ? addressBlock[1] ?? "" : addressBlock[0] ?? "";
  const streetLine = startsWithSalutation ? addressBlock[2] ?? "" : addressBlock[1] ?? "";
  const postalCityLine = startsWithSalutation ? addressBlock[3] ?? "" : addressBlock[2] ?? "";

  const { firstName, lastName } = parseName(nameLine);
  const street = streetLine.trim();
  const postalCityMatch = POSTAL_CITY_REGEX.exec(postalCityLine.trim());

  const parsed = {
    orderNumber,
    customerNumber: customerNumberCandidates[0],
    mobile,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    addressLine1: street.length > 0 ? street : null,
    postalCode: postalCityMatch?.[1]?.trim() ?? null,
    city: postalCityMatch?.[2]?.trim() ?? null,
  };

  const requiredSchema = z.object({
    customerNumber: z.string().trim().min(1),
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    mobile: z.string().trim().min(1),
  });

  requiredSchema.parse(parsed);
  return parsed;
}

