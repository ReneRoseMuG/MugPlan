/**
 * Test Scope:
 *
 * Feature: FT02 - Projekte
 * Use Case: UC 02/07 und UC 02/17
 *
 * Abgedeckte Regeln:
 * - `scope=upcoming` liefert nur Projekte mit mindestens einem Termin ab heute.
 * - `scope=noAppointments` liefert nur Projekte ohne Termine.
 * - Grundmengen sind disjunkt.
 * - Statusfilter wirkt nur innerhalb der bereits geladenen Grundmenge.
 *
 * Fehlerfaelle:
 * - Vermischung der Grundmengen.
 * - Scope-Filter ignoriert Datumslogik.
 *
 * Ziel:
 * Mengenlogik der Projektliste serverseitig explizit absichern.
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

let app: express.Express;
let seq = 1;

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
  await agent
    .post("/api/auth/login")
    .send({ username: "test-admin", password: "test-admin-password" })
    .expect(200);
  return agent;
}

async function createCustomer(prefix: string) {
  const token = `${prefix}-${Date.now()}-${seq++}`;
  return customersService.createCustomer({
    customerNumber: token,
    firstName: "Scope",
    lastName: token,
    fullName: `${token}, Scope`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });
}

async function createProject(customerId: number, name: string) {
  return projectsService.createProject({
    customerId,
    name,
    descriptionMd: null,
    version: 1,
  });
}

describe("FT02 integration: projects scope and mengenlogik", () => {
  it("UC 02/07 + UC 02/17: keeps upcoming and noAppointments disjoint", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("FT02-SCOPE");

    const projectFuture = await createProject(customer.id, "Scope Future");
    const projectPast = await createProject(customer.id, "Scope Past");
    const projectMixed = await createProject(customer.id, "Scope Mixed");
    const projectNone = await createProject(customer.id, "Scope None");

    await appointmentsService.createAppointment({
      projectId: projectFuture.id,
      startDate: "2099-12-01",
      employeeIds: [],
    });

    await appointmentsService.createAppointment({
      projectId: projectPast.id,
      startDate: "2000-01-01",
      employeeIds: [],
    });

    await appointmentsService.createAppointment({
      projectId: projectMixed.id,
      startDate: "2000-02-01",
      employeeIds: [],
    });
    await appointmentsService.createAppointment({
      projectId: projectMixed.id,
      startDate: "2099-12-02",
      employeeIds: [],
    });

    const upcoming = await admin.get("/api/projects?filter=all&scope=upcoming").expect(200);
    const noAppointments = await admin.get("/api/projects?filter=all&scope=noAppointments").expect(200);

    const upcomingIds = new Set((upcoming.body as Array<{ id: number }>).map((row) => row.id));
    const noAppointmentsIds = new Set((noAppointments.body as Array<{ id: number }>).map((row) => row.id));

    expect(upcomingIds.has(projectFuture.id)).toBe(true);
    expect(upcomingIds.has(projectMixed.id)).toBe(true);
    expect(upcomingIds.has(projectPast.id)).toBe(false);
    expect(upcomingIds.has(projectNone.id)).toBe(false);

    expect(noAppointmentsIds.has(projectNone.id)).toBe(true);
    expect(noAppointmentsIds.has(projectFuture.id)).toBe(false);
    expect(noAppointmentsIds.has(projectMixed.id)).toBe(false);
    expect(noAppointmentsIds.has(projectPast.id)).toBe(false);

    for (const id of upcomingIds) {
      expect(noAppointmentsIds.has(id)).toBe(false);
    }
  });

  it("UC 02/17: status filter stays inside selected ground set", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("FT02-SCOPE-STATUS");

    const projectWithFuture = await createProject(customer.id, "Scope Status Upcoming");
    const projectWithoutAppointments = await createProject(customer.id, "Scope Status None");

    await appointmentsService.createAppointment({
      projectId: projectWithFuture.id,
      startDate: "2099-12-10",
      employeeIds: [],
    });

    const statusResponse = await admin
      .post("/api/project-status")
      .send({ title: `ScopeStatus-${Date.now()}-${seq++}`, color: "#1f8b4c", description: null, sortOrder: 1 })
      .expect(201);

    const statusId = Number(statusResponse.body.id);

    await admin
      .post(`/api/projects/${projectWithoutAppointments.id}/statuses`)
      .send({ statusId, expectedVersion: 0 })
      .expect(201);

    const upcomingFiltered = await admin
      .get(`/api/projects?filter=all&scope=upcoming&statusIds=${statusId}`)
      .expect(200);

    const noAppointmentsFiltered = await admin
      .get(`/api/projects?filter=all&scope=noAppointments&statusIds=${statusId}`)
      .expect(200);

    const upcomingIds = (upcomingFiltered.body as Array<{ id: number }>).map((row) => row.id);
    const noAppointmentsIds = (noAppointmentsFiltered.body as Array<{ id: number }>).map((row) => row.id);

    expect(upcomingIds).not.toContain(projectWithoutAppointments.id);
    expect(noAppointmentsIds).toContain(projectWithoutAppointments.id);
    expect(noAppointmentsIds).not.toContain(projectWithFuture.id);
  });
});
