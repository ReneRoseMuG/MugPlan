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
  tags,
  type Tag,
  tours,
} from "@shared/schema";
import { stripReportHtmlToText } from "../lib/reportVorlaufliste";
import {
  hasAppointmentCancellationTag,
  hasManagedReportExclusionTag,
  isAppointmentCancellationTag,
  isManagedSpecialMeasureTag,
} from "../lib/appointmentCancellation";
import {
  buildGroupedProductVorlaufCategoryGroups,
  collectMatchedSonderblockTagIds,
} from "../lib/reportProductVorlauf";
import {
  getProjectAttachmentCountsByProjectIds,
  getProjectNoteCountsByProjectIds,
} from "./appointmentsRepository";
import { getAppointmentTagsByAppointmentIds, getProjectTagsByProjectIds } from "./tagRelationsRepository";

export type VorlauflisteArticleValue = {
  categoryId: number;
  value: string | null;
};

export type VorlauflisteCategory = {
  id: number;
  name: string;
};

export type VorlauflisteRow = {
  projectId: number;
  projectName: string;
  orderNumber: string | null;
  customerId: number;
  customerNumber: string | null;
  tags: Tag[];
  highlightTag: Tag | null;
  amount: string | null;
  customerFullName: string | null;
  postalCode: string | null;
  city: string | null;
  articleValues: VorlauflisteArticleValue[];
  plannedDateText: string | null;
  plannedWeek: string | null;
  actualDate: string;
  projectDescription: string | null;
  notesCount: number;
  plannedAppointmentsCount: number;
  attachmentsCount: number;
  reportState: AppointmentCancellationReportState;
};

export type VorlauflistePagedResult = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  productCategories: VorlauflisteCategory[];
  componentCategories: VorlauflisteCategory[];
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
  projectRows: ProductVorlaufProjectRow[];
};

export type ProductVorlaufProjectRow = {
  projectId: number;
  projectName: string;
  orderNumber: string | null;
  actualDate: string;
  tourName: string | null;
  articleValues: VorlauflisteArticleValue[];
  projectDescription: string | null;
  matchedSonderblockTagIds: number[];
};

type ReportArticleBuckets = Map<number, Set<string>>;

type NormalizedProjectAppointmentRow = {
  appointmentId: number;
  projectId: number;
  startDate: string;
  tourId: number | null;
  tourName: string | null;
};

type ProjectAppointmentTagRow = {
  appointmentId: number;
  projectId: number;
};

type ProjectReportTagState = {
  hasReportExclusion: boolean;
  cancellationTag: Tag | null;
  specialMeasureTag: Tag | null;
};

const berlinFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getBerlinTodayDate(): Date {
  const berlinToday = berlinFormatter.format(new Date());
  return new Date(`${berlinToday}T00:00:00`);
}

function createEmptyBuckets(): ReportArticleBuckets {
  return new Map<number, Set<string>>();
}

function addToBucket(buckets: ReportArticleBuckets, categoryId: number, value: string): void {
  const existing = buckets.get(categoryId) ?? new Set<string>();
  existing.add(value);
  buckets.set(categoryId, existing);
}

function joinSorted(values: Set<string>): string | null {
  if (values.size === 0) return null;
  return Array.from(values).sort((left, right) => left.localeCompare(right, "de")).join(", ");
}

