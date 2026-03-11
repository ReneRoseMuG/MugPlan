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

const DEFAULT_PRODUCT_CATEGORY_NAME = "Fass Saunen";
const PROTECTED_COMPONENT_CATEGORY_NAMES = [
  "Dachvarianten",
  "Fenster",
  "Inneneinrichtung",
  "Öfen",
  "Rückwände",
  "Steuerungen",
  "Türen",
  "Vorderwände",
] as const;
const PROTECTED_COMPONENT_CATEGORY_NAME_SET = new Set<string>(PROTECTED_COMPONENT_CATEGORY_NAMES);

export type MasterDataSeedResult = {
  logLines: string[];
};

export class MasterDataError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "FORBIDDEN" | "BUSINESS_CONFLICT";

  constructor(
    status: number,
    code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "FORBIDDEN" | "BUSINESS_CONFLICT",
  ) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function requireAdmin(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "ADMIN") {
    throw new MasterDataError(403, "FORBIDDEN");
  }
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

function buildSeedLog(action: "created" | "reactivated" | "existing", kind: "Produktkategorie" | "Komponentenkategorie", name: string): string {
  if (action === "created") return `${kind} angelegt: ${name}`;
  if (action === "reactivated") return `${kind} reaktiviert: ${name}`;
  return `${kind} bereits vorhanden: ${name}`;
}

export async function listProductCategories(
  filter: "active" | "inactive" | "all" | undefined,
  roleKey: CanonicalRoleKey,
): Promise<ProductCategory[]> {
  requireAdmin(roleKey);
  return masterDataRepository.listProductCategories(normalizeFilter(filter));
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
  if (category.name === DEFAULT_PRODUCT_CATEGORY_NAME) {
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
  if (PROTECTED_COMPONENT_CATEGORY_NAME_SET.has(category.name)) {
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
    return await masterDataRepository.createProduct(input);
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
    const result = await masterDataRepository.updateProductWithVersion(id, expectedVersion, input);
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
    return await masterDataRepository.createComponent(input);
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
    const result = await masterDataRepository.updateComponentWithVersion(id, expectedVersion, input);
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
  try {
    const result = await masterDataRepository.deleteComponentWithVersion(id, expectedVersion);
    if (result.kind === "not_found") throw new MasterDataError(404, "NOT_FOUND");
    if (result.kind === "version_conflict") throw new MasterDataError(409, "VERSION_CONFLICT");
  } catch (error) {
    if (isRowReferencedError(error)) {
      throw new MasterDataError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
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

export async function runProductManagementSeed(roleKey: CanonicalRoleKey): Promise<MasterDataSeedResult> {
  requireAdmin(roleKey);
  const logLines: string[] = [];

  const productCategory = await masterDataRepository.getProductCategoryByName(DEFAULT_PRODUCT_CATEGORY_NAME);
  if (!productCategory) {
    await masterDataRepository.createProductCategory({
      name: DEFAULT_PRODUCT_CATEGORY_NAME,
      isActive: true,
      version: 1,
    });
    logLines.push(buildSeedLog("created", "Produktkategorie", DEFAULT_PRODUCT_CATEGORY_NAME));
  } else if (!productCategory.isActive) {
    await masterDataRepository.updateProductCategoryWithVersion(productCategory.id, productCategory.version, {
      isActive: true,
    });
    logLines.push(buildSeedLog("reactivated", "Produktkategorie", DEFAULT_PRODUCT_CATEGORY_NAME));
  } else {
    logLines.push(buildSeedLog("existing", "Produktkategorie", DEFAULT_PRODUCT_CATEGORY_NAME));
  }

  for (const categoryName of PROTECTED_COMPONENT_CATEGORY_NAMES) {
    const componentCategory = await masterDataRepository.getComponentCategoryByName(categoryName);
    if (!componentCategory) {
      await masterDataRepository.createComponentCategory({
        name: categoryName,
        isActive: true,
        version: 1,
      });
      logLines.push(buildSeedLog("created", "Komponentenkategorie", categoryName));
      continue;
    }

    if (!componentCategory.isActive) {
      await masterDataRepository.updateComponentCategoryWithVersion(componentCategory.id, componentCategory.version, {
        isActive: true,
      });
      logLines.push(buildSeedLog("reactivated", "Komponentenkategorie", categoryName));
      continue;
    }

    logLines.push(buildSeedLog("existing", "Komponentenkategorie", categoryName));
  }

  return { logLines };
}

export function isMasterDataError(error: unknown): error is MasterDataError {
  return error instanceof MasterDataError;
}
