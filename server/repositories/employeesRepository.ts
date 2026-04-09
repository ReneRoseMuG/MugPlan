import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  appointments,
  appointmentEmployees,
  employeeAttachments,
  employeeNotes,
  employees,
  type Employee,
  type EmployeeAttachment,
  type InsertEmployee,
  type InsertEmployeeAttachment,
  type UpdateEmployee,
} from "@shared/schema";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type EmployeeListItem = Employee & {
  notesCount: number;
  attachmentsCount: number;
};

export async function getEmployees(scope: "active" | "inactive" = "active"): Promise<Employee[]> {
  return db
    .select()
    .from(employees)
    .where(eq(employees.isActive, scope === "active"))
    .orderBy(asc(employees.lastName), asc(employees.firstName), asc(employees.id));
}

export async function getEmployeeListItems(scope: "active" | "inactive" = "active"): Promise<EmployeeListItem[]> {
  const rows = await getEmployees(scope);
  const employeeIds = rows.map((employee) => employee.id);

  if (employeeIds.length === 0) {
    return [];
  }

  const noteCountRows = await db
    .select({
      employeeId: employeeNotes.employeeId,
      count: sql<number>`count(*)`,
    })
    .from(employeeNotes)
    .where(inArray(employeeNotes.employeeId, employeeIds))
    .groupBy(employeeNotes.employeeId);

  const attachmentCountRows = await db
    .select({
      employeeId: employeeAttachments.employeeId,
      count: sql<number>`count(*)`,
    })
    .from(employeeAttachments)
    .where(inArray(employeeAttachments.employeeId, employeeIds))
    .groupBy(employeeAttachments.employeeId);

  const notesCountByEmployeeId = new Map(noteCountRows.map((row) => [row.employeeId, Number(row.count)] as const));
  const attachmentsCountByEmployeeId = new Map(attachmentCountRows.map((row) => [row.employeeId, Number(row.count)] as const));

  return rows.map((employee) => ({
    ...employee,
    notesCount: notesCountByEmployeeId.get(employee.id) ?? 0,
    attachmentsCount: attachmentsCountByEmployeeId.get(employee.id) ?? 0,
  }));
}

export async function getEmployeesAvailableOnDate(
  scope: "active" | "inactive",
  _appointmentDate: string,
): Promise<Employee[]> {
  return getEmployees(scope);
}

export async function getAllEmployees(): Promise<Employee[]> {
  return db
    .select()
    .from(employees)
    .orderBy(asc(employees.lastName), asc(employees.firstName), asc(employees.id));
}

export async function getEmployeesByIds(employeeIds: number[]): Promise<Employee[]> {
  const normalizedEmployeeIds = Array.from(new Set(employeeIds.filter((value) => Number.isInteger(value) && value > 0)));
  if (normalizedEmployeeIds.length === 0) return [];

  return db
    .select()
    .from(employees)
    .where(inArray(employees.id, normalizedEmployeeIds))
    .orderBy(asc(employees.lastName), asc(employees.firstName), asc(employees.id));
}

export async function getEmployee(id: number): Promise<Employee | null> {
  const [employee] = await db.select().from(employees).where(eq(employees.id, id));
  return employee || null;
}

export async function getEmployeeTx(tx: DbTx, id: number): Promise<Employee | null> {
  const [employee] = await tx.select().from(employees).where(eq(employees.id, id));
  return employee || null;
}

export async function createEmployee(data: InsertEmployee & { fullName: string }): Promise<Employee> {
  const result = await db.insert(employees).values(data);
  const insertId = (result as any)[0].insertId;
  const [employee] = await db.select().from(employees).where(eq(employees.id, insertId));
  return employee;
}

export async function updateEmployeeWithVersion(
  id: number,
  expectedVersion: number,
  data: UpdateEmployee & { fullName?: string },
): Promise<{ kind: "updated"; employee: Employee } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update employee
    set
      first_name = coalesce(${data.firstName ?? null}, first_name),
      last_name = coalesce(${data.lastName ?? null}, last_name),
      full_name = coalesce(${data.fullName ?? null}, full_name),
      phone = ${data.phone ?? null},
      email = ${data.email ?? null},
      exit_date = ${data.exitDate ?? null},
      is_active = coalesce(${data.isActive ?? null}, is_active),
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);

  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) {
    return { kind: "version_conflict" };
  }

  const [employee] = await db.select().from(employees).where(eq(employees.id, id));
  return { kind: "updated", employee };
}

export async function toggleEmployeeActiveWithVersion(
  id: number,
  expectedVersion: number,
  isActive: boolean,
): Promise<{ kind: "updated"; employee: Employee } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update employee
    set
      is_active = ${isActive},
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) return { kind: "version_conflict" };

  const [employee] = await db.select().from(employees).where(eq(employees.id, id));
  return { kind: "updated", employee };
}

