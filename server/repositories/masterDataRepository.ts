import { asc, eq, sql } from "drizzle-orm";
import type {
  Component,
  ComponentCategory,
  InsertComponent,
  InsertComponentCategory,
  InsertProduct,
  InsertProductCategory,
  Product,
  ProductCategory,
  UpdateComponent,
  UpdateComponentCategory,
  UpdateProduct,
  UpdateProductCategory,
} from "@shared/schema";
import {
  componentCategories,
  components,
  productCategories,
  products,
} from "@shared/schema";
import { db } from "../db";

export type ActiveFilter = "active" | "inactive" | "all";

export type VersionedDeleteResult =
  | { kind: "deleted" }
  | { kind: "not_found" }
  | { kind: "version_conflict" };

export type VersionedUpdateResult<T> =
  | { kind: "updated"; row: T }
  | { kind: "not_found" }
  | { kind: "version_conflict" };

function toAffectedRows(result: unknown): number {
  return Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
}

function toInsertId(result: unknown): number {
  return Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0);
}

async function classifyVersionedMutation(tableName: string, id: number, affectedRows: number): Promise<"ok" | "not_found" | "version_conflict"> {
  if (affectedRows > 0) return "ok";
  const [exists] = await db.execute(sql`select id from ${sql.raw(tableName)} where id = ${id} limit 1`);
  const hasRows = Array.isArray(exists) && exists.length > 0;
  return hasRows ? "version_conflict" : "not_found";
}

function whereByActive<TColumn>(column: TColumn, filter: ActiveFilter) {
  if (filter === "all") return undefined;
  return eq(column as any, filter === "active");
}

export async function listProductCategories(filter: ActiveFilter): Promise<ProductCategory[]> {
  const where = whereByActive(productCategories.isActive, filter);
  return db
    .select()
    .from(productCategories)
    .where(where)
    .orderBy(asc(productCategories.name), asc(productCategories.id));
}

export async function createProductCategory(input: InsertProductCategory): Promise<ProductCategory> {
  const result = await db.insert(productCategories).values(input);
  const id = toInsertId(result);
  const [row] = await db.select().from(productCategories).where(eq(productCategories.id, id));
  return row;
}

export async function updateProductCategoryWithVersion(
  id: number,
  expectedVersion: number,
  input: UpdateProductCategory,
): Promise<VersionedUpdateResult<ProductCategory>> {
  const result = await db.execute(sql`
    update product_categories
    set
      name = if(${input.name === undefined}, name, ${input.name ?? null}),
      is_active = if(${input.isActive === undefined}, is_active, ${input.isActive ?? null}),
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);

  const outcome = await classifyVersionedMutation("product_categories", id, toAffectedRows(result));
  if (outcome === "not_found") return { kind: "not_found" };
  if (outcome === "version_conflict") return { kind: "version_conflict" };

  const [row] = await db.select().from(productCategories).where(eq(productCategories.id, id));
  return { kind: "updated", row };
}

export async function deleteProductCategoryWithVersion(id: number, expectedVersion: number): Promise<VersionedDeleteResult> {
  const result = await db.execute(sql`
    delete from product_categories
    where id = ${id}
      and version = ${expectedVersion}
  `);

  const outcome = await classifyVersionedMutation("product_categories", id, toAffectedRows(result));
  if (outcome === "not_found") return { kind: "not_found" };
  if (outcome === "version_conflict") return { kind: "version_conflict" };
  return { kind: "deleted" };
}

export async function listComponentCategories(filter: ActiveFilter): Promise<ComponentCategory[]> {
  const where = whereByActive(componentCategories.isActive, filter);
  return db
    .select()
    .from(componentCategories)
    .where(where)
    .orderBy(asc(componentCategories.name), asc(componentCategories.id));
}

export async function createComponentCategory(input: InsertComponentCategory): Promise<ComponentCategory> {
  const result = await db.insert(componentCategories).values(input);
  const id = toInsertId(result);
  const [row] = await db.select().from(componentCategories).where(eq(componentCategories.id, id));
  return row;
}

export async function updateComponentCategoryWithVersion(
  id: number,
  expectedVersion: number,
  input: UpdateComponentCategory,
): Promise<VersionedUpdateResult<ComponentCategory>> {
  const result = await db.execute(sql`
    update component_categories
    set
      name = if(${input.name === undefined}, name, ${input.name ?? null}),
      is_active = if(${input.isActive === undefined}, is_active, ${input.isActive ?? null}),
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);

  const outcome = await classifyVersionedMutation("component_categories", id, toAffectedRows(result));
  if (outcome === "not_found") return { kind: "not_found" };
  if (outcome === "version_conflict") return { kind: "version_conflict" };

  const [row] = await db.select().from(componentCategories).where(eq(componentCategories.id, id));
  return { kind: "updated", row };
}

