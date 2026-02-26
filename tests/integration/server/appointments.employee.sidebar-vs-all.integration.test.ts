/**
 * Test Scope:
 *
 * Feature: FT04/FT05 - Terminprojektion Mitarbeiter
 * Use Case: UC Sidebar zeigt nur aktuelle Termine, Dialog "Alle Termine" zeigt Historie + Zukunft
 *
 * Abgedeckte Regeln:
 * - /api/employees/:id/appointments?scope=upcoming liefert nur aktuelle/zukuenftige Termine.
 * - /api/employees/:id/appointments?scope=all liefert historische + aktuelle + zukuenftige Termine.
 * - Das Verhalten ist fuer mehrere Mitarbeiter gleichzeitig korrekt getrennt (keine Fremdtermine).
 * - Der Payload deckt die fuer Tabelle+Preview benoetigten Felder vollstaendig ab.
 * - Mitarbeiter ohne Terminzuweisungen erhalten eine leere Liste.
 * - Leserrolle darf aktive Mitarbeitertermine lesend abrufen.
 *
 * Fehlerfaelle:
 * - Historische Termine erscheinen faelschlich in der Sidebar-Liste.
 * - "Alle Termine" blendet historische Termine aus.
 * - Termine anderer Mitarbeiter werden mitgeliefert.
 *
 * Ziel:
 * End-to-end absichern, dass Mitarbeiter-Sidebar und Mitarbeiter-"Alle Termine" unterschiedliche Filterlogik korrekt anwenden.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { nextDeterministicToken } from "../../helpers/deterministic";

let app: express.Express;
let counter = 0;

const HISTORICAL_DATE = "2000-01-01";
const CURRENT_DATE = "2099-01-01";
const FUTURE_DATE = "2099-02-01";

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

function nextSeq() {
  counter += 1;
  return counter;
}

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createReaderAgent(): Promise<SuperAgentTest> {
  const username = `test-reader-${nextDeterministicToken("employees-sidebar-reader")}`;
  const password = "test-reader-password";
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Test",
    lastName: "Reader",
    passwordHash,
    roleCode: "READER",
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function createEmployee(admin: SuperAgentTest, label: string) {
  const seq = nextSeq();
  const response = await admin
    .post("/api/employees")
    .send({ firstName: `Emp-${label}-${seq}`, lastName: "Filter", phone: null, email: null })
    .expect(201);
  return response.body as { id: number; fullName: string };
}

async function createProjectForEmployee(label: string) {
  const seq = nextSeq();
  const unique = nextDeterministicToken("emp-sidebar-all");
  const customer = await customersService.createCustomer({
    customerNumber: `EMP-SIDE-ALL-${label}-${seq}-${unique}`,
    firstName: "Emp",
    lastName: `Customer-${label}-${seq}`,
    fullName: `Customer-${label}-${seq}, Emp`,
    company: null,
    email: null,
    phone: "12345",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });

  return projectsService.createProject({
    name: `Emp SidebarAll Project ${label} ${seq}`,
    customerId: customer.id,
    descriptionMd: null,
    version: 1,
  });
}

async function insertAppointment(params: {
  projectId: number;
  employeeIds: number[];
  startDate: string;
  title: string;
}) {
  const created = await appointmentsRepository.createAppointment(
    {
      projectId: params.projectId,
      tourId: null,
      title: params.title,
      description: null,
      startDate: new Date(`${params.startDate}T00:00:00`),
      startTime: null,
      endDate: null,
      endTime: null,
    },
    params.employeeIds,
  );
  return created.id as number;
}

describe("FT04/FT05 integration: employee sidebar vs all appointments", () => {
  it("returns only current+future for sidebar and full history for all-appointments across multiple employees", async () => {
    const admin = await loginAdminAgent();
    const employees = await Promise.all([
      createEmployee(admin, "A"),
      createEmployee(admin, "B"),
      createEmployee(admin, "C"),
    ]);
    const projects = await Promise.all([
      createProjectForEmployee("A"),
      createProjectForEmployee("B"),
      createProjectForEmployee("C"),
    ]);

    const expectedByEmployee = new Map<number, { historical: number; current: number; future: number }>();

    for (let index = 0; index < employees.length; index += 1) {
      const employee = employees[index];
      const project = projects[index];
      const historicalId = await insertAppointment({
        projectId: project.id,
        employeeIds: [employee.id],
        startDate: HISTORICAL_DATE,
        title: `Historical ${employee.id}`,
      });
      const currentId = await insertAppointment({
        projectId: project.id,
        employeeIds: [employee.id],
        startDate: CURRENT_DATE,
        title: `Current ${employee.id}`,
      });
      const futureId = await insertAppointment({
        projectId: project.id,
        employeeIds: [employee.id],
        startDate: FUTURE_DATE,
        title: `Future ${employee.id}`,
      });

      expectedByEmployee.set(employee.id, {
        historical: historicalId,
        current: currentId,
        future: futureId,
      });
    }

    for (const employee of employees) {
      const expected = expectedByEmployee.get(employee.id);
      if (!expected) throw new Error("Expected appointment ids for employee");

      const sidebarResponse = await admin
        .get(`/api/employees/${employee.id}/appointments?scope=upcoming`)
        .expect(200);
      const sidebarItems = sidebarResponse.body as Array<{ id: number; startDate: string; employees: Array<{ id: number }> }>;

      expect(sidebarItems).toHaveLength(2);
      expect(sidebarItems.map((item) => item.id).sort((a, b) => a - b)).toEqual(
        [expected.current, expected.future].sort((a, b) => a - b),
      );
      expect(sidebarItems.every((item) => item.employees.some((entry) => entry.id === employee.id))).toBe(true);

      const allResponse = await admin
        .get(`/api/employees/${employee.id}/appointments?scope=all`)
        .expect(200);
      const allItems = allResponse.body as Array<{
        id: number;
        version: number;
        projectName: string;
        projectOrderNumber: string | null;
        projectDescription: string | null;
        projectStatuses: Array<{ id: number; title: string; color: string }>;
        startDate: string;
        startTime: string | null;
        customer: {
          customerNumber: string;
          fullName: string | null;
          addressLine1: string | null;
          addressLine2: string | null;
          postalCode: string | null;
          city: string | null;
        };
        employees: Array<{ id: number; fullName: string }>;
        tourColor: string | null;
        isLocked: boolean;
      }>;

      expect(allItems).toHaveLength(3);
      expect(allItems.map((item) => item.id).sort((a, b) => a - b)).toEqual(
        [expected.historical, expected.current, expected.future].sort((a, b) => a - b),
      );
      expect(allItems.every((item) => item.employees.some((entry) => entry.id === employee.id))).toBe(true);
      const sample = allItems[0];
      expect(sample).toEqual(expect.objectContaining({
        id: expect.any(Number),
        version: expect.any(Number),
        projectName: expect.any(String),
        projectStatuses: expect.any(Array),
        startDate: expect.any(String),
        customer: expect.objectContaining({
          customerNumber: expect.any(String),
        }),
        employees: expect.any(Array),
        isLocked: expect.any(Boolean),
      }));
      expect("projectOrderNumber" in sample).toBe(true);
      expect("projectDescription" in sample).toBe(true);
      expect("startTime" in sample).toBe(true);
      expect("tourColor" in sample).toBe(true);
      expect("fullName" in sample.customer).toBe(true);
      expect("addressLine1" in sample.customer).toBe(true);
      expect("addressLine2" in sample.customer).toBe(true);
      expect("postalCode" in sample.customer).toBe(true);
      expect("city" in sample.customer).toBe(true);
    }
  });

  it("allows fromDate override in test env for upcoming and ignores fromDate for all", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin, "override");
    const project = await createProjectForEmployee("override");

    await insertAppointment({ projectId: project.id, employeeIds: [employee.id], startDate: HISTORICAL_DATE, title: "Historical override" });
    await insertAppointment({ projectId: project.id, employeeIds: [employee.id], startDate: CURRENT_DATE, title: "Current override" });
    await insertAppointment({ projectId: project.id, employeeIds: [employee.id], startDate: FUTURE_DATE, title: "Future override" });

    const withoutHeader = await admin
      .get(`/api/employees/${employee.id}/appointments?scope=upcoming&fromDate=${HISTORICAL_DATE}`)
      .expect(200);
    expect((withoutHeader.body as Array<{ id: number }>)).toHaveLength(3);

    const withHeader = await admin
      .get(`/api/employees/${employee.id}/appointments?scope=upcoming&fromDate=${HISTORICAL_DATE}`)
      .set("x-internal-debug", "1")
      .expect(200);
    expect((withHeader.body as Array<{ id: number }>)).toHaveLength(3);

    const allWithFromDate = await admin
      .get(`/api/employees/${employee.id}/appointments?scope=all&fromDate=${FUTURE_DATE}`)
      .expect(200);
    expect((allWithFromDate.body as Array<{ id: number }>)).toHaveLength(3);
  });

  it("returns an empty array for employee without appointments", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin, "empty");

    await admin
      .get(`/api/employees/${employee.id}/appointments?scope=all`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(0);
      });
  });

  it("allows reader role to fetch employee appointments for active employee", async () => {
    const admin = await loginAdminAgent();
    const reader = await createReaderAgent();
    const employee = await createEmployee(admin, "reader");
    const project = await createProjectForEmployee("reader");

    const futureId = await insertAppointment({
      projectId: project.id,
      employeeIds: [employee.id],
      startDate: FUTURE_DATE,
      title: `Reader ${employee.id}`,
    });

    await reader
      .get(`/api/employees/${employee.id}/appointments?scope=all`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect((res.body as Array<{ id: number }>).map((item) => item.id)).toContain(futureId);
      });
  });
});
