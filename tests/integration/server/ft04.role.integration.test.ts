/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - READER darf laut Soll keine Touren anlegen, bearbeiten, loeschen oder Kaskaden mutieren.
 * - DISPATCHER darf Touren anlegen/bearbeiten und Kaskaden ausfuehren, aber nicht loeschen.
 * - ADMIN darf Tour-CRUD und Kaskadenoperationen ausfuehren.
 *
 * Fehlerfaelle:
 * - Fehlende serverseitige 403-Guards werden als fehlschlagende Solltests sichtbar.
 *
 * Ziel:
 * Rollenverhalten fuer FT04 nach Wegfall der direkten Tour-Mitarbeiter-Endpunkte serverseitig absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";

let app: express.Express;
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
  userCounter = 1;
});

async function loginAgent(username: string, password: string): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function createRoleAgent(roleCode: "READER" | "DISPATCHER"): Promise<SuperAgentTest> {
  const idx = userCounter++;
  const username = `ft04-${roleCode.toLowerCase()}-${idx}`;
  const password = `ft04-${roleCode.toLowerCase()}-password`;
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

async function loginAdminAgent(): Promise<SuperAgentTest> {
  return loginAgent("test-admin", "test-admin-password");
}

async function createCascadeFixture() {
  const tour = await createTourFixture("#334455");
  const candidate = await createEmployeeFixture("FT04-ROLE");
  const project = await createProjectFixture({ prefix: "FT04-ROLE" });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
    tourId: tour.id,
  });

  return { tour, candidate, appointment };
}

describe("FT04 integration: RoleTests", () => {
  it("enforces READER create/update/delete restrictions with server-side 403", async () => {
    const reader = await createRoleAgent("READER");

    await reader.post("/api/tours").send({ color: "#aa0000" }).expect(403);
    await reader.patch("/api/tours/1").send({ name: "Reader Tour", color: "#0000aa", version: 1 }).expect(403);
    await reader.delete("/api/tours/1").send({ version: 1 }).expect(403);
  });

  it("blocks READER on cascade preview and execute endpoints", async () => {
    const reader = await createRoleAgent("READER");
    const { tour, candidate, appointment } = await createCascadeFixture();

    await reader
      .post(`/api/tours/${tour.id}/employees/cascade-add/preview`)
      .send({ employeeId: candidate.id })
      .expect(403);

    await reader
      .post(`/api/tours/${tour.id}/employees/cascade-add`)
      .send({ employeeId: candidate.id, selectedAppointmentIds: [appointment!.id] })
      .expect(403);
  });

  it("allows DISPATCHER to create/update tours and execute cascade add but blocks delete", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    const created = await dispatcher.post("/api/tours").send({ color: "#1111aa" }).expect(201);
    const updated = await dispatcher
      .patch(`/api/tours/${created.body.id}`)
      .send({ name: "Dispatcher Tour", color: "#22aa22", version: created.body.version })
      .expect(200);

    const candidate = await createEmployeeFixture("FT04-DISPATCHER");
    const project = await createProjectFixture({ prefix: "FT04-DISPATCHER" });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: created.body.id,
    });

    await dispatcher
      .post(`/api/tours/${created.body.id}/employees/cascade-add`)
      .send({ employeeId: candidate.id, selectedAppointmentIds: [appointment!.id] })
      .expect(200);

    await dispatcher.delete(`/api/tours/${created.body.id}`).send({ version: updated.body.version }).expect(403);
  });

  it("allows ADMIN to perform tour CRUD and cascade operations", async () => {
    const admin = await loginAdminAgent();

    const crudTour = await admin.post("/api/tours").send({ color: "#334455" }).expect(201);
    const updatedCrudTour = await admin
      .patch(`/api/tours/${crudTour.body.id}`)
      .send({ name: "Admin Tour", color: "#445566", version: crudTour.body.version })
      .expect(200);
    const cascadeTour = await admin.post("/api/tours").send({ color: "#556677" }).expect(201);

    const candidate = await createEmployeeFixture("FT04-ADMIN");
    const project = await createProjectFixture({ prefix: "FT04-ADMIN" });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: cascadeTour.body.id,
      employeeIds: [candidate.id],
    });

    await admin
      .post(`/api/tours/${cascadeTour.body.id}/employees/cascade-remove/preview`)
      .send({ employeeId: candidate.id })
      .expect(200);

    await admin
      .post(`/api/tours/${cascadeTour.body.id}/employees/cascade-remove`)
      .send({ employeeId: candidate.id, selectedAppointmentIds: [appointment!.id] })
      .expect(200);

    await admin.delete(`/api/tours/${crudTour.body.id}`).send({ version: updatedCrudTour.body.version }).expect(204);
  });
});
