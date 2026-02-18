import type { Customer, InsertCustomer, UpdateCustomer } from "@shared/schema";
import * as customersRepository from "../repositories/customersRepository";
import type { CanonicalRoleKey } from "../settings/registry";

export class CustomersError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "FORBIDDEN";

  constructor(status: number, code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "FORBIDDEN") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function resolveScope(roleKey: CanonicalRoleKey, requestedScope: "active" | "inactive"): "active" | "inactive" {
  if (roleKey !== "ADMIN") return "active";
  return requestedScope;
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
  const fullName = `${data.lastName}, ${data.firstName}`;
  return customersRepository.createCustomer({ ...data, fullName });
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

  let fullName = existing.fullName;
  if (data.firstName !== undefined || data.lastName !== undefined) {
    const firstName = data.firstName !== undefined ? data.firstName : existing.firstName;
    const lastName = data.lastName !== undefined ? data.lastName : existing.lastName;
    fullName = `${lastName}, ${firstName}`;
  }

  const result = await customersRepository.updateCustomerWithVersion(id, data.version, { ...data, fullName });
  if (result.kind === "version_conflict") {
    const exists = await customersRepository.getCustomer(id);
    if (!exists) return null;
    throw new CustomersError(409, "VERSION_CONFLICT");
  }
  return result.customer;
}
