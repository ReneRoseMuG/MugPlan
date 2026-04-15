import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "../db";
import {
  appointmentEmployees,
  appointments,
  customers,
  employees,
  projects,
  tours,
  tourWeekEmployees,
} from "@shared/schema";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbLike = DbTx | typeof db;

export type TourWeekEmployeeAssignmentRow = {
  assignmentId: number;
  tourId: number;
  tourName: string;
  tourColor: string | null;
  isoYear: number;
  isoWeek: number;
  employeeId: number;
  fullName: string;
};

export type TourWeekAppointmentRow = {
  appointmentId: number;
  tourId: number | null;
  startDate: Date | string;
  endDate: Date | string | null;
  startTime: string | null;
  projectName: string | null;
  customerName: string | null;
};

function getAffectedRows(result: unknown): number {
  const raw = result as Record<string, unknown> & { 0?: { affectedRows?: number }; affectedRows?: number };
  return Number(raw?.[0]?.affectedRows ?? raw?.affectedRows ?? 0);
}

export async function listAssignmentsByTour(tourId: number): Promise<TourWeekEmployeeAssignmentRow[]> {
  const rows = await db
    .select({
      assignmentId: tourWeekEmployees.id,
      tourId: tourWeekEmployees.tourId,
      tourName: tours.name,
      tourColor: tours.color,
      isoYear: tourWeekEmployees.isoYear,
      isoWeek: tourWeekEmployees.isoWeek,
      employeeId: tourWeekEmployees.employeeId,
      fullName: employees.fullName,
    })
    .from(tourWeekEmployees)
    .innerJoin(tours, eq(tourWeekEmployees.tourId, tours.id))
    .innerJoin(employees, eq(tourWeekEmployees.employeeId, employees.id))
    .where(eq(tourWeekEmployees.tourId, tourId))
    .orderBy(
      asc(tourWeekEmployees.isoYear),
      asc(tourWeekEmployees.isoWeek),
      asc(employees.lastName),
      asc(employees.firstName),
      asc(employees.id),
    );

  return rows.map((row) => ({
    assignmentId: Number(row.assignmentId),
    tourId: Number(row.tourId),
    tourName: row.tourName,
    tourColor: row.tourColor,
    isoYear: Number(row.isoYear),
    isoWeek: Number(row.isoWeek),
    employeeId: Number(row.employeeId),
    fullName: row.fullName,
  }));
}

export async function listAssignmentsByTourIds(tourIds: number[]): Promise<TourWeekEmployeeAssignmentRow[]> {
  const normalizedTourIds = Array.from(new Set(tourIds.filter((value) => Number.isInteger(value) && value > 0)));
  if (normalizedTourIds.length === 0) return [];

  const rows = await db
    .select({
      assignmentId: tourWeekEmployees.id,
      tourId: tourWeekEmployees.tourId,
      tourName: tours.name,
      tourColor: tours.color,
      isoYear: tourWeekEmployees.isoYear,
      isoWeek: tourWeekEmployees.isoWeek,
      employeeId: tourWeekEmployees.employeeId,
      fullName: employees.fullName,
    })
    .from(tourWeekEmployees)
    .innerJoin(tours, eq(tourWeekEmployees.tourId, tours.id))
    .innerJoin(employees, eq(tourWeekEmployees.employeeId, employees.id))
    .where(inArray(tourWeekEmployees.tourId, normalizedTourIds))
    .orderBy(
      asc(tourWeekEmployees.tourId),
      asc(tourWeekEmployees.isoYear),
      asc(tourWeekEmployees.isoWeek),
      asc(employees.lastName),
      asc(employees.firstName),
      asc(employees.id),
    );

  return rows.map((row) => ({
    assignmentId: Number(row.assignmentId),
    tourId: Number(row.tourId),
    tourName: row.tourName,
    tourColor: row.tourColor,
    isoYear: Number(row.isoYear),
    isoWeek: Number(row.isoWeek),
    employeeId: Number(row.employeeId),
    fullName: row.fullName,
  }));
}

