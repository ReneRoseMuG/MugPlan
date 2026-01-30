import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { helpTexts, type HelpText, type InsertHelpText, type UpdateHelpText } from "@shared/schema";

export async function getHelpTexts(query?: string): Promise<HelpText[]> {
  if (query && query.trim()) {
    const searchTerm = `%${query.trim().toLowerCase()}%`;
    return db
      .select()
      .from(helpTexts)
      .where(sql`LOWER(${helpTexts.helpKey}) LIKE ${searchTerm} OR LOWER(${helpTexts.title}) LIKE ${searchTerm}`)
      .orderBy(asc(helpTexts.helpKey));
  }
  return db.select().from(helpTexts).orderBy(asc(helpTexts.helpKey));
}

export async function getHelpTextById(id: number): Promise<HelpText | null> {
  const [helpText] = await db.select().from(helpTexts).where(eq(helpTexts.id, id));
  return helpText || null;
}

export async function getHelpTextByKey(helpKey: string): Promise<HelpText | null> {
  const [helpText] = await db
    .select()
    .from(helpTexts)
    .where(and(eq(helpTexts.helpKey, helpKey), eq(helpTexts.isActive, true)));
  return helpText || null;
}

export async function getHelpTextByKeyIncludingInactive(helpKey: string): Promise<HelpText | null> {
  const [helpText] = await db.select().from(helpTexts).where(eq(helpTexts.helpKey, helpKey));
  return helpText || null;
}

export async function createHelpText(data: InsertHelpText): Promise<HelpText> {
  const result = await db.insert(helpTexts).values(data);
  const insertId = (result as any)[0].insertId;
  const [helpText] = await db.select().from(helpTexts).where(eq(helpTexts.id, insertId));
  return helpText;
}

export async function updateHelpText(id: number, data: UpdateHelpText): Promise<HelpText | null> {
  await db
    .update(helpTexts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(helpTexts.id, id));
  const [helpText] = await db.select().from(helpTexts).where(eq(helpTexts.id, id));
  return helpText || null;
}

export async function toggleHelpTextActive(id: number, isActive: boolean): Promise<HelpText | null> {
  await db
    .update(helpTexts)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(helpTexts.id, id));
  const [helpText] = await db.select().from(helpTexts).where(eq(helpTexts.id, id));
  return helpText || null;
}

export async function deleteHelpText(id: number): Promise<void> {
  await db.delete(helpTexts).where(eq(helpTexts.id, id));
}
