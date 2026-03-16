import { and, asc, eq, gte, inArray, isNotNull, lte, sql, type SQL } from "drizzle-orm";

import { db } from "../db";
import {
  appointments,
  componentCategories,
  components,
  customers,
  productCategories,
  products,
  projectOrder,
  projectOrderItems,
  projects,
  type Tag,
} from "@shared/schema";
import { isReportSaunaProductCategoryName } from "@shared/projectArticleList";
import { resolveReportComponentSlot, stripReportHtmlToText } from "../lib/reportVorlaufliste";
import { getProjectTagsByProjectIds } from "./tagRelationsRepository";

export type VorlauflisteRow = {
  projectId: number;
  tags: Tag[];
  amount: string | null;
  customerFullName: string | null;
  postalCode: string | null;
  city: string | null;
  sauna: string | null;
  door: string | null;
  window: string | null;
  oven: string | null;
  control: string | null;
  roof: string | null;
  plannedDateText: string | null;
  plannedWeek: string | null;
  actualDate: string;
  projectDescription: string | null;
};

export type VorlauflistePagedResult = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: VorlauflisteRow[];
};

export type ProductVorlaufCategoryTotal = {
  categoryId: number;
  categoryName: string;
  totalQuantity: number;
};

export type ProductVorlaufSpecialMeasureProject = {
  projectId: number;
  orderNumber: string | null;
  projectDescription: string | null;
  specialMeasureTag: Tag | null;
};

export type ProductVorlaufResult = {
  productCategoryTotals: ProductVorlaufCategoryTotal[];
  componentCategoryTotals: ProductVorlaufCategoryTotal[];
  specialMeasureProjects: ProductVorlaufSpecialMeasureProject[];
};

type ReportArticleBuckets = {
  sauna: Set<string>;
  door: Set<string>;
  window: Set<string>;
  oven: Set<string>;
  control: Set<string>;
  roof: Set<string>;
};

function createEmptyBuckets(): ReportArticleBuckets {
  return {
    sauna: new Set<string>(),
    door: new Set<string>(),
    window: new Set<string>(),
    oven: new Set<string>(),
    control: new Set<string>(),
    roof: new Set<string>(),
  };
}

function normalizeDateOnly(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  return null;
}

function joinSorted(values: Set<string>): string | null {
  if (values.size === 0) return null;
  return Array.from(values).sort((left, right) => left.localeCompare(right, "de")).join(", ");
}

function buildAppointmentConditions(params: { fromDate: string; toDate?: string }): SQL<unknown>[] {
  const appointmentConditions: SQL<unknown>[] = [
    isNotNull(appointments.projectId),
    gte(appointments.startDate, new Date(`${params.fromDate}T00:00:00`)),
  ];

  if (params.toDate) {
    appointmentConditions.push(lte(appointments.startDate, new Date(`${params.toDate}T00:00:00`)));
  }

  return appointmentConditions;
}