export async function listAssignmentsByTourAndWeek(
  tourId: number,
  isoYear: number,
  isoWeek: number,
): Promise<TourWeekEmployeeAssignmentRow[]> {
  const rows = await db
    .select({
      assignmentId: tourWeekEmployees.id,
      tourId: tourWeekEmployees.tourId,
      tourName: tours.name,
      tourColor: tours.color,
      isoYear: tourWeekEmployees.isoYear,
      isoWeek: tourWeekEmployees.isoWeek,
      employeeId: tourWeekEmployees.employeeId,
      fullName: employees.fullName,
    })
    .from(tourWeekEmployees)
    .innerJoin(tours, eq(tourWeekEmployees.tourId, tours.id))
    .innerJoin(employees, eq(tourWeekEmployees.employeeId, employees.id))
    .where(and(
      eq(tourWeekEmployees.tourId, tourId),
      eq(tourWeekEmployees.isoYear, isoYear),
      eq(tourWeekEmployees.isoWeek, isoWeek),
    ))
    .orderBy(asc(employees.lastName), asc(employees.firstName), asc(employees.id));

  return rows.map((row) => ({
    assignmentId: Number(row.assignmentId),
    tourId: Number(row.tourId),
    tourName: row.tourName,
    tourColor: row.tourColor,
    isoYear: Number(row.isoYear),
    isoWeek: Number(row.isoWeek),
    employeeId: Number(row.employeeId),
    fullName: row.fullName,
  }));
}

export async function listAssignedEmployeeIdsByWeek(
  isoYear: number,
  isoWeek: number,
): Promise<number[]> {
  const rows = await db
    .selectDistinct({
      employeeId: tourWeekEmployees.employeeId,
    })
    .from(tourWeekEmployees)
    .where(and(
      eq(tourWeekEmployees.isoYear, isoYear),
      eq(tourWeekEmployees.isoWeek, isoWeek),
    ))
    .orderBy(asc(tourWeekEmployees.employeeId));

  return rows.map((row) => Number(row.employeeId));
}

export async function getAssignmentById(
  assignmentId: number,
): Promise<TourWeekEmployeeAssignmentRow | null> {
  const [row] = await db
    .select({
      assignmentId: tourWeekEmployees.id,
      tourId: tourWeekEmployees.tourId,
      tourName: tours.name,
      tourColor: tours.color,
      isoYear: tourWeekEmployees.isoYear,
      isoWeek: tourWeekEmployees.isoWeek,
      employeeId: tourWeekEmployees.employeeId,
      fullName: employees.fullName,
    })
    .from(tourWeekEmployees)
    .innerJoin(tours, eq(tourWeekEmployees.tourId, tours.id))
    .innerJoin(employees, eq(tourWeekEmployees.employeeId, employees.id))
    .where(eq(tourWeekEmployees.id, assignmentId));

  if (!row) return null;

  return {
    assignmentId: Number(row.assignmentId),
    tourId: Number(row.tourId),
    tourName: row.tourName,
    tourColor: row.tourColor,
    isoYear: Number(row.isoYear),
    isoWeek: Number(row.isoWeek),
    employeeId: Number(row.employeeId),
    fullName: row.fullName,
  };
}

export async function getAssignmentForEmployeeWeek(
  employeeId: number,
  isoYear: number,
  isoWeek: number,
): Promise<TourWeekEmployeeAssignmentRow | null> {
  const [row] = await db
    .select({
      assignmentId: tourWeekEmployees.id,
      tourId: tourWeekEmployees.tourId,
      tourName: tours.name,
      tourColor: tours.color,
      isoYear: tourWeekEmployees.isoYear,
      isoWeek: tourWeekEmployees.isoWeek,
      employeeId: tourWeekEmployees.employeeId,
      fullName: employees.fullName,
    })
    .from(tourWeekEmployees)
    .innerJoin(tours, eq(tourWeekEmployees.tourId, tours.id))
    .innerJoin(employees, eq(tourWeekEmployees.employeeId, employees.id))
    .where(and(
      eq(tourWeekEmployees.employeeId, employeeId),
      eq(tourWeekEmployees.isoYear, isoYear),
      eq(tourWeekEmployees.isoWeek, isoWeek),
    ));

  if (!row) return null;

  return {
    assignmentId: Number(row.assignmentId),
    tourId: Number(row.tourId),
    tourName: row.tourName,
    tourColor: row.tourColor,
    isoYear: Number(row.isoYear),
    isoWeek: Number(row.isoWeek),
    employeeId: Number(row.employeeId),
    fullName: row.fullName,
  };
}

export async function createAssignmentTx(
  tx: DbTx,
  params: { tourId: number; isoYear: number; isoWeek: number; employeeId: number },
): Promise<number> {
  const result = await tx.insert(tourWeekEmployees).values({
    tourId: params.tourId,
    isoYear: params.isoYear,
    isoWeek: params.isoWeek,
    employeeId: params.employeeId,
  });
  return Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId);
}

