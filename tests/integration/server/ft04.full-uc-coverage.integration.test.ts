/**
 * Test Scope:
 *
 * Feature: FT04 - Tourenplanung
 * Use Case: UC 04/01 bis UC 04/10
 *
 * Abgedeckte Regeln:
 * - UC-nahe End-to-end-Absicherung von Tour-CRUD, Rollenlogik, Konflikten und Darstellungskonsistenz.
 * - Multi-User-Konflikte werden deterministisch ueber zwei Sessions validiert.
 * - Rollen- und Projektionserwartungen werden als verifizierbare Integrationskontrakte geprueft.
 *
 * Fehlerfaelle:
 * - Fehlende Rollen-Guards fuer Tour-Mitarbeiter-Mutationen.
 * - Fehlende Readonly-Umsetzung in Wochenableitungs-Sollregeln.
 *
 * Ziel:
 * Vollstaendige FT04-UC-Abdeckung (UC 04/01-04/10) ohne Produktionscode-Aenderung.
 */
import express from "express";
import { createServer } from "http";
import request, { type Response, type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { resetDatabase } from "../../helpers/resetDatabase";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as appointmentsService from "../../../server/services/appointmentsService";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";

let app: express.Express;
let employeeCounter = 1;
let customerCounter = 1;
let userCounter = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

beforeEach(async () => {
  await resetDatabase();
  employeeCounter = 1;
  customerCounter = 1;
  userCounter = 1;
});

async function loginAgent(username: string, password: string): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function loginAdminAgent(): Promise<SuperAgentTest> {
  return loginAgent("test-admin", "test-admin-password");
}

async function createRoleAgent(roleCode: "READER" | "DISPATCHER"): Promise<SuperAgentTest> {
  const idx = userCounter++;
  const username = `ft04-uc-${roleCode.toLowerCase()}-${idx}`;
  const password = `ft04-uc-${roleCode.toLowerCase()}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "FT04",
    lastName: roleCode,
    passwordHash,
    roleCode,
  });
  return loginAgent(username, password);
}

async function createEmployee(agent: SuperAgentTest) {
  const idx = employeeCounter++;
  const response = await agent.post("/api/employees").send({
    firstName: `Uc-${idx}`,
    lastName: `Employee-${idx}`,
    phone: null,
    email: null,
  }).expect(201);
  return response.body as { id: number; version: number; tourId: number | null };
}

async function createTour(agent: SuperAgentTest, color: string) {
  const response = await agent.post("/api/tours").send({ color }).expect(201);
  return response.body as { id: number; name: string; color: string; version: number };
}

async function createProjectForAppointment() {
  const customer = await customersService.createCustomer({
    customerNumber: `FT04-UC-${customerCounter}`,
    firstName: "Uc",
    lastName: `Customer-${customerCounter}`,
    fullName: `Customer-${customerCounter}, Uc`,
    company: null,
    email: null,
    phone: "12345",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });
  customerCounter += 1;
  return projectsService.createProject({
    name: `FT04-UC-Project-${customerCounter}`,
    customerId: customer.id,
    orderNumber: `ORD-FT04-UC-${customerCounter}`,
    descriptionMd: null,
    version: 1,
  });
}

function getSuccessAndConflict(
  first: Response,
  second: Response,
): { success: Response; conflict: Response } {
  if (first.status === 200 && second.status === 409) return { success: first, conflict: second };
  if (first.status === 409 && second.status === 200) return { success: second, conflict: first };
  throw new Error(`Expected [200,409], received [${first.status},${second.status}]`);
}

describe("FT04 full UC coverage integration", () => {
  it("UC 04/01 creates tour with generated name and optional employee assignment", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin);

    const tour = await createTour(admin, "#114488");
    expect(tour.name).toMatch(/^Tour \d+$/);

    await admin.post(`/api/tours/${tour.id}/employees`).send({
      items: [{ employeeId: employee.id, version: employee.version }],
    }).expect(200);

    await admin.get(`/api/tours/${tour.id}/employees`).expect(200).expect((res) => {
      expect(res.body.map((entry: { id: number }) => entry.id)).toContain(employee.id);
    });
  });

  it("UC 04/02 updates tour color and member list while keeping generated name unchanged", async () => {
    const admin = await loginAdminAgent();
    const employeeA = await createEmployee(admin);
    const employeeB = await createEmployee(admin);
    const created = await createTour(admin, "#222222");

    const firstAssign = await admin.post(`/api/tours/${created.id}/employees`).send({
      items: [{ employeeId: employeeA.id, version: employeeA.version }],
    }).expect(200);
    const versionA = Number(firstAssign.body[0].version);

    const updated = await admin.patch(`/api/tours/${created.id}`).send({
      color: "#333333",
      version: created.version,
      name: "Nicht editierbar",
    }).expect(200);

    await admin.post(`/api/tours/${created.id}/employees`).send({
      items: [
        { employeeId: employeeA.id, version: versionA },
        { employeeId: employeeB.id, version: employeeB.version },
      ],
    }).expect(200);

    expect(updated.body.color).toBe("#333333");
    expect(updated.body.name).toBe(created.name);
    await admin.get(`/api/tours/${created.id}/employees`).expect(200).expect((res) => {
      const ids = res.body.map((entry: { id: number }) => entry.id).sort((l: number, r: number) => l - r);
      expect(ids).toEqual([employeeA.id, employeeB.id].sort((l, r) => l - r));
    });
  });

  it("UC 04/03 enforces single-tour membership when assigning/removing employees", async () => {
    const admin = await loginAdminAgent();
    const tourA = await createTour(admin, "#441100");
    const tourB = await createTour(admin, "#005522");
    const employee = await createEmployee(admin);

    const assignedToA = await admin.post(`/api/tours/${tourA.id}/employees`).send({
      items: [{ employeeId: employee.id, version: employee.version }],
    }).expect(200);

    await admin.post(`/api/tours/${tourB.id}/employees`).send({
      items: [{ employeeId: employee.id, version: assignedToA.body[0].version }],
    }).expect(200);

    await admin.get(`/api/tours/${tourA.id}/employees`).expect(200).expect((res) => {
      expect(res.body.map((entry: { id: number }) => entry.id)).not.toContain(employee.id);
    });
    await admin.get(`/api/tours/${tourB.id}/employees`).expect(200).expect((res) => {
      expect(res.body.map((entry: { id: number }) => entry.id)).toContain(employee.id);
    });
  });

  it("UC 04/04 deletes tour only without appointments and resets employee references", async () => {
    const admin = await loginAdminAgent();
    const tour = await createTour(admin, "#773355");
    const employee = await createEmployee(admin);
    const assigned = await admin.post(`/api/tours/${tour.id}/employees`).send({
      items: [{ employeeId: employee.id, version: employee.version }],
    }).expect(200);

    await admin.delete(`/api/tours/${tour.id}/employees/${employee.id}`).send({
      version: assigned.body[0].version,
    }).expect(200);

    await admin.delete(`/api/tours/${tour.id}`).send({ version: tour.version }).expect(204);
    await admin.get("/api/tours").expect(200).expect((res) => {
      expect(res.body.some((entry: { id: number }) => entry.id === tour.id)).toBe(false);
    });
    await admin.get(`/api/employees/${employee.id}`).expect(200).expect((res) => {
      expect(res.body.employee.tourId).toBeNull();
    });
  });

  it("UC 04/05 blocks READER mutation on tour-employee endpoints", async () => {
    const admin = await loginAdminAgent();
    const reader = await createRoleAgent("READER");
    const tour = await createTour(admin, "#5511aa");
    const employee = await createEmployee(admin);

    const response = await reader.post(`/api/tours/${tour.id}/employees`).send({
      items: [{ employeeId: employee.id, version: employee.version }],
    });
    if (response.status !== 403 || response.body?.code !== "FORBIDDEN") {
      throw new Error(
        `UC 04/05 contract mismatch: READER/Monteur darf Tour-Mitarbeiter-Mutationen nicht ausfuehren (erwartet 403/FORBIDDEN, erhalten ${response.status}/${response.body?.code ?? "n/a"})`,
      );
    }
  });

  it("UC 04/06 reflects tour color changes in calendar projections without changing other tours", async () => {
    const admin = await loginAdminAgent();
    const project = await createProjectForAppointment();
    const tourA = await createTour(admin, "#336699");
    const tourB = await createTour(admin, "#aa5500");

    const appointmentA = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-04-10",
      tourId: tourA.id,
      employeeIds: [],
    });
    const appointmentB = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-04-11",
      tourId: tourB.id,
      employeeIds: [],
    });

    await admin.patch(`/api/tours/${tourA.id}`).send({ color: "#22bb88", version: tourA.version }).expect(200);

    await admin.get("/api/calendar/appointments?fromDate=2099-04-01&toDate=2099-04-30").expect(200).expect((res) => {
      const rowA = res.body.find((entry: { id: number }) => entry.id === (appointmentA as { id: number }).id);
      const rowB = res.body.find((entry: { id: number }) => entry.id === (appointmentB as { id: number }).id);
      expect(rowA.tourColor).toBe("#22bb88");
      expect(rowB.tourColor).toBe("#aa5500");
    });
  });

  it("UC 04/07 derives week overview from current tour-employee assignments", async () => {
    const admin = await loginAdminAgent();
    const tour = await createTour(admin, "#2a6fbb");
    const employeeA = await createEmployee(admin);
    const employeeB = await createEmployee(admin);
    const employeeC = await createEmployee(admin);

    const assignInitial = await admin
      .post(`/api/tours/${tour.id}/employees`)
      .send({
        items: [
          { employeeId: employeeA.id, version: employeeA.version },
          { employeeId: employeeB.id, version: employeeB.version },
        ],
      })
      .expect(200);

    const versionB = Number(
      (assignInitial.body as Array<{ id: number; version: number }>).find((entry) => entry.id === employeeB.id)?.version,
    );
    if (!Number.isInteger(versionB) || versionB < 1) {
      throw new Error("Expected valid employee version for employeeB after assignment");
    }

    await admin
      .delete(`/api/tours/${tour.id}/employees/${employeeB.id}`)
      .send({ version: versionB })
      .expect(200);

    await admin
      .post(`/api/tours/${tour.id}/employees`)
      .send({
        items: [{ employeeId: employeeC.id, version: employeeC.version }],
      })
      .expect(200);

    await admin.get("/api/employees?scope=active").expect(200).expect((res) => {
      const rows = res.body as Array<{ id: number; tourId: number | null }>;
      const byId = new Map(rows.map((row) => [row.id, row] as const));
      expect(byId.get(employeeA.id)?.tourId).toBe(tour.id);
      expect(byId.get(employeeB.id)?.tourId ?? null).toBeNull();
      expect(byId.get(employeeC.id)?.tourId).toBe(tour.id);
    });

    await admin.get(`/api/tours/${tour.id}/employees`).expect(200).expect((res) => {
      const ids = (res.body as Array<{ id: number }>).map((entry) => entry.id).sort((l, r) => l - r);
      expect(ids).toEqual([employeeA.id, employeeC.id].sort((l, r) => l - r));
      expect(ids).not.toContain(employeeB.id);
    });
  });

  it("UC 04/08 prevents parallel assignment of same employee to different tours", async () => {
    const sessionA = await loginAdminAgent();
    const sessionB = await loginAdminAgent();
    const tourA = await createTour(sessionA, "#118811");
    const tourB = await createTour(sessionA, "#881111");
    const employee = await createEmployee(sessionA);

    const [resA, resB] = await Promise.all([
      sessionA.post(`/api/tours/${tourA.id}/employees`).send({ items: [{ employeeId: employee.id, version: employee.version }] }),
      sessionB.post(`/api/tours/${tourB.id}/employees`).send({ items: [{ employeeId: employee.id, version: employee.version }] }),
    ]);

    const { success, conflict } = getSuccessAndConflict(resA, resB);
    expect(conflict.body.code).toBe("VERSION_CONFLICT");

    const winningTourId = Number(success.req.path.match(/\/api\/tours\/(\d+)\/employees/)?.[1]);
    const losingTourId = winningTourId === tourA.id ? tourB.id : tourA.id;

    await sessionA.get(`/api/tours/${winningTourId}/employees`).expect(200).expect((res) => {
      expect(res.body.map((entry: { id: number }) => entry.id)).toContain(employee.id);
    });
    await sessionA.get(`/api/tours/${losingTourId}/employees`).expect(200).expect((res) => {
      expect(res.body.map((entry: { id: number }) => entry.id)).not.toContain(employee.id);
    });
  });

  it("UC 04/09 prevents silent overwrite on parallel tour edit", async () => {
    const sessionA = await loginAdminAgent();
    const sessionB = await loginAdminAgent();
    const tour = await createTour(sessionA, "#101010");

    const [resA, resB] = await Promise.all([
      sessionA.patch(`/api/tours/${tour.id}`).send({ color: "#202020", version: tour.version }),
      sessionB.patch(`/api/tours/${tour.id}`).send({ color: "#303030", version: tour.version }),
    ]);

    const { success, conflict } = getSuccessAndConflict(resA, resB);
    expect(conflict.body.code).toBe("VERSION_CONFLICT");

    const persistedColor = (success.body as { color: string }).color;
    await sessionA.get("/api/tours").expect(200).expect((res) => {
      const persisted = res.body.find((entry: { id: number }) => entry.id === tour.id);
      expect(persisted.color).toBe(persistedColor);
    });
  });

  it("UC 04/10 blocks delete when appointment assignment appears before delete commit", async () => {
    const sessionA = await loginAdminAgent();
    const sessionB = await loginAdminAgent();
    const tour = await createTour(sessionA, "#557799");
    const project = await createProjectForAppointment();

    await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-07-01",
      tourId: tour.id,
      employeeIds: [],
    });

    await sessionA.delete(`/api/tours/${tour.id}`).send({ version: tour.version }).expect(409).expect((res) => {
      expect(res.body.code).toBe("BUSINESS_CONFLICT");
    });

    await sessionB.get(`/api/tours/${tour.id}/current-appointments?fromDate=2000-01-01`).expect(200).expect((res) => {
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });
});
