import type { Customer, InsertCustomer, UpdateCustomer } from "@shared/schema";
import * as customersRepository from "../repositories/customersRepository";

export class CustomersError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR";

  constructor(status: number, code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export async function listCustomers(): Promise<Customer[]> {
  return customersRepository.getCustomers();
}

export async function getCustomer(id: number): Promise<Customer | null> {
  return customersRepository.getCustomer(id);
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
): Promise<Customer | null> {
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new CustomersError(422, "VALIDATION_ERROR");
  }

  const existing = await customersRepository.getCustomer(id);
  if (!existing) return null;

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