export async function listAssignmentsByEmployee(employeeId: number): Promise<TourWeekEmployeeAssignmentRow[]> {
  const rows = await db
    .select({
      assignmentId: tourWeekEmployees.id,
      tourId: tourWeekEmployees.tourId,
      tourName: tours.name,
      tourColor: tours.color,
      isoYear: tourWeekEmployees.isoYear,
      isoWeek: tourWeekEmployees.isoWeek,
      employeeId: tourWeekEmployees.employeeId,
      fullName: employees.fullName,
    })
    .from(tourWeekEmployees)
    .innerJoin(tours, eq(tourWeekEmployees.tourId, tours.id))
    .innerJoin(employees, eq(tourWeekEmployees.employeeId, employees.id))
    .where(eq(tourWeekEmployees.employeeId, employeeId))
    .orderBy(
      asc(tourWeekEmployees.isoYear),
      asc(tourWeekEmployees.isoWeek),
      asc(tours.name),
      asc(tours.id),
    );

  return rows.map((row) => ({
    assignmentId: Number(row.assignmentId),
    tourId: Number(row.tourId),
    tourName: row.tourName,
    tourColor: row.tourColor,
    isoYear: Number(row.isoYear),
    isoWeek: Number(row.isoWeek),
    employeeId: Number(row.employeeId),
    fullName: row.fullName,
  }));
}

export async function deleteAssignmentTx(tx: DbTx, assignmentId: number): Promise<number> {
  const result = await tx.delete(tourWeekEmployees).where(eq(tourWeekEmployees.id, assignmentId));
  return getAffectedRows(result);
}

export async function deleteAssignmentsByTourAndWeekTx(
  tx: DbTx,
  params: { tourId: number; isoYear: number; isoWeek: number },
): Promise<number> {
  const result = await tx.delete(tourWeekEmployees).where(and(
    eq(tourWeekEmployees.tourId, params.tourId),
    eq(tourWeekEmployees.isoYear, params.isoYear),
    eq(tourWeekEmployees.isoWeek, params.isoWeek),
  ));
  return getAffectedRows(result);
}

export async function listAppointmentsByTourAndDateRange(
  tourId: number,
  params: { fromDate: Date; toDate: Date },
): Promise<TourWeekAppointmentRow[]> {
  return listAppointmentsByTourAndDateRangeInternal(db, tourId, params);
}

export async function listAppointmentsByTourAndDateRangeTx(
  tx: DbTx,
  tourId: number,
  params: { fromDate: Date; toDate: Date },
): Promise<TourWeekAppointmentRow[]> {
  return listAppointmentsByTourAndDateRangeInternal(tx, tourId, params);
}

async function listAppointmentsByTourAndDateRangeInternal(
  executor: DbLike,
  tourId: number,
  params: { fromDate: Date; toDate: Date },
): Promise<TourWeekAppointmentRow[]> {
  const rows = await executor
    .select({
      appointmentId: appointments.id,
      tourId: appointments.tourId,
      startDate: appointments.startDate,
      endDate: appointments.endDate,
      startTime: appointments.startTime,
      projectName: projects.name,
      customerName: customers.fullName,
    })
    .from(appointments)
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .where(and(
      eq(appointments.tourId, tourId),
      lte(appointments.startDate, params.toDate),
      or(
        and(isNull(appointments.endDate), gte(appointments.startDate, params.fromDate)),
        gte(appointments.endDate, params.fromDate),
      ),
    ))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));

  return rows.map((row) => ({
    appointmentId: Number(row.appointmentId),
    tourId: row.tourId == null ? null : Number(row.tourId),
    startDate: row.startDate,
    endDate: row.endDate,
    startTime: row.startTime,
    projectName: row.projectName ?? null,
    customerName: row.customerName ?? null,
  }));
}

export async function listAssignedAppointmentIdsForEmployee(
  employeeId: number,
  appointmentIds: number[],
): Promise<number[]> {
  return listAssignedAppointmentIdsForEmployeeInternal(db, employeeId, appointmentIds);
}

export async function listAssignedAppointmentIdsForEmployeeTx(
  tx: DbTx,
  employeeId: number,
  appointmentIds: number[],
): Promise<number[]> {
  return listAssignedAppointmentIdsForEmployeeInternal(tx, employeeId, appointmentIds);
}

async function listAssignedAppointmentIdsForEmployeeInternal(
  executor: DbLike,
  employeeId: number,
  appointmentIds: number[],
): Promise<number[]> {
  const normalizedAppointmentIds = Array.from(new Set(appointmentIds.filter((value) => Number.isInteger(value) && value > 0)));
  if (normalizedAppointmentIds.length === 0) return [];

  const rows = await executor
    .select({ appointmentId: appointmentEmployees.appointmentId })
    .from(appointmentEmployees)
    .where(and(
      eq(appointmentEmployees.employeeId, employeeId),
      inArray(appointmentEmployees.appointmentId, normalizedAppointmentIds),
    ));

  return rows.map((row) => Number(row.appointmentId));
}
