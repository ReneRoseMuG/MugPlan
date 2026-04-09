import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, like, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import { RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME } from "@shared/appointmentCancellation";
import {
  appointmentAttachments,
  appointmentNotes,
  appointmentEmployees,
  appointments,
  appointmentTags,
  componentCategories,
  components,
  customerAttachments,
  customerNotes,
  customerTags,
  customers,
  employees,
  notes,
  projectOrder,
  projectAttachments,
  projectOrderItems,
  projectNotes,
  projectTags,
  projects,
  products,
  tags,
  tours,
  type AppointmentAttachment,
  type Appointment,
  type InsertAppointmentAttachment,
  type InsertAppointment,
  type Tag,
  type Note,
} from "@shared/schema";
import { logDebug } from "../lib/logger";
import {
  getAppointmentTagsByAppointmentIds as getAppointmentTagsByAppointmentIdsMap,
  getCustomerTagsByCustomerIds as getCustomerTagsByCustomerIdsMap,
  getProjectTagsByProjectIds as getProjectTagsByProjectIdsMap,
} from "./tagRelationsRepository";

const logPrefix = "[appointments-repo]";
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function buildExcludeCancelledAppointmentCondition() {
  return sql`not exists (
    select 1
    from ${appointmentTags}
    inner join ${tags} on ${appointmentTags.tagId} = ${tags.id}
    where ${appointmentTags.appointmentId} = ${appointments.id}
      and lower(trim(${tags.name})) = lower(trim(${RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME}))
  )`;
}

export type AppointmentListFilters = {
  employeeId?: number;
  projectId?: number;
  customerId?: number;
  projectTitle?: string;
  customerLastName?: string;
  customerNumber?: string;
  orderNumber?: string;
  tagIds?: number[];
  tourId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  allDayOnly?: boolean;
  withStartTimeOnly?: boolean;
  singleEmployeeOnly?: boolean;
  lockedOnly?: boolean;
  lockedBeforeDate?: Date;
};

export type AppointmentListPaging = {
  page: number;
  pageSize: number;
};

async function getAppointmentEmployees(appointmentId: number) {
  const rows = await db
    .select({ employee: employees })
    .from(appointmentEmployees)
    .innerJoin(employees, eq(appointmentEmployees.employeeId, employees.id))
    .where(eq(appointmentEmployees.appointmentId, appointmentId));
  return rows.map((row) => row.employee);
}

async function getAppointmentEmployeesTx(tx: DbTx, appointmentId: number) {
  const rows = await tx
    .select({ employee: employees })
    .from(appointmentEmployees)
    .innerJoin(employees, eq(appointmentEmployees.employeeId, employees.id))
    .where(eq(appointmentEmployees.appointmentId, appointmentId));
  return rows.map((row) => row.employee);
}

export async function withAppointmentTransaction<T>(handler: (tx: DbTx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => handler(tx));
}

export async function getAppointmentEmployeesByAppointmentIds(appointmentIds: number[]) {
  if (appointmentIds.length === 0) return [];

  return db
    .select({
      appointmentId: appointmentEmployees.appointmentId,
      employee: employees,
    })
    .from(appointmentEmployees)
    .innerJoin(employees, eq(appointmentEmployees.employeeId, employees.id))
    .where(inArray(appointmentEmployees.appointmentId, appointmentIds));
}

export async function getAppointmentEmployeesByAppointmentIdsTx(tx: DbTx, appointmentIds: number[]) {
  if (appointmentIds.length === 0) return [];

  return tx
    .select({
      appointmentId: appointmentEmployees.appointmentId,
      employee: employees,
    })
    .from(appointmentEmployees)
    .innerJoin(employees, eq(appointmentEmployees.employeeId, employees.id))
    .where(inArray(appointmentEmployees.appointmentId, appointmentIds));
}

