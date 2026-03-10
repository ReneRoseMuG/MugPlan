import { eq, sql } from "drizzle-orm";
import {
  componentCategories,
  components,
  productCategories,
  products,
} from "@shared/schema";
import { db } from "../db";
import { logError, logInfo } from "../lib/logger";
import type { OvenRow, SaunaModelRow } from "./types";

const logPrefix = "[product-component-seeder]";

const PRODUCT_CATEGORY_NAMES = ["Sauna", "Ausstattung"] as const;
const COMPONENT_CATEGORY_NAMES = ["Saunamodell", "Ofen", "Steuerung", "Dach", "Tür", "Fenster"] as const;

const PRODUCT_DEFINITIONS = {
  sauna: { name: "Sauna", categoryName: "Sauna" },
  oven: { name: "Ofen", categoryName: "Ausstattung" },
  roof: { name: "Dach", categoryName: "Ausstattung" },
  door: { name: "Tür", categoryName: "Ausstattung" },
  window: { name: "Fenster", categoryName: "Ausstattung" },
} as const;

const STATIC_COMPONENTS = {
  roof: ["Runddach", "Satteldach", "Tonnendach", "Aluminiumblech-Dach", "Alu-Prefa-Dach", "Kunststoffschindeln"],
  door: ["Standardtür", "Ganzglastür", "Doppelverglaste Tür", "Thermopane-Tür"],
  window: ["Ohne Fenster", "Rückwandfenster einfach", "Rückwandfenster doppelt verglast", "Seitenfenster", "Kippfenster"],
} as const;

export type ProductComponentSeedResult = {
  productCategoriesCreated: number;
  productCategoriesSkipped: number;
  componentCategoriesCreated: number;
  componentCategoriesSkipped: number;
  productsCreated: number;
  productsSkipped: number;
  componentsCreated: number;
  componentsSkipped: number;
  linksCreated: number;
  linksSkipped: number;
};

function createEmptyResult(): ProductComponentSeedResult {
  return {
    productCategoriesCreated: 0,
    productCategoriesSkipped: 0,
    componentCategoriesCreated: 0,
    componentCategoriesSkipped: 0,
    productsCreated: 0,
    productsSkipped: 0,
    componentsCreated: 0,
    componentsSkipped: 0,
    linksCreated: 0,
    linksSkipped: 0,
  };
}

function toAffectedRows(result: unknown): number {
  return Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
}

function compactDescription(parts: Array<string | null>): string | null {
  const filtered = parts
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0);
  return filtered.length > 0 ? filtered.join(" | ") : null;
}

function buildSaunaDescription(row: SaunaModelRow): string | null {
  return compactDescription([
    row.saunaShape.trim() ? `Form: ${row.saunaShape}` : null,
    row.saunaLCm.trim() || row.saunaWCm.trim() || row.saunaHCm.trim()
      ? `Maße L×B×H: ${row.saunaLCm}×${row.saunaWCm}×${row.saunaHCm} cm`
      : null,
    row.saunaWallThicknessMm.trim() ? `Wandstärke: ${row.saunaWallThicknessMm} mm` : null,
    row.saunaOuterWood.trim() ? `Außenholz: ${row.saunaOuterWood}` : null,
  ]);
}

function buildOvenDescription(row: OvenRow): string | null {
  return compactDescription([
    row.ovenType.trim() ? `Typ: ${row.ovenType}` : null,
    row.ovenPowerKw.trim() ? `Leistung: ${row.ovenPowerKw} kW` : null,
    row.ovenBrand.trim() ? `Marke: ${row.ovenBrand}` : null,
    row.ovenPriceEur.trim() ? `Preis: ${row.ovenPriceEur} €` : null,
  ]);
}

async function ensureProductCategory(name: string) {
  const insertResult = await db.execute(sql`
    INSERT IGNORE INTO product_categories (name, is_active, version, created_at, updated_at)
    VALUES (${name}, 1, 1, now(), now())
  `);
  const [row] = await db.select().from(productCategories).where(eq(productCategories.name, name));
  if (!row) {
    throw new Error(`Produktkategorie konnte nicht geladen werden: ${name}`);
  }
  return { row, created: toAffectedRows(insertResult) > 0 };
}

async function ensureComponentCategory(name: string) {
  const insertResult = await db.execute(sql`
    INSERT IGNORE INTO component_categories (name, is_active, version, created_at, updated_at)
    VALUES (${name}, 1, 1, now(), now())
  `);
  const [row] = await db.select().from(componentCategories).where(eq(componentCategories.name, name));
  if (!row) {
    throw new Error(`Komponentenkategorie konnte nicht geladen werden: ${name}`);
  }
  return { row, created: toAffectedRows(insertResult) > 0 };
}

