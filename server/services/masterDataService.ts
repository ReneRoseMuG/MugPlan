import type {
  Component,
  ComponentCategory,
  InsertComponent,
  InsertComponentCategory,
  InsertProduct,
  InsertProductCategory,
  Product,
  ProductCategory,
  UpdateComponent,
  UpdateComponentCategory,
  UpdateProduct,
  UpdateProductCategory,
} from "@shared/schema";
import type { CanonicalRoleKey } from "../settings/registry";
import * as masterDataRepository from "../repositories/masterDataRepository";

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

function normalizeFilter(filter: "active" | "inactive" | "all" | undefined): masterDataRepository.ActiveFilter {
  if (filter === "inactive" || filter === "all") return filter;
  return "active";
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
  requireAdmin(roleKey);
  return masterDataRepository.listComponentCategories(normalizeFilter(filter));
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
  requireAdmin(roleKey);
  return masterDataRepository.listProducts(normalizeFilter(filter));
}

export async function createProduct(input: InsertProduct, roleKey: CanonicalRoleKey): Promise<Product> {
  requireAdmin(roleKey);
  try {
    return await masterDataRepository.createProduct(input);
  } catch (error) {
    if (isDuplicateKeyError(error) || isRowReferencedError(error)) {
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
    if (isDuplicateKeyError(error) || isRowReferencedError(error)) {
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
  requireAdmin(roleKey);
  return masterDataRepository.listComponents(normalizeFilter(filter));
}

export async function createComponent(input: InsertComponent, roleKey: CanonicalRoleKey): Promise<Component> {
  requireAdmin(roleKey);
  try {
    return await masterDataRepository.createComponent(input);
  } catch (error) {
    if (isDuplicateKeyError(error) || isRowReferencedError(error)) {
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
    if (isDuplicateKeyError(error) || isRowReferencedError(error)) {
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

export function isMasterDataError(error: unknown): error is MasterDataError {
  return error instanceof MasterDataError;
}
