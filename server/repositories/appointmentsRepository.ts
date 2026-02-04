import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "../db";
import {
  appointmentEmployees,
  appointments,
  customers,
  employees,
  projects,
  type Appointment,
  type InsertAppointment,
} from "@shared/schema";

const logPrefix = "[appointments-repo]";

type DbLike = typeof db;

async function getAppointmentEmployees(conn: DbLike, appointmentId: number) {
  const rows = await conn
    .select({ employee: employees })
    .from(appointmentEmployees)
    .innerJoin(employees, eq(appointmentEmployees.employeeId, employees.id))
    .where(eq(appointmentEmployees.appointmentId, appointmentId));
  return rows.map((row) => row.employee);
}

export async function getAppointment(id: number): Promise<Appointment | null> {
  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
  return appointment || null;
}

export async function getAppointmentWithEmployees(id: number) {
  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
  if (!appointment) return null;
  const employeeRows = await getAppointmentEmployees(db, id);
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
    const assignedEmployees = await getAppointmentEmployees(tx as DbLike, insertId);

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
    const assignedEmployees = await getAppointmentEmployees(tx as DbLike, appointmentId);
    return { ...appointment, employees: assignedEmployees };
  });
}

export async function listAppointmentsByProjectFromDate(projectId: number, fromDate: string): Promise<Appointment[]> {
  console.log(`${logPrefix} list appointments projectId=${projectId} fromDate>=${fromDate}`);
  return db
    .select()
    .from(appointments)
    .where(and(eq(appointments.projectId, projectId), gte(appointments.startDate, fromDate)))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

export async function listAppointmentsByEmployeeFromDate(employeeId: number, fromDate: string) {
  console.log(`${logPrefix} list appointments employeeId=${employeeId} fromDate>=${fromDate}`);
  return db
    .select({
      appointment: appointments,
      projectName: projects.name,
      customerName: customers.name,
    })
    .from(appointmentEmployees)
    .innerJoin(appointments, eq(appointmentEmployees.appointmentId, appointments.id))
    .innerJoin(projects, eq(appointments.projectId, projects.id))
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .where(and(eq(appointmentEmployees.employeeId, employeeId), gte(appointments.startDate, fromDate)))
    .orderBy(asc(appointments.startDate), asc(appointments.startTime), asc(appointments.id));
}

export async function deleteAppointment(appointmentId: number): Promise<void> {
  console.log(`${logPrefix} delete appointmentId=${appointmentId}`);
  await db.delete(appointments).where(eq(appointments.id, appointmentId));
}
