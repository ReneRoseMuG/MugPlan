import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  addressCategories,
  customerAddresses,
  customers,
  ADDRESS_ROLE_BILLING,
  ADDRESS_ROLE_DELIVERY,
  type AddressCategory,
} from "@shared/schema";

export type CustomerAddressItem = {
  id: number;
  customerId: number;
  categoryId: number;
  categoryName: string;
  roleKey: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  isSystemManaged: boolean;
  isEffectiveDelivery: boolean;
  version: number;
};

export type CustomerAddressFieldInput = {
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
};

function toItem(
  row: {
    id: number;
    customerId: number;
    categoryId: number;
    categoryName: string;
    roleKey: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    version: number;
  },
  hasDelivery: boolean,
): CustomerAddressItem {
  const isEffectiveDelivery = hasDelivery
    ? row.roleKey === ADDRESS_ROLE_DELIVERY
    : row.roleKey === ADDRESS_ROLE_BILLING;
  return {
    ...row,
    isSystemManaged: row.roleKey === ADDRESS_ROLE_BILLING,
    isEffectiveDelivery,
  };
}

const baseSelect = {
  id: customerAddresses.id,
  customerId: customerAddresses.customerId,
  categoryId: customerAddresses.categoryId,
  categoryName: addressCategories.name,
  roleKey: addressCategories.roleKey,
  addressLine1: customerAddresses.addressLine1,
  addressLine2: customerAddresses.addressLine2,
  postalCode: customerAddresses.postalCode,
  city: customerAddresses.city,
  country: customerAddresses.country,
  version: customerAddresses.version,
};

export async function customerExists(customerId: number): Promise<boolean> {
  const [row] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).limit(1);
  return !!row;
}

export async function listCustomerAddresses(customerId: number): Promise<CustomerAddressItem[]> {
  const rows = await db
    .select(baseSelect)
    .from(customerAddresses)
    .innerJoin(addressCategories, eq(addressCategories.id, customerAddresses.categoryId))
    .where(eq(customerAddresses.customerId, customerId))
    .orderBy(asc(addressCategories.sortOrder), asc(customerAddresses.id));
  const hasDelivery = rows.some((row) => row.roleKey === ADDRESS_ROLE_DELIVERY);
  return rows.map((row) => toItem(row, hasDelivery));
}

export async function getCustomerAddress(
  customerId: number,
  addressId: number,
): Promise<CustomerAddressItem | null> {
  const rows = await db
    .select(baseSelect)
    .from(customerAddresses)
    .innerJoin(addressCategories, eq(addressCategories.id, customerAddresses.categoryId))
    .where(and(eq(customerAddresses.customerId, customerId), eq(customerAddresses.id, addressId)))
    .limit(1);
  if (rows.length === 0) return null;
  // Das isEffectiveDelivery-Flag hängt vom Kundenkontext ab (Liefer- vor Rechnungsadresse).
  const all = await listCustomerAddresses(customerId);
  return all.find((item) => item.id === addressId) ?? null;
}

export async function createCustomerAddress(
  customerId: number,
  categoryId: number,
  fields: CustomerAddressFieldInput,
): Promise<number> {
  const result = await db.insert(customerAddresses).values({
    customerId,
    categoryId,
    ...fields,
    version: 1,
  });
  return Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0);
}

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const EMPTY_ADDRESS_FIELDS: CustomerAddressFieldInput = {
  addressLine1: null,
  addressLine2: null,
  postalCode: null,
  city: null,
  country: null,
};

/**
 * Stellt die Rechnungsadress-Zeile (Kategorie roleKey=BILLING) eines Kunden sicher und setzt
 * sie auf die übergebenen Werte (MS-68). Zentrale, transaktionsfähige Schreibstelle der
 * Rechnungsadresse: Beim Anlegen eines Kunden wird sie atomar miterzeugt (Default: leere
 * Felder), System-/Seed-Pfade übergeben feste Werte. Fehlt die Pflichtkategorie BILLING, ist
 * das ein Systemfehler (kein stilles Überspringen) — die Invariante „jeder Kunde hat eine
 * Rechnungsadresse" muss gewahrt bleiben.
 */