export async function listProjectArticleRowsByProjectIds(projectIds: number[]) {
  const uniqueProjectIds = Array.from(new Set(projectIds.filter((value) => Number.isFinite(value) && value > 0)));
  if (uniqueProjectIds.length === 0) return [];

  return db
    .select({
      projectId: projectOrderItems.projectId,
      itemId: projectOrderItems.id,
      productId: projectOrderItems.productId,
      componentId: projectOrderItems.componentId,
      productName: products.name,
      productShortCode: products.shortCode,
      componentName: components.name,
      componentShortCode: components.shortCode,
      componentCategoryName: componentCategories.name,
    })
    .from(projectOrderItems)
    .leftJoin(products, eq(projectOrderItems.productId, products.id))
    .leftJoin(components, eq(projectOrderItems.componentId, components.id))
    .leftJoin(componentCategories, eq(components.categoryId, componentCategories.id))
    .where(inArray(projectOrderItems.projectId, uniqueProjectIds))
    .orderBy(desc(projectOrderItems.updatedAt), desc(projectOrderItems.id));
}

export async function getCustomerNoteCountsByCustomerIds(customerIds: number[]): Promise<Map<number, number>> {
  const uniqueCustomerIds = Array.from(new Set(customerIds));
  if (uniqueCustomerIds.length === 0) return new Map();

  const rows = await db
    .select({
      customerId: customerNotes.customerId,
      count: sql<number>`count(*)`,
    })
    .from(customerNotes)
    .where(inArray(customerNotes.customerId, uniqueCustomerIds))
    .groupBy(customerNotes.customerId);

  return new Map(rows.map((row) => [row.customerId, Number(row.count)] as const));
}

export async function getProjectNoteCountsByProjectIds(projectIds: number[]): Promise<Map<number, number>> {
  const uniqueProjectIds = Array.from(new Set(projectIds));
  if (uniqueProjectIds.length === 0) return new Map();

  const rows = await db
    .select({
      projectId: projectNotes.projectId,
      count: sql<number>`count(*)`,
    })
    .from(projectNotes)
    .where(inArray(projectNotes.projectId, uniqueProjectIds))
    .groupBy(projectNotes.projectId);

  return new Map(rows.map((row) => [row.projectId, Number(row.count)] as const));
}

export async function getAppointmentNoteCountsByAppointmentIds(appointmentIds: number[]): Promise<Map<number, number>> {
  const uniqueAppointmentIds = Array.from(new Set(appointmentIds));
  if (uniqueAppointmentIds.length === 0) return new Map();

  const rows = await db
    .select({
      appointmentId: appointmentNotes.appointmentId,
      count: sql<number>`count(*)`,
    })
    .from(appointmentNotes)
    .where(inArray(appointmentNotes.appointmentId, uniqueAppointmentIds))
    .groupBy(appointmentNotes.appointmentId);

  return new Map(rows.map((row) => [row.appointmentId, Number(row.count)] as const));
}

export async function getAppointmentAttachmentCountsByAppointmentIds(appointmentIds: number[]): Promise<Map<number, number>> {
  const uniqueAppointmentIds = Array.from(new Set(appointmentIds));
  if (uniqueAppointmentIds.length === 0) return new Map();

  const rows = await db
    .select({
      appointmentId: appointmentAttachments.appointmentId,
      count: sql<number>`count(*)`,
    })
    .from(appointmentAttachments)
    .where(inArray(appointmentAttachments.appointmentId, uniqueAppointmentIds))
    .groupBy(appointmentAttachments.appointmentId);

  return new Map(rows.map((row) => [row.appointmentId, Number(row.count)] as const));
}

export async function getCustomerAttachmentCountsByCustomerIds(customerIds: number[]): Promise<Map<number, number>> {
  const uniqueCustomerIds = Array.from(new Set(customerIds.filter((value) => Number.isFinite(value) && value > 0)));
  if (uniqueCustomerIds.length === 0) return new Map();

  const rows = await db
    .select({
      customerId: customerAttachments.customerId,
      count: sql<number>`count(*)`,
    })
    .from(customerAttachments)
    .where(inArray(customerAttachments.customerId, uniqueCustomerIds))
    .groupBy(customerAttachments.customerId);

  return new Map(rows.map((row) => [row.customerId, Number(row.count)] as const));
}

export async function getProjectAttachmentCountsByProjectIds(projectIds: number[]): Promise<Map<number, number>> {
  const uniqueProjectIds = Array.from(new Set(projectIds.filter((value) => Number.isFinite(value) && value > 0)));
  if (uniqueProjectIds.length === 0) return new Map();

  const rows = await db
    .select({
      projectId: projectAttachments.projectId,
      count: sql<number>`count(*)`,
    })
    .from(projectAttachments)
    .where(inArray(projectAttachments.projectId, uniqueProjectIds))
    .groupBy(projectAttachments.projectId);

  return new Map(rows.map((row) => [row.projectId, Number(row.count)] as const));
}

