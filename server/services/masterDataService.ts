import type {
  Component,
  ComponentCategory,
  ComponentSpecification,
  InsertComponent,
  InsertComponentCategory,
  InsertComponentSpecification,
  InsertProduct,
  InsertProductCategory,
  Tag,
  Product,
  ProductCategory,
  UpdateComponent,
  UpdateComponentCategory,
  UpdateComponentSpecification,
  UpdateProduct,
  UpdateProductCategory,
} from "@shared/schema";
import type { CanonicalRoleKey } from "../settings/registry";
import * as masterDataRepository from "../repositories/masterDataRepository";

export type MasterDataCategoryImportRow = {
  lineNumber: number;
  name: string;
  status: "CREATED" | "UPDATED" | "REACTIVATED" | "INVALID" | "ERROR";
  message: string;
};

export type MasterDataCategoryImportResult = {
  summary: {
    totalRows: number;
    createdRows: number;
    updatedRows: number;
    reactivatedRows: number;
    invalidRows: number;
    errorRows: number;
  };
  rows: MasterDataCategoryImportRow[];
};

export class MasterDataError extends Error {
  status: number;
  code:
    | "VERSION_CONFLICT"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "FORBIDDEN"
    | "BUSINESS_CONFLICT"
    | "INVALID_CSV_FORMAT"
    | "INVALID_CSV_HEADER"
    | "INVALID_CSV_CONTENT";
  details?: Record<string, unknown>;

  constructor(
    status: number,
    code:
      | "VERSION_CONFLICT"
      | "NOT_FOUND"
      | "VALIDATION_ERROR"
      | "FORBIDDEN"
      | "BUSINESS_CONFLICT"
      | "INVALID_CSV_FORMAT"
      | "INVALID_CSV_HEADER"
      | "INVALID_CSV_CONTENT",
    details?: Record<string, unknown>,
  ) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function requireAdmin(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "ADMIN") {
    throw new MasterDataError(403, "FORBIDDEN");
  }
}

export function assertMasterDataAdmin(roleKey: CanonicalRoleKey): void {
  requireAdmin(roleKey);
}

function isDuplicateKeyError(error: unknown): boolean {
  const mysqlError = error as { code?: string; errno?: number } | null;
  return mysqlError?.code === "ER_DUP_ENTRY" || mysqlError?.errno === 1062;
}

function isRowReferencedError(error: unknown): boolean {
  const mysqlError = error as { code?: string; errno?: number } | null;
  return (
    mysqlError?.code === "ER_ROW_IS_REFERENCED_2"
    || mysqlError?.code === "ER_ROW_IS_REFERENCED"
    || mysqlError?.errno === 1451
  );
}

function isMissingReferenceError(error: unknown): boolean {
  const mysqlError = error as { code?: string; errno?: number } | null;
  return mysqlError?.code === "ER_NO_REFERENCED_ROW_2" || mysqlError?.errno === 1452;
}

function normalizeFilter(filter: "active" | "inactive" | "all" | undefined): masterDataRepository.ActiveFilter {
  if (filter === "inactive" || filter === "all") return filter;
  return "active";
}

function normalizeReadFilterForRole(
  filter: "active" | "inactive" | "all" | undefined,
  roleKey: CanonicalRoleKey,
): masterDataRepository.ActiveFilter {
  if (roleKey === "ADMIN") {
    return normalizeFilter(filter);
  }
  return "active";
}

function normalizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

function normalizeProductInput(input: InsertProduct): InsertProduct {
  return {
    ...input,
    shortCode: normalizeOptionalText(input.shortCode),
  };
}

function normalizeProductUpdate(input: UpdateProduct): UpdateProduct {
  return {
    ...input,
    shortCode: normalizeOptionalText(input.shortCode),
  };
}

function normalizeComponentInput(input: InsertComponent): InsertComponent {
  return {
    ...input,
    shortCode: normalizeOptionalText(input.shortCode),
  };
}

function normalizeComponentUpdate(input: UpdateComponent): UpdateComponent {
  return {
    ...input,
    shortCode: normalizeOptionalText(input.shortCode),
  };
}