export async function ensureBillingAddressTx(
  tx: DbTx,
  customerId: number,
  fields: CustomerAddressFieldInput = EMPTY_ADDRESS_FIELDS,
): Promise<void> {
  const [billingCategory] = await tx
    .select({ id: addressCategories.id })
    .from(addressCategories)
    .where(eq(addressCategories.roleKey, ADDRESS_ROLE_BILLING))
    .limit(1);
  if (!billingCategory) {
    throw new Error("Rechnungsadress-Kategorie (BILLING) fehlt — System-Seed nicht ausgeführt.");
  }

  const [existing] = await tx
    .select({ id: customerAddresses.id })
    .from(customerAddresses)
    .where(and(eq(customerAddresses.customerId, customerId), eq(customerAddresses.categoryId, billingCategory.id)))
    .limit(1);

  if (existing) {
    await tx
      .update(customerAddresses)
      .set({ ...fields, updatedAt: sql`now()`, version: sql`${customerAddresses.version} + 1` })
      .where(eq(customerAddresses.id, existing.id));
    return;
  }

  await tx.insert(customerAddresses).values({
    customerId,
    categoryId: billingCategory.id,
    ...fields,
    version: 1,
  });
}

export async function updateCustomerAddressWithVersion(
  addressId: number,
  expectedVersion: number,
  categoryId: number,
  fields: CustomerAddressFieldInput,
): Promise<"updated" | "version_conflict"> {
  const result = await db
    .update(customerAddresses)
    .set({
      categoryId,
      ...fields,
      updatedAt: sql`now()`,
      version: sql`${customerAddresses.version} + 1`,
    })
    .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.version, expectedVersion)));
  const affected = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  return affected === 0 ? "version_conflict" : "updated";
}

export async function deleteCustomerAddressWithVersion(
  addressId: number,
  expectedVersion: number,
): Promise<"deleted" | "version_conflict"> {
  const result = await db
    .delete(customerAddresses)
    .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.version, expectedVersion)));
  const affected = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  return affected === 0 ? "version_conflict" : "deleted";
}

// --- Adresskategorie-Katalog (FT 09 / UC 09-27, 09-28) ---

export async function listAddressCategories(): Promise<AddressCategory[]> {
  return db.select().from(addressCategories).orderBy(asc(addressCategories.sortOrder), asc(addressCategories.id));
}

export async function getAddressCategory(categoryId: number): Promise<AddressCategory | null> {
  const [row] = await db.select().from(addressCategories).where(eq(addressCategories.id, categoryId)).limit(1);
  return row ?? null;
}

export async function createAddressCategory(name: string, sortOrder: number): Promise<number> {
  const result = await db.insert(addressCategories).values({
    name,
    roleKey: null,
    isProtected: false,
    sortOrder,
    isActive: true,
    version: 1,
  });
  return Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0);
}

export async function updateAddressCategoryWithVersion(
  categoryId: number,
  expectedVersion: number,
  changes: { name?: string; sortOrder?: number; isActive?: boolean },
): Promise<"updated" | "version_conflict"> {
  const updateData: Record<string, unknown> = {
    updatedAt: sql`now()`,
    version: sql`${addressCategories.version} + 1`,
  };
  if (changes.name !== undefined) updateData.name = changes.name;
  if (changes.sortOrder !== undefined) updateData.sortOrder = changes.sortOrder;
  if (changes.isActive !== undefined) updateData.isActive = changes.isActive;

  const result = await db
    .update(addressCategories)
    .set(updateData)
    .where(and(eq(addressCategories.id, categoryId), eq(addressCategories.version, expectedVersion)));
  const affected = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  return affected === 0 ? "version_conflict" : "updated";
}

export async function deleteAddressCategory(categoryId: number): Promise<void> {
  await db.delete(addressCategories).where(eq(addressCategories.id, categoryId));
}

export async function isCategoryInUse(categoryId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: customerAddresses.id })
    .from(customerAddresses)
    .where(eq(customerAddresses.categoryId, categoryId))
    .limit(1);
  return !!row;
}
