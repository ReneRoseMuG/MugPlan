import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  employeeAttachments,
  employees,
  type Employee,
  type EmployeeAttachment,
  type InsertEmployee,
  type InsertEmployeeAttachment,
  type UpdateEmployee,
} from "@shared/schema";

export async function getEmployees(scope: "active" | "all" = "active"): Promise<Employee[]> {
  if (scope === "all") {
    return db
      .select()
      .from(employees)
      .orderBy(asc(employees.lastName), asc(employees.firstName), asc(employees.id));
  }
  return db
    .select()
    .from(employees)
    .where(eq(employees.isActive, true))
    .orderBy(asc(employees.lastName), asc(employees.firstName), asc(employees.id));
}

export async function getEmployee(id: number): Promise<Employee | null> {
  const [employee] = await db.select().from(employees).where(eq(employees.id, id));
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

export async function getEmployeesByTour(tourId: number): Promise<Employee[]> {
  return db
    .select()
    .from(employees)
    .where(eq(employees.tourId, tourId))
    .orderBy(asc(employees.lastName), asc(employees.firstName));
}

export async function getEmployeesByTeam(teamId: number): Promise<Employee[]> {
  return db
    .select()
    .from(employees)
    .where(eq(employees.teamId, teamId))
    .orderBy(asc(employees.lastName), asc(employees.firstName));
}

export async function setEmployeeTourWithVersion(
  employeeId: number,
  expectedVersion: number,
  tourId: number | null,
): Promise<{ kind: "updated"; employee: Employee } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update employee
    set
      tour_id = ${tourId},
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

// Technical exception for demo-seed flow (excluded from hardening scope).
export async function setEmployeeTour(employeeId: number, tourId: number | null): Promise<Employee | null> {
  await db
    .update(employees)
    .set({ tourId, updatedAt: new Date() })
    .where(eq(employees.id, employeeId));
  const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId));
  return employee || null;
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