function hasComponentDeleteConflictDetails(details: {
  assignedProductCount: number;
  projectOrderItemCount: number;
}): boolean {
  return details.assignedProductCount > 0 || details.projectOrderItemCount > 0;
}

function toLines(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((raw, index) => ({ raw, lineNumber: index + 1 }));
}

function parseCsvRow(line: string, delimiter: string): { values: string[]; error?: "UNBALANCED_QUOTES" } {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (inQuotes) {
    return { values: [], error: "UNBALANCED_QUOTES" };
  }

  values.push(current);
  return { values };
}

function detectCategoryImportDelimiter(headerLine: string): string {
  const candidates = [";", ","];
  const matching = candidates.filter((candidate) => {
    const parsed = parseCsvRow(headerLine, candidate);
    if (parsed.error) return false;
    const normalized = parsed.values.map((entry) => entry.trim().toLocaleLowerCase("de"));
    return normalized.includes("name");
  });

  if (matching.length === 1) return matching[0];
  if (matching.length > 1) {
    const semicolonParsed = parseCsvRow(headerLine, ";");
    const commaParsed = parseCsvRow(headerLine, ",");
    if (!semicolonParsed.error && !commaParsed.error) {
      const semicolonValues = semicolonParsed.values.map((entry) => entry.trim());
      const commaValues = commaParsed.values.map((entry) => entry.trim());
      const isSingleColumnHeader = semicolonValues.length === 1
        && commaValues.length === 1
        && semicolonValues[0]?.toLocaleLowerCase("de") === "name"
        && commaValues[0]?.toLocaleLowerCase("de") === "name";
      if (isSingleColumnHeader) {
        return ";";
      }
    }
    throw new MasterDataError(422, "INVALID_CSV_FORMAT");
  }
  throw new MasterDataError(400, "INVALID_CSV_HEADER");
}

function parseOptionalCsvBoolean(value: string): boolean | null {
  const normalized = value.trim().toLocaleLowerCase("de");
  if (!normalized) return null;
  if (["true", "1", "ja", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "nein", "no", "n"].includes(normalized)) return false;
  return null;
}

type CategoryImportCandidate = {
  lineNumber: number;
  name: string;
  normalizedName: string;
  description: string | null;
  isActive: boolean;
};

function parseCategoryImportCsv(rawBuffer: Buffer): {
  candidates: CategoryImportCandidate[];
  rows: MasterDataCategoryImportRow[];
} {
  const content = rawBuffer.toString("utf8").replace(/^\uFEFF/, "");
  const lines = toLines(content);
  const nonEmpty = lines.filter((line) => line.raw.trim().length > 0);
  if (nonEmpty.length === 0) {
    throw new MasterDataError(422, "INVALID_CSV_CONTENT");
  }

  const headerLine = nonEmpty[0];
  const delimiter = detectCategoryImportDelimiter(headerLine.raw);
  const parsedHeader = parseCsvRow(headerLine.raw, delimiter);
  if (parsedHeader.error) {
    throw new MasterDataError(422, "INVALID_CSV_FORMAT");
  }

  const normalizedHeaders = parsedHeader.values.map((entry) => entry.trim().toLocaleLowerCase("de"));
  const nameIndex = normalizedHeaders.indexOf("name");
  const descriptionIndex = normalizedHeaders.indexOf("beschreibung");
  const isActiveIndex = normalizedHeaders.indexOf("isactive");

  if (nameIndex < 0) {
    throw new MasterDataError(400, "INVALID_CSV_HEADER");
  }

  const rows: MasterDataCategoryImportRow[] = [];
  const candidates: CategoryImportCandidate[] = [];
  const seenInFile = new Set<string>();

  for (const line of nonEmpty.slice(1)) {
    const parsed = parseCsvRow(line.raw, delimiter);
    if (parsed.error) {
      rows.push({
        lineNumber: line.lineNumber,
        name: "",
        status: "INVALID",
        message: "CSV-Zeile ist ungueltig formatiert",
      });
      continue;
    }

    const name = (parsed.values[nameIndex] ?? "").trim();
    const descriptionRaw = descriptionIndex >= 0 ? (parsed.values[descriptionIndex] ?? "").trim() : "";
    const isActiveRaw = isActiveIndex >= 0 ? (parsed.values[isActiveIndex] ?? "").trim() : "";

    if (!name) {
      rows.push({
        lineNumber: line.lineNumber,
        name,
        status: "INVALID",
        message: "Name ist ein Pflichtfeld",
      });
      continue;
    }

    if (name.length > 255) {
      rows.push({
        lineNumber: line.lineNumber,
        name,
        status: "INVALID",
        message: "Name darf maximal 255 Zeichen lang sein",
      });
      continue;
    }

    const normalizedName = name.toLocaleLowerCase("de");
    if (seenInFile.has(normalizedName)) {
      rows.push({
        lineNumber: line.lineNumber,
        name,
        status: "INVALID",
        message: "Duplikat innerhalb der CSV-Datei",
      });
      continue;
    }

    seenInFile.add(normalizedName);
    candidates.push({
      lineNumber: line.lineNumber,
      name,
      normalizedName,
      description: descriptionRaw ? descriptionRaw : null,
      isActive: parseOptionalCsvBoolean(isActiveRaw) ?? true,
    });
  }

  if (candidates.length === 0 && rows.length === 0) {
    throw new MasterDataError(422, "INVALID_CSV_CONTENT");
  }

  return { candidates, rows };
}

