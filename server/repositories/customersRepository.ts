import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  customerAttachments,
  customers,
  type Customer,
  type CustomerAttachment,
  type InsertCustomer,
  type InsertCustomerAttachment,
  type UpdateCustomer,
} from "@shared/schema";

export async function getCustomers(scope: "active" | "inactive" = "active"): Promise<Customer[]> {
  return db
    .select()
    .from(customers)
    .where(eq(customers.isActive, scope === "active"))
    .orderBy(customers.id);
}

export async function getCustomer(id: number): Promise<Customer | null> {
  const [customer] = await db.select().from(customers).where(eq(customers.id, id));
  return customer || null;
}

export async function listCustomerNumbers(): Promise<string[]> {
  const rows = await db
    .select({ customerNumber: customers.customerNumber })
    .from(customers);
  return rows.map((row) => row.customerNumber);
}

export async function getCustomersByCustomerNumber(customerNumber: string): Promise<Customer[]> {
  return db
    .select()
    .from(customers)
    .where(eq(customers.customerNumber, customerNumber.trim()));
}

export async function createCustomer(data: InsertCustomer & { fullName: string | null }): Promise<Customer> {
  const result = await db.insert(customers).values(data);
  const insertId = (result as any)[0].insertId;
  const [customer] = await db.select().from(customers).where(eq(customers.id, insertId));
  return customer;
}

export async function updateCustomerWithVersion(
  id: number,
  expectedVersion: number,
  data: UpdateCustomer & { fullName?: string | null },
): Promise<{ kind: "updated"; customer: Customer } | { kind: "version_conflict" }> {
  const updateData: Record<string, unknown> = {
    updatedAt: sql`now()`,
    version: sql`${customers.version} + 1`,
  };

  if (data.customerNumber !== undefined) updateData.customerNumber = data.customerNumber;
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.fullName !== undefined) updateData.fullName = data.fullName;
  if (data.company !== undefined) updateData.company = data.company;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.addressLine1 !== undefined) updateData.addressLine1 = data.addressLine1;
  if (data.addressLine2 !== undefined) updateData.addressLine2 = data.addressLine2;
  if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
  if (data.city !== undefined) updateData.city = data.city;

  const result = await db
    .update(customers)
    .set(updateData)
    .where(and(eq(customers.id, id), eq(customers.version, expectedVersion)));

  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) {
    return { kind: "version_conflict" };
  }

  const [customer] = await db.select().from(customers).where(eq(customers.id, id));
  return { kind: "updated", customer };
}

export async function getCustomerAttachments(customerId: number): Promise<CustomerAttachment[]> {
  return db
    .select()
    .from(customerAttachments)
    .where(eq(customerAttachments.customerId, customerId))
    .orderBy(desc(customerAttachments.createdAt));
}

export async function getCustomerAttachmentById(id: number): Promise<CustomerAttachment | null> {
  const [attachment] = await db
    .select()
    .from(customerAttachments)
    .where(eq(customerAttachments.id, id));
  return attachment ?? null;
}

export async function createCustomerAttachment(data: InsertCustomerAttachment): Promise<CustomerAttachment> {
  const result = await db.insert(customerAttachments).values(data);
  const insertId = (result as any)[0].insertId;
  const [attachment] = await db
    .select()
    .from(customerAttachments)
    .where(eq(customerAttachments.id, insertId));
  return attachment;
}