export async function getVorlauflistePaged(params: {
  fromDate: string;
  toDate?: string;
  productCategoryIds: number[];
  componentCategoryIds: number[];
  page: number;
  pageSize: number;
}): Promise<VorlauflistePagedResult> {
  const appointmentConditions = buildAppointmentConditions(params);

  const totalRows = await db
    .select({
      count: sql<number>`count(distinct ${appointments.projectId})`,
    })
    .from(appointments)
    .where(and(...appointmentConditions));

  const total = Number(totalRows[0]?.count ?? 0);
  if (total === 0) {
    return {
      page: params.page,
      pageSize: params.pageSize,
      total: 0,
      totalPages: 0,
      items: [],
    };
  }

  const offset = (params.page - 1) * params.pageSize;
  const pagedProjectRows = await db
    .select({
      projectId: appointments.projectId,
      actualDate: sql<string>`min(${appointments.startDate})`,
    })
    .from(appointments)
    .where(and(...appointmentConditions))
    .groupBy(appointments.projectId)
    .orderBy(sql`min(${appointments.startDate}) asc`, asc(appointments.projectId))
    .limit(params.pageSize)
    .offset(offset);

  const projectIds = pagedProjectRows
    .map((row) => row.projectId)
    .filter((value): value is number => typeof value === "number");

  if (projectIds.length === 0) {
    return {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
      items: [],
    };
  }

  const projectRows = await db
    .select({
      project: projects,
      customer: customers,
      order: projectOrder,
    })
    .from(projects)
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .where(inArray(projects.id, projectIds));

  const orderItemRows = await db
    .select({
      item: projectOrderItems,
      product: products,
      productCategory: productCategories,
      component: components,
      componentCategory: componentCategories,
    })
    .from(projectOrderItems)
    .leftJoin(products, eq(projectOrderItems.productId, products.id))
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .leftJoin(components, eq(projectOrderItems.componentId, components.id))
    .leftJoin(componentCategories, eq(components.categoryId, componentCategories.id))
    .where(inArray(projectOrderItems.projectId, projectIds));

  const projectById = new Map(projectRows.map((row) => [row.project.id, row] as const));
  const tagsByProjectId = await getProjectTagsByProjectIds(projectIds);
  const bucketsByProjectId = new Map<number, ReportArticleBuckets>();
  const selectedProductCategoryIds = new Set(params.productCategoryIds);
  const selectedComponentCategoryIds = new Set(params.componentCategoryIds);

  for (const row of orderItemRows) {
    const projectId = row.item.projectId;
    const buckets = bucketsByProjectId.get(projectId) ?? createEmptyBuckets();

    if (
      row.product
      && row.productCategory
      && (selectedProductCategoryIds.size === 0 || selectedProductCategoryIds.has(row.productCategory.id))
      && isReportSaunaProductCategoryName(row.productCategory.name)
    ) {
      buckets.sauna.add(row.product.name.trim());
      bucketsByProjectId.set(projectId, buckets);
      continue;
    }

    if (!row.component || !row.componentCategory) {
      bucketsByProjectId.set(projectId, buckets);
      continue;
    }

    if (selectedComponentCategoryIds.size > 0 && !selectedComponentCategoryIds.has(row.componentCategory.id)) {
      bucketsByProjectId.set(projectId, buckets);
      continue;
    }

    const fieldKey = resolveReportComponentSlot(row.componentCategory.name);
    const componentName = row.component.name.trim();
    if (fieldKey === "door") buckets.door.add(componentName);
    if (fieldKey === "window") buckets.window.add(componentName);
    if (fieldKey === "oven") buckets.oven.add(componentName);
    if (fieldKey === "control") buckets.control.add(componentName);
    if (fieldKey === "roof") buckets.roof.add(componentName);

    bucketsByProjectId.set(projectId, buckets);
  }

  const actualDateByProjectId = new Map(
    pagedProjectRows
      .map((row) => {
        const projectId = row.projectId;
        const actualDate = normalizeDateOnly(row.actualDate);
        if (typeof projectId !== "number" || actualDate === null) return null;
        return [projectId, actualDate] as const;
      })
      .filter((entry): entry is readonly [number, string] => entry !== null),
  );

  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.ceil(total / params.pageSize),
    items: projectIds
      .map((projectId) => {
        const row = projectById.get(projectId);
        const actualDate = actualDateByProjectId.get(projectId);
        if (!row || !actualDate) return null;
        const buckets = bucketsByProjectId.get(projectId) ?? createEmptyBuckets();
        const projectTags = tagsByProjectId.get(projectId) ?? [];

        return {
          projectId,
          tags: projectTags,
          amount: row.order?.amount ?? null,
          customerFullName: row.customer.fullName ?? null,
          postalCode: row.customer.postalCode ?? null,
          city: row.customer.city ?? null,
          sauna: joinSorted(buckets.sauna),
          door: joinSorted(buckets.door),
          window: joinSorted(buckets.window),
          oven: joinSorted(buckets.oven),
          control: joinSorted(buckets.control),
          roof: joinSorted(buckets.roof),
          plannedDateText: row.order?.plannedDateText ?? null,
          plannedWeek: row.order?.plannedWeek ?? null,
          actualDate,
          projectDescription: stripReportHtmlToText(row.project.descriptionMd),
        };
      })
      .filter((entry): entry is VorlauflisteRow => entry !== null),
  };
}