export async function getCustomerTagsByCustomerIds(customerIds: number[]): Promise<Map<number, Tag[]>> {
  return getCustomerTagsByCustomerIdsMap(customerIds);
}

export async function getProjectTagsByProjectIds(projectIds: number[]): Promise<Map<number, Tag[]>> {
  return getProjectTagsByProjectIdsMap(projectIds);
}

export async function getAppointmentTagsByAppointmentIds(appointmentIds: number[]): Promise<Map<number, Tag[]>> {
  return getAppointmentTagsByAppointmentIdsMap(appointmentIds);
}

function buildNotesByOwnerMap<TId extends number>(
  rows: Array<{ ownerId: TId; note: Note }>,
): Map<TId, Note[]> {
  const notesByOwner = new Map<TId, Note[]>();
  for (const row of rows) {
    const existing = notesByOwner.get(row.ownerId) ?? [];
    existing.push(row.note);
    notesByOwner.set(row.ownerId, existing);
  }
  return notesByOwner;
}

export async function getCustomerPrintNotesByCustomerIds(customerIds: number[]): Promise<Map<number, Note[]>> {
  const uniqueCustomerIds = Array.from(new Set(customerIds.filter((value) => Number.isFinite(value) && value > 0)));
  if (uniqueCustomerIds.length === 0) return new Map();

  const rows = await db
    .select({
      ownerId: customerNotes.customerId,
      note: notes,
    })
    .from(customerNotes)
    .innerJoin(notes, eq(customerNotes.noteId, notes.id))
    .where(and(inArray(customerNotes.customerId, uniqueCustomerIds), eq(notes.print, true)))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt), desc(notes.id));

  return buildNotesByOwnerMap(rows);
}

export async function getProjectPrintNotesByProjectIds(projectIds: number[]): Promise<Map<number, Note[]>> {
  const uniqueProjectIds = Array.from(new Set(projectIds.filter((value) => Number.isFinite(value) && value > 0)));
  if (uniqueProjectIds.length === 0) return new Map();

  const rows = await db
    .select({
      ownerId: projectNotes.projectId,
      note: notes,
    })
    .from(projectNotes)
    .innerJoin(notes, eq(projectNotes.noteId, notes.id))
    .where(and(inArray(projectNotes.projectId, uniqueProjectIds), eq(notes.print, true)))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt), desc(notes.id));

  return buildNotesByOwnerMap(rows);
}

export async function getAppointmentPrintNotesByAppointmentIds(appointmentIds: number[]): Promise<Map<number, Note[]>> {
  const uniqueAppointmentIds = Array.from(new Set(appointmentIds.filter((value) => Number.isFinite(value) && value > 0)));
  if (uniqueAppointmentIds.length === 0) return new Map();

  const rows = await db
    .select({
      ownerId: appointmentNotes.appointmentId,
      note: notes,
    })
    .from(appointmentNotes)
    .innerJoin(notes, eq(appointmentNotes.noteId, notes.id))
    .where(and(inArray(appointmentNotes.appointmentId, uniqueAppointmentIds), eq(notes.print, true)))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt), desc(notes.id));

  return buildNotesByOwnerMap(rows);
}

export async function getAppointment(id: number): Promise<Appointment | null> {
  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
  return appointment || null;
}

export async function getAppointmentAttachments(appointmentId: number): Promise<AppointmentAttachment[]> {
  return db
    .select()
    .from(appointmentAttachments)
    .where(eq(appointmentAttachments.appointmentId, appointmentId))
    .orderBy(desc(appointmentAttachments.createdAt));
}

export async function getAppointmentAttachmentById(id: number): Promise<AppointmentAttachment | null> {
  const [attachment] = await db
    .select()
    .from(appointmentAttachments)
    .where(eq(appointmentAttachments.id, id));
  return attachment ?? null;
}

export async function createAppointmentAttachment(data: InsertAppointmentAttachment): Promise<AppointmentAttachment> {
  const result = await db.insert(appointmentAttachments).values(data);
  const insertId = (result as any)[0].insertId;
  const [attachment] = await db
    .select()
    .from(appointmentAttachments)
    .where(eq(appointmentAttachments.id, insertId));
  return attachment;
}

