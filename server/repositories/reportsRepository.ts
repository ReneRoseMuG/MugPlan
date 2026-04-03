import { and, asc, eq, gte, inArray, isNotNull, lte, sql, type SQL } from "drizzle-orm";
import { differenceInCalendarDays } from "date-fns";
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
  tours,
} from "@shared/schema";
import { stripReportHtmlToText } from "../lib/reportVorlaufliste";
import {
  hasAppointmentCancellationTag,
  isManagedRemarksTag,
  hasManagedReportExclusionTag,
  isAppointmentCancellationTag,
  isManagedSpecialMeasureTag,
} from "../lib/appointmentCancellation";
import {
  buildGroupedProduktionsplanungCategoryGroups,
  collectManagedReportCardReasonTags,
} from "../lib/reportProduktionsplanung";
import {
  getAppointmentAttachmentCountsByAppointmentIds,
  getAppointmentEmployeesByAppointmentIds,
  getAppointmentNoteCountsByAppointmentIds,
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
  isActive: boolean;
  orderNumber: string | null;
  customerId: number;
  customerNumber: string | null;
  tags: Tag[];
  highlightTag: Tag | null;
  amount: string | null;
  customerFullName: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
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

export type VorlauflisteResult = {
  productCategories: VorlauflisteCategory[];
  componentCategories: VorlauflisteCategory[];
  items: VorlauflisteRow[];
};

export type ProduktionsplanungItemTotal = {
  itemName: string;
  totalQuantity: number;
};

export type ProduktionsplanungCategoryGroup = {
  categoryId: number;
  categoryName: string;
  items: ProduktionsplanungItemTotal[];
};

export type ReportEmployeeSummary = {
  id: number;
  fullName: string;
};

export type ProduktionsplanungProjectRow = {
  projectId: number;
  orderNumber: string | null;
  customerNumber: string | null;
  customerFullName: string | null;
  projectName: string;
  actualDate: string;
  durationDays: number;
  tourName: string | null;
  employees: ReportEmployeeSummary[];
  notesCount: number;
  attachmentsCount: number;
  tags: Tag[];
  reportCardReasonTags: Tag[];
  articleValues: VorlauflisteArticleValue[];
  projectDescription: string | null;
};

export type ProduktionsplanungResult = {
  productCategoryGroups: ProduktionsplanungCategoryGroup[];
  componentCategoryGroups: ProduktionsplanungCategoryGroup[];
  projectRows: ProduktionsplanungProjectRow[];
};

type ReportArticleBuckets = Map<number, Set<string>>;

type NormalizedProjectAppointmentRow = {
  appointmentId: number;
  projectId: number;
  startDate: string;
  endDate: string | null;
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
  remarksTag: Tag | null;
};

type VorlauflisteAppointmentMeta = {
  appointmentId: number;
  sortDate: string;
  actualDate: string;
  durationDays: number;
  tourName: string | null;
  appointmentTags: Tag[];
  reportState: AppointmentCancellationReportState;
};

type VorlauflisteProjectMeta = {
  sortedProjectIds: number[];
  appointmentMetaByProjectId: Map<number, VorlauflisteAppointmentMeta>;
  projectReportTagStateByProjectId: Map<number, ProjectReportTagState>;
  tagsByProjectId: Map<number, Tag[]>;
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
    remarksTag: null,
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
      remarksTag: findFirstMatchingTag(projectTags, isManagedRemarksTag),
    });
  }

  for (const row of appointmentRows) {
    const current = stateByProjectId.get(row.projectId) ?? createEmptyProjectReportTagState();
    const appointmentTags = appointmentTagsByAppointmentId.get(row.appointmentId) ?? [];

    current.hasReportExclusion ||= hasManagedReportExclusionTag(appointmentTags);
    current.cancellationTag ??= findFirstMatchingTag(appointmentTags, isAppointmentCancellationTag);
    current.specialMeasureTag ??= findFirstMatchingTag(appointmentTags, isManagedSpecialMeasureTag);
    current.remarksTag ??= findFirstMatchingTag(appointmentTags, isManagedRemarksTag);

    stateByProjectId.set(row.projectId, current);
  }

  return stateByProjectId;
}

