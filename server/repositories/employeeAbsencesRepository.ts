import { and, asc, eq, gt, gte, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  appointmentEmployees,
  appointments,
  employeeAbsences,
  tours,
  type EmployeeAbsence,
  type InsertEmployeeAbsence,
  type UpdateEmployeeAbsence,
} from "@shared/schema";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function listEmployeeAbsences(employeeId: number): Promise<EmployeeAbsence[]> {
  return db
    .select()
    .from(employeeAbsences)
    .where(eq(employeeAbsences.employeeId, employeeId))
    .orderBy(asc(employeeAbsences.from), asc(employeeAbsences.until), asc(employeeAbsences.id));
}

export async function getEmployeeAbsence(employeeId: number, absenceId: number): Promise<EmployeeAbsence | null> {
  const [absence] = await db
    .select()
    .from(employeeAbsences)
    .where(and(eq(employeeAbsences.employeeId, employeeId), eq(employeeAbsences.id, absenceId)));

  return absence ?? null;
}

export async function createEmployeeAbsence(
  employeeId: number,
  data: InsertEmployeeAbsence,
): Promise<EmployeeAbsence> {
  const result = await db.insert(employeeAbsences).values({
    employeeId,
    type: data.type,
    from: data.from,
    until: data.until,
  });
  const insertId = Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0);
  const [absence] = await db.select().from(employeeAbsences).where(eq(employeeAbsences.id, insertId));
  return absence;
}

export async function updateEmployeeAbsenceWithVersion(
  employeeId: number,
  absenceId: number,
  expectedVersion: number,
  data: UpdateEmployeeAbsence,
): Promise<{ kind: "updated"; absence: EmployeeAbsence } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update employee_absence
    set
      type = coalesce(${data.type ?? null}, type),
      from_date = coalesce(${data.from ?? null}, from_date),
      until_date = coalesce(${data.until ?? null}, until_date),
      updated_at = now(),
      version = version + 1
    where id = ${absenceId}
      and employee_id = ${employeeId}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) {
    return { kind: "version_conflict" };
  }

  const [absence] = await db
    .select()
    .from(employeeAbsences)
    .where(and(eq(employeeAbsences.employeeId, employeeId), eq(employeeAbsences.id, absenceId)));
  return { kind: "updated", absence };
}

export async function deleteEmployeeAbsenceWithVersion(
  employeeId: number,
  absenceId: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    delete from employee_absence
    where id = ${absenceId}
      and employee_id = ${employeeId}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) {
    return { kind: "version_conflict" };
  }
  return { kind: "deleted" };
}

export async function listAffectedFutureAppointments(
  employeeId: number,
  params: { from: string; until: string; today: string },
) {
  const fromDate = new Date(`${params.from}T00:00:00`);
  const untilDate = new Date(`${params.until}T00:00:00`);
  const todayDate = new Date(`${params.today}T00:00:00`);
  return db
    .select({
      appointmentId: appointments.id,
      startDate: appointments.startDate,
      endDate: appointments.endDate,
      tourName: tours.name,
    })
    .from(appointmentEmployees)
    .innerJoin(appointments, eq(appointmentEmployees.appointmentId, appointments.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(
      and(
        eq(appointmentEmployees.employeeId, employeeId),
        gt(appointments.startDate, todayDate),
        lte(appointments.startDate, untilDate),
        or(gte(appointments.endDate, fromDate), gte(appointments.startDate, fromDate)),
      ),
    )
    .orderBy(asc(appointments.startDate), asc(appointments.id));
}

export async function listAffectedFutureAppointmentsTx(
  tx: DbTx,
  employeeId: number,
  params: { from: string; until: string; today: string; replacementEmployeeId: number },
) {
  const fromDate = new Date(`${params.from}T00:00:00`);
  const untilDate = new Date(`${params.until}T00:00:00`);
  const todayDate = new Date(`${params.today}T00:00:00`);
  return tx
    .select({
      appointmentId: appointments.id,
      startDate: appointments.startDate,
      endDate: appointments.endDate,
      tourName: tours.name,
      replacementAlreadyAssigned: sql<number>`
        exists (
          select 1
          from appointment_employee ae_replacement
          where ae_replacement.appointment_id = ${appointments.id}
            and ae_replacement.employee_id = ${params.replacementEmployeeId}
        )
      `,
    })
    .from(appointmentEmployees)
    .innerJoin(appointments, eq(appointmentEmployees.appointmentId, appointments.id))
    .leftJoin(tours, eq(appointments.tourId, tours.id))
    .where(
      and(
        eq(appointmentEmployees.employeeId, employeeId),
        gt(appointments.startDate, todayDate),
        lte(appointments.startDate, untilDate),
        or(gte(appointments.endDate, fromDate), gte(appointments.startDate, fromDate)),
      ),
    )
    .orderBy(asc(appointments.startDate), asc(appointments.id));
}

export async function removeEmployeeFromAppointmentTx(tx: DbTx, appointmentId: number, employeeId: number): Promise<void> {
  await tx
    .delete(appointmentEmployees)
    .where(and(eq(appointmentEmployees.appointmentId, appointmentId), eq(appointmentEmployees.employeeId, employeeId)));
}

export async function addEmployeeToAppointmentTx(tx: DbTx, appointmentId: number, employeeId: number): Promise<void> {
  await tx.insert(appointmentEmployees).values({
    appointmentId,
    employeeId,
  });
}
