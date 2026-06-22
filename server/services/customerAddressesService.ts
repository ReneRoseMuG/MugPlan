import * as addressesRepository from "../repositories/customerAddressesRepository";
import * as customersRepository from "../repositories/customersRepository";
import type { CanonicalRoleKey } from "../settings/registry";
import {
  ADDRESS_ROLE_BILLING,
  type AddressCategory,
  type InsertAddressCategory,
  type InsertCustomerAddress,
  type UpdateAddressCategory,
  type UpdateCustomerAddress,
} from "@shared/schema";

type AddressErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "VERSION_CONFLICT"
  | "ADDRESS_ROLE_CONFLICT"
  | "ADDRESS_PROTECTED"
  | "ADDRESS_CATEGORY_PROTECTED"
  | "ADDRESS_CATEGORY_IN_USE"
  | "ADDRESS_CATEGORY_NAME_CONFLICT";

export class AddressError extends Error {
  status: number;
  code: AddressErrorCode;
  constructor(status: number, code: AddressErrorCode) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function requireDispatcherOrAdmin(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "DISPONENT" && roleKey !== "ADMIN") {
    throw new AddressError(403, "FORBIDDEN");
  }
}

function requireAdmin(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "ADMIN") {
    throw new AddressError(403, "FORBIDDEN");
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  const direct = error as { code?: string; errno?: number; cause?: unknown } | null;
  const cause = direct?.cause as { code?: string; errno?: number } | null | undefined;
  const dbError = cause ?? direct;
  return dbError?.code === "ER_DUP_ENTRY" || dbError?.errno === 1062;
}

function toFields(data: { addressLine1?: string | null; addressLine2?: string | null; postalCode?: string | null; city?: string | null; country?: string | null; }) {
  return {
    addressLine1: data.addressLine1 ?? null,
    addressLine2: data.addressLine2 ?? null,
    postalCode: data.postalCode ?? null,
    city: data.city ?? null,
    country: data.country ?? null,
  };
}

async function requireVisibleCustomer(customerId: number, roleKey: CanonicalRoleKey): Promise<boolean> {
  const customer = await customersRepository.getCustomer(customerId);
  if (!customer) return false;
  if (roleKey !== "ADMIN" && !customer.isActive) return false;
  return true;
}

export async function listAddresses(
  customerId: number,
  roleKey: CanonicalRoleKey,
): Promise<addressesRepository.CustomerAddressItem[] | null> {
  if (!(await requireVisibleCustomer(customerId, roleKey))) return null;
  return addressesRepository.listCustomerAddresses(customerId);
}

export async function createAddress(
  customerId: number,
  data: InsertCustomerAddress,
  roleKey: CanonicalRoleKey,
): Promise<addressesRepository.CustomerAddressItem> {
  requireDispatcherOrAdmin(roleKey);
  if (!(await requireVisibleCustomer(customerId, roleKey))) {
    throw new AddressError(404, "NOT_FOUND");
  }
  const category = await addressesRepository.getAddressCategory(data.categoryId);
  if (!category || !category.isActive) throw new AddressError(422, "VALIDATION_ERROR");
  // Die Rechnungsadresse wird im Kundenformular gepflegt (systemgepflegte Zeile).
  if (category.roleKey === ADDRESS_ROLE_BILLING) throw new AddressError(409, "ADDRESS_CATEGORY_PROTECTED");

  try {
    const id = await addressesRepository.createCustomerAddress(customerId, data.categoryId, toFields(data));
    const item = await addressesRepository.getCustomerAddress(customerId, id);
    if (!item) throw new AddressError(404, "NOT_FOUND");
    return item;
  } catch (error) {
    if (error instanceof AddressError) throw error;
    // Eindeutigkeit (customerId, categoryId): höchstens eine Adresse je Kategorie.
    if (isDuplicateKeyError(error)) throw new AddressError(409, "ADDRESS_ROLE_CONFLICT");
    throw error;
  }
}

