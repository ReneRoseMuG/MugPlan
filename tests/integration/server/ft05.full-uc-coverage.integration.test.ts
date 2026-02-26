/**
 * Test Scope:
 *
 * Feature: FT05 - Mitarbeiterverwaltung
 * Use Case: UC 05/02, UC 05/07, UC 05/09, UC 05/10, UC 05/11, UC 05/12, UC 05/13
 *
 * Abgedeckte Regeln:
 * - Bearbeitung durch Disponent aendert Stammdaten ohne Nebenwirkung auf Terminrelation.
 * - Detail-, Attachment- und Terminansicht sind konsistent lesbar.
 * - Parallelfaelle fuer Reaktivierung/Bearbeitung triggern VERSION_CONFLICT.
 * - Listen-/Dialog-Query fuer aktive Mitarbeiter bleibt konsistent.
 * - DELETE blockiert bei bestehenden Terminreferenzen und ist nur fuer ADMIN erlaubt.
 *
 * Fehlerfaelle:
 * - Konfliktfall Deaktivierung vor Terminspeicherung muss Save blockieren.
 * - DELETE liefert BUSINESS_CONFLICT bei Referenzen und FORBIDDEN fuer unberechtigte Rollen.
 *
 * Ziel:
 * FT05-Use-Cases mit Integrationsfokus inklusive DELETE-Regeln absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type Response, type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as appointmentsService from "../../../server/services/appointmentsService";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { nextDeterministicToken } from "../../helpers/deterministic";

let app: express.Express;
let employeeCounter = 0;
let projectCounter = 0;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createRoleAgent(roleCode: "DISPATCHER" | "READER", namespace: string): Promise<SuperAgentTest> {
  const username = `ft05-${roleCode.toLowerCase()}-${nextDeterministicToken(namespace)}`;
  const password = `ft05-${roleCode.toLowerCase()}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "FT05",
    lastName: roleCode,
    passwordHash,
    roleCode,
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function createEmployee(admin: SuperAgentTest, suffix: string) {
  employeeCounter += 1;
  const res = await admin
    .post("/api/employees")
    .send({
      firstName: `FT05-${suffix}-${employeeCounter}`,
      lastName: "Employee",
      phone: null,
      email: null,
    })
    .expect(201);

  return res.body as { id: number; version: number; isActive: boolean; firstName: string };
}

async function createProjectFixture(label: string) {
  projectCounter += 1;
  const token = nextDeterministicToken(`ft05-project-${label}`);
  const customer = await customersService.createCustomer({
    customerNumber: `FT05-${label}-${projectCounter}-${token}`,
    firstName: "FT05",
    lastName: `Customer-${projectCounter}`,
    fullName: `Customer-${projectCounter}, FT05`,
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
    customerId: customer.id,
    name: `FT05 Project ${label} ${projectCounter}`,
    descriptionMd: null,
    version: 1,
  });
}

function listAppointmentIds(payload: unknown): number[] {
  return (payload as Array<{ id: number }>).map((item) => item.id).sort((a, b) => a - b);
}

describe("FT05 integration: full UC coverage", () => {
  it("UC 05/02: dispatcher updates employee master data without changing appointment relation history", async () => {
    const admin = await loginAdminAgent();
    const dispatcher = await createRoleAgent("DISPATCHER", "uc0502-dispatcher");
    const employee = await createEmployee(admin, "uc0502");
    const project = await createProjectFixture("uc0502");

    await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-07-01",
      employeeIds: [employee.id],
    });

    const before = await admin.get(`/api/employees/${employee.id}/appointments?scope=all`).expect(200);
    const beforeIds = listAppointmentIds(before.body);

    await dispatcher
      .put(`/api/employees/${employee.id}`)
      .send({ firstName: "DispatcherUpdated", version: employee.version })
      .expect(200)
      .expect((res) => {
        expect(res.body.firstName).toBe("DispatcherUpdated");
      });

    await admin
      .get(`/api/employees/${employee.id}/appointments?scope=all`)
      .expect(200)
      .expect((res) => {
        expect(listAppointmentIds(res.body)).toEqual(beforeIds);
      });
  });

  it("UC 05/07: employee detail, attachments and appointments are consistently readable", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin, "uc0507");
    const project = await createProjectFixture("uc0507");

    const appointment = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-08-11",
      employeeIds: [employee.id],
    });
    if (!appointment) throw new Error("Expected appointment fixture for UC 05/07");

    const attachmentUpload = await admin
      .post(`/api/employees/${employee.id}/attachments`)
      .attach("file", Buffer.from("UC0507"), "uc0507.txt")
      .expect(201);

    await admin
      .get(`/api/employees/${employee.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.employee.id).toBe(employee.id);
      });

    await admin
      .get(`/api/employees/${employee.id}/attachments`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect((res.body as Array<{ id: number }>).map((entry) => entry.id)).toContain(attachmentUpload.body.id);
      });

    await admin
      .get(`/api/employees/${employee.id}/appointments?scope=all`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        const ids = (res.body as Array<{ id: number }>).map((entry) => entry.id);
        expect(ids).toContain(appointment.id);
      });
  });

  it("UC 05/09: deactivated employee must not be assignable to a new appointment", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin, "uc0509");
    const project = await createProjectFixture("uc0509");

    const deactivated = await admin
      .patch(`/api/employees/${employee.id}/active`)
      .send({ isActive: false, version: employee.version })
      .expect(200);
    expect(deactivated.body.isActive).toBe(false);

    const createResponse: Response = await admin
      .post("/api/appointments")
      .send({
        projectId: project.id,
        startDate: "2099-10-01",
        employeeIds: [employee.id],
      });

    if (createResponse.status !== 409 && createResponse.status !== 400) {
      throw new Error(
        `UC 05/09 violated: expected 409/400 when assigning deactivated employee, got ${createResponse.status}. ` +
          "Required production extension: enforce active-employee validation on appointment save.",
      );
    }
  });

  it("UC 05/11: stale update after reactivation returns 409 VERSION_CONFLICT", async () => {
    const adminA = await loginAdminAgent();
    const adminB = await loginAdminAgent();
    const employee = await createEmployee(adminA, "uc0511");

    const inactive = await adminA
      .patch(`/api/employees/${employee.id}/active`)
      .send({ isActive: false, version: employee.version })
      .expect(200);

    const snapshotB = await adminB.get(`/api/employees/${employee.id}`).expect(200);
    const staleVersion = snapshotB.body.employee.version as number;

    await adminA
      .patch(`/api/employees/${employee.id}/active`)
      .send({ isActive: true, version: inactive.body.version })
      .expect(200);

    await adminB
      .put(`/api/employees/${employee.id}`)
      .send({ firstName: "StaleWrite", version: staleVersion })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("VERSION_CONFLICT");
      });
  });

  it("UC 05/13: dispatcher gets consistent active employee query result across list and dialog sources", async () => {
    const admin = await loginAdminAgent();
    const dispatcher = await createRoleAgent("DISPATCHER", "uc0513-dispatcher");

    const activeA = await createEmployee(admin, "uc0513-active-a");
    await createEmployee(admin, "uc0513-active-b");
    const inactive = await createEmployee(admin, "uc0513-inactive");

    await admin
      .patch(`/api/employees/${inactive.id}/active`)
      .send({ isActive: false, version: inactive.version })
      .expect(200);

    const listResponse = await dispatcher.get("/api/employees?scope=active").expect(200);
    const dialogResponse = await dispatcher.get("/api/employees?scope=inactive").expect(200);

    const listIds = listAppointmentIds(listResponse.body);
    const dialogIds = listAppointmentIds(dialogResponse.body);

    expect(listIds).toEqual(dialogIds);
    expect(listIds).toContain(activeA.id);
    expect(listIds).not.toContain(inactive.id);
  });

  it("UC 05/10: deletion with existing appointment references is blocked with 409 BUSINESS_CONFLICT", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin, "uc0510");
    const project = await createProjectFixture("uc0510");

    await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-11-01",
      employeeIds: [employee.id],
    });

    await admin
      .delete(`/api/employees/${employee.id}`)
      .send({ version: employee.version })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });
  });

  it("UC 05/12: unauthorized delete attempt is rejected with 403 FORBIDDEN", async () => {
    const admin = await loginAdminAgent();
    const reader = await createRoleAgent("READER", "uc0512-reader");
    const employee = await createEmployee(admin, "uc0512");

    await reader
      .delete(`/api/employees/${employee.id}`)
      .send({ version: employee.version })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });
});
