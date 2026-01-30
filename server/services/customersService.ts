import type { Customer, InsertCustomer, UpdateCustomer } from "@shared/schema";
import * as customersRepository from "../repositories/customersRepository";

export async function listCustomers(): Promise<Customer[]> {
  return customersRepository.getCustomers();
}

export async function getCustomer(id: number): Promise<Customer | null> {
  return customersRepository.getCustomer(id);
}

export async function createCustomer(data: InsertCustomer): Promise<Customer> {
  const fullName = `${data.lastName}, ${data.firstName}`;
  return customersRepository.createCustomer({ ...data, fullName });
}

export async function updateCustomer(id: number, data: UpdateCustomer): Promise<Customer | null> {
  const existing = await customersRepository.getCustomer(id);
  if (!existing) return null;

  let fullName = existing.fullName;
  if (data.firstName !== undefined || data.lastName !== undefined) {
    const firstName = data.firstName !== undefined ? data.firstName : existing.firstName;
    const lastName = data.lastName !== undefined ? data.lastName : existing.lastName;
    fullName = `${lastName}, ${firstName}`;
  }

  return customersRepository.updateCustomer(id, { ...data, fullName });
}
