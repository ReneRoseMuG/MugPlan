import { desc, eq, sql } from "drizzle-orm";
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

export async function createCustomer(data: InsertCustomer & { fullName: string }): Promise<Customer> {
  const result = await db.insert(customers).values(data);
  const insertId = (result as any)[0].insertId;
  const [customer] = await db.select().from(customers).where(eq(customers.id, insertId));
  return customer;
}

export async function updateCustomerWithVersion(
  id: number,
  expectedVersion: number,
  data: UpdateCustomer & { fullName?: string },
): Promise<{ kind: "updated"; customer: Customer } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update customer
    set
      customer_number = coalesce(${data.customerNumber ?? null}, customer_number),
      first_name = coalesce(${data.firstName ?? null}, first_name),
      last_name = coalesce(${data.lastName ?? null}, last_name),
      full_name = coalesce(${data.fullName ?? null}, full_name),
      company = ${data.company ?? null},
      email = ${data.email ?? null},
      phone = coalesce(${data.phone ?? null}, phone),
      address_line1 = ${data.addressLine1 ?? null},
      address_line2 = ${data.addressLine2 ?? null},
      postal_code = ${data.postalCode ?? null},
      city = ${data.city ?? null},
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);

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
