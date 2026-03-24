import type { CustomerAttachment, InsertCustomerAttachment } from "@shared/schema";
import * as customersRepository from "../repositories/customersRepository";

export async function listCustomerAttachments(customerId: number): Promise<CustomerAttachment[]> {
  return customersRepository.getCustomerAttachments(customerId);
}

export async function getCustomerAttachmentById(id: number): Promise<CustomerAttachment | null> {
  return customersRepository.getCustomerAttachmentById(id);
}

export async function createCustomerAttachment(data: InsertCustomerAttachment): Promise<CustomerAttachment> {
  return customersRepository.createCustomerAttachment(data);
}

export async function softDeleteCustomerAttachment(id: number): Promise<void> {
  await customersRepository.deleteCustomerAttachment(id);
}

export async function hardDeleteCustomerAttachment(id: number): Promise<void> {
  await customersRepository.deleteCustomerAttachment(id);
}
