import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  appointmentEmployees,
  appointments,
  employees,
  type Appointment,
  type InsertAppointment,
  type UpdateAppointment,
  type Employee,
} from "@shared/schema";

const logAppointmentRepo = (message: string, details?: Record<string, unknown>) => {
  const payload = details ? ` :: ${JSON.stringify(details)}` : "";
  console.info(`[appointments:repo] ${message}${payload}`);
};

export async function getAppointment(id: number): Promise<Appointment | null> {
  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
  return appointment || null;
}

export async function getAppointmentEmployees(appointmentId: number): Promise<Employee[]> {
  const results = await db
    .select({
      id: employees.id,
      firstName: employees.firstName,
      lastName: employees.lastName,
      fullName: employees.fullName,
      isActive: employees.isActive,
    })
    .from(appointmentEmployees)
    .innerJoin(employees, eq(appointmentEmployees.employeeId, employees.id))
    .where(eq(appointmentEmployees.appointmentId, appointmentId));
  return results;
}

export async function createAppointmentWithEmployees(
  data: InsertAppointment,
  employeeIds: number[],
): Promise<Appointment> {
  const uniqueEmployeeIds = Array.from(new Set(employeeIds));
  return db.transaction(async (tx) => {
    logAppointmentRepo("creating appointment", {
      projectId: data.projectId,
      tourId: data.tourId ?? null,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      employeeCount: uniqueEmployeeIds.length,
    });
    const result = await tx.insert(appointments).values(data);
    const insertId = (result as any)[0].insertId as number;
    if (uniqueEmployeeIds.length > 0) {
      await tx.insert(appointmentEmployees).values(
        uniqueEmployeeIds.map((employeeId) => ({
          appointmentId: insertId,
          employeeId,
        })),
      );
      logAppointmentRepo("assigned employees", {
        appointmentId: insertId,
        employeeCount: uniqueEmployeeIds.length,
      });
    }
    const [appointment] = await tx.select().from(appointments).where(eq(appointments.id, insertId));
    return appointment;
  });
}

export async function updateAppointmentWithEmployees(
  id: number,
  data: UpdateAppointment,
  employeeIds: number[],
): Promise<Appointment | null> {
  const uniqueEmployeeIds = Array.from(new Set(employeeIds));
  return db.transaction(async (tx) => {
    await tx.update(appointments).set({ ...data, updatedAt: new Date() }).where(eq(appointments.id, id));
    await tx.delete(appointmentEmployees).where(eq(appointmentEmployees.appointmentId, id));
    logAppointmentRepo("replaced appointment employees", {
      appointmentId: id,
      employeeCount: uniqueEmployeeIds.length,
    });
    if (uniqueEmployeeIds.length > 0) {
      await tx.insert(appointmentEmployees).values(
        uniqueEmployeeIds.map((employeeId) => ({
          appointmentId: id,
          employeeId,
        })),
      );
    }
    const [appointment] = await tx.select().from(appointments).where(eq(appointments.id, id));
    return appointment || null;
  });
}

export async function deleteAppointment(id: number): Promise<void> {
  await db.delete(appointments).where(eq(appointments.id, id));
  logAppointmentRepo("deleted appointment", { appointmentId: id });
}
