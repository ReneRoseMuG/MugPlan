import { and, asc, eq, gte, inArray, isNotNull, lte, sql, type SQL } from "drizzle-orm";
import type { AppointmentCancellationReportState } from "@shared/appointmentCancellation";

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
import {
  hasAppointmentCancellationTag,
  hasManagedReportExclusionTag,
} from "../lib/appointmentCancellation";
import { getAppointmentTagsByAppointmentIds, getProjectTagsByProjectIds } from "./tagRelationsRepository";

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
  reportState: AppointmentCancellationReportState;
};

export type VorlauflistePagedResult = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: VorlauflisteRow[];
};

export type ProductVorlaufItemTotal = {
  itemName: string;
  totalQuantity: number;
};

export type ProductVorlaufCategoryGroup = {
  categoryId: number;
  categoryName: string;
  items: ProductVorlaufItemTotal[];
};

export type ProductVorlaufSpecialMeasureProject = {
  projectId: number;
  orderNumber: string | null;
  customerNumber: string | null;
  customerFullName: string | null;
  actualDate: string | null;
  projectDescription: string | null;
  specialMeasureTag: Tag | null;
};

export type ProductVorlaufResult = {
  productCategoryGroups: ProductVorlaufCategoryGroup[];
  componentCategoryGroups: ProductVorlaufCategoryGroup[];
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

function upsertGroupedItem(
  groups: Map<number, ProductVorlaufCategoryGroup>,
  params: { categoryId: number; categoryName: string; itemName: string; quantity: number },
) {
  const group = groups.get(params.categoryId) ?? {
    categoryId: params.categoryId,
    categoryName: params.categoryName,
    items: [],
  };
  const existingItem = group.items.find((entry) => entry.itemName === params.itemName);
  if (existingItem) {
    existingItem.totalQuantity += params.quantity;
  } else {
    group.items.push({
      itemName: params.itemName,
      totalQuantity: params.quantity,
    });
  }
  groups.set(params.categoryId, group);
}

function sortGroupedItems(groups: Map<number, ProductVorlaufCategoryGroup>): ProductVorlaufCategoryGroup[] {
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: [...group.items].sort((left, right) => left.itemName.localeCompare(right.itemName, "de")),
    }))
    .sort((left, right) => left.categoryName.localeCompare(right.categoryName, "de") || left.categoryId - right.categoryId);
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
  const projectAppointmentRows = await db
    .select({
      appointmentId: appointments.id,
      projectId: appointments.projectId,
      startDate: sql<string>`date_format(${appointments.startDate}, '%Y-%m-%d')`,
    })
    .from(appointments)
    .where(and(...appointmentConditions))
    .orderBy(asc(appointments.startDate), asc(appointments.id));

  const normalizedAppointmentRows = projectAppointmentRows.filter((row): row is {
    appointmentId: number;
    projectId: number;
    startDate: string;
  } => typeof row.projectId === "number");

  if (normalizedAppointmentRows.length === 0) {
    return {
      page: params.page,
      pageSize: params.pageSize,
      total: 0,
      totalPages: 0,
      items: [],
    };
  }

  const appointmentTagsByAppointmentId = await getAppointmentTagsByAppointmentIds(
    normalizedAppointmentRows.map((row) => row.appointmentId),
  );
  const reportEligibleAppointmentRows = normalizedAppointmentRows.filter(
    (row) => !hasManagedReportExclusionTag(appointmentTagsByAppointmentId.get(row.appointmentId) ?? []),
  );
  if (reportEligibleAppointmentRows.length === 0) {
    return {
      page: params.page,
      pageSize: params.pageSize,
      total: 0,
      totalPages: 0,
      items: [],
    };
  }

  const tagsByProjectId = await getProjectTagsByProjectIds(
    Array.from(new Set(reportEligibleAppointmentRows.map((row) => row.projectId))),
  );
  const appointmentMetaByProjectId = new Map<number, {
    sortDate: string;
    actualDate: string;
    reportState: AppointmentCancellationReportState;
  }>();
  const appointmentAccumulatorByProjectId = new Map<number, {
    firstActiveDate: string | null;
    firstCancelledDate: string | null;
    hasActive: boolean;
    hasCancelled: boolean;
  }>();

  for (const row of reportEligibleAppointmentRows) {
    const projectTags = tagsByProjectId.get(row.projectId) ?? [];
    if (hasManagedReportExclusionTag(projectTags)) {
      continue;
    }

    const current = appointmentAccumulatorByProjectId.get(row.projectId) ?? {
      firstActiveDate: null,
      firstCancelledDate: null,
      hasActive: false,
      hasCancelled: false,
    };
    const isCancelled = hasAppointmentCancellationTag(appointmentTagsByAppointmentId.get(row.appointmentId) ?? []);

    if (isCancelled) {
      current.hasCancelled = true;
      current.firstCancelledDate ??= row.startDate;
    } else {
      current.hasActive = true;
      current.firstActiveDate ??= row.startDate;
    }

    appointmentAccumulatorByProjectId.set(row.projectId, current);

    const actualDate = current.firstActiveDate ?? current.firstCancelledDate;
    if (!actualDate) continue;

    appointmentMetaByProjectId.set(row.projectId, {
      sortDate: actualDate,
      actualDate,
      reportState: current.hasCancelled
        ? (current.hasActive ? "contains_cancelled" : "cancelled_only")
        : "default",
    });
  }

  const sortedProjectIds = Array.from(appointmentMetaByProjectId.entries())
    .sort((left, right) => left[1].sortDate.localeCompare(right[1].sortDate, "de") || left[0] - right[0])
    .map(([projectId]) => projectId);

  const total = sortedProjectIds.length;
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
  const projectIds = sortedProjectIds.slice(offset, offset + params.pageSize);
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

  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.ceil(total / params.pageSize),
    items: projectIds
      .map((projectId) => {
        const row = projectById.get(projectId);
        const appointmentMeta = appointmentMetaByProjectId.get(projectId);
        if (!row || !appointmentMeta) return null;
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
          actualDate: appointmentMeta.actualDate,
          projectDescription: stripReportHtmlToText(row.project.descriptionMd),
          reportState: appointmentMeta.reportState,
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
        actualDate: sql<string>`min(${appointments.startDate})`,
      })
      .from(appointments)
      .where(and(...appointmentConditions))
      .groupBy(appointments.projectId);

  const projectIds = projectRows
    .map((row) => row.projectId)
    .filter((value): value is number => typeof value === "number");

    if (projectIds.length === 0) {
      return {
      productCategoryGroups: [],
      componentCategoryGroups: [],
        specialMeasureProjects: [],
      };
    }

    const projectDetails = await db
      .select({
        project: projects,
        customer: customers,
        order: projectOrder,
      })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
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
  const productGroups = new Map<number, ProductVorlaufCategoryGroup>();
  const componentGroups = new Map<number, ProductVorlaufCategoryGroup>();
  const matchedProjectIds = new Set<number>();

  for (const row of orderItemRows) {
    const quantity = Number(row.item.quantity ?? 0);
    if (!Number.isInteger(quantity) || quantity <= 0) continue;

      if (
        row.product
        && row.productCategory
        && row.product.name.trim().length > 0
        && (selectedProductCategoryIds.size === 0 || selectedProductCategoryIds.has(row.productCategory.id))
      ) {
        upsertGroupedItem(productGroups, {
          categoryId: row.productCategory.id,
          categoryName: row.productCategory.name,
          itemName: row.product.name.trim(),
          quantity,
        });
        matchedProjectIds.add(row.item.projectId);
      }

      if (
        row.component
        && row.componentCategory
        && row.component.name.trim().length > 0
        && (selectedComponentCategoryIds.size === 0 || selectedComponentCategoryIds.has(row.componentCategory.id))
      ) {
        upsertGroupedItem(componentGroups, {
          categoryId: row.componentCategory.id,
          categoryName: row.componentCategory.name,
          itemName: row.component.name.trim(),
          quantity,
        });
        matchedProjectIds.add(row.item.projectId);
      }
    }

    if (matchedProjectIds.size === 0) {
      return {
      productCategoryGroups: [],
      componentCategoryGroups: [],
        specialMeasureProjects: [],
      };
    }

  const sortedProductCategoryGroups = sortGroupedItems(productGroups);
  const sortedComponentCategoryGroups = sortGroupedItems(componentGroups);

    const projectDetailsById = new Map(projectDetails.map((row) => [row.project.id, row] as const));
    const appointmentDateByProjectId = new Map(
      projectRows
        .filter((row): row is { projectId: number; actualDate: string } => typeof row.projectId === "number")
        .map((row) => [row.projectId, normalizeDateOnly(row.actualDate)] as const),
    );
    const tagsByProjectId = await getProjectTagsByProjectIds(Array.from(matchedProjectIds));
    const specialMeasureProjects: ProductVorlaufSpecialMeasureProject[] = [];

  for (const projectId of Array.from(matchedProjectIds)) {
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
        customerNumber: projectDetail.customer?.customerNumber ?? null,
        customerFullName: projectDetail.customer?.fullName ?? null,
        actualDate: appointmentDateByProjectId.get(projectId) ?? null,
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
    productCategoryGroups: sortedProductCategoryGroups,
    componentCategoryGroups: sortedComponentCategoryGroups,
      specialMeasureProjects,
    };
  }