export async function deleteAppointmentAttachment(id: number): Promise<void> {
  await db.delete(appointmentAttachments).where(eq(appointmentAttachments.id, id));
}

export async function getAppointmentTx(tx: DbTx, id: number): Promise<Appointment | null> {
  const [appointment] = await tx.select().from(appointments).where(eq(appointments.id, id));
  return appointment || null;
}

export async function getProjectTx(
  tx: DbTx,
  projectId: number,
): Promise<{ id: number; name: string; customerId: number } | null> {
  const [project] = await tx
    .select({
      id: projects.id,
      name: projects.name,
      customerId: projects.customerId,
    })
    .from(projects)
    .where(eq(projects.id, projectId));

  return project ?? null;
}

export async function hasEmployeeDateOverlapTx(
  tx: DbTx,
  params: {
    employeeIds: number[];
    startDate: Date;
    endDate: Date | null;
    startTimeHour: number | null;
    excludeAppointmentId?: number;
  },
): Promise<boolean> {
  const normalizedEmployeeIds = Array.from(new Set(params.employeeIds));
  if (normalizedEmployeeIds.length === 0) return false;

  const effectiveEndDate = params.endDate ?? params.startDate;
  const conditions = [
    inArray(appointmentEmployees.employeeId, normalizedEmployeeIds),
    lte(appointments.startDate, effectiveEndDate),
    gte(sql<Date>`coalesce(${appointments.endDate}, ${appointments.startDate})`, params.startDate),
    buildExcludeCancelledAppointmentCondition(),
  ];
  if (params.startTimeHour == null) {
    conditions.push(isNull(appointments.startTime));
  } else {
    conditions.push(isNotNull(appointments.startTime));
    conditions.push(sql`hour(${appointments.startTime}) = ${params.startTimeHour}`);
  }

  if (typeof params.excludeAppointmentId === "number") {
    conditions.push(sql`${appointments.id} <> ${params.excludeAppointmentId}`);
  }

  const [row] = await tx
    .select({ count: sql<number>`count(*)` })
    .from(appointmentEmployees)
    .innerJoin(appointments, eq(appointmentEmployees.appointmentId, appointments.id))
    .where(and(...conditions));

  return Number(row?.count ?? 0) > 0;
}

export async function getConflictingEmployeesTx(
  tx: DbTx,
  params: {
    employeeIds: number[];
    startDate: Date;
    endDate: Date | null;
    startTimeHour: number | null;
    excludeAppointmentId?: number;
  },
): Promise<Array<{ id: number; fullName: string }>> {
  const normalizedEmployeeIds = Array.from(new Set(params.employeeIds));
  if (normalizedEmployeeIds.length === 0) return [];

  const effectiveEndDate = params.endDate ?? params.startDate;
  const conditions = [
    inArray(appointmentEmployees.employeeId, normalizedEmployeeIds),
    lte(appointments.startDate, effectiveEndDate),
    gte(sql<Date>`coalesce(${appointments.endDate}, ${appointments.startDate})`, params.startDate),
    buildExcludeCancelledAppointmentCondition(),
  ];
  if (params.startTimeHour == null) {
    conditions.push(isNull(appointments.startTime));
  } else {
    conditions.push(isNotNull(appointments.startTime));
    conditions.push(sql`hour(${appointments.startTime}) = ${params.startTimeHour}`);
  }

  if (typeof params.excludeAppointmentId === "number") {
    conditions.push(sql`${appointments.id} <> ${params.excludeAppointmentId}`);
  }

  const rows = await tx
    .select({
      id: employees.id,
      fullName: employees.fullName,
    })
    .from(appointmentEmployees)
    .innerJoin(appointments, eq(appointmentEmployees.appointmentId, appointments.id))
    .innerJoin(employees, eq(appointmentEmployees.employeeId, employees.id))
    .where(and(...conditions))
    .groupBy(employees.id, employees.fullName)
    .orderBy(asc(employees.id));

  return rows.map((row) => ({ id: row.id, fullName: row.fullName }));
}

