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
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

export async function getAppointment(id: number): Promise<Appointment | null> {
  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
  return appointment || null;
}

export async function getAppointmentTx(tx: DbTx, id: number): Promise<Appointment | null> {
  const [appointment] = await tx.select().from(appointments).where(eq(appointments.id, id));
  return appointment || null;
}

export async function getProjectTx(
  tx: DbTx,
  projectId: number,
): Promise<{ id: number; name: string } | null> {
  const [project] = await tx
    .select({
      id: projects.id,
      name: projects.name,
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
  ];

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

export async function createAppointmentTx(tx: DbTx, data: InsertAppointment): Promise<number> {
  const result = await tx.insert(appointments).values(data);
  return Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId);
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

export async function createAppointment(data: InsertAppointment, employeeIds: number[]) {
  return withAppointmentTransaction(async (tx) => {
    console.log(`${logPrefix} create appointment for projectId=${data.projectId}`);
    const insertId = await createAppointmentTx(tx, data);

    if (employeeIds.length > 0) {
      console.log(`${logPrefix} assign ${employeeIds.length} employees to appointmentId=${insertId}`);
      await replaceAppointmentEmployeesTx(tx, insertId, employeeIds);
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
  return withAppointmentTransaction(async (tx) => {
    console.log(`${logPrefix} update appointmentId=${appointmentId}`);
    await tx.update(appointments).set(data).where(eq(appointments.id, appointmentId));

    console.log(`${logPrefix} replace employees for appointmentId=${appointmentId}`);
    await replaceAppointmentEmployeesTx(tx, appointmentId, employeeIds);

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
