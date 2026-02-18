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

export async function updateHelpTextWithVersion(
  id: number,
  expectedVersion: number,
  data: UpdateHelpText,
): Promise<{ kind: "updated"; helpText: HelpText } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update help_texts
    set
      help_key = coalesce(${data.helpKey ?? null}, help_key),
      title = coalesce(${data.title ?? null}, title),
      body = coalesce(${data.body ?? null}, body),
      is_active = coalesce(${data.isActive ?? null}, is_active),
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) return { kind: "version_conflict" };
  const [helpText] = await db.select().from(helpTexts).where(eq(helpTexts.id, id));
  return { kind: "updated", helpText };
}

export async function toggleHelpTextActiveWithVersion(
  id: number,
  expectedVersion: number,
  isActive: boolean,
): Promise<{ kind: "updated"; helpText: HelpText } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update help_texts
    set
      is_active = ${isActive},
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) return { kind: "version_conflict" };
  const [helpText] = await db.select().from(helpTexts).where(eq(helpTexts.id, id));
  return { kind: "updated", helpText };
}

export async function deleteHelpTextWithVersion(
  id: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    delete from help_texts
    where id = ${id}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  return affectedRows === 0 ? { kind: "version_conflict" } : { kind: "deleted" };
}
