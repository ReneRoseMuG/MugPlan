/**
 * Test Scope:
 *
 * Feature: FT05/FT05+ - Employee current-appointments endpoint
 * Use Case: UC Mitarbeiter-Termine abrufen (Sidebar)
 *
 * Abgedeckte Regeln:
 * - Endpoint liefert 200 mit Array-Struktur bei gueltiger Employee-ID.
 * - Ungueltige ID und ungueltiges fromDate liefern 400.
 * - Nicht-Admin-Verhalten auf inaktivem Mitarbeiter wird als IST dokumentiert.
 * - Nicht existente Mitarbeiter-ID wird als IST dokumentiert.
 *
 * Fehlerfaelle:
 * - Nicht numerische ID.
 * - Falsches Datumsformat in fromDate.
 *
 * Ziel:
 * Das aktuelle Serververhalten von /api/employees/:id/current-appointments reproduzierbar absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as appointmentsService from "../../../server/services/appointmentsService";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";

let app: express.Express;
let seedCounter = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

function nextSeed() {
  seedCounter += 1;
  return seedCounter;
}

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createDispatcherAgent(): Promise<SuperAgentTest> {
  const username = `test-dispatcher-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = "test-dispatcher-password";
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Test",
    lastName: "Dispatcher",
    passwordHash,
    roleCode: "DISPATCHER",
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function createEmployee(admin: SuperAgentTest, suffix = "emp") {
  const seq = nextSeed();
  const res = await admin
    .post("/api/employees")
    .send({ firstName: `Emp-${suffix}-${seq}`, lastName: "Case", phone: null, email: null })
    .expect(201);

  return res.body as { id: number; version: number };
}

async function createProjectWithCustomer() {
  const seq = nextSeed();
  const uniqueKey = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const customer = await customersService.createCustomer({
    customerNumber: `EMP-CUR-${seq}-${uniqueKey}`,
    firstName: "Cur",
    lastName: `Customer-${seq}`,
    fullName: `Customer-${seq}, Cur`,
    company: null,
    email: null,
    phone: "12345",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });

  const project = await projectsService.createProject({
    name: `Emp Current Project ${seq}`,
    customerId: customer.id,
    descriptionMd: null,
    version: 1,
  });

  return project;
}

describe("FT05 integration: employees current appointments", () => {
  it("returns 200 and array payload for valid employee id", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin, "valid");
    const project = await createProjectWithCustomer();

    await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-04-11",
      employeeIds: [employee.id],
    });

    await admin
      .get(`/api/employees/${employee.id}/current-appointments?fromDate=2000-01-01`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        const first = res.body[0];
        expect(first).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            version: expect.any(Number),
            projectId: expect.any(Number),
            projectName: expect.any(String),
            customer: expect.objectContaining({ id: expect.any(Number), customerNumber: expect.any(String) }),
            employees: expect.any(Array),
          }),
        );
      });
  });

  it("returns 400 for non-numeric employee id", async () => {
    const admin = await loginAdminAgent();

    await admin.get("/api/employees/not-a-number/current-appointments").expect(400);
  });

  it("returns 400 for invalid fromDate format", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin, "date");

    await admin
      .get(`/api/employees/${employee.id}/current-appointments?fromDate=10-02-2026`)
      .expect(400);
  });

  it("documents non-admin behavior for inactive employee (IST)", async () => {
    const admin = await loginAdminAgent();
    const dispatcher = await createDispatcherAgent();
    const employee = await createEmployee(admin, "inactive");
    const project = await createProjectWithCustomer();

    await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-05-11",
      employeeIds: [employee.id],
    });

    const deactivated = await admin
      .patch(`/api/employees/${employee.id}/active`)
      .send({ isActive: false, version: employee.version })
      .expect(200);

    expect(deactivated.body.isActive).toBe(false);

    await dispatcher
      .get(`/api/employees/${employee.id}/current-appointments?fromDate=2000-01-01`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it("documents behavior for non-existing employee id (IST)", async () => {
    const admin = await loginAdminAgent();

    await admin
      .get("/api/employees/999999/current-appointments?fromDate=2000-01-01")
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(0);
      });
  });
});
