import { eq } from "drizzle-orm";
import { db } from "../db";
import { customers, type Customer, type InsertCustomer, type UpdateCustomer } from "@shared/schema";

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