async function ensureProduct(name: string, categoryId: number, description: string | null) {
  const insertResult = await db.execute(sql`
    INSERT IGNORE INTO products (name, category_id, description, is_active, version, created_at, updated_at)
    VALUES (${name}, ${categoryId}, ${description}, 1, 1, now(), now())
  `);
  const [row] = await db.select().from(products).where(eq(products.name, name));
  if (!row) {
    throw new Error(`Produkt konnte nicht geladen werden: ${name}`);
  }
  return { row, created: toAffectedRows(insertResult) > 0 };
}

async function ensureComponent(name: string, categoryId: number, description: string | null) {
  const insertResult = await db.execute(sql`
    INSERT IGNORE INTO components (name, category_id, description, is_active, version, created_at, updated_at)
    VALUES (${name}, ${categoryId}, ${description}, 1, 1, now(), now())
  `);
  const [row] = await db.select().from(components).where(eq(components.name, name));
  if (!row) {
    throw new Error(`Komponente konnte nicht geladen werden: ${name}`);
  }
  return { row, created: toAffectedRows(insertResult) > 0 };
}

async function ensureProductComponentLink(productId: number, componentId: number) {
  const insertResult = await db.execute(sql`
    INSERT IGNORE INTO product_component (product_id, component_id, version)
    VALUES (${productId}, ${componentId}, 1)
  `);
  return { created: toAffectedRows(insertResult) > 0 };
}

export async function seedProductsAndComponents(
  saunaModels: SaunaModelRow[],
  ovens: OvenRow[],
): Promise<ProductComponentSeedResult> {
  const result = createEmptyResult();

  try {
    const productCategoryByName = new Map<string, number>();
    for (const name of PRODUCT_CATEGORY_NAMES) {
      const ensured = await ensureProductCategory(name);
      productCategoryByName.set(name, ensured.row.id);
      if (ensured.created) {
        result.productCategoriesCreated += 1;
      } else {
        result.productCategoriesSkipped += 1;
      }
    }

    const componentCategoryByName = new Map<string, number>();
    for (const name of COMPONENT_CATEGORY_NAMES) {
      const ensured = await ensureComponentCategory(name);
      componentCategoryByName.set(name, ensured.row.id);
      if (ensured.created) {
        result.componentCategoriesCreated += 1;
      } else {
        result.componentCategoriesSkipped += 1;
      }
    }

    const productByKey = new Map<keyof typeof PRODUCT_DEFINITIONS, number>();
    for (const [key, definition] of Object.entries(PRODUCT_DEFINITIONS) as Array<
      [keyof typeof PRODUCT_DEFINITIONS, (typeof PRODUCT_DEFINITIONS)[keyof typeof PRODUCT_DEFINITIONS]]
    >) {
      const categoryId = productCategoryByName.get(definition.categoryName);
      if (!categoryId) {
        throw new Error(`Produktkategorie-ID fehlt: ${definition.categoryName}`);
      }
      const ensured = await ensureProduct(definition.name, categoryId, null);
      productByKey.set(key, ensured.row.id);
      if (ensured.created) {
        result.productsCreated += 1;
      } else {
        result.productsSkipped += 1;
      }
    }

    const seedComponent = async (
      productKey: keyof typeof PRODUCT_DEFINITIONS,
      categoryName: string,
      name: string,
      description: string | null,
    ) => {
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        logInfo(`${logPrefix} skip empty component name`, { productKey, categoryName });
        return;
      }
      const categoryId = componentCategoryByName.get(categoryName);
      const productId = productByKey.get(productKey);
      if (!categoryId) {
        throw new Error(`Komponentenkategorie-ID fehlt: ${categoryName}`);
      }
      if (!productId) {
        throw new Error(`Produkt-ID fehlt: ${productKey}`);
      }

      const component = await ensureComponent(trimmedName, categoryId, description);
      if (component.created) {
        result.componentsCreated += 1;
      } else {
        result.componentsSkipped += 1;
      }

      const link = await ensureProductComponentLink(productId, component.row.id);
      if (link.created) {
        result.linksCreated += 1;
      } else {
        result.linksSkipped += 1;
      }
    };

    for (const row of saunaModels) {
      await seedComponent("sauna", "Saunamodell", row.saunaModelName, buildSaunaDescription(row));
    }

    for (const row of ovens) {
      await seedComponent("oven", "Ofen", row.ovenName, buildOvenDescription(row));
    }

    for (const name of STATIC_COMPONENTS.roof) {
      await seedComponent("roof", "Dach", name, null);
    }
    for (const name of STATIC_COMPONENTS.door) {
      await seedComponent("door", "Tür", name, null);
    }
    for (const name of STATIC_COMPONENTS.window) {
      await seedComponent("window", "Fenster", name, null);
    }

    return result;
  } catch (error) {
    logError(`${logPrefix} seed failed`, {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
