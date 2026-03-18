import { asc, eq, sql } from "drizzle-orm";
import type {
  Component,
  ComponentCategory,
  ComponentSpecification,
  InsertComponent,
  InsertComponentCategory,
  InsertComponentSpecification,
  InsertProduct,
  InsertProductCategory,
  Tag,
  Product,
  ProductCategory,
  UpdateComponentSpecification,
  UpdateComponent,
  UpdateComponentCategory,
  UpdateProduct,
  UpdateProductCategory,
} from "@shared/schema";
import {
  appointmentTags,
  componentCategories,
  componentSpecifications,
  components,
  customerTags,
  employeeTags,
  productCategories,
  productComponent,
  projectOrderItems,
  projectTags,
  products,
  tags,
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

export async function getProductCategoryById(id: number): Promise<ProductCategory | undefined> {
  const [row] = await db.select().from(productCategories).where(eq(productCategories.id, id));
  return row;
}

export async function getProductCategoryByName(name: string): Promise<ProductCategory | undefined> {
  const [row] = await db.select().from(productCategories).where(eq(productCategories.name, name)).limit(1);
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
      is_default = if(${input.isDefault === undefined}, is_default, ${input.isDefault ?? null}),
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

export async function getComponentCategoryById(id: number): Promise<ComponentCategory | undefined> {
  const [row] = await db.select().from(componentCategories).where(eq(componentCategories.id, id));
  return row;
}

export async function getComponentCategoryByName(name: string): Promise<ComponentCategory | undefined> {
  const [row] = await db.select().from(componentCategories).where(eq(componentCategories.name, name)).limit(1);
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
      is_default = if(${input.isDefault === undefined}, is_default, ${input.isDefault ?? null}),
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

export async function getProductById(id: number): Promise<Product | undefined> {
  const [row] = await db.select().from(products).where(eq(products.id, id));
  return row;
}

export async function getProductByNormalizedName(name: string): Promise<Product | undefined> {
  const normalizedName = name.trim().toLocaleLowerCase("de");
  const [row] = await db
    .select()
    .from(products)
    .where(sql`lower(trim(${products.name})) = ${normalizedName}`)
    .limit(1);
  return row;
}

export async function getProductsByIds(ids: number[]): Promise<Product[]> {
  const uniqueIds = Array.from(new Set(ids.filter((value) => Number.isFinite(value) && value > 0)));
  if (uniqueIds.length === 0) return [];
  const idList = sql.join(uniqueIds.map((value) => sql`${value}`), sql`, `);
  return db.select().from(products).where(sql`${products.id} in (${idList})`);
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
      short_code = if(${input.shortCode === undefined}, short_code, ${input.shortCode ?? null}),
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

export async function listProductsByCategoryId(categoryId: number): Promise<Product[]> {
  return db.select().from(products).where(eq(products.categoryId, categoryId)).orderBy(asc(products.name), asc(products.id));
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

export async function getComponentById(id: number): Promise<Component | undefined> {
  const [row] = await db.select().from(components).where(eq(components.id, id));
  return row;
}

export async function listComponentsByCategoryId(categoryId: number): Promise<Component[]> {
  return db.select().from(components).where(eq(components.categoryId, categoryId)).orderBy(asc(components.name), asc(components.id));
}

export async function getComponentDeleteRelationCounts(componentId: number): Promise<{
  assignedProductCount: number;
  projectOrderItemCount: number;
}> {
  const [assignedProductCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(productComponent)
    .where(eq(productComponent.componentId, componentId));
  const [projectOrderItemCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(projectOrderItems)
    .where(eq(projectOrderItems.componentId, componentId));

  return {
    assignedProductCount: Number(assignedProductCountRow?.count ?? 0),
    projectOrderItemCount: Number(projectOrderItemCountRow?.count ?? 0),
  };
}

export async function getComponentByNormalizedName(name: string): Promise<Component | undefined> {
  const normalizedName = name.trim().toLocaleLowerCase("de");
  const [row] = await db
    .select()
    .from(components)
    .where(sql`lower(trim(${components.name})) = ${normalizedName}`)
    .limit(1);
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
      short_code = if(${input.shortCode === undefined}, short_code, ${input.shortCode ?? null}),
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

export async function listComponentSpecifications(componentId: number): Promise<ComponentSpecification[]> {
  return db
    .select()
    .from(componentSpecifications)
    .where(eq(componentSpecifications.componentId, componentId))
    .orderBy(asc(componentSpecifications.specName), asc(componentSpecifications.id));
}

export async function createComponentSpecification(input: InsertComponentSpecification): Promise<ComponentSpecification> {
  const result = await db.insert(componentSpecifications).values(input);
  const id = toInsertId(result);
  const [row] = await db.select().from(componentSpecifications).where(eq(componentSpecifications.id, id));
  return row;
}

export async function updateComponentSpecificationWithVersion(
  id: number,
  expectedVersion: number,
  input: UpdateComponentSpecification,
): Promise<VersionedUpdateResult<ComponentSpecification>> {
  const result = await db.execute(sql`
    update component_specifications
    set
      spec_name = if(${input.specName === undefined}, spec_name, ${input.specName ?? null}),
      spec_value = if(${input.specValue === undefined}, spec_value, ${input.specValue ?? null}),
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);

  const outcome = await classifyVersionedMutation("component_specifications", id, toAffectedRows(result));
  if (outcome === "not_found") return { kind: "not_found" };
  if (outcome === "version_conflict") return { kind: "version_conflict" };

  const [row] = await db.select().from(componentSpecifications).where(eq(componentSpecifications.id, id));
  return { kind: "updated", row };
}

export async function deleteComponentSpecificationWithVersion(id: number, expectedVersion: number): Promise<VersionedDeleteResult> {
  const result = await db.execute(sql`
    delete from component_specifications
    where id = ${id}
      and version = ${expectedVersion}
  `);

  const outcome = await classifyVersionedMutation("component_specifications", id, toAffectedRows(result));
  if (outcome === "not_found") return { kind: "not_found" };
  if (outcome === "version_conflict") return { kind: "version_conflict" };
  return { kind: "deleted" };
}

export async function listTags(): Promise<Tag[]> {
  return db
    .select()
    .from(tags)
    .orderBy(asc(tags.name), asc(tags.id));
}

export async function createTag(input: { name: string; color: string }): Promise<Tag> {
  const result = await db.insert(tags).values({
    name: input.name,
    color: input.color,
    isDefault: false,
    version: 1,
  });
  const id = toInsertId(result);
  const [row] = await db.select().from(tags).where(eq(tags.id, id));
  return row;
}

export async function updateTagWithVersion(
  id: number,
  expectedVersion: number,
  input: { name?: string; color?: string },
): Promise<VersionedUpdateResult<Tag>> {
  const result = await db.execute(sql`
    update tags
    set
      name = if(${input.name === undefined}, name, ${input.name ?? null}),
      color = if(${input.color === undefined}, color, ${input.color ?? null}),
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);

  const outcome = await classifyVersionedMutation("tags", id, toAffectedRows(result));
  if (outcome === "not_found") return { kind: "not_found" };
  if (outcome === "version_conflict") return { kind: "version_conflict" };

  const [row] = await db.select().from(tags).where(eq(tags.id, id));
  return { kind: "updated", row };
}

export async function deleteTagWithVersion(id: number, expectedVersion: number): Promise<VersionedDeleteResult> {
  const result = await db.execute(sql`
    delete from tags
    where id = ${id}
      and version = ${expectedVersion}
  `);

  const outcome = await classifyVersionedMutation("tags", id, toAffectedRows(result));
  if (outcome === "not_found") return { kind: "not_found" };
  if (outcome === "version_conflict") return { kind: "version_conflict" };
  return { kind: "deleted" };
}

export async function getTagRelationCounts(tagId: number): Promise<{
  projectCount: number;
  customerCount: number;
  employeeCount: number;
  appointmentCount: number;
}> {
  const [projectCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(projectTags)
    .where(eq(projectTags.tagId, tagId));
  const [customerCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(customerTags)
    .where(eq(customerTags.tagId, tagId));
  const [employeeCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(employeeTags)
    .where(eq(employeeTags.tagId, tagId));
  const [appointmentCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appointmentTags)
    .where(eq(appointmentTags.tagId, tagId));

  return {
    projectCount: Number(projectCountRow?.count ?? 0),
    customerCount: Number(customerCountRow?.count ?? 0),
    employeeCount: Number(employeeCountRow?.count ?? 0),
    appointmentCount: Number(appointmentCountRow?.count ?? 0),
  };
}

export async function listComponentProducts() {
  return db
    .select()
    .from(productComponent)
    .orderBy(asc(productComponent.componentId), asc(productComponent.productId));
}

export async function replaceComponentProductsWithVersion(
  componentId: number,
  expectedVersion: number,
  productIds: number[],
): Promise<VersionedUpdateResult<Component>> {
  const uniqueProductIds = Array.from(new Set(productIds.filter((value) => Number.isFinite(value) && value > 0)));

  return db.transaction(async (tx) => {
    const versionUpdate = await tx.execute(sql`
      update components
      set
        updated_at = now(),
        version = version + 1
      where id = ${componentId}
        and version = ${expectedVersion}
    `);

    const affectedRows = Number((versionUpdate as any)?.[0]?.affectedRows ?? (versionUpdate as any)?.affectedRows ?? 0);
    if (affectedRows === 0) {
      const [existing] = await tx.select({ id: components.id }).from(components).where(eq(components.id, componentId)).limit(1);
      return existing ? { kind: "version_conflict" as const } : { kind: "not_found" as const };
    }

    await tx.delete(productComponent).where(eq(productComponent.componentId, componentId));

    if (uniqueProductIds.length > 0) {
      await tx.insert(productComponent).values(
        uniqueProductIds.map((productId) => ({
          componentId,
          productId,
          version: 1,
        })),
      );
    }

    const [updatedComponent] = await tx.select().from(components).where(eq(components.id, componentId));
    return { kind: "updated" as const, row: updatedComponent };
  });
}
