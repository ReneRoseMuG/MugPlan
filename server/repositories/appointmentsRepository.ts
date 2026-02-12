import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  appointmentEmployees,
  appointments,
  customers,
  employees,
  projects,
  tours,
  type Appointment,
  type InsertAppointment,
} from "@shared/schema";

const logPrefix = "[appointments-repo]";

export type AppointmentListFilters = {
  employeeId?: number;
  projectId?: number;
  customerId?: number;
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

async function getAppointmentEmployeesTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  appointmentId: number,
) {
  const rows = await tx
    .select({ employee: employees })
    .from(appointmentEmployees)
    .innerJoin(employees, eq(appointmentEmployees.employeeId, employees.id))
    .where(eq(appointmentEmployees.appointmentId, appointmentId));
  return rows.map((row) => row.employee);
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

export async function getAppointment(id: number): Promise<Appointment | null> {
  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
  return appointment || null;
}

export async function getAppointmentWithEmployees(id: number) {
  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
  if (!appointment) return null;
  const employeeRows = await getAppointmentEmployees(id);
  return { ...appointment, employees: employeeRows };
}

export async function createAppointment(data: InsertAppointment, employeeIds: number[]) {
  return db.transaction(async (tx) => {
    console.log(`${logPrefix} create appointment for projectId=${data.projectId}`);
    const result = await tx.insert(appointments).values(data);
    const insertId = (result as any)[0].insertId as number;

    if (employeeIds.length > 0) {
      console.log(`${logPrefix} assign ${employeeIds.length} employees to appointmentId=${insertId}`);
      await tx.insert(appointmentEmployees).values(
        employeeIds.map((employeeId) => ({
          appointmentId: insertId,
          employeeId,
        })),
      );
    } else {
      console.log(`${logPrefix} no employees assigned to appointmentId=${insertId}`);
    }

    const [appointment] = await tx.select().from(appointments).where(eq(appointments.id, insertId));
    const assignedEmployees = await getAppointmentEmployeesTx(tx, insertId);

    return { ...appointment, employees: assignedEmployees };
  });
}

export async function updateAppointment(
  appointmentId: number,
  data: Partial<InsertAppointment>,
  employeeIds: number[],
) {
  return db.transaction(async (tx) => {
    console.log(`${logPrefix} update appointmentId=${appointmentId}`);
    await tx.update(appointments).set(data).where(eq(appointments.id, appointmentId));

    console.log(`${logPrefix} replace employees for appointmentId=${appointmentId}`);
    await tx.delete(appointmentEmployees).where(eq(appointmentEmployees.appointmentId, appointmentId));
    if (employeeIds.length > 0) {
      await tx.insert(appointmentEmployees).values(
        employeeIds.map((employeeId) => ({
          appointmentId,
          employeeId,
        })),
      );
    }

    const [appointment] = await tx.select().from(appointments).where(eq(appointments.id, appointmentId));
    const assignedEmployees = await getAppointmentEmployeesTx(tx, appointmentId);
    return { ...appointment, employees: assignedEmployees };
  });
}

export async function listAppointmentsByProjectFromDate(projectId: number, fromDate: Date): Promise<Appointment[]> {
  console.log(`${logPrefix} list appointments projectId=${projectId} fromDate>=${fromDate}`);
  return db
    .select()
    .from(appointments)
    .where(and(eq(appointments.projectId, projectId), gte(appointments.startDate, fromDate)))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

export async function listAppointmentsByEmployeeFromDate(employeeId: number, fromDate: Date) {
  console.log(`${logPrefix} list appointments employeeId=${employeeId} fromDate>=${fromDate}`);
  return db
    .select({
      appointment: appointments,
      projectName: projects.name,
      customerName: customers.fullName,
    })
    .from(appointmentEmployees)
    .innerJoin(appointments, eq(appointmentEmployees.appointmentId, appointments.id))
    .innerJoin(projects, eq(appointments.projectId, projects.id))
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .where(and(eq(appointmentEmployees.employeeId, employeeId), gte(appointments.startDate, fromDate)))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

export async function listSidebarAppointmentsByProjectFromDate(projectId: number, fromDate: Date) {
  console.log(`${logPrefix} list sidebar appointments by project projectId=${projectId} fromDate>=${fromDate}`);
  return db
    .select({
      appointment: appointments,
      project: projects,
      customer: customers,
      tour: tours,
    })
    .from(appointments)
    .innerJoin(projects, eq(appointments.projectId, projects.id))
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(and(eq(appointments.projectId, projectId), gte(appointments.startDate, fromDate)))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

export async function listSidebarAppointmentsByEmployeeFromDate(employeeId: number, fromDate: Date) {
  console.log(`${logPrefix} list sidebar appointments by employee employeeId=${employeeId} fromDate>=${fromDate}`);
  return db
    .select({
      appointment: appointments,
      project: projects,
      customer: customers,
      tour: tours,
    })
    .from(appointmentEmployees)
    .innerJoin(appointments, eq(appointmentEmployees.appointmentId, appointments.id))
    .innerJoin(projects, eq(appointments.projectId, projects.id))
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(and(eq(appointmentEmployees.employeeId, employeeId), gte(appointments.startDate, fromDate)))
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
  console.log(`${logPrefix} list calendar appointments fromDate=${fromDate} toDate=${toDate} employeeId=${employeeId ?? "n/a"}`);

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
      customer: customers,
      tour: tours,
    })
    .from(appointments)
    .innerJoin(projects, eq(appointments.projectId, projects.id))
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(and(...conditions))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

function buildAppointmentListConditions(filters: AppointmentListFilters) {
  const conditions: unknown[] = [];

  if (filters.projectId) {
    conditions.push(eq(appointments.projectId, filters.projectId));
  }
  if (filters.customerId) {
    conditions.push(eq(projects.customerId, filters.customerId));
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
    .innerJoin(projects, eq(appointments.projectId, projects.id))
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(whereClause);

  const rows = await db
    .select({
      appointment: appointments,
      project: projects,
      customer: customers,
      tour: tours,
    })
    .from(appointments)
    .innerJoin(projects, eq(appointments.projectId, projects.id))
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(whereClause)
    .orderBy(desc(appointments.startDate), desc(appointments.startTime), desc(appointments.id))
    .limit(paging.pageSize)
    .offset(offset);

  return {
    rows,
    total: Number(totalResult?.total ?? 0),
  };
}

export async function deleteAppointment(appointmentId: number): Promise<void> {
  console.log(`${logPrefix} delete appointmentId=${appointmentId}`);
  await db.delete(appointments).where(eq(appointments.id, appointmentId));
}