function resolveArticleName(name: string, shortCode: string | null | undefined, useShortCodes: boolean): string {
  if (useShortCodes && shortCode && shortCode.trim().length > 0) return shortCode.trim();
  return name;
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

function createEmptyProjectReportTagState(): ProjectReportTagState {
  return {
    hasReportExclusion: false,
    cancellationTag: null,
    specialMeasureTag: null,
  };
}

function findFirstMatchingTag(tags: Tag[], predicate: (tag: Pick<Tag, "name">) => boolean): Tag | null {
  return tags.find((tag) => predicate(tag)) ?? null;
}

function buildProjectReportTagStateByProjectId(
  projectIds: number[],
  appointmentRows: ProjectAppointmentTagRow[],
  appointmentTagsByAppointmentId: Map<number, Tag[]>,
  projectTagsByProjectId: Map<number, Tag[]>,
): Map<number, ProjectReportTagState> {
  const stateByProjectId = new Map<number, ProjectReportTagState>();

  for (const projectId of projectIds) {
    const projectTags = projectTagsByProjectId.get(projectId) ?? [];
    stateByProjectId.set(projectId, {
      hasReportExclusion: hasManagedReportExclusionTag(projectTags),
      cancellationTag: findFirstMatchingTag(projectTags, isAppointmentCancellationTag),
      specialMeasureTag: findFirstMatchingTag(projectTags, isManagedSpecialMeasureTag),
    });
  }

  for (const row of appointmentRows) {
    const current = stateByProjectId.get(row.projectId) ?? createEmptyProjectReportTagState();
    const appointmentTags = appointmentTagsByAppointmentId.get(row.appointmentId) ?? [];

    current.hasReportExclusion ||= hasManagedReportExclusionTag(appointmentTags);
    current.cancellationTag ??= findFirstMatchingTag(appointmentTags, isAppointmentCancellationTag);
    current.specialMeasureTag ??= findFirstMatchingTag(appointmentTags, isManagedSpecialMeasureTag);

    stateByProjectId.set(row.projectId, current);
  }

  return stateByProjectId;
}

export async function getVorlauflistePaged(params: {
  fromDate: string;
  toDate?: string;
  productCategoryIds: number[];
  componentCategoryIds: number[];
  useShortCodes: boolean;
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
      productCategories: [],
      componentCategories: [],
      items: [],
    };
  }

  const appointmentTagsByAppointmentId = await getAppointmentTagsByAppointmentIds(
    normalizedAppointmentRows.map((row) => row.appointmentId),
  );
  const allProjectIds = Array.from(new Set(normalizedAppointmentRows.map((row) => row.projectId)));
  const tagsByProjectId = await getProjectTagsByProjectIds(allProjectIds);
  const projectReportTagStateByProjectId = buildProjectReportTagStateByProjectId(
    allProjectIds,
    normalizedAppointmentRows,
    appointmentTagsByAppointmentId,
    tagsByProjectId,
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

  for (const row of normalizedAppointmentRows) {
    const projectTagState = projectReportTagStateByProjectId.get(row.projectId) ?? createEmptyProjectReportTagState();
    if (projectTagState.hasReportExclusion) {
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
      productCategories: [],
      componentCategories: [],
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
      productCategories: [],
      componentCategories: [],
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

  const [projectNoteCountsByProjectId, projectAttachmentsCountByProjectId] = await Promise.all([
    getProjectNoteCountsByProjectIds(projectIds),
    getProjectAttachmentCountsByProjectIds(projectIds),
  ]);

  const futureAppointmentRows = await db
    .select({
      projectId: appointments.projectId,
    })
    .from(appointments)
    .where(and(
      inArray(appointments.projectId, projectIds),
      gte(appointments.startDate, getBerlinTodayDate()),
    ));

  const plannedAppointmentsCountByProjectId = new Map<number, number>();
  for (const row of futureAppointmentRows) {
    if (typeof row.projectId !== "number") {
      continue;
    }
    plannedAppointmentsCountByProjectId.set(
      row.projectId,
      (plannedAppointmentsCountByProjectId.get(row.projectId) ?? 0) + 1,
    );
  }

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
  const productCategoryNameById = new Map<number, string>();
  const componentCategoryNameById = new Map<number, string>();

  for (const row of orderItemRows) {
    const projectId = row.item.projectId;
    const buckets = bucketsByProjectId.get(projectId) ?? createEmptyBuckets();

    if (
      row.product
      && row.productCategory
      && (selectedProductCategoryIds.size === 0 || selectedProductCategoryIds.has(row.productCategory.id))
    ) {
      productCategoryNameById.set(row.productCategory.id, row.productCategory.name);
      const displayName = resolveArticleName(row.product.name.trim(), row.product.shortCode, params.useShortCodes);
      addToBucket(buckets, row.productCategory.id, displayName);
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

    componentCategoryNameById.set(row.componentCategory.id, row.componentCategory.name);
    const displayName = resolveArticleName(row.component.name.trim(), row.component.shortCode, params.useShortCodes);
    addToBucket(buckets, row.componentCategory.id, displayName);
    bucketsByProjectId.set(projectId, buckets);
  }

  const orderedProductCategories: VorlauflisteCategory[] = params.productCategoryIds
    .filter((id) => productCategoryNameById.has(id))
    .map((id) => ({ id, name: productCategoryNameById.get(id)! }));

  const orderedComponentCategories: VorlauflisteCategory[] = params.componentCategoryIds
    .filter((id) => componentCategoryNameById.has(id))
    .map((id) => ({ id, name: componentCategoryNameById.get(id)! }));

  const allCategoryIds = [
    ...params.productCategoryIds,
    ...params.componentCategoryIds,
  ];

  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.ceil(total / params.pageSize),
    productCategories: orderedProductCategories,
    componentCategories: orderedComponentCategories,
    items: projectIds
      .map((projectId) => {
        const row = projectById.get(projectId);
        const appointmentMeta = appointmentMetaByProjectId.get(projectId);
        const projectTagState = projectReportTagStateByProjectId.get(projectId) ?? createEmptyProjectReportTagState();
        if (!row || !appointmentMeta) return null;
        const buckets = bucketsByProjectId.get(projectId) ?? createEmptyBuckets();
        const projectTags = (tagsByProjectId.get(projectId) ?? []).filter((tag) => tag.isDefault);

        const articleValues: VorlauflisteArticleValue[] = allCategoryIds.map((categoryId) => ({
          categoryId,
          value: joinSorted(buckets.get(categoryId) ?? new Set()),
        }));

        return {
          projectId,
          projectName: row.project.name,
          orderNumber: row.order?.orderNumber ?? null,
          customerId: row.customer.id,
          customerNumber: row.customer.customerNumber || null,
          tags: projectTags,
          highlightTag: projectTagState.cancellationTag ?? projectTagState.specialMeasureTag,
          amount: row.order?.amount ?? null,
          customerFullName: row.customer.fullName ?? null,
          postalCode: row.customer.postalCode ?? null,
          city: row.customer.city ?? null,
          articleValues,
          plannedDateText: row.order?.plannedDateText ?? null,
          plannedWeek: row.order?.plannedWeek ?? null,
          actualDate: appointmentMeta.actualDate,
          projectDescription: stripReportHtmlToText(row.project.descriptionMd),
          notesCount: projectNoteCountsByProjectId.get(projectId) ?? 0,
          plannedAppointmentsCount: plannedAppointmentsCountByProjectId.get(projectId) ?? 0,
          attachmentsCount: projectAttachmentsCountByProjectId.get(projectId) ?? 0,
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
  useShortCodes: boolean;
  sonderblockTagIds: number[];
}): Promise<ProductVorlaufResult> {
  const appointmentConditions = buildAppointmentConditions(params);
  const projectAppointmentRows = await db
    .select({
      appointmentId: appointments.id,
      projectId: appointments.projectId,
      startDate: sql<string>`date_format(${appointments.startDate}, '%Y-%m-%d')`,
      tourId: appointments.tourId,
      tourName: tours.name,
    })
    .from(appointments)
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(and(...appointmentConditions))
    .orderBy(asc(appointments.startDate), asc(appointments.id));

  const normalizedAppointmentRows = projectAppointmentRows.filter((row): row is NormalizedProjectAppointmentRow =>
    typeof row.projectId === "number",
  );
  if (normalizedAppointmentRows.length === 0) {
    return {
      productCategoryGroups: [],
      componentCategoryGroups: [],
      specialMeasureProjects: [],
      projectRows: [],
    };
  }

  const allProjectIds = Array.from(new Set(normalizedAppointmentRows.map((row) => row.projectId)));
  const appointmentTagsByAppointmentId = await getAppointmentTagsByAppointmentIds(
    normalizedAppointmentRows.map((row) => row.appointmentId),
  );
  const tagsByProjectId = await getProjectTagsByProjectIds(allProjectIds);
  const projectReportTagStateByProjectId = buildProjectReportTagStateByProjectId(
    allProjectIds,
    normalizedAppointmentRows,
    appointmentTagsByAppointmentId,
    tagsByProjectId,
  );
  const eligibleProjectIds = allProjectIds.filter((projectId) => {
    const tagState = projectReportTagStateByProjectId.get(projectId) ?? createEmptyProjectReportTagState();
    return !tagState.hasReportExclusion && !tagState.cancellationTag;
  });
  const eligibleProjectIdSet = new Set(eligibleProjectIds);

  if (eligibleProjectIds.length === 0) {
    return {
      productCategoryGroups: [],
      componentCategoryGroups: [],
      specialMeasureProjects: [],
      projectRows: [],
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
    .where(inArray(projects.id, eligibleProjectIds));

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
    .where(inArray(projectOrderItems.projectId, eligibleProjectIds));

  const selectedProductCategoryIds = new Set(params.productCategoryIds);
  const selectedComponentCategoryIds = new Set(params.componentCategoryIds);
  const productGroupRows: Array<{
    categoryId: number;
    categoryName: string;
    itemName: string;
    shortCode: string | null;
    quantity: number;
  }> = [];
  const componentGroupRows: Array<{
    categoryId: number;
    categoryName: string;
    itemName: string;
    shortCode: string | null;
    quantity: number;
  }> = [];
  const matchedProjectIds = new Set<number>();
  const articleBucketsByProjectId = new Map<number, ReportArticleBuckets>();
  const appointmentMetaByProjectId = new Map<number, { actualDate: string; tourName: string | null }>();
  const selectedTagRows: Tag[] = params.sonderblockTagIds.length > 0
    ? await db.select().from(tags).where(inArray(tags.id, params.sonderblockTagIds))
    : [];

  for (const row of normalizedAppointmentRows) {
    if (!eligibleProjectIdSet.has(row.projectId) || appointmentMetaByProjectId.has(row.projectId)) {
      continue;
    }
    appointmentMetaByProjectId.set(row.projectId, {
      actualDate: row.startDate,
      tourName: row.tourName ?? null,
    });
  }

  for (const row of orderItemRows) {
    const quantity = Number(row.item.quantity ?? 0);
    const articleBuckets = articleBucketsByProjectId.get(row.item.projectId) ?? createEmptyBuckets();

    if (
      row.product
      && row.productCategory
      && row.product.name.trim().length > 0
      && (selectedProductCategoryIds.size === 0 || selectedProductCategoryIds.has(row.productCategory.id))
    ) {
      const displayName = resolveArticleName(row.product.name.trim(), row.product.shortCode, params.useShortCodes);
      addToBucket(articleBuckets, row.productCategory.id, displayName);
      articleBucketsByProjectId.set(row.item.projectId, articleBuckets);

      if (selectedProductCategoryIds.has(row.productCategory.id) && Number.isInteger(quantity) && quantity > 0) {
        productGroupRows.push({
          categoryId: row.productCategory.id,
          categoryName: row.productCategory.name,
          itemName: row.product.name.trim(),
          shortCode: row.product.shortCode,
          quantity,
        });
        matchedProjectIds.add(row.item.projectId);
      }
      continue;
    }

    if (!row.component || !row.componentCategory || row.component.name.trim().length === 0) {
      articleBucketsByProjectId.set(row.item.projectId, articleBuckets);
      continue;
    }

    if (selectedComponentCategoryIds.size === 0 || selectedComponentCategoryIds.has(row.componentCategory.id)) {
      const displayName = resolveArticleName(row.component.name.trim(), row.component.shortCode, params.useShortCodes);
      addToBucket(articleBuckets, row.componentCategory.id, displayName);
      articleBucketsByProjectId.set(row.item.projectId, articleBuckets);
    }

    if (selectedComponentCategoryIds.has(row.componentCategory.id) && Number.isInteger(quantity) && quantity > 0) {
      componentGroupRows.push({
        categoryId: row.componentCategory.id,
        categoryName: row.componentCategory.name,
        itemName: row.component.name.trim(),
        shortCode: row.component.shortCode,
        quantity,
      });
      matchedProjectIds.add(row.item.projectId);
    }
  }

  const sortedProductCategoryGroups = buildGroupedProductVorlaufCategoryGroups(productGroupRows, params.useShortCodes);
  const sortedComponentCategoryGroups = buildGroupedProductVorlaufCategoryGroups(componentGroupRows, params.useShortCodes);

  const projectDetailsById = new Map(projectDetails.map((row) => [row.project.id, row] as const));
  const specialMeasureProjects: ProductVorlaufSpecialMeasureProject[] = [];

  for (const projectId of Array.from(matchedProjectIds)) {
    const projectTagState = projectReportTagStateByProjectId.get(projectId) ?? createEmptyProjectReportTagState();
    const specialMeasureTag = projectTagState.specialMeasureTag;
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
      actualDate: appointmentMetaByProjectId.get(projectId)?.actualDate ?? null,
      projectDescription: stripReportHtmlToText(projectDetail.project.descriptionMd),
      specialMeasureTag,
    });
  }

  specialMeasureProjects.sort((left, right) => {
    const orderA = left.orderNumber ?? "";
    const orderB = right.orderNumber ?? "";
    return orderA.localeCompare(orderB, "de") || left.projectId - right.projectId;
  });

  const allCategoryIds = [...params.productCategoryIds, ...params.componentCategoryIds];
  const projectRows = eligibleProjectIds
    .map((projectId) => {
      const projectDetail = projectDetailsById.get(projectId);
      const appointmentMeta = appointmentMetaByProjectId.get(projectId);
      if (!projectDetail || !appointmentMeta) {
        return null;
      }

      const projectTags = tagsByProjectId.get(projectId) ?? [];
      const appointmentTags = normalizedAppointmentRows
        .filter((row) => row.projectId === projectId)
        .flatMap((row) => appointmentTagsByAppointmentId.get(row.appointmentId) ?? []);
      const matchedSonderblockTagIds = collectMatchedSonderblockTagIds({
        selectedTags: selectedTagRows,
        projectTags,
        appointmentTags,
      });
      const articleBuckets = articleBucketsByProjectId.get(projectId) ?? createEmptyBuckets();

      return {
        projectId,
        projectName: projectDetail.project.name,
        orderNumber: projectDetail.order?.orderNumber ?? null,
        actualDate: appointmentMeta.actualDate,
        tourName: appointmentMeta.tourName,
        articleValues: allCategoryIds.map((categoryId) => ({
          categoryId,
          value: joinSorted(articleBuckets.get(categoryId) ?? new Set()),
        })),
        projectDescription: stripReportHtmlToText(projectDetail.project.descriptionMd),
        matchedSonderblockTagIds,
      };
    })
    .filter((entry): entry is ProductVorlaufProjectRow => entry !== null)
    .sort((left, right) => left.actualDate.localeCompare(right.actualDate, "de") || left.projectId - right.projectId);

  return {
    productCategoryGroups: sortedProductCategoryGroups,
    componentCategoryGroups: sortedComponentCategoryGroups,
    specialMeasureProjects,
    projectRows,
  };
}