export async function getInactiveEmployeesByIdsTx(
  tx: DbTx,
  employeeIds: number[],
): Promise<Array<{ id: number; fullName: string }>> {
  const normalizedEmployeeIds = Array.from(new Set(employeeIds));
  if (normalizedEmployeeIds.length === 0) return [];

  const rows = await tx
    .select({
      id: employees.id,
      fullName: employees.fullName,
    })
    .from(employees)
    .where(and(inArray(employees.id, normalizedEmployeeIds), eq(employees.isActive, false)))
    .orderBy(asc(employees.id));

  return rows.map((row) => ({ id: row.id, fullName: row.fullName }));
}

export async function createAppointmentTx(tx: DbTx, data: InsertAppointment): Promise<number> {
  const result = await tx.insert(appointments).values(data);
  return Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId);
}

export async function deleteAppointmentEmployeeTx(
  tx: DbTx,
  appointmentId: number,
  employeeId: number,
): Promise<number> {
  const result = await tx
    .delete(appointmentEmployees)
    .where(and(eq(appointmentEmployees.appointmentId, appointmentId), eq(appointmentEmployees.employeeId, employeeId)));
  return getAffectedRows(result);
}

export async function replaceAppointmentEmployeesTx(
  tx: DbTx,
  appointmentId: number,
  employeeIds: number[],
): Promise<void> {
  await tx.delete(appointmentEmployees).where(eq(appointmentEmployees.appointmentId, appointmentId));

  if (employeeIds.length === 0) return;

  await tx.insert(appointmentEmployees).values(
    employeeIds.map((employeeId) => ({
      appointmentId,
      employeeId,
    })),
  );
}

export async function addAppointmentTagTx(
  tx: DbTx,
  appointmentId: number,
  tagId: number,
): Promise<void> {
  await tx.execute(sql`
    insert into appointment_tags (appointment_id, tag_id, version)
    values (${appointmentId}, ${tagId}, 1)
    on duplicate key update version = version
  `);
}

function getAffectedRows(result: unknown): number {
  const raw = result as any;
  return Number(raw?.[0]?.affectedRows ?? raw?.affectedRows ?? 0);
}

export async function updateAppointmentWithVersionTx(
  tx: DbTx,
  params: {
    appointmentId: number;
    expectedVersion: number;
    data: Partial<InsertAppointment>;
  },
): Promise<{ kind: "updated" | "version_conflict" }> {
  const result = await tx.execute(sql`
    update appointments
    set
      project_id = ${params.data.projectId ?? null},
      customer_id = ${params.data.customerId ?? null},
      tour_id = ${params.data.tourId ?? null},
      title = ${params.data.title ?? null},
      description = ${params.data.description ?? null},
      start_date = ${params.data.startDate ?? null},
      start_time = ${params.data.startTime ?? null},
      end_date = ${params.data.endDate ?? null},
      end_time = ${params.data.endTime ?? null},
      version = version + 1
    where id = ${params.appointmentId}
      and version = ${params.expectedVersion}
  `);

  return getAffectedRows(result) === 0 ? { kind: "version_conflict" } : { kind: "updated" };
}

export async function updateAppointmentDisplayModeWithVersionTx(
  tx: DbTx,
  params: {
    appointmentId: number;
    expectedVersion: number;
    displayMode: string;
  },
): Promise<{ kind: "updated" | "version_conflict" }> {
  const result = await tx.execute(sql`
    update appointments
    set
      display_mode = ${params.displayMode},
      version = version + 1
    where id = ${params.appointmentId}
      and version = ${params.expectedVersion}
  `);

  return getAffectedRows(result) === 0 ? { kind: "version_conflict" } : { kind: "updated" };
}

export async function bumpAppointmentVersionTx(
  tx: DbTx,
  params: {
    appointmentId: number;
    expectedVersion: number;
  },
): Promise<{ kind: "updated" | "version_conflict" }> {
  const result = await tx.execute(sql`
    update appointments
    set
      version = version + 1
    where id = ${params.appointmentId}
      and version = ${params.expectedVersion}
  `);

  return getAffectedRows(result) === 0 ? { kind: "version_conflict" } : { kind: "updated" };
}

export async function deleteAppointmentWithVersionTx(
  tx: DbTx,
  params: { appointmentId: number; expectedVersion: number },
): Promise<{ kind: "deleted" | "version_conflict" }> {
  const result = await tx.execute(sql`
    delete from appointments
    where id = ${params.appointmentId}
      and version = ${params.expectedVersion}
  `);

  return getAffectedRows(result) === 0 ? { kind: "version_conflict" } : { kind: "deleted" };
}