export async function getProductVorlauf(params: {
  fromDate: string;
  toDate?: string;
  productCategoryIds: number[];
  componentCategoryIds: number[];
  specialMeasureTagId?: number;
}): Promise<ProductVorlaufResult> {
  const appointmentConditions = buildAppointmentConditions(params);
  const projectRows = await db
    .select({
      projectId: appointments.projectId,
    })
    .from(appointments)
    .where(and(...appointmentConditions))
    .groupBy(appointments.projectId);

  const projectIds = projectRows
    .map((row) => row.projectId)
    .filter((value): value is number => typeof value === "number");

  if (projectIds.length === 0) {
    return {
      productCategoryTotals: [],
      componentCategoryTotals: [],
      specialMeasureProjects: [],
    };
  }

  const projectDetails = await db
    .select({
      project: projects,
      order: projectOrder,
    })
    .from(projects)
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .where(inArray(projects.id, projectIds));

  const orderItemRows = await db
    .select({
      item: projectOrderItems,
      product: products,
      productCategory: productCategories,
      component: components,
      componentCategory: componentCategories,
    })
    .from(projectOrderItems)
    .leftJoin(products, eq(projectOrderItems.productId, products.id))
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .leftJoin(components, eq(projectOrderItems.componentId, components.id))
    .leftJoin(componentCategories, eq(components.categoryId, componentCategories.id))
    .where(inArray(projectOrderItems.projectId, projectIds));

  const selectedProductCategoryIds = new Set(params.productCategoryIds);
  const selectedComponentCategoryIds = new Set(params.componentCategoryIds);
  const productTotals = new Map<number, ProductVorlaufCategoryTotal>();
  const componentTotals = new Map<number, ProductVorlaufCategoryTotal>();
  const matchedProjectIds = new Set<number>();

  for (const row of orderItemRows) {
    const quantity = Number(row.item.quantity ?? 0);
    if (!Number.isInteger(quantity) || quantity <= 0) continue;

    if (
      row.product
      && row.productCategory
      && (selectedProductCategoryIds.size === 0 || selectedProductCategoryIds.has(row.productCategory.id))
    ) {
      const current = productTotals.get(row.productCategory.id) ?? {
        categoryId: row.productCategory.id,
        categoryName: row.productCategory.name,
        totalQuantity: 0,
      };
      current.totalQuantity += quantity;
      productTotals.set(row.productCategory.id, current);
      matchedProjectIds.add(row.item.projectId);
    }

    if (
      row.component
      && row.componentCategory
      && (selectedComponentCategoryIds.size === 0 || selectedComponentCategoryIds.has(row.componentCategory.id))
    ) {
      const current = componentTotals.get(row.componentCategory.id) ?? {
        categoryId: row.componentCategory.id,
        categoryName: row.componentCategory.name,
        totalQuantity: 0,
      };
      current.totalQuantity += quantity;
      componentTotals.set(row.componentCategory.id, current);
      matchedProjectIds.add(row.item.projectId);
    }
  }

  if (matchedProjectIds.size === 0) {
    return {
      productCategoryTotals: [],
      componentCategoryTotals: [],
      specialMeasureProjects: [],
    };
  }

  const sortedProductCategoryTotals = Array.from(productTotals.values())
    .sort((left, right) => left.categoryName.localeCompare(right.categoryName, "de") || left.categoryId - right.categoryId);
  const sortedComponentCategoryTotals = Array.from(componentTotals.values())
    .sort((left, right) => left.categoryName.localeCompare(right.categoryName, "de") || left.categoryId - right.categoryId);

  const projectDetailsById = new Map(projectDetails.map((row) => [row.project.id, row] as const));
  const tagsByProjectId = await getProjectTagsByProjectIds(Array.from(matchedProjectIds));
  const specialMeasureProjects: ProductVorlaufSpecialMeasureProject[] = [];

  for (const projectId of matchedProjectIds) {
    if (!params.specialMeasureTagId) {
      continue;
    }

    const projectTags = tagsByProjectId.get(projectId) ?? [];
    const specialMeasureTag = projectTags.find((tag) => tag.id === params.specialMeasureTagId) ?? null;
    if (!specialMeasureTag) {
      continue;
    }

    const projectDetail = projectDetailsById.get(projectId);
    if (!projectDetail) {
      continue;
    }

    specialMeasureProjects.push({
      projectId,
      orderNumber: projectDetail.order?.orderNumber ?? null,
      projectDescription: stripReportHtmlToText(projectDetail.project.descriptionMd),
      specialMeasureTag,
    });
  }

  specialMeasureProjects.sort((left, right) => {
    const orderA = left.orderNumber ?? "";
    const orderB = right.orderNumber ?? "";
    return orderA.localeCompare(orderB, "de") || left.projectId - right.projectId;
  });

  return {
    productCategoryTotals: sortedProductCategoryTotals,
    componentCategoryTotals: sortedComponentCategoryTotals,
    specialMeasureProjects,
  };
}
