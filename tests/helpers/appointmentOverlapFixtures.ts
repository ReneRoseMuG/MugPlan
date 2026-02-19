import type express from "express";
import request, { type SuperAgentTest } from "supertest";
import { eq, sql } from "drizzle-orm";

import { db } from "../../server/db";
import { appointmentEmployees, employees as employeesTable, type Employee } from "@shared/schema";
import * as appointmentsService from "../../server/services/appointmentsService";
import * as customersService from "../../server/services/customersService";
import * as employeesService from "../../server/services/employeesService";
import * as projectsService from "../../server/services/projectsService";
import * as teamEmployeesService from "../../server/services/teamEmployeesService";
import * as teamsService from "../../server/services/teamsService";
import * as tourEmployeesService from "../../server/services/tourEmployeesService";
import * as toursService from "../../server/services/toursService";

let fixtureCounter = 1;

export function resetAppointmentOverlapFixtureCounters() {
  fixtureCounter = 1;
}

function nextSuffix(prefix: string): string {
  const current = fixtureCounter;
  fixtureCounter += 1;
  return `${prefix}-${String(current).padStart(3, "0")}`;
}

export async function loginAdminAgent(app: express.Express): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

export async function createCustomerFixture(prefix = "CUST") {
  const suffix = nextSuffix(prefix);
  return customersService.createCustomer({
    customerNumber: suffix,
    firstName: "Fixture",
    lastName: suffix,
    company: null,
    email: null,
    phone: "0123456789",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
  });
}

export async function createProjectFixture(prefix = "PROJ") {
  const customer = await createCustomerFixture(`${prefix}-CUST`);
  const suffix = nextSuffix(prefix);
  const project = await projectsService.createProject({
    name: suffix,
    customerId: customer.id,
    descriptionMd: null,
  });
  return { customer, project };
}

export async function createEmployeeFixture(label: string) {
  const suffix = nextSuffix(`EMP-${label}`);
  return employeesService.createEmployee({
    firstName: label,
    lastName: suffix,
    phone: null,
    email: null,
  });
}

export async function createTeamFixture(color = "#0088cc") {
  return teamsService.createTeam({ color });
}

export async function createTourFixture(color = "#00aa66") {
  return toursService.createTour({ color });
}

export async function assignEmployeesToTeamFixture(teamId: number, employees: Employee[]) {
  const currentRows = await db
    .select({ id: employeesTable.id, version: employeesTable.version })
    .from(employeesTable)
    .where(sql`${employeesTable.id} in (${sql.join(employees.map((employee) => sql`${employee.id}`), sql`, `)})`);

  const versionById = new Map(currentRows.map((row) => [row.id, row.version] as const));
  const items = employees.map((employee) => ({ employeeId: employee.id, version: versionById.get(employee.id) ?? employee.version }));
  return teamEmployeesService.assignEmployeesToTeam(teamId, items);
}

export async function assignEmployeesToTourFixture(tourId: number, employees: Employee[]) {
  const currentRows = await db
    .select({ id: employeesTable.id, version: employeesTable.version })
    .from(employeesTable)
    .where(sql`${employeesTable.id} in (${sql.join(employees.map((employee) => sql`${employee.id}`), sql`, `)})`);

  const versionById = new Map(currentRows.map((row) => [row.id, row.version] as const));
  const items = employees.map((employee) => ({ employeeId: employee.id, version: versionById.get(employee.id) ?? employee.version }));
  return tourEmployeesService.assignEmployeesToTour(tourId, items);
}

export async function createAppointmentFixture(input: {
  projectId: number;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  tourId?: number | null;
  employeeIds?: number[];
}) {
  return appointmentsService.createAppointment({
    projectId: input.projectId,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    startTime: input.startTime ?? null,
    tourId: input.tourId ?? null,
    employeeIds: input.employeeIds ?? [],
  });
}

export async function getAppointmentEmployeeIds(appointmentId: number): Promise<number[]> {
  const rows = await db
    .select({ employeeId: appointmentEmployees.employeeId })
    .from(appointmentEmployees)
    .where(eq(appointmentEmployees.appointmentId, appointmentId));

  return rows.map((row) => row.employeeId).sort((a, b) => a - b);
}

export async function assertNoDuplicateAppointmentEmployeePairs() {
  const result = await db.execute(sql`
    select
      count(*) as total_rows,
      count(distinct concat(appointment_id, '-', employee_id)) as distinct_rows
    from appointment_employee
  `);

  const rawRow = ((result as unknown as { rows?: Array<Record<string, unknown>> }).rows ?? [])[0] ?? {};
  const totalRows = Number(rawRow.total_rows ?? rawRow.TOTAL_ROWS ?? 0);
  const distinctRows = Number(rawRow.distinct_rows ?? rawRow.DISTINCT_ROWS ?? 0);

  expect(totalRows).toBe(distinctRows);
}

export function expectConflictPayloadContainsEmployees(
  payload: unknown,
  expected: Array<{ id: number; fullName?: string }>,
) {
  const body = payload as { code?: string; message?: string; conflictEmployees?: Array<{ id?: number; fullName?: string }> };
  expect(body.code).toBe("BUSINESS_CONFLICT");
  expect(typeof body.message).toBe("string");
  expect((body.message ?? "").trim().length).toBeGreaterThan(0);
  expect(Array.isArray(body.conflictEmployees)).toBe(true);

  const conflictEmployees = body.conflictEmployees ?? [];
  for (const employee of expected) {
    expect(conflictEmployees.some((entry) => entry.id === employee.id)).toBe(true);
    if (employee.fullName) {
      expect(conflictEmployees.some((entry) => entry.id === employee.id && entry.fullName === employee.fullName)).toBe(true);
    }
  }
}