export async function getAppointmentWithEmployeesTx(tx: DbTx, id: number) {
  const [appointment] = await tx.select().from(appointments).where(eq(appointments.id, id));
  if (!appointment) return null;
  const employeeRows = await getAppointmentEmployeesTx(tx, id);
  return { ...appointment, employees: employeeRows };
}

export async function getAppointmentWithEmployees(id: number) {
  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
  if (!appointment) return null;
  const employeeRows = await getAppointmentEmployees(id);
  return { ...appointment, employees: employeeRows };
}

export async function setAppointmentExternalEventId(
  appointmentId: number,
  externalEventId: string | null,
): Promise<void> {
  await db
    .update(appointments)
    .set({ externalEventId })
    .where(eq(appointments.id, appointmentId));
}

export async function createAppointment(data: InsertAppointment, employeeIds: number[]) {
  return withAppointmentTransaction(async (tx) => {
    logDebug(`${logPrefix} create appointment for projectId=${data.projectId}`);
    const insertId = await createAppointmentTx(tx, data);

    if (employeeIds.length > 0) {
      logDebug(`${logPrefix} assign ${employeeIds.length} employees to appointmentId=${insertId}`);
      await replaceAppointmentEmployeesTx(tx, insertId, employeeIds);
    } else {
      logDebug(`${logPrefix} no employees assigned to appointmentId=${insertId}`);
    }

    const [appointment] = await tx.select().from(appointments).where(eq(appointments.id, insertId));
    const assignedEmployees = await getAppointmentEmployeesTx(tx, insertId);

    return { ...appointment, employees: assignedEmployees };
  });
}