export async function deleteComponentCategoryWithVersion(id: number, expectedVersion: number): Promise<VersionedDeleteResult> {
  const result = await db.execute(sql`
    delete from component_categories
    where id = ${id}
      and version = ${expectedVersion}
  `);

  const outcome = await classifyVersionedMutation("component_categories", id, toAffectedRows(result));
  if (outcome === "not_found") return { kind: "not_found" };
  if (outcome === "version_conflict") return { kind: "version_conflict" };
  return { kind: "deleted" };
}

export async function listProducts(filter: ActiveFilter): Promise<Product[]> {
  const where = whereByActive(products.isActive, filter);
  return db
    .select()
    .from(products)
    .where(where)
    .orderBy(asc(products.name), asc(products.id));
}

export async function createProduct(input: InsertProduct): Promise<Product> {
  const result = await db.insert(products).values(input);
  const id = toInsertId(result);
  const [row] = await db.select().from(products).where(eq(products.id, id));
  return row;
}

export async function updateProductWithVersion(
  id: number,
  expectedVersion: number,
  input: UpdateProduct,
): Promise<VersionedUpdateResult<Product>> {
  const result = await db.execute(sql`
    update products
    set
      name = if(${input.name === undefined}, name, ${input.name ?? null}),
      category_id = if(${input.categoryId === undefined}, category_id, ${input.categoryId ?? null}),
      description = if(${input.description === undefined}, description, ${input.description ?? null}),
      is_active = if(${input.isActive === undefined}, is_active, ${input.isActive ?? null}),
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);

  const outcome = await classifyVersionedMutation("products", id, toAffectedRows(result));
  if (outcome === "not_found") return { kind: "not_found" };
  if (outcome === "version_conflict") return { kind: "version_conflict" };

  const [row] = await db.select().from(products).where(eq(products.id, id));
  return { kind: "updated", row };
}

export async function deleteProductWithVersion(id: number, expectedVersion: number): Promise<VersionedDeleteResult> {
  const result = await db.execute(sql`
    delete from products
    where id = ${id}
      and version = ${expectedVersion}
  `);

  const outcome = await classifyVersionedMutation("products", id, toAffectedRows(result));
  if (outcome === "not_found") return { kind: "not_found" };
  if (outcome === "version_conflict") return { kind: "version_conflict" };
  return { kind: "deleted" };
}

export async function listComponents(filter: ActiveFilter): Promise<Component[]> {
  const where = whereByActive(components.isActive, filter);
  return db
    .select()
    .from(components)
    .where(where)
    .orderBy(asc(components.name), asc(components.id));
}

export async function createComponent(input: InsertComponent): Promise<Component> {
  const result = await db.insert(components).values(input);
  const id = toInsertId(result);
  const [row] = await db.select().from(components).where(eq(components.id, id));
  return row;
}

export async function updateComponentWithVersion(
  id: number,
  expectedVersion: number,
  input: UpdateComponent,
): Promise<VersionedUpdateResult<Component>> {
  const result = await db.execute(sql`
    update components
    set
      name = if(${input.name === undefined}, name, ${input.name ?? null}),
      category_id = if(${input.categoryId === undefined}, category_id, ${input.categoryId ?? null}),
      description = if(${input.description === undefined}, description, ${input.description ?? null}),
      is_active = if(${input.isActive === undefined}, is_active, ${input.isActive ?? null}),
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);

  const outcome = await classifyVersionedMutation("components", id, toAffectedRows(result));
  if (outcome === "not_found") return { kind: "not_found" };
  if (outcome === "version_conflict") return { kind: "version_conflict" };

  const [row] = await db.select().from(components).where(eq(components.id, id));
  return { kind: "updated", row };
}

export async function deleteComponentWithVersion(id: number, expectedVersion: number): Promise<VersionedDeleteResult> {
  const result = await db.execute(sql`
    delete from components
    where id = ${id}
      and version = ${expectedVersion}
  `);

  const outcome = await classifyVersionedMutation("components", id, toAffectedRows(result));
  if (outcome === "not_found") return { kind: "not_found" };
  if (outcome === "version_conflict") return { kind: "version_conflict" };
  return { kind: "deleted" };
}