function buildCategoryImportSummary(rows: MasterDataCategoryImportRow[]): MasterDataCategoryImportResult["summary"] {
  return {
    totalRows: rows.length,
    createdRows: rows.filter((row) => row.status === "CREATED").length,
    updatedRows: rows.filter((row) => row.status === "UPDATED").length,
    reactivatedRows: rows.filter((row) => row.status === "REACTIVATED").length,
    invalidRows: rows.filter((row) => row.status === "INVALID").length,
    errorRows: rows.filter((row) => row.status === "ERROR").length,
  };
}

export async function listProductCategories(
  filter: "active" | "inactive" | "all" | undefined,
  roleKey: CanonicalRoleKey,
): Promise<ProductCategory[]> {
  requireAdmin(roleKey);
  return masterDataRepository.listProductCategories(normalizeFilter(filter));
}

export async function importProductsForCategory(
  categoryId: number,
  rawBuffer: Buffer,
  roleKey: CanonicalRoleKey,
): Promise<MasterDataCategoryImportResult> {
  requireAdmin(roleKey);
  const category = await masterDataRepository.getProductCategoryById(categoryId);
  if (!category) {
    throw new MasterDataError(404, "NOT_FOUND");
  }

  const parsed = parseCategoryImportCsv(rawBuffer);
  const rows = [...parsed.rows];

  for (const candidate of parsed.candidates) {
    try {
      const existing = await masterDataRepository.getProductByNormalizedName(candidate.name);
      if (!existing) {
        await masterDataRepository.createProduct({
          name: candidate.name,
          shortCode: null,
          categoryId,
          description: candidate.description,
          isActive: candidate.isActive,
          version: 1,
        });
        rows.push({
          lineNumber: candidate.lineNumber,
          name: candidate.name,
          status: "CREATED",
          message: "Produkt angelegt",
        });
        continue;
      }

      const result = await masterDataRepository.updateProductWithVersion(existing.id, existing.version, {
        name: candidate.name,
        shortCode: null,
        categoryId,
        description: candidate.description,
        isActive: candidate.isActive,
      });

      if (result.kind !== "updated") {
        rows.push({
          lineNumber: candidate.lineNumber,
          name: candidate.name,
          status: "ERROR",
          message: "Produkt konnte nicht aktualisiert werden",
        });
        continue;
      }

      rows.push({
        lineNumber: candidate.lineNumber,
        name: candidate.name,
        status: existing.isActive || !candidate.isActive ? "UPDATED" : "REACTIVATED",
        message: existing.isActive || !candidate.isActive ? "Produkt aktualisiert" : "Produkt reaktiviert",
      });
    } catch {
      rows.push({
        lineNumber: candidate.lineNumber,
        name: candidate.name,
        status: "ERROR",
        message: "Insert oder Update fehlgeschlagen",
      });
    }
  }

  return {
    summary: buildCategoryImportSummary(rows),
    rows: rows.sort((a, b) => a.lineNumber - b.lineNumber),
  };
}