export async function listAppointmentsByProjectFromDate(projectId: number, fromDate: Date): Promise<Appointment[]> {
  logDebug(`${logPrefix} list appointments projectId=${projectId} fromDate>=${fromDate}`);
  return db
    .select()
    .from(appointments)
    .where(and(eq(appointments.projectId, projectId), gte(appointments.startDate, fromDate)))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

export async function getLatestAppointmentSummaryByProjectId(projectId: number): Promise<{
  id: number;
  startDate: Date;
  endDate: Date | null;
  startTime: string | null;
  tourName: string | null;
  customerName: string | null;
} | null> {
  const [row] = await db
    .select({
      id: appointments.id,
      startDate: appointments.startDate,
      endDate: appointments.endDate,
      startTime: appointments.startTime,
      tourName: tours.name,
      customerName: customers.fullName,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(eq(appointments.projectId, projectId))
    .orderBy(desc(appointments.startDate), desc(appointments.startTime), desc(appointments.id))
    .limit(1);

  return row ?? null;
}

export async function listAppointmentsByEmployeeFromDate(employeeId: number, fromDate: Date) {
  logDebug(`${logPrefix} list appointments employeeId=${employeeId} fromDate>=${fromDate}`);
  return db
    .select({
      appointment: appointments,
      projectName: projects.name,
      customerName: customers.fullName,
    })
    .from(appointmentEmployees)
    .innerJoin(appointments, eq(appointmentEmployees.appointmentId, appointments.id))
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .where(and(eq(appointmentEmployees.employeeId, employeeId), gte(appointments.startDate, fromDate)))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

export async function listSidebarAppointmentsByProjectFromDate(projectId: number, fromDate: Date) {
  logDebug(`${logPrefix} list sidebar appointments by project projectId=${projectId} fromDate>=${fromDate}`);
  return db
    .select({
      appointment: appointments,
      project: projects,
      projectOrder,
      customer: customers,
      tour: tours,
    })
    .from(appointments)
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(and(eq(appointments.projectId, projectId), gte(appointments.startDate, fromDate)))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

export async function listSidebarAppointmentsByEmployeeFromDate(employeeId: number, fromDate: Date) {
  logDebug(`${logPrefix} list sidebar appointments by employee employeeId=${employeeId} fromDate>=${fromDate}`);
  return db
    .select({
      appointment: appointments,
      project: projects,
      projectOrder,
      customer: customers,
      tour: tours,
    })
    .from(appointmentEmployees)
    .innerJoin(appointments, eq(appointmentEmployees.appointmentId, appointments.id))
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(and(eq(appointmentEmployees.employeeId, employeeId), gte(appointments.startDate, fromDate)))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

export async function listSidebarAppointmentsByEmployeeScope(employeeId: number, fromDate?: Date) {
  logDebug(
    `${logPrefix} list sidebar appointments by employee scope employeeId=${employeeId} fromDate=${fromDate ? `>=${fromDate}` : "none"}`,
  );
  const whereConditions = [eq(appointmentEmployees.employeeId, employeeId)];
  if (fromDate) {
    whereConditions.push(gte(appointments.startDate, fromDate));
  }
  return db
    .select({
      appointment: appointments,
      project: projects,
      projectOrder,
      customer: customers,
      tour: tours,
    })
    .from(appointmentEmployees)
    .innerJoin(appointments, eq(appointmentEmployees.appointmentId, appointments.id))
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(and(...whereConditions))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

export async function listSidebarAppointmentsByCustomerScope(customerId: number, fromDate?: Date) {
  logDebug(
    `${logPrefix} list sidebar appointments by customer scope customerId=${customerId} fromDate=${fromDate ? `>=${fromDate}` : "none"}`,
  );
  const whereConditions = [eq(appointments.customerId, customerId)];
  if (fromDate) {
    whereConditions.push(gte(appointments.startDate, fromDate));
  }
  return db
    .select({
      appointment: appointments,
      project: projects,
      projectOrder,
      customer: customers,
      tour: tours,
    })
    .from(appointments)
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(and(...whereConditions))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

export async function listSidebarAppointmentsByTourFromDate(tourId: number, fromDate: Date) {
  logDebug(`${logPrefix} list sidebar appointments by tour tourId=${tourId} fromDate>=${fromDate}`);
  return db
    .select({
      appointment: appointments,
      project: projects,
      projectOrder,
      customer: customers,
      tour: tours,
    })
    .from(appointments)
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(and(eq(appointments.tourId, tourId), gte(appointments.startDate, fromDate)))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

export async function listAppointmentsByTourForDateRange(tourId: number, fromDate: Date, toDate: Date) {
  logDebug(`${logPrefix} list tour print appointments tourId=${tourId} fromDate=${fromDate} toDate=${toDate}`);
  return db
    .select({
      appointment: appointments,
      project: projects,
      projectOrder,
      customer: customers,
      tour: tours,
    })
    .from(appointments)
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(
      and(
        tourId === 0 ? isNull(appointments.tourId) : eq(appointments.tourId, tourId),
        lte(appointments.startDate, toDate),
        or(isNull(appointments.endDate), gte(appointments.endDate, fromDate)),
      ),
    )
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

export async function listAppointmentsForCalendarRange({
  fromDate,
  toDate,
  employeeId,
}: {
  fromDate: Date;
  toDate: Date;
  employeeId?: number | null;
}) {
  logDebug(`${logPrefix} list calendar appointments fromDate=${fromDate} toDate=${toDate} employeeId=${employeeId ?? "n/a"}`);

  const employeeAppointmentIdsQuery = employeeId
    ? db
        .select({ appointmentId: appointmentEmployees.appointmentId })
        .from(appointmentEmployees)
        .where(eq(appointmentEmployees.employeeId, employeeId))
    : null;

  const conditions = [
    lte(appointments.startDate, toDate),
    or(isNull(appointments.endDate), gte(appointments.endDate, fromDate)),
  ];

  if (employeeAppointmentIdsQuery) {
    conditions.push(inArray(appointments.id, employeeAppointmentIdsQuery));
  }

  return db
    .select({
      appointment: appointments,
      project: projects,
      projectOrder,
      customer: customers,
      tour: tours,
    })
    .from(appointments)
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(and(...conditions))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

function buildAppointmentListConditions(filters: AppointmentListFilters) {
  const conditions: unknown[] = [];
  const tagIds = Array.from(new Set((filters.tagIds ?? []).filter((value) => Number.isFinite(value) && value > 0)));

  if (filters.projectId) {
    conditions.push(eq(appointments.projectId, filters.projectId));
  }
  if (filters.customerId) {
    conditions.push(eq(appointments.customerId, filters.customerId));
  }
  if (filters.projectTitle) {
    conditions.push(sql`lower(coalesce(${projects.name}, '')) like ${`%${filters.projectTitle.toLowerCase()}%`}`);
  }
  if (filters.customerLastName) {
    conditions.push(or(
      sql`lower(coalesce(${customers.lastName}, '')) like ${`%${filters.customerLastName.toLowerCase()}%`}`,
      sql`lower(coalesce(${customers.fullName}, '')) like ${`%${filters.customerLastName.toLowerCase()}%`}`,
    )!);
  }
  if (filters.customerNumber) {
    conditions.push(like(customers.customerNumber, `%${filters.customerNumber}%`));
  }
  if (filters.orderNumber) {
    conditions.push(like(projectOrder.orderNumber, `%${filters.orderNumber}%`));
  }
  if (tagIds.length > 0) {
    const tagIdList = sql.join(tagIds.map((id) => sql`${id}`), sql`, `);
    conditions.push(sql`(
      exists (
        select 1
        from ${appointmentTags}
        where ${appointmentTags.appointmentId} = ${appointments.id}
          and ${appointmentTags.tagId} in (${tagIdList})
      )
      or exists (
        select 1
        from ${customerTags}
        where ${customerTags.customerId} = ${appointments.customerId}
          and ${customerTags.tagId} in (${tagIdList})
      )
      or exists (
        select 1
        from ${projectTags}
        where ${projectTags.projectId} = ${appointments.projectId}
          and ${projectTags.tagId} in (${tagIdList})
      )
    )`);
  }
  if (filters.tourId) {
    conditions.push(eq(appointments.tourId, filters.tourId));
  }
  if (filters.dateFrom) {
    conditions.push(gte(appointments.startDate, filters.dateFrom));
  }
  if (filters.dateTo) {
    conditions.push(lte(appointments.startDate, filters.dateTo));
  }
  if (filters.allDayOnly) {
    conditions.push(isNull(appointments.startTime));
  }
  if (filters.withStartTimeOnly) {
    conditions.push(isNotNull(appointments.startTime));
  }
  if (filters.lockedOnly && filters.lockedBeforeDate) {
    conditions.push(lte(appointments.startDate, filters.lockedBeforeDate));
  }
  if (filters.employeeId) {
    conditions.push(
      sql`exists (
        select 1
        from ${appointmentEmployees}
        where ${appointmentEmployees.appointmentId} = ${appointments.id}
          and ${appointmentEmployees.employeeId} = ${filters.employeeId}
      )`,
    );
  }
  if (filters.singleEmployeeOnly) {
    conditions.push(
      sql`exists (
        select 1
        from ${appointmentEmployees}
        where ${appointmentEmployees.appointmentId} = ${appointments.id}
        group by ${appointmentEmployees.appointmentId}
        having count(*) = 1
      )`,
    );
  }

  return conditions;
}

export async function listAppointmentsForList(
  filters: AppointmentListFilters,
  paging: AppointmentListPaging,
) {
  const conditions = buildAppointmentListConditions(filters);
  const whereClause = conditions.length > 0 ? and(...(conditions as Parameters<typeof and>)) : undefined;
  const offset = (paging.page - 1) * paging.pageSize;

  const [totalResult] = await db
    .select({ total: sql<number>`count(*)` })
    .from(appointments)
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(whereClause);

  const rows = await db
    .select({
      appointment: appointments,
      project: projects,
      projectOrder,
      customer: customers,
      tour: tours,
    })
    .from(appointments)
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(whereClause)
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id))
    .limit(paging.pageSize)
    .offset(offset);

  return {
    rows,
    total: Number(totalResult?.total ?? 0),
  };
}

export async function listAppointmentsForMonitoring(params: {
  fromDate: Date;
  toDate?: Date;
}) {
  const whereClause = params.toDate
    ? and(gte(appointments.startDate, params.fromDate), lte(appointments.startDate, params.toDate))
    : gte(appointments.startDate, params.fromDate);

  return db
    .select({
      appointmentId: appointments.id,
      startDate: sql<string>`date_format(${appointments.startDate}, '%Y-%m-%d')`,
      endDate: sql<string | null>`case when ${appointments.endDate} is null then null else date_format(${appointments.endDate}, '%Y-%m-%d') end`,
      tourName: tours.name,
      employeeCount: sql<number>`cast(count(${appointmentEmployees.employeeId}) as signed)`,
    })
    .from(appointments)
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .leftJoin(appointmentEmployees, eq(appointmentEmployees.appointmentId, appointments.id))
    .where(whereClause)
    .groupBy(appointments.id, appointments.startDate, appointments.endDate, tours.name)
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}
