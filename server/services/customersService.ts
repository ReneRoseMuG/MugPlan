import type { Customer, InsertCustomer, UpdateCustomer } from "@shared/schema";
import * as customersRepository from "../repositories/customersRepository";
import type { CanonicalRoleKey } from "../settings/registry";

export class CustomersError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "FORBIDDEN" | "CUSTOMER_NUMBER_CONFLICT";

  constructor(
    status: number,
    code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "FORBIDDEN" | "CUSTOMER_NUMBER_CONFLICT",
  ) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function isCustomerNumberDuplicateError(error: unknown): boolean {
  const mysqlError = error as { code?: string; errno?: number; sqlMessage?: string } | null;
  if (!(mysqlError?.code === "ER_DUP_ENTRY" || mysqlError?.errno === 1062)) {
    return false;
  }
  return true;
}

function resolveScope(roleKey: CanonicalRoleKey, requestedScope: "active" | "inactive"): "active" | "inactive" {
  if (roleKey !== "ADMIN") return "active";
  return requestedScope;
}

function normalizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function buildCustomerFullName(data: { firstName?: string | null; lastName?: string | null; company?: string | null }): string | null {
  const firstName = normalizeOptionalText(data.firstName);
  const lastName = normalizeOptionalText(data.lastName);
  const company = normalizeOptionalText(data.company);

  if (firstName && lastName) {
    return `${lastName}, ${firstName}`;
  }
  if (lastName) return lastName;
  if (firstName) return firstName;
  if (company) return company;
  return null;
}

export async function listCustomers(roleKey: CanonicalRoleKey, scope: "active" | "inactive" = "active"): Promise<Customer[]> {
  return customersRepository.getCustomers(resolveScope(roleKey, scope));
}

export async function getCustomer(id: number, roleKey: CanonicalRoleKey): Promise<Customer | null> {
  const customer = await customersRepository.getCustomer(id);
  if (!customer) return null;
  if (roleKey !== "ADMIN" && !customer.isActive) return null;
  return customer;
}

export async function getCustomersByCustomerNumber(customerNumber: string): Promise<Customer[]> {
  return customersRepository.getCustomersByCustomerNumber(customerNumber);
}

export async function createCustomer(data: InsertCustomer): Promise<Customer> {
  const normalizedData: InsertCustomer = {
    ...data,
    firstName: normalizeOptionalText(data.firstName),
    lastName: normalizeOptionalText(data.lastName),
    company: normalizeOptionalText(data.company),
    email: normalizeOptionalText(data.email),
    phone: normalizeOptionalText(data.phone),
    addressLine1: normalizeOptionalText(data.addressLine1),
    addressLine2: normalizeOptionalText(data.addressLine2),
    postalCode: normalizeOptionalText(data.postalCode),
    city: normalizeOptionalText(data.city),
  };
  const fullName = buildCustomerFullName(normalizedData);
  try {
    return await customersRepository.createCustomer({ ...normalizedData, fullName });
  } catch (error) {
    if (isCustomerNumberDuplicateError(error)) {
      throw new CustomersError(409, "CUSTOMER_NUMBER_CONFLICT");
    }
    throw error;
  }
}

export async function updateCustomer(
  id: number,
  data: UpdateCustomer & { version: number },
  roleKey: CanonicalRoleKey,
): Promise<Customer | null> {
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new CustomersError(422, "VALIDATION_ERROR");
  }

  const existing = await customersRepository.getCustomer(id);
  if (!existing) return null;
  if (roleKey !== "ADMIN" && !existing.isActive) return null;
  if (roleKey !== "ADMIN" && data.isActive !== undefined && data.isActive !== existing.isActive) {
    throw new CustomersError(403, "FORBIDDEN");
  }

  const normalizedUpdateData: UpdateCustomer = {
    ...data,
    firstName: normalizeOptionalText(data.firstName),
    lastName: normalizeOptionalText(data.lastName),
    company: normalizeOptionalText(data.company),
    email: normalizeOptionalText(data.email),
    phone: normalizeOptionalText(data.phone),
    addressLine1: normalizeOptionalText(data.addressLine1),
    addressLine2: normalizeOptionalText(data.addressLine2),
    postalCode: normalizeOptionalText(data.postalCode),
    city: normalizeOptionalText(data.city),
  };

  const willUpdateNameParts =
    normalizedUpdateData.firstName !== undefined ||
    normalizedUpdateData.lastName !== undefined ||
    normalizedUpdateData.company !== undefined;

  const fullName = willUpdateNameParts
    ? buildCustomerFullName({
        firstName: normalizedUpdateData.firstName !== undefined ? normalizedUpdateData.firstName : existing.firstName,
        lastName: normalizedUpdateData.lastName !== undefined ? normalizedUpdateData.lastName : existing.lastName,
        company: normalizedUpdateData.company !== undefined ? normalizedUpdateData.company : existing.company,
      })
    : undefined;

  const result = await customersRepository.updateCustomerWithVersion(id, data.version, { ...normalizedUpdateData, fullName });
  if (result.kind === "version_conflict") {
    const exists = await customersRepository.getCustomer(id);
    if (!exists) return null;
    throw new CustomersError(409, "VERSION_CONFLICT");
  }
  return result.customer;
}
