import { eq, sql } from "drizzle-orm";
import {
  productCategories,
  addressCategories,
  ADDRESS_ROLE_BILLING,
  ADDRESS_ROLE_DELIVERY,
} from "@shared/schema";
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
    .where(eq(productCategories.name, "Fass Saunen"))
    .limit(1);

  if (!existing) {
    try {
      await db.insert(productCategories).values({
        name: "Fass Saunen",
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

// Stellt eine geschützte Adress-Rollenkategorie sicher (Rechnungs-/Lieferadresse).
// Idempotent anhand des eindeutigen role_key. Die Auflösung der wirksamen Lieferadresse
// beruht auf diesen beiden Pflichteinträgen (MS-68, FT 09).
async function ensureAddressRoleCategory(
  name: string,
  roleKey: string,
  sortOrder: number,
): Promise<void> {
  const [existing] = await db
    .select({ id: addressCategories.id })
    .from(addressCategories)
    .where(eq(addressCategories.roleKey, roleKey))
    .limit(1);

  if (existing) {
    return;
  }

  try {
    await db.insert(addressCategories).values({
      name,
      roleKey,
      isProtected: true,
      sortOrder,
      isActive: true,
      version: 1,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
  }
}

async function ensureAddressCategoryDefaults(): Promise<void> {
  await ensureAddressRoleCategory("Rechnungsadresse", ADDRESS_ROLE_BILLING, 1);
  await ensureAddressRoleCategory("Lieferadresse", ADDRESS_ROLE_DELIVERY, 2);
}

export async function ensureMasterDataDefaults(): Promise<void> {
  await ensureProductDefaultCategory();
  await ensureAddressCategoryDefaults();
}
