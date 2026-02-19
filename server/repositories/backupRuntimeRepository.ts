import { and, asc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  appointmentEmployees,
  appointments,
  customers,
  employees,
  projectProjectStatus,
  projectStatus,
  projects,
  tours,
} from "@shared/schema";

export type ExportAppointmentRow = {
  appointmentId: number;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  tourId: number | null;
  tourName: string | null;
  tourColor: string | null;
  projectId: number;
  projectName: string;
  orderNumber: string | null;
  customerId: number;
  customerNumber: string;
  customerName: string | null;
  postalCode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
};

let ensureToursUpdatedAtPromise: Promise<void> | null = null;

async function ensureToursUpdatedAtColumn(): Promise<void> {
  if (!ensureToursUpdatedAtPromise) {
    ensureToursUpdatedAtPromise = db.execute(sql`
      ALTER TABLE tours
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `).then(() => undefined).catch(() => undefined);
  }
  await ensureToursUpdatedAtPromise;
}

export async function getLatestRelevantDataChangeAt(): Promise<Date | null> {
  await ensureToursUpdatedAtColumn();

  const [row] = await db.execute(sql`
    SELECT GREATEST(
      IFNULL((SELECT MAX(updated_at) FROM appointments), '1970-01-01 00:00:00'),
      IFNULL((SELECT MAX(updated_at) FROM project), '1970-01-01 00:00:00'),
      IFNULL((SELECT MAX(updated_at) FROM customer), '1970-01-01 00:00:00'),
      IFNULL((SELECT MAX(updated_at) FROM employee), '1970-01-01 00:00:00'),
      IFNULL((SELECT MAX(updated_at) FROM tours), '1970-01-01 00:00:00')
    ) AS latest_change
  `) as unknown as Array<{ latest_change?: Date | string | null }>;

  const rawValue = row?.latest_change ?? null;
  if (!rawValue) return null;
  const parsed = rawValue instanceof Date ? rawValue : new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function getExportAppointmentRows(range: { fromDate: Date; toDate: Date }): Promise<ExportAppointmentRow[]> {
  const rows = await db
    .select({
      appointmentId: appointments.id,
      startDate: appointments.startDate,
      endDate: appointments.endDate,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      tourId: appointments.tourId,
      tourName: tours.name,
      tourColor: tours.color,
      projectId: projects.id,
      projectName: projects.name,
      orderNumber: projects.orderNumber,
      customerId: customers.id,
      customerNumber: customers.customerNumber,
      customerName: customers.fullName,
      postalCode: customers.postalCode,
      addressLine1: customers.addressLine1,
      addressLine2: customers.addressLine2,
    })
    .from(appointments)
    .innerJoin(projects, eq(appointments.projectId, projects.id))
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(
      and(
        lte(appointments.startDate, range.toDate),
        or(sql`${appointments.endDate} IS NULL`, gte(appointments.endDate, range.fromDate)),
      ),
    )
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));

  return rows.map((row) => ({
    appointmentId: row.appointmentId,
    startDate: row.startDate ? String(row.startDate).slice(0, 10) : null,
    endDate: row.endDate ? String(row.endDate).slice(0, 10) : null,
    startTime: row.startTime ?? null,
    endTime: row.endTime ?? null,
    tourId: row.tourId ?? null,
    tourName: row.tourName ?? null,
    tourColor: row.tourColor ?? null,
    projectId: row.projectId,
    projectName: row.projectName,
    orderNumber: row.orderNumber ?? null,
    customerId: row.customerId,
    customerNumber: row.customerNumber,
    customerName: row.customerName ?? null,
    postalCode: row.postalCode ?? null,
    addressLine1: row.addressLine1 ?? null,
    addressLine2: row.addressLine2 ?? null,
  }));
}

export async function getAllExportAppointmentRows(): Promise<ExportAppointmentRow[]> {
  const rows = await db
    .select({
      appointmentId: appointments.id,
      startDate: appointments.startDate,
      endDate: appointments.endDate,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      tourId: appointments.tourId,
      tourName: tours.name,
      tourColor: tours.color,
      projectId: projects.id,
      projectName: projects.name,
      orderNumber: projects.orderNumber,
      customerId: customers.id,
      customerNumber: customers.customerNumber,
      customerName: customers.fullName,
      postalCode: customers.postalCode,
      addressLine1: customers.addressLine1,
      addressLine2: customers.addressLine2,
    })
    .from(appointments)
    .innerJoin(projects, eq(appointments.projectId, projects.id))
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));

  return rows.map((row) => ({
    appointmentId: row.appointmentId,
    startDate: row.startDate ? String(row.startDate).slice(0, 10) : null,
    endDate: row.endDate ? String(row.endDate).slice(0, 10) : null,
    startTime: row.startTime ?? null,
    endTime: row.endTime ?? null,
    tourId: row.tourId ?? null,
    tourName: row.tourName ?? null,
    tourColor: row.tourColor ?? null,
    projectId: row.projectId,
    projectName: row.projectName,
    orderNumber: row.orderNumber ?? null,
    customerId: row.customerId,
    customerNumber: row.customerNumber,
    customerName: row.customerName ?? null,
    postalCode: row.postalCode ?? null,
    addressLine1: row.addressLine1 ?? null,
    addressLine2: row.addressLine2 ?? null,
  }));
}

export async function getAppointmentEmployeesByIds(appointmentIds: number[]) {
  if (appointmentIds.length === 0) return [];
  return db
    .select({
      appointmentId: appointmentEmployees.appointmentId,
      employeeId: employees.id,
      employeeName: employees.fullName,
    })
    .from(appointmentEmployees)
    .innerJoin(employees, eq(appointmentEmployees.employeeId, employees.id))
    .where(inArray(appointmentEmployees.appointmentId, appointmentIds))
    .orderBy(asc(appointmentEmployees.appointmentId), asc(employees.fullName));
}

export async function getProjectStatusesByIds(projectIds: number[]) {
  if (projectIds.length === 0) return [];
  return db
    .select({
      projectId: projectProjectStatus.projectId,
      statusTitle: projectStatus.title,
    })
    .from(projectProjectStatus)
    .innerJoin(projectStatus, eq(projectProjectStatus.projectStatusId, projectStatus.id))
    .where(inArray(projectProjectStatus.projectId, projectIds))
    .orderBy(asc(projectProjectStatus.projectId), asc(projectStatus.sortOrder), asc(projectStatus.title));
}

export async function listAllTours() {
  await ensureToursUpdatedAtColumn();
  return db.select().from(tours).orderBy(asc(tours.id));
}

export async function listAllProjects() {
  return db.select().from(projects).orderBy(asc(projects.id));
}

export async function listAllCustomers() {
  return db.select().from(customers).orderBy(asc(customers.id));
}

export async function listAllEmployees() {
  return db.select().from(employees).orderBy(asc(employees.id));
}

export async function getAppointmentByIdForSync(appointmentId: number) {
  const [row] = await db
    .select({
      appointmentId: appointments.id,
      title: appointments.title,
      description: appointments.description,
      startDate: appointments.startDate,
      endDate: appointments.endDate,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      projectName: projects.name,
      orderNumber: projects.orderNumber,
      customerNumber: customers.customerNumber,
      customerName: customers.fullName,
      tourName: tours.name,
    })
    .from(appointments)
    .innerJoin(projects, eq(appointments.projectId, projects.id))
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  return row ?? null;
}
