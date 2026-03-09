import { and, asc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  appointmentEmployees,
  appointments,
  customers,
  employees,
  projectOrder,
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
  projectId: number | null;
  projectName: string;
  orderNumber: string | null;
  customerId: number;
  customerNumber: string;
  customerName: string | null;
  postalCode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
};

function toDateOnlyString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return null;
}

export async function getLatestRelevantDataChangeAt(): Promise<Date | null> {
  const result = await db.execute(sql`
    SELECT GREATEST(
      IFNULL((SELECT MAX(updated_at) FROM appointments), '1970-01-01 00:00:00'),
      IFNULL((SELECT MAX(updated_at) FROM project), '1970-01-01 00:00:00'),
      IFNULL((SELECT MAX(updated_at) FROM customer), '1970-01-01 00:00:00'),
      IFNULL((SELECT MAX(updated_at) FROM employee), '1970-01-01 00:00:00')
    ) AS latest_change
  `);

  const rows = Array.isArray(result?.[0]) ? (result[0] as Array<{ latest_change?: Date | string | null }>) : [];
  const row = rows[0];

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
      orderNumber: projectOrder.orderNumber,
      customerId: customers.id,
      customerNumber: customers.customerNumber,
      customerName: customers.fullName,
      postalCode: customers.postalCode,
      addressLine1: customers.addressLine1,
      addressLine2: customers.addressLine2,
    })
    .from(appointments)
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
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
    startDate: toDateOnlyString(row.startDate),
    endDate: toDateOnlyString(row.endDate),
    startTime: row.startTime ?? null,
    endTime: row.endTime ?? null,
    tourId: row.tourId ?? null,
    tourName: row.tourName ?? null,
    tourColor: row.tourColor ?? null,
    projectId: row.projectId ?? null,
    projectName: row.projectName ?? "Ohne Projekt",
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
      orderNumber: projectOrder.orderNumber,
      customerId: customers.id,
      customerNumber: customers.customerNumber,
      customerName: customers.fullName,
      postalCode: customers.postalCode,
      addressLine1: customers.addressLine1,
      addressLine2: customers.addressLine2,
    })
    .from(appointments)
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));

  return rows.map((row) => ({
    appointmentId: row.appointmentId,
    startDate: toDateOnlyString(row.startDate),
    endDate: toDateOnlyString(row.endDate),
    startTime: row.startTime ?? null,
    endTime: row.endTime ?? null,
    tourId: row.tourId ?? null,
    tourName: row.tourName ?? null,
    tourColor: row.tourColor ?? null,
    projectId: row.projectId ?? null,
    projectName: row.projectName ?? "Ohne Projekt",
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
  return db.select().from(tours).orderBy(asc(tours.id));
}

export async function listAllProjects() {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      type: projects.type,
      customerId: projects.customerId,
      descriptionMd: projects.descriptionMd,
      isActive: projects.isActive,
      version: projects.version,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      orderNumber: projectOrder.orderNumber,
    })
    .from(projects)
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .orderBy(asc(projects.id));
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
      externalEventId: appointments.externalEventId,
      projectName: projects.name,
      orderNumber: projectOrder.orderNumber,
      customerNumber: customers.customerNumber,
      customerName: customers.fullName,
      tourName: tours.name,
    })
    .from(appointments)
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  return row ?? null;
}
