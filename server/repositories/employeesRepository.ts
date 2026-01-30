import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { employees, type Employee, type InsertEmployee, type UpdateEmployee } from "@shared/schema";

export async function getEmployees(filter: "active" | "inactive" | "all" = "active"): Promise<Employee[]> {
  if (filter === "all") {
    return db
      .select()
      .from(employees)
      .orderBy(asc(employees.lastName), asc(employees.firstName), asc(employees.id));
  }
  const isActive = filter === "active";
  return db
    .select()
    .from(employees)
    .where(eq(employees.isActive, isActive))
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

export async function updateEmployee(id: number, data: UpdateEmployee & { fullName?: string }): Promise<Employee | null> {
  await db
    .update(employees)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(employees.id, id));
  const [employee] = await db.select().from(employees).where(eq(employees.id, id));
  return employee || null;
}

export async function toggleEmployeeActive(id: number, isActive: boolean): Promise<Employee | null> {
  await db
    .update(employees)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(employees.id, id));
  const [employee] = await db.select().from(employees).where(eq(employees.id, id));
  return employee || null;
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

export async function setEmployeeTour(employeeId: number, tourId: number | null): Promise<Employee | null> {
  await db
    .update(employees)
    .set({ tourId, updatedAt: new Date() })
    .where(eq(employees.id, employeeId));
  const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId));
  return employee || null;
}

export async function setEmployeeTeam(employeeId: number, teamId: number | null): Promise<Employee | null> {
  await db
    .update(employees)
    .set({ teamId, updatedAt: new Date() })
    .where(eq(employees.id, employeeId));
  const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId));
  return employee || null;
}