async function listActiveVorlauflisteCategories(): Promise<{
  productCategories: VorlauflisteCategory[];
  componentCategories: VorlauflisteCategory[];
}> {
  const [activeProductCategories, activeComponentCategories] = await Promise.all([
    db
      .select({
        id: productCategories.id,
        name: productCategories.name,
      })
      .from(productCategories)
      .where(eq(productCategories.isActive, true))
      .orderBy(asc(productCategories.name), asc(productCategories.id)),
    db
      .select({
        id: componentCategories.id,
        name: componentCategories.name,
      })
      .from(componentCategories)
      .where(eq(componentCategories.isActive, true))
      .orderBy(asc(componentCategories.name), asc(componentCategories.id)),
  ]);

  return {
    productCategories: activeProductCategories,
    componentCategories: activeComponentCategories,
  };
}

async function buildVorlauflisteProjectMeta(params: {
  fromDate: string;
  toDate?: string;
  useShortCodes: boolean;
}): Promise<VorlauflisteProjectMeta> {
  const appointmentConditions = buildAppointmentConditions(params);
  const projectAppointmentRows = await db
    .select({
      appointmentId: appointments.id,
      projectId: appointments.projectId,
      startDate: sql<string>`date_format(${appointments.startDate}, '%Y-%m-%d')`,
      endDate: sql<string | null>`case when ${appointments.endDate} is null then null else date_format(${appointments.endDate}, '%Y-%m-%d') end`,
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
      sortedProjectIds: [],
      appointmentMetaByProjectId: new Map<number, VorlauflisteAppointmentMeta>(),
      projectReportTagStateByProjectId: new Map<number, ProjectReportTagState>(),
      tagsByProjectId: new Map<number, Tag[]>(),
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
  const appointmentMetaByProjectId = new Map<number, VorlauflisteAppointmentMeta>();
  const appointmentAccumulatorByProjectId = new Map<number, {
    firstActiveMeta: Omit<VorlauflisteAppointmentMeta, "reportState"> | null;
    firstCancelledMeta: Omit<VorlauflisteAppointmentMeta, "reportState"> | null;
    hasActive: boolean;
    hasCancelled: boolean;
  }>();

  for (const row of normalizedAppointmentRows) {
    const projectTagState = projectReportTagStateByProjectId.get(row.projectId) ?? createEmptyProjectReportTagState();
    if (projectTagState.hasReportExclusion) {
      continue;
    }

    const current = appointmentAccumulatorByProjectId.get(row.projectId) ?? {
      firstActiveMeta: null,
      firstCancelledMeta: null,
      hasActive: false,
      hasCancelled: false,
    };
    const isCancelled = hasAppointmentCancellationTag(appointmentTagsByAppointmentId.get(row.appointmentId) ?? []);
    const appointmentMeta = {
      appointmentId: row.appointmentId,
      sortDate: row.startDate,
      actualDate: row.startDate,
      durationDays: differenceInCalendarDays(
        new Date(`${row.endDate ?? row.startDate}T00:00:00`),
        new Date(`${row.startDate}T00:00:00`),
      ) + 1,
      tourName: row.tourName ?? null,
      appointmentTags: appointmentTagsByAppointmentId.get(row.appointmentId) ?? [],
    };

    if (isCancelled) {
      current.hasCancelled = true;
      current.firstCancelledMeta ??= appointmentMeta;
    } else {
      current.hasActive = true;
      current.firstActiveMeta ??= appointmentMeta;
    }

    appointmentAccumulatorByProjectId.set(row.projectId, current);

    const selectedMeta = current.firstActiveMeta ?? current.firstCancelledMeta;
    if (!selectedMeta) continue;

    appointmentMetaByProjectId.set(row.projectId, {
      ...selectedMeta,
      reportState: current.hasCancelled
        ? (current.hasActive ? "contains_cancelled" : "cancelled_only")
        : "default",
    });
  }

  const sortedProjectIds = Array.from(appointmentMetaByProjectId.entries())
    .sort((left, right) => left[1].sortDate.localeCompare(right[1].sortDate, "de") || left[0] - right[0])
    .map(([projectId]) => projectId);

  return {
    sortedProjectIds,
    appointmentMetaByProjectId,
    projectReportTagStateByProjectId,
    tagsByProjectId,
  };
}

async function buildVorlauflisteItems(params: {
  projectIds: number[];
  useShortCodes: boolean;
  productCategories: VorlauflisteCategory[];
  componentCategories: VorlauflisteCategory[];
  appointmentMetaByProjectId: Map<number, VorlauflisteAppointmentMeta>;
  projectReportTagStateByProjectId: Map<number, ProjectReportTagState>;
  tagsByProjectId: Map<number, Tag[]>;
}): Promise<VorlauflisteRow[]> {
  const { projectIds } = params;
  if (projectIds.length === 0) {
    return [];
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
  const activeProductCategoryIds = new Set(params.productCategories.map((category) => category.id));
  const activeComponentCategoryIds = new Set(params.componentCategories.map((category) => category.id));

  for (const row of orderItemRows) {
    const projectId = row.item.projectId;
    const buckets = bucketsByProjectId.get(projectId) ?? createEmptyBuckets();

    if (
      row.product
      && row.productCategory
      && activeProductCategoryIds.has(row.productCategory.id)
    ) {
      const displayName = resolveArticleName(row.product.name.trim(), row.product.shortCode, params.useShortCodes);
      addToBucket(buckets, row.productCategory.id, displayName);
      bucketsByProjectId.set(projectId, buckets);
      continue;
    }

    if (!row.component || !row.componentCategory || !activeComponentCategoryIds.has(row.componentCategory.id)) {
      bucketsByProjectId.set(projectId, buckets);
      continue;
    }

    const displayName = resolveArticleName(row.component.name.trim(), row.component.shortCode, params.useShortCodes);
    addToBucket(buckets, row.componentCategory.id, displayName);
    bucketsByProjectId.set(projectId, buckets);
  }

  const allCategoryIds = [
    ...params.productCategories.map((category) => category.id),
    ...params.componentCategories.map((category) => category.id),
  ];

  return projectIds
    .map((projectId) => {
      const row = projectById.get(projectId);
      const appointmentMeta = params.appointmentMetaByProjectId.get(projectId);
      const projectTagState = params.projectReportTagStateByProjectId.get(projectId) ?? createEmptyProjectReportTagState();
      if (!row || !appointmentMeta) return null;
      const buckets = bucketsByProjectId.get(projectId) ?? createEmptyBuckets();
      const projectTags = params.tagsByProjectId.get(projectId) ?? [];

      const articleValues: VorlauflisteArticleValue[] = allCategoryIds.map((categoryId) => ({
        categoryId,
        value: joinSorted(buckets.get(categoryId) ?? new Set()),
      }));

      return {
        projectId,
        projectName: row.project.name,
        isActive: row.project.isActive,
        orderNumber: row.order?.orderNumber ?? null,
        customerId: row.customer.id,
        customerNumber: row.customer.customerNumber || null,
        tags: projectTags,
        highlightTag: projectTagState.cancellationTag ?? projectTagState.specialMeasureTag,
        amount: row.order?.amount ?? null,
        customerFullName: row.customer.fullName ?? null,
        postalCode: row.customer.postalCode ?? null,
        city: row.customer.city ?? null,
        country: row.customer.country ?? null,
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
    .filter((entry): entry is VorlauflisteRow => entry !== null);
}

export async function getVorlauflistePaged(params: {
  fromDate: string;
  toDate?: string;
  useShortCodes: boolean;
  page: number;
  pageSize: number;
}): Promise<VorlauflistePagedResult> {
  const [categories, projectMeta] = await Promise.all([
    listActiveVorlauflisteCategories(),
    buildVorlauflisteProjectMeta(params),
  ]);

  const total = projectMeta.sortedProjectIds.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / params.pageSize);
  const offset = (params.page - 1) * params.pageSize;
  const projectIds = projectMeta.sortedProjectIds.slice(offset, offset + params.pageSize);
  const items = await buildVorlauflisteItems({
    projectIds,
    useShortCodes: params.useShortCodes,
    productCategories: categories.productCategories,
    componentCategories: categories.componentCategories,
    appointmentMetaByProjectId: projectMeta.appointmentMetaByProjectId,
    projectReportTagStateByProjectId: projectMeta.projectReportTagStateByProjectId,
    tagsByProjectId: projectMeta.tagsByProjectId,
  });

  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages,
    productCategories: categories.productCategories,
    componentCategories: categories.componentCategories,
    items,
  };
}

export async function getVorlauflistePrintPreview(params: {
  fromDate: string;
  toDate?: string;
  useShortCodes: boolean;
}): Promise<VorlauflisteResult> {
  const [categories, projectMeta] = await Promise.all([
    listActiveVorlauflisteCategories(),
    buildVorlauflisteProjectMeta(params),
  ]);
  const items = await buildVorlauflisteItems({
    projectIds: projectMeta.sortedProjectIds,
    useShortCodes: params.useShortCodes,
    productCategories: categories.productCategories,
    componentCategories: categories.componentCategories,
    appointmentMetaByProjectId: projectMeta.appointmentMetaByProjectId,
    projectReportTagStateByProjectId: projectMeta.projectReportTagStateByProjectId,
    tagsByProjectId: projectMeta.tagsByProjectId,
  });

  return {
    productCategories: categories.productCategories,
    componentCategories: categories.componentCategories,
    items,
  };
}

export async function getProduktionsplanung(params: {
  fromDate: string;
  toDate?: string;
  productCategoryIds: number[];
  componentCategoryIds: number[];
  useShortCodes: boolean;
}): Promise<ProduktionsplanungResult> {
  const projectMeta = await buildVorlauflisteProjectMeta(params);
  if (projectMeta.sortedProjectIds.length === 0) {
    return {
      productCategoryGroups: [],
      componentCategoryGroups: [],
      projectRows: [],
    };
  }

  const eligibleProjectIds = projectMeta.sortedProjectIds.filter((projectId) => {
    const tagState = projectMeta.projectReportTagStateByProjectId.get(projectId) ?? createEmptyProjectReportTagState();
    return !tagState.hasReportExclusion && !tagState.cancellationTag;
  });

  if (eligibleProjectIds.length === 0) {
    return {
      productCategoryGroups: [],
      componentCategoryGroups: [],
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

  const representativeAppointmentIds = Array.from(new Set(
    eligibleProjectIds
      .map((projectId) => projectMeta.appointmentMetaByProjectId.get(projectId)?.appointmentId)
      .filter((appointmentId): appointmentId is number => typeof appointmentId === "number" && Number.isInteger(appointmentId) && appointmentId > 0),
  ));
  const [
    representativeAppointmentEmployees,
    representativeAppointmentNoteCounts,
    representativeAppointmentAttachmentCounts,
    projectNoteCountsByProjectId,
    projectAttachmentsCountByProjectId,
  ] = await Promise.all([
    getAppointmentEmployeesByAppointmentIds(representativeAppointmentIds),
    getAppointmentNoteCountsByAppointmentIds(representativeAppointmentIds),
    getAppointmentAttachmentCountsByAppointmentIds(representativeAppointmentIds),
    getProjectNoteCountsByProjectIds(eligibleProjectIds),
    getProjectAttachmentCountsByProjectIds(eligibleProjectIds),
  ]);

  const employeesByAppointmentId = new Map<number, ReportEmployeeSummary[]>();
  for (const row of representativeAppointmentEmployees) {
    const entries = employeesByAppointmentId.get(row.appointmentId) ?? [];
    entries.push({
      id: row.employee.id,
      fullName: row.employee.fullName,
    });
    employeesByAppointmentId.set(row.appointmentId, entries);
  }
  for (const [appointmentId, employeesForAppointment] of Array.from(employeesByAppointmentId.entries())) {
    employeesByAppointmentId.set(
      appointmentId,
      employeesForAppointment.sort((left: ReportEmployeeSummary, right: ReportEmployeeSummary) =>
        left.fullName.localeCompare(right.fullName, "de") || left.id - right.id),
    );
  }

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
  const articleBucketsByProjectId = new Map<number, ReportArticleBuckets>();

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
    }
  }

  const sortedProductCategoryGroups = buildGroupedProduktionsplanungCategoryGroups(productGroupRows, params.useShortCodes);
  const sortedComponentCategoryGroups = buildGroupedProduktionsplanungCategoryGroups(componentGroupRows, params.useShortCodes);

  const projectDetailsById = new Map(projectDetails.map((row) => [row.project.id, row] as const));

  const allCategoryIds = [...params.productCategoryIds, ...params.componentCategoryIds];
  const projectRows = eligibleProjectIds
    .map((projectId) => {
      const projectDetail = projectDetailsById.get(projectId);
      const appointmentMeta = projectMeta.appointmentMetaByProjectId.get(projectId);
      if (!projectDetail || !appointmentMeta) {
        return null;
      }

      const projectTags = projectMeta.tagsByProjectId.get(projectId) ?? [];
      const articleBuckets = articleBucketsByProjectId.get(projectId) ?? createEmptyBuckets();
      const appointmentEmployees = employeesByAppointmentId.get(appointmentMeta.appointmentId) ?? [];
      const notesCount = (projectNoteCountsByProjectId.get(projectId) ?? 0) + (representativeAppointmentNoteCounts.get(appointmentMeta.appointmentId) ?? 0);
      const attachmentsCount = (projectAttachmentsCountByProjectId.get(projectId) ?? 0) + (representativeAppointmentAttachmentCounts.get(appointmentMeta.appointmentId) ?? 0);
      const reportCardReasonTags = collectManagedReportCardReasonTags({
        projectTags,
        appointmentTags: appointmentMeta.appointmentTags,
      });

      if (reportCardReasonTags.length === 0) {
        return null;
      }

      return {
        projectId,
        projectName: projectDetail.project.name,
        orderNumber: projectDetail.order?.orderNumber ?? null,
        customerNumber: projectDetail.customer?.customerNumber ?? null,
        customerFullName: projectDetail.customer?.fullName ?? null,
        actualDate: appointmentMeta.actualDate,
        durationDays: appointmentMeta.durationDays,
        tourName: appointmentMeta.tourName,
        employees: appointmentEmployees,
        notesCount,
        attachmentsCount,
        tags: Array.from(new Map(
          [...projectTags, ...appointmentMeta.appointmentTags].map((tag) => [tag.id, tag] as const),
        ).values()).sort((left, right) => left.name.localeCompare(right.name, "de") || left.id - right.id),
        reportCardReasonTags,
        articleValues: allCategoryIds.map((categoryId) => ({
          categoryId,
          value: joinSorted(articleBuckets.get(categoryId) ?? new Set()),
        })),
        projectDescription: stripReportHtmlToText(projectDetail.project.descriptionMd),
      };
    })
    .filter((entry): entry is ProduktionsplanungProjectRow => entry !== null)
    .sort((left, right) => left.actualDate.localeCompare(right.actualDate, "de") || left.projectId - right.projectId);

  return {
    productCategoryGroups: sortedProductCategoryGroups,
    componentCategoryGroups: sortedComponentCategoryGroups,
    projectRows,
  };
}
