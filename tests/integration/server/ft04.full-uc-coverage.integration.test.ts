/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - UC-nahe End-to-end-Absicherung von Tour-CRUD, Rollenlogik, Projektionen und der abgeleiteten aktiven Mitarbeitermenge.
 * - Multi-User-Konflikte auf Tour-Update bleiben deterministisch.
 * - Der neue FT04-Lesepfad fuer Tour-Mitarbeiter bleibt terminbasiert und dedupliziert.
 *
 * Fehlerfaelle:
 * - Fehlende Rollen-Guards fuer Tour-Kaskaden oder aktive Mitarbeitermengen.
 * - Kalender- oder Tour-Projektionen driften nach Rename oder Terminbezug auseinander.
 *
 * Ziel:
 * FT04-UC-Abdeckung auf den neuen Stand ohne direkte `employee.tourId`-Beziehung heben.
 */
import type { Response, SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as appointmentsService from "../../../server/services/appointmentsService";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { createApiTestApp, loginAdminAgent as loginAdminAgentBase, loginAgent as loginAgentBase } from "../../helpers/apiTestHarness";
import type express from "express";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";

let app: express.Express;
let customerCounter = 1;
let userCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

beforeEach(() => {
  customerCounter = 1;
  userCounter = 1;
});

async function loginAgent(username: string, password: string): Promise<SuperAgentTest> {
  return loginAgentBase(app, { username, password });
}

async function loginAdminAgent(): Promise<SuperAgentTest> {
  return loginAdminAgentBase(app);
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

function getSuccessAndConflict(first: Response, second: Response): { success: Response; conflict: Response } {
  if (first.status === 200 && second.status === 409) return { success: first, conflict: second };
  if (first.status === 409 && second.status === 200) return { success: second, conflict: first };
  throw new Error(`Expected [200,409], received [${first.status},${second.status}]`);
}

describe("FT04 full UC coverage integration", () => {
  it("UC 04/01 creates a tour with generated name and no active employees", async () => {
    const admin = await loginAdminAgent();

    const tour = await createTour(admin, "#114488");
    expect(tour.name).toMatch(/^Tour \d+$/);

    await admin.get(`/api/tours/${tour.id}/employees/active`).expect(200).expect((res) => {
      expect(res.body).toEqual([]);
    });
  });

  it("UC 04/02 updates tour name and color", async () => {
    const admin = await loginAdminAgent();
    const created = await createTour(admin, "#222222");

    const updated = await admin.patch(`/api/tours/${created.id}`).send({
      name: "Nordtour",
      color: "#333333",
      version: created.version,
    }).expect(200);

    expect(updated.body.color).toBe("#333333");
    expect(updated.body.name).toBe("Nordtour");
  });

  it("UC 04/03 derives active employees from future tour appointments", async () => {
    const admin = await loginAdminAgent();
    const tour = await createTourFixture("#441100");
    const project = await createProjectFixture({ prefix: "FT04-UC03" });
    const employeeA = await createEmployeeFixture("FT04-UC03-A");
    const employeeB = await createEmployeeFixture("FT04-UC03-B");

    await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
      employeeIds: [employeeA.id, employeeB.id],
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      tourId: tour.id,
      employeeIds: [employeeA.id],
    });

    await admin.get(`/api/tours/${tour.id}/employees/active`).expect(200).expect((res) => {
      const ids = (res.body as Array<{ id: number }>).map((entry) => entry.id).sort((left, right) => left - right);
      expect(ids).toEqual([employeeA.id, employeeB.id].sort((left, right) => left - right));
    });
  });

  it("UC 04/04 deletes a tour only when no appointments still reference it", async () => {
    const admin = await loginAdminAgent();
    const deleteableTour = await createTour(admin, "#773355");
    const blockedTour = await createTour(admin, "#885566");
    const project = await createProjectForAppointment();

    await admin.delete(`/api/tours/${deleteableTour.id}`).send({ version: deleteableTour.version }).expect(204);

    await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-07-01",
      tourId: blockedTour.id,
      employeeIds: [],
    });

    await admin.delete(`/api/tours/${blockedTour.id}`).send({ version: blockedTour.version }).expect(409).expect((res) => {
      expect(res.body.code).toBe("BUSINESS_CONFLICT");
    });
  });

  it("UC 04/05 blocks READER mutation on tour-employee cascade endpoints", async () => {
    const admin = await loginAdminAgent();
    const reader = await createRoleAgent("READER");
    const tour = await createTour(admin, "#5511aa");
    const employee = await createEmployeeFixture("FT04-UC05");
    const project = await createProjectFixture({ prefix: "FT04-UC05" });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
    });

    const response = await reader.post(`/api/tours/${tour.id}/employees/cascade-add`).send({
      employeeId: employee.id,
      selectedAppointmentIds: [appointment!.id],
    });
    if (response.status !== 403 || response.body?.code !== "FORBIDDEN") {
      throw new Error(
        `UC 04/05 contract mismatch: READER darf Tour-Kaskaden nicht ausfuehren (erwartet 403/FORBIDDEN, erhalten ${response.status}/${response.body?.code ?? "n/a"})`,
      );
    }
  });

  it("UC 04/06 reflects tour name and color changes in calendar projections without changing other tours", async () => {
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

    await admin.patch(`/api/tours/${tourA.id}`).send({
      name: "Westtour",
      color: "#22bb88",
      version: tourA.version,
    }).expect(200);

    await admin.get("/api/calendar/appointments?fromDate=2099-04-01&toDate=2099-04-30").expect(200).expect((res) => {
      const rowA = res.body.find((entry: { id: number }) => entry.id === (appointmentA as { id: number }).id);
      const rowB = res.body.find((entry: { id: number }) => entry.id === (appointmentB as { id: number }).id);
      expect(rowA.tourColor).toBe("#22bb88");
      expect(rowA.tourName).toBe("Westtour");
      expect(rowB.tourColor).toBe("#aa5500");
      expect(rowB.tourName).toBe(tourB.name);
    });
  });

  it("UC 04/07 current-appointments endpoint returns only appointments of the requested tour", async () => {
    const admin = await loginAdminAgent();
    const project = await createProjectForAppointment();
    const tourA = await createTour(admin, "#2a6fbb");
    const tourB = await createTour(admin, "#bb6f2a");

    const appointmentA = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-08-01",
      tourId: tourA.id,
      employeeIds: [],
    });
    await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-08-02",
      tourId: tourB.id,
      employeeIds: [],
    });

    await admin.get(`/api/tours/${tourA.id}/current-appointments?fromDate=2099-08-01`).expect(200).expect((res) => {
      expect(res.body.map((entry: { id: number }) => entry.id)).toEqual([(appointmentA as { id: number }).id]);
    });
  });

  it("UC 04/08 prevents silent overwrite on parallel tour edit", async () => {
    const sessionA = await loginAdminAgent();
    const sessionB = await loginAdminAgent();
    const tour = await createTour(sessionA, "#101010");

    const [resA, resB] = await Promise.all([
      sessionA.patch(`/api/tours/${tour.id}`).send({ name: "Nordtour", color: "#202020", version: tour.version }),
      sessionB.patch(`/api/tours/${tour.id}`).send({ name: "Suedtour", color: "#303030", version: tour.version }),
    ]);

    const { success, conflict } = getSuccessAndConflict(resA, resB);
    expect(conflict.body.code).toBe("VERSION_CONFLICT");

    const persistedColor = (success.body as { color: string }).color;
    await sessionA.get("/api/tours").expect(200).expect((res) => {
      const persisted = res.body.find((entry: { id: number }) => entry.id === tour.id);
      expect(persisted.color).toBe(persistedColor);
    });
  });

  it("UC 04/09 allows DISPATCHER to mutate tours but keeps delete reserved for ADMIN", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    const created = await dispatcher.post("/api/tours").send({ color: "#557799" }).expect(201);
    const updated = await dispatcher.patch(`/api/tours/${created.body.id}`).send({
      name: "Dispatcher Tour",
      color: "#779955",
      version: created.body.version,
    }).expect(200);

    await dispatcher.delete(`/api/tours/${created.body.id}`).send({ version: updated.body.version }).expect(403);
  });

  it("UC 04/10 blocks delete when appointment assignment exists before delete commit", async () => {
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
