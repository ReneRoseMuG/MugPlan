import { desc, eq } from "drizzle-orm";
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

export async function getCustomers(): Promise<Customer[]> {
  return db
    .select()
    .from(customers)
    .where(eq(customers.isActive, true))
    .orderBy(customers.id);
}

export async function getCustomer(id: number): Promise<Customer | null> {
  const [customer] = await db.select().from(customers).where(eq(customers.id, id));
  return customer || null;
}

export async function createCustomer(data: InsertCustomer & { fullName: string }): Promise<Customer> {
  const result = await db.insert(customers).values(data);
  const insertId = (result as any)[0].insertId;
  const [customer] = await db.select().from(customers).where(eq(customers.id, insertId));
  return customer;
}

export async function updateCustomer(
  id: number,
  data: UpdateCustomer & { fullName?: string },
): Promise<Customer | null> {
  await db
    .update(customers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(customers.id, id));
  const [customer] = await db.select().from(customers).where(eq(customers.id, id));
  return customer || null;
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