export async function createProductCategory(input: InsertProductCategory, roleKey: CanonicalRoleKey): Promise<ProductCategory> {
  requireAdmin(roleKey);
  try {
    return await masterDataRepository.createProductCategory(input);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export async function updateProductCategory(
  id: number,
  expectedVersion: number,
  input: UpdateProductCategory,
  roleKey: CanonicalRoleKey,
): Promise<ProductCategory> {
  requireAdmin(roleKey);
  const result = await masterDataRepository.updateProductCategoryWithVersion(id, expectedVersion, input);
  if (result.kind === "not_found") throw new MasterDataError(404, "NOT_FOUND");
  if (result.kind === "version_conflict") throw new MasterDataError(409, "VERSION_CONFLICT");
  return result.row;
}

export async function deleteProductCategory(
  id: number,
  expectedVersion: number,
  roleKey: CanonicalRoleKey,
): Promise<void> {
  requireAdmin(roleKey);
  const category = await masterDataRepository.getProductCategoryById(id);
  if (!category) throw new MasterDataError(404, "NOT_FOUND");
  if (category.isDefault) {
    throw new MasterDataError(409, "BUSINESS_CONFLICT");
  }
  try {
    const result = await masterDataRepository.deleteProductCategoryWithVersion(id, expectedVersion);
    if (result.kind === "not_found") throw new MasterDataError(404, "NOT_FOUND");
    if (result.kind === "version_conflict") throw new MasterDataError(409, "VERSION_CONFLICT");
  } catch (error) {
    if (isRowReferencedError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export async function listComponentCategories(
  filter: "active" | "inactive" | "all" | undefined,
  roleKey: CanonicalRoleKey,
): Promise<ComponentCategory[]> {
  if (!roleKey) {
    throw new MasterDataError(403, "FORBIDDEN");
  }
  return masterDataRepository.listComponentCategories(normalizeReadFilterForRole(filter, roleKey));
}

export async function importComponentsForCategory(
  categoryId: number,
  rawBuffer: Buffer,
  roleKey: CanonicalRoleKey,
): Promise<MasterDataCategoryImportResult> {
  requireAdmin(roleKey);
  const category = await masterDataRepository.getComponentCategoryById(categoryId);
  if (!category) {
    throw new MasterDataError(404, "NOT_FOUND");
  }

  const parsed = parseCategoryImportCsv(rawBuffer);
  const rows = [...parsed.rows];

  for (const candidate of parsed.candidates) {
    try {
      const existing = await masterDataRepository.getComponentByNormalizedName(candidate.name);
      if (!existing) {
        await masterDataRepository.createComponent({
          name: candidate.name,
          shortCode: null,
          categoryId,
          description: candidate.description,
          isActive: candidate.isActive,
          version: 1,
        });
        rows.push({
          lineNumber: candidate.lineNumber,
          name: candidate.name,
          status: "CREATED",
          message: "Komponente angelegt",
        });
        continue;
      }

      const result = await masterDataRepository.updateComponentWithVersion(existing.id, existing.version, {
        name: candidate.name,
        shortCode: null,
        categoryId,
        description: candidate.description,
        isActive: candidate.isActive,
      });

      if (result.kind !== "updated") {
        rows.push({
          lineNumber: candidate.lineNumber,
          name: candidate.name,
          status: "ERROR",
          message: "Komponente konnte nicht aktualisiert werden",
        });
        continue;
      }

      rows.push({
        lineNumber: candidate.lineNumber,
        name: candidate.name,
        status: existing.isActive || !candidate.isActive ? "UPDATED" : "REACTIVATED",
        message: existing.isActive || !candidate.isActive ? "Komponente aktualisiert" : "Komponente reaktiviert",
      });
    } catch {
      rows.push({
        lineNumber: candidate.lineNumber,
        name: candidate.name,
        status: "ERROR",
        message: "Insert oder Update fehlgeschlagen",
      });
    }
  }

  return {
    summary: buildCategoryImportSummary(rows),
    rows: rows.sort((a, b) => a.lineNumber - b.lineNumber),
  };
}

export async function createComponentCategory(input: InsertComponentCategory, roleKey: CanonicalRoleKey): Promise<ComponentCategory> {
  requireAdmin(roleKey);
  try {
    return await masterDataRepository.createComponentCategory(input);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export async function updateComponentCategory(
  id: number,
  expectedVersion: number,
  input: UpdateComponentCategory,
  roleKey: CanonicalRoleKey,
): Promise<ComponentCategory> {
  requireAdmin(roleKey);
  const result = await masterDataRepository.updateComponentCategoryWithVersion(id, expectedVersion, input);
  if (result.kind === "not_found") throw new MasterDataError(404, "NOT_FOUND");
  if (result.kind === "version_conflict") throw new MasterDataError(409, "VERSION_CONFLICT");
  return result.row;
}

export async function deleteComponentCategory(
  id: number,
  expectedVersion: number,
  roleKey: CanonicalRoleKey,
): Promise<void> {
  requireAdmin(roleKey);
  const category = await masterDataRepository.getComponentCategoryById(id);
  if (!category) throw new MasterDataError(404, "NOT_FOUND");
  if (category.isDefault) {
    throw new MasterDataError(409, "BUSINESS_CONFLICT");
  }
  try {
    const result = await masterDataRepository.deleteComponentCategoryWithVersion(id, expectedVersion);
    if (result.kind === "not_found") throw new MasterDataError(404, "NOT_FOUND");
    if (result.kind === "version_conflict") throw new MasterDataError(409, "VERSION_CONFLICT");
  } catch (error) {
    if (isRowReferencedError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export async function listProducts(
  filter: "active" | "inactive" | "all" | undefined,
  roleKey: CanonicalRoleKey,
): Promise<Product[]> {
  if (!roleKey) {
    throw new MasterDataError(403, "FORBIDDEN");
  }
  return masterDataRepository.listProducts(normalizeReadFilterForRole(filter, roleKey));
}

export async function createProduct(input: InsertProduct, roleKey: CanonicalRoleKey): Promise<Product> {
  requireAdmin(roleKey);
  try {
    return await masterDataRepository.createProduct(normalizeProductInput(input));
  } catch (error) {
    if (isDuplicateKeyError(error) || isRowReferencedError(error) || isMissingReferenceError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export async function updateProduct(
  id: number,
  expectedVersion: number,
  input: UpdateProduct,
  roleKey: CanonicalRoleKey,
): Promise<Product> {
  requireAdmin(roleKey);
  try {
    const result = await masterDataRepository.updateProductWithVersion(id, expectedVersion, normalizeProductUpdate(input));
    if (result.kind === "not_found") throw new MasterDataError(404, "NOT_FOUND");
    if (result.kind === "version_conflict") throw new MasterDataError(409, "VERSION_CONFLICT");
    return result.row;
  } catch (error) {
    if (isDuplicateKeyError(error) || isRowReferencedError(error) || isMissingReferenceError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export async function deleteProduct(
  id: number,
  expectedVersion: number,
  roleKey: CanonicalRoleKey,
): Promise<void> {
  requireAdmin(roleKey);
  try {
    const result = await masterDataRepository.deleteProductWithVersion(id, expectedVersion);
    if (result.kind === "not_found") throw new MasterDataError(404, "NOT_FOUND");
    if (result.kind === "version_conflict") throw new MasterDataError(409, "VERSION_CONFLICT");
  } catch (error) {
    if (isRowReferencedError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export async function listComponents(
  filter: "active" | "inactive" | "all" | undefined,
  roleKey: CanonicalRoleKey,
): Promise<Component[]> {
  if (!roleKey) {
    throw new MasterDataError(403, "FORBIDDEN");
  }
  return masterDataRepository.listComponents(normalizeReadFilterForRole(filter, roleKey));
}

export async function createComponent(input: InsertComponent, roleKey: CanonicalRoleKey): Promise<Component> {
  requireAdmin(roleKey);
  try {
    return await masterDataRepository.createComponent(normalizeComponentInput(input));
  } catch (error) {
    if (isDuplicateKeyError(error) || isRowReferencedError(error) || isMissingReferenceError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export async function updateComponent(
  id: number,
  expectedVersion: number,
  input: UpdateComponent,
  roleKey: CanonicalRoleKey,
): Promise<Component> {
  requireAdmin(roleKey);
  try {
    const result = await masterDataRepository.updateComponentWithVersion(id, expectedVersion, normalizeComponentUpdate(input));
    if (result.kind === "not_found") throw new MasterDataError(404, "NOT_FOUND");
    if (result.kind === "version_conflict") throw new MasterDataError(409, "VERSION_CONFLICT");
    return result.row;
  } catch (error) {
    if (isDuplicateKeyError(error) || isRowReferencedError(error) || isMissingReferenceError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export async function deleteComponent(
  id: number,
  expectedVersion: number,
  roleKey: CanonicalRoleKey,
): Promise<void> {
  requireAdmin(roleKey);
  const relationCounts = await masterDataRepository.getComponentDeleteRelationCounts(id);
  if (hasComponentDeleteConflictDetails(relationCounts)) {
    throw new MasterDataError(409, "BUSINESS_CONFLICT", relationCounts);
  }
  try {
    const result = await masterDataRepository.deleteComponentWithVersion(id, expectedVersion);
    if (result.kind === "not_found") throw new MasterDataError(404, "NOT_FOUND");
    if (result.kind === "version_conflict") throw new MasterDataError(409, "VERSION_CONFLICT");
  } catch (error) {
    if (isRowReferencedError(error)) {
      const currentRelationCounts = await masterDataRepository.getComponentDeleteRelationCounts(id);
      throw new MasterDataError(
        409,
        "BUSINESS_CONFLICT",
        hasComponentDeleteConflictDetails(currentRelationCounts) ? currentRelationCounts : undefined,
      );
    }
    throw error;
  }
}

export async function deleteProductsByCategory(
  categoryId: number,
  roleKey: CanonicalRoleKey,
): Promise<{ deletedCount: number; skippedCount: number }> {
  requireAdmin(roleKey);
  const items = await masterDataRepository.listProductsByCategoryId(categoryId);
  let deletedCount = 0;
  let skippedCount = 0;
  for (const item of items) {
    try {
      const result = await masterDataRepository.deleteProductWithVersion(item.id, item.version);
      if (result.kind === "deleted") {
        deletedCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      if (isRowReferencedError(error)) {
        skippedCount++;
      } else {
        throw error;
      }
    }
  }
  return { deletedCount, skippedCount };
}

export async function deleteComponentsByCategory(
  categoryId: number,
  roleKey: CanonicalRoleKey,
): Promise<{ deletedCount: number; skippedCount: number }> {
  requireAdmin(roleKey);
  const items = await masterDataRepository.listComponentsByCategoryId(categoryId);
  let deletedCount = 0;
  let skippedCount = 0;
  for (const item of items) {
    const relationCounts = await masterDataRepository.getComponentDeleteRelationCounts(item.id);
    if (hasComponentDeleteConflictDetails(relationCounts)) {
      skippedCount++;
      continue;
    }
    try {
      const result = await masterDataRepository.deleteComponentWithVersion(item.id, item.version);
      if (result.kind === "deleted") {
        deletedCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      if (isRowReferencedError(error)) {
        skippedCount++;
      } else {
        throw error;
      }
    }
  }
  return { deletedCount, skippedCount };
}

export async function listComponentSpecifications(componentId: number, roleKey: CanonicalRoleKey): Promise<ComponentSpecification[]> {
  requireAdmin(roleKey);
  return masterDataRepository.listComponentSpecifications(componentId);
}

export async function createComponentSpecification(
  input: InsertComponentSpecification,
  roleKey: CanonicalRoleKey,
): Promise<ComponentSpecification> {
  requireAdmin(roleKey);
  try {
    return await masterDataRepository.createComponentSpecification(input);
  } catch (error) {
    if (isDuplicateKeyError(error) || isMissingReferenceError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export async function updateComponentSpecification(
  id: number,
  expectedVersion: number,
  input: UpdateComponentSpecification,
  roleKey: CanonicalRoleKey,
): Promise<ComponentSpecification> {
  requireAdmin(roleKey);
  try {
    const result = await masterDataRepository.updateComponentSpecificationWithVersion(id, expectedVersion, input);
    if (result.kind === "not_found") throw new MasterDataError(404, "NOT_FOUND");
    if (result.kind === "version_conflict") throw new MasterDataError(409, "VERSION_CONFLICT");
    return result.row;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export async function deleteComponentSpecification(
  id: number,
  expectedVersion: number,
  roleKey: CanonicalRoleKey,
): Promise<void> {
  requireAdmin(roleKey);
  try {
    const result = await masterDataRepository.deleteComponentSpecificationWithVersion(id, expectedVersion);
    if (result.kind === "not_found") throw new MasterDataError(404, "NOT_FOUND");
    if (result.kind === "version_conflict") throw new MasterDataError(409, "VERSION_CONFLICT");
  } catch (error) {
    if (isRowReferencedError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export async function listTags(roleKey: CanonicalRoleKey): Promise<Tag[]> {
  requireAdmin(roleKey);
  return masterDataRepository.listTags();
}

export async function createTag(input: { name: string; color: string }, roleKey: CanonicalRoleKey): Promise<Tag> {
  requireAdmin(roleKey);
  try {
    return await masterDataRepository.createTag(input);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export async function updateTag(
  id: number,
  expectedVersion: number,
  input: { name?: string; color?: string },
  roleKey: CanonicalRoleKey,
): Promise<Tag> {
  requireAdmin(roleKey);
  try {
    const result = await masterDataRepository.updateTagWithVersion(id, expectedVersion, input);
    if (result.kind === "not_found") throw new MasterDataError(404, "NOT_FOUND");
    if (result.kind === "version_conflict") throw new MasterDataError(409, "VERSION_CONFLICT");
    return result.row;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export async function deleteTag(
  id: number,
  expectedVersion: number,
  roleKey: CanonicalRoleKey,
): Promise<void> {
  requireAdmin(roleKey);
  const relationCounts = await masterDataRepository.getTagRelationCounts(id);
  const relationTotal = relationCounts.projectCount
    + relationCounts.customerCount
    + relationCounts.employeeCount
    + relationCounts.appointmentCount;
  if (relationTotal > 0) {
    throw new MasterDataError(409, "BUSINESS_CONFLICT");
  }
  const result = await masterDataRepository.deleteTagWithVersion(id, expectedVersion);
  if (result.kind === "not_found") throw new MasterDataError(404, "NOT_FOUND");
  if (result.kind === "version_conflict") throw new MasterDataError(409, "VERSION_CONFLICT");
}

export async function listComponentProducts(roleKey: CanonicalRoleKey) {
  requireAdmin(roleKey);
  return masterDataRepository.listComponentProducts();
}

export async function replaceComponentProducts(
  componentId: number,
  expectedVersion: number,
  productIds: number[],
  roleKey: CanonicalRoleKey,
): Promise<Component> {
  requireAdmin(roleKey);
  const component = await masterDataRepository.getComponentById(componentId);
  if (!component) {
    throw new MasterDataError(404, "NOT_FOUND");
  }
  if (!component.isActive) {
    throw new MasterDataError(409, "BUSINESS_CONFLICT");
  }

  const uniqueProductIds = Array.from(new Set(productIds.filter((value) => Number.isFinite(value) && value > 0)));
  const referencedProducts = await masterDataRepository.getProductsByIds(uniqueProductIds);
  if (referencedProducts.length !== uniqueProductIds.length || referencedProducts.some((product) => !product.isActive)) {
    throw new MasterDataError(409, "BUSINESS_CONFLICT");
  }

  try {
    const result = await masterDataRepository.replaceComponentProductsWithVersion(componentId, expectedVersion, productIds);
    if (result.kind === "not_found") throw new MasterDataError(404, "NOT_FOUND");
    if (result.kind === "version_conflict") throw new MasterDataError(409, "VERSION_CONFLICT");
    return result.row;
  } catch (error) {
    if (isDuplicateKeyError(error) || isRowReferencedError(error) || isMissingReferenceError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
}

export function isMasterDataError(error: unknown): error is MasterDataError {
  return error instanceof MasterDataError;
}