export async function deleteEmployeeWithVersion(
  id: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "version_conflict" } | { kind: "business_conflict" }> {
  return db.transaction(async (tx) => {
    const versionCheck = await tx.execute(sql`
      update employee
      set version = version
      where id = ${id}
        and version = ${expectedVersion}
    `);
    const versionCheckAffectedRows = Number(
      (versionCheck as any)?.[0]?.affectedRows ?? (versionCheck as any)?.affectedRows ?? 0,
    );
    if (versionCheckAffectedRows === 0) {
      throw new Error("VERSION_CONFLICT");
    }

    const [existingReference] = await tx
      .select({ appointmentId: appointmentEmployees.appointmentId })
      .from(appointmentEmployees)
      .where(eq(appointmentEmployees.employeeId, id))
      .limit(1);
    if (existingReference) {
      return { kind: "business_conflict" as const };
    }

    await tx.delete(employeeAttachments).where(eq(employeeAttachments.employeeId, id));
    const result = await tx.execute(sql`
      delete from employee
      where id = ${id}
        and version = ${expectedVersion}
    `);
    const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
    if (affectedRows === 0) {
      throw new Error("VERSION_CONFLICT");
    }
    return { kind: "deleted" as const };
  }).catch((error) => {
    if (error instanceof Error && error.message === "VERSION_CONFLICT") {
      return { kind: "version_conflict" as const };
    }
    throw error;
  });
}

export async function getEmployeesByTourFromAppointments(tourId: number, fromDate: Date): Promise<Employee[]> {
  const rows = await db
    .selectDistinct({ employeeId: appointmentEmployees.employeeId })
    .from(appointmentEmployees)
    .innerJoin(appointments, eq(appointmentEmployees.appointmentId, appointments.id))
    .where(and(eq(appointments.tourId, tourId), gte(appointments.startDate, fromDate)));

  if (rows.length === 0) {
    return [];
  }

  return db
    .select()
    .from(employees)
    .where(inArray(employees.id, rows.map((row) => row.employeeId)))
    .orderBy(asc(employees.lastName), asc(employees.firstName));
}

export async function getEmployeesByTeam(teamId: number): Promise<Employee[]> {
  return db
    .select()
    .from(employees)
    .where(eq(employees.teamId, teamId))
    .orderBy(asc(employees.lastName), asc(employees.firstName));
}

export async function setEmployeeTeamWithVersion(
  employeeId: number,
  expectedVersion: number,
  teamId: number | null,
): Promise<{ kind: "updated"; employee: Employee } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update employee
    set
      team_id = ${teamId},
      updated_at = now(),
      version = version + 1
    where id = ${employeeId}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) return { kind: "version_conflict" };

  const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId));
  return { kind: "updated", employee };
}

export async function setEmployeeTeamWithVersionTx(
  tx: DbTx,
  employeeId: number,
  expectedVersion: number,
  teamId: number | null,
): Promise<{ kind: "updated"; employee: Employee } | { kind: "version_conflict" }> {
  const result = await tx.execute(sql`
    update employee
    set
      team_id = ${teamId},
      updated_at = now(),
      version = version + 1
    where id = ${employeeId}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) return { kind: "version_conflict" };

  const [employee] = await tx.select().from(employees).where(eq(employees.id, employeeId));
  return { kind: "updated", employee };
}

// Technical exception for demo-seed flow (excluded from hardening scope).
export async function setEmployeeTeam(employeeId: number, teamId: number | null): Promise<Employee | null> {
  await db
    .update(employees)
    .set({ teamId, updatedAt: new Date() })
    .where(eq(employees.id, employeeId));
  const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId));
  return employee || null;
}

export async function getEmployeeAttachments(employeeId: number): Promise<EmployeeAttachment[]> {
  return db
    .select()
    .from(employeeAttachments)
    .where(eq(employeeAttachments.employeeId, employeeId))
    .orderBy(desc(employeeAttachments.createdAt));
}

export async function getEmployeeAttachmentById(id: number): Promise<EmployeeAttachment | null> {
  const [attachment] = await db
    .select()
    .from(employeeAttachments)
    .where(eq(employeeAttachments.id, id));
  return attachment ?? null;
}

export async function createEmployeeAttachment(data: InsertEmployeeAttachment): Promise<EmployeeAttachment> {
  const result = await db.insert(employeeAttachments).values(data);
  const insertId = (result as any)[0].insertId;
  const [attachment] = await db
    .select()
    .from(employeeAttachments)
    .where(eq(employeeAttachments.id, insertId));
  return attachment;
}

export async function deleteEmployeeAttachment(id: number): Promise<void> {
  await db.delete(employeeAttachments).where(eq(employeeAttachments.id, id));
}
