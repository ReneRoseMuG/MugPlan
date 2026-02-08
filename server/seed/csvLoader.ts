import fs from "fs";
import path from "path";
import type { ModelOvenMappingRow, OvenRow, SaunaModelRow } from "./types";

function resolveDemoDataDir() {
  const candidates = [
    path.resolve(process.cwd(), ".ai", "Demodaten"),
    path.resolve(process.cwd(), ".ai", "demodata"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

const DEMO_DATA_DIR = resolveDemoDataDir();
const MODELS_CSV = "fasssauna_modelle.csv";
const OVENS_CSV = "fasssauna_ofenmodelle.csv";
const MODEL_OVEN_MAPPING_CSV = "fasssauna_modelle_ofen_mapping.csv";

type RawRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  fields.push(current.trim());
  return fields;
}

function readCsvRows(filePath: string): RawRow[] {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const rows: RawRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const row: RawRow = {};
    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]] = (values[j] ?? "").trim();
    }
    rows.push(row);
  }

  return rows;
}

function pick(row: RawRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key.toLowerCase()];
    if (value !== undefined) return value;
  }
  return "";
}

function slug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toSaunaModelRow(row: RawRow, index: number): SaunaModelRow {
  const modelName = pick(row, "sauna_model_name", "model_name", "name", "modell");
  const artNr = pick(row, "sauna_art_nr", "art_nr", "artikelnummer");
  const derivedModelId = slug(artNr || modelName || `model-${index + 1}`) || `model-${index + 1}`;

  return {
    modelId: pick(row, "model_id", "id") || derivedModelId,
    saunaModelName: modelName,
    saunaArtNr: artNr,
    saunaGtin: pick(row, "sauna_gtin", "gtin"),
    saunaCategory: pick(row, "sauna_category", "category", "kategorie"),
    saunaShape: pick(row, "sauna_shape", "shape", "form"),
    saunaHasVorraum: pick(row, "sauna_has_vorraum", "has_vorraum", "vorraum"),
    saunaLCm: pick(row, "sauna_l_cm", "l_cm", "laenge_cm"),
    saunaWCm: pick(row, "sauna_w_cm", "w_cm", "breite_cm"),
    saunaHCm: pick(row, "sauna_h_cm", "h_cm", "hoehe_cm"),
    saunaWallThicknessMm: pick(row, "sauna_wall_thickness_mm", "wall_thickness_mm", "wandstaerke_mm"),
    saunaOuterWood: pick(row, "sauna_outer_wood", "outer_wood", "aussenholz"),
    saunaInteriorWood: pick(row, "sauna_interior_wood", "interior_wood", "innenholz"),
    saunaRoofVariants: pick(row, "sauna_roof_variants", "roof_variants", "dachvarianten"),
    saunaRoofColors: pick(row, "sauna_roof_colors", "roof_colors", "dachfarben"),
    saunaWindowsDoors: pick(row, "sauna_windows_doors", "windows_doors", "fenster_tueren"),
    saunaDimensionsNote: pick(row, "sauna_dimensions_note", "dimensions_note", "hinweise"),
    saunaProductPageUrl: pick(row, "sauna_product_page_url", "product_page_url", "url"),
  };
}

function toOvenRow(row: RawRow, index: number): OvenRow {
  const ovenName = pick(row, "oven_name", "name", "ofen_name");
  const ovenId = pick(row, "oven_id", "id") || slug(ovenName || `oven-${index + 1}`) || `oven-${index + 1}`;
  return {
    ovenId,
    ovenName,
    ovenType: pick(row, "oven_type", "type", "ofen_typ"),
    ovenPowerKw: pick(row, "oven_power_kw", "power_kw", "leistung_kw"),
    ovenBrand: pick(row, "oven_brand", "brand", "marke"),
    ovenPriceEur: pick(row, "oven_price_eur", "price_eur", "preis_eur"),
  };
}

function toModelOvenMappingRow(row: RawRow): ModelOvenMappingRow {
  const ovenIdRaw = pick(row, "oven_id");
  const ovenNameRaw = pick(row, "oven_name", "name");
  return {
    modelId: pick(row, "model_id"),
    ovenId: ovenIdRaw || slug(ovenNameRaw),
  };
}

export type SaunaSeedData = {
  saunaModels: SaunaModelRow[];
  ovens: OvenRow[];
  mappings: ModelOvenMappingRow[];
  warnings: string[];
};

export function loadSaunaSeedData(): SaunaSeedData {
  const warnings: string[] = [];
  const modelsPath = path.resolve(DEMO_DATA_DIR, MODELS_CSV);
  if (!fs.existsSync(modelsPath)) {
    throw new Error(`Pflichtdatei fehlt: ${modelsPath}`);
  }

  const saunaModels = readCsvRows(modelsPath).map((row, index) => toSaunaModelRow(row, index));

  const ovensPath = path.resolve(DEMO_DATA_DIR, OVENS_CSV);
  const mappingPath = path.resolve(DEMO_DATA_DIR, MODEL_OVEN_MAPPING_CSV);

  let ovens: OvenRow[] = [];
  if (fs.existsSync(ovensPath)) {
    ovens = readCsvRows(ovensPath).map((row, index) => toOvenRow(row, index));
  } else {
    warnings.push(`Optionale Datei fehlt: ${ovensPath}`);
  }

  let mappings: ModelOvenMappingRow[] = [];
  if (fs.existsSync(mappingPath)) {
    mappings = readCsvRows(mappingPath).map(toModelOvenMappingRow);
  } else {
    warnings.push(`Optionale Datei fehlt: ${mappingPath}`);
  }

  return {
    saunaModels,
    ovens,
    mappings,
    warnings,
  };
}
