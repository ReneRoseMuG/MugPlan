import { eq, sql } from "drizzle-orm";
import { componentCategories, productCategories } from "@shared/schema";
import { db } from "../db";

function isDuplicateKeyError(error: unknown): boolean {
  const mysqlError = error as { code?: string; errno?: number } | null;
  return mysqlError?.code === "ER_DUP_ENTRY" || mysqlError?.errno === 1062;
}

async function ensureProductDefaultCategory(): Promise<void> {
  const [existing] = await db
    .select({
      id: productCategories.id,
      isActive: productCategories.isActive,
    })
    .from(productCategories)
    .where(eq(productCategories.name, "Alle Produkte"))
    .limit(1);

  if (!existing) {
    try {
      await db.insert(productCategories).values({
        name: "Alle Produkte",
        isActive: true,
        version: 1,
      });
      return;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }

  if (existing && !existing.isActive) {
    await db.execute(sql`
      update product_categories
      set is_active = true, updated_at = now(), version = version + 1
      where id = ${existing.id}
        and is_active = false
    `);
  }
}

async function ensureModelDefaultCategory(): Promise<void> {
  const [existing] = await db
    .select({
      id: componentCategories.id,
      isActive: componentCategories.isActive,
    })
    .from(componentCategories)
    .where(eq(componentCategories.name, "Alle Modelle"))
    .limit(1);

  if (!existing) {
    try {
      await db.insert(componentCategories).values({
        name: "Alle Modelle",
        isActive: true,
        version: 1,
      });
      return;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }

  if (existing && !existing.isActive) {
    await db.execute(sql`
      update component_categories
      set is_active = true, updated_at = now(), version = version + 1
      where id = ${existing.id}
        and is_active = false
    `);
  }
}

export async function ensureMasterDataDefaults(): Promise<void> {
  await ensureProductDefaultCategory();
  await ensureModelDefaultCategory();
}