export async function updateAddress(
  customerId: number,
  addressId: number,
  data: UpdateCustomerAddress,
  roleKey: CanonicalRoleKey,
): Promise<addressesRepository.CustomerAddressItem> {
  requireDispatcherOrAdmin(roleKey);
  if (!(await requireVisibleCustomer(customerId, roleKey))) {
    throw new AddressError(404, "NOT_FOUND");
  }
  const existing = await addressesRepository.getCustomerAddress(customerId, addressId);
  if (!existing) throw new AddressError(404, "NOT_FOUND");
  if (existing.isSystemManaged) throw new AddressError(409, "ADDRESS_PROTECTED");

  const targetCategoryId = data.categoryId ?? existing.categoryId;
  if (data.categoryId !== undefined && data.categoryId !== existing.categoryId) {
    const category = await addressesRepository.getAddressCategory(data.categoryId);
    if (!category || !category.isActive) throw new AddressError(422, "VALIDATION_ERROR");
    if (category.roleKey === ADDRESS_ROLE_BILLING) throw new AddressError(409, "ADDRESS_CATEGORY_PROTECTED");
  }

  try {
    const result = await addressesRepository.updateCustomerAddressWithVersion(
      addressId,
      data.version,
      targetCategoryId,
      toFields(data),
    );
    if (result === "version_conflict") throw new AddressError(409, "VERSION_CONFLICT");
  } catch (error) {
    if (error instanceof AddressError) throw error;
    if (isDuplicateKeyError(error)) throw new AddressError(409, "ADDRESS_ROLE_CONFLICT");
    throw error;
  }
  const item = await addressesRepository.getCustomerAddress(customerId, addressId);
  if (!item) throw new AddressError(404, "NOT_FOUND");
  return item;
}

export async function deleteAddress(
  customerId: number,
  addressId: number,
  version: number,
  roleKey: CanonicalRoleKey,
): Promise<void> {
  requireDispatcherOrAdmin(roleKey);
  if (!(await requireVisibleCustomer(customerId, roleKey))) {
    throw new AddressError(404, "NOT_FOUND");
  }
  const existing = await addressesRepository.getCustomerAddress(customerId, addressId);
  if (!existing) throw new AddressError(404, "NOT_FOUND");
  // Die Rechnungsadresse darf nicht entfernt werden (Kunde bliebe ohne Rechnungsadresse).
  if (existing.isSystemManaged) throw new AddressError(409, "ADDRESS_PROTECTED");
  const result = await addressesRepository.deleteCustomerAddressWithVersion(addressId, version);
  if (result === "version_conflict") throw new AddressError(409, "VERSION_CONFLICT");
}

// --- Adresskategorie-Katalog ---

export async function listCategories(): Promise<AddressCategory[]> {
  return addressesRepository.listAddressCategories();
}

export async function createCategory(
  data: InsertAddressCategory,
  roleKey: CanonicalRoleKey,
): Promise<AddressCategory> {
  requireAdmin(roleKey);
  try {
    const id = await addressesRepository.createAddressCategory(data.name, data.sortOrder ?? 0);
    const category = await addressesRepository.getAddressCategory(id);
    if (!category) throw new AddressError(404, "NOT_FOUND");
    return category;
  } catch (error) {
    if (error instanceof AddressError) throw error;
    if (isDuplicateKeyError(error)) throw new AddressError(409, "ADDRESS_CATEGORY_NAME_CONFLICT");
    throw error;
  }
}

export async function updateCategory(
  categoryId: number,
  data: UpdateAddressCategory,
  roleKey: CanonicalRoleKey,
): Promise<AddressCategory> {
  requireAdmin(roleKey);
  const existing = await addressesRepository.getAddressCategory(categoryId);
  if (!existing) throw new AddressError(404, "NOT_FOUND");
  // Geschützte Pflichtkategorien (Rechnungs-/Lieferadresse) bleiben unverändert.
  if (existing.isProtected) throw new AddressError(409, "ADDRESS_CATEGORY_PROTECTED");

  try {
    const result = await addressesRepository.updateAddressCategoryWithVersion(categoryId, data.version, {
      name: data.name,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    });
    if (result === "version_conflict") throw new AddressError(409, "VERSION_CONFLICT");
  } catch (error) {
    if (error instanceof AddressError) throw error;
    if (isDuplicateKeyError(error)) throw new AddressError(409, "ADDRESS_CATEGORY_NAME_CONFLICT");
    throw error;
  }
  const category = await addressesRepository.getAddressCategory(categoryId);
  if (!category) throw new AddressError(404, "NOT_FOUND");
  return category;
}

export async function deleteCategory(
  categoryId: number,
  version: number,
  roleKey: CanonicalRoleKey,
): Promise<void> {
  requireAdmin(roleKey);
  const existing = await addressesRepository.getAddressCategory(categoryId);
  if (!existing) throw new AddressError(404, "NOT_FOUND");
  if (existing.isProtected) throw new AddressError(409, "ADDRESS_CATEGORY_PROTECTED");
  if (existing.version !== version) throw new AddressError(409, "VERSION_CONFLICT");
  if (await addressesRepository.isCategoryInUse(categoryId)) throw new AddressError(409, "ADDRESS_CATEGORY_IN_USE");
  await addressesRepository.deleteAddressCategory(categoryId);
}
