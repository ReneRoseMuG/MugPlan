/**
 * Test Scope:
 *
 * Feature: FT02 - Projekte
 * Use Case: UC 02/07 und UC 02/17
 *
 * Abgedeckte Regeln:
 * - `scope=all` liefert die vollstaendige Projektmenge.
 * - `scope=withAppointments` liefert Projekte mit mindestens einem Termin unabhaengig vom Datum.
 * - `scope=upcoming` liefert nur Projekte mit mindestens einem Termin ab heute.
 * - `scope=noAppointments` liefert nur Projekte ohne Termine.
 * - Die Grundmengen sind sauber voneinander abgegrenzt.
 *
 * Fehlerfaelle:
 * - Vermischung oder Luecken zwischen den Grundmengen.
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
import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";

let app: express.Express;
let seq = 1;
const berlinFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

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
    orderNumber: `ORD-${name.replace(/\s+/g, "-")}-${customerId}`,
    descriptionMd: null,
    version: 1,
  });
}

function relativeBerlinDate(daysFromToday: number): string {
  const now = new Date();
  now.setDate(now.getDate() + daysFromToday);
  return berlinFormatter.format(now);
}

async function insertAppointmentRaw(params: { projectId: number; customerId: number; startDate: string; title: string }) {
  const created = await appointmentsRepository.createAppointment(
    {
      projectId: params.projectId,
      customerId: params.customerId,
      tourId: null,
      title: params.title,
      description: null,
      startDate: new Date(`${params.startDate}T00:00:00`),
      startTime: null,
      endDate: null,
      endTime: null,
    },
    [],
  );
  return created.id as number;
}

describe("FT02 integration: projects scope and mengenlogik", () => {
  it("UC 02/07 + UC 02/17: partitions all projects into withAppointments and noAppointments while upcoming stays narrower", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("FT02-SCOPE");

    const projectFuture = await createProject(customer.id, "Scope Future");
    const projectPast = await createProject(customer.id, "Scope Past");
    const projectMixed = await createProject(customer.id, "Scope Mixed");
    const projectNone = await createProject(customer.id, "Scope None");

    const futureDay1 = relativeBerlinDate(1);
    const futureDay2 = relativeBerlinDate(2);
    const pastDay1 = relativeBerlinDate(-1);

    await appointmentsService.createAppointment({
      projectId: projectFuture.id,
      startDate: futureDay1,
      employeeIds: [],
    });

    await insertAppointmentRaw({
      projectId: projectPast.id,
      customerId: projectPast.customerId,
      startDate: pastDay1,
      title: "Scope Past",
    });

    await insertAppointmentRaw({
      projectId: projectMixed.id,
      customerId: projectMixed.customerId,
      startDate: pastDay1,
      title: "Scope Mixed Past",
    });
    await appointmentsService.createAppointment({
      projectId: projectMixed.id,
      startDate: futureDay2,
      employeeIds: [],
    });

    const all = await admin.get("/api/projects?filter=all&scope=all").expect(200);
    const withAppointments = await admin.get("/api/projects?filter=all&scope=withAppointments").expect(200);
    const upcoming = await admin.get("/api/projects?filter=all&scope=upcoming").expect(200);
    const noAppointments = await admin.get("/api/projects?filter=all&scope=noAppointments").expect(200);

    const allIds = new Set((all.body as Array<{ id: number }>).map((row) => row.id));
    const withAppointmentsIds = new Set((withAppointments.body as Array<{ id: number }>).map((row) => row.id));
    const upcomingIds = new Set((upcoming.body as Array<{ id: number }>).map((row) => row.id));
    const noAppointmentsIds = new Set((noAppointments.body as Array<{ id: number }>).map((row) => row.id));

    expect(allIds.has(projectFuture.id)).toBe(true);
    expect(allIds.has(projectPast.id)).toBe(true);
    expect(allIds.has(projectMixed.id)).toBe(true);
    expect(allIds.has(projectNone.id)).toBe(true);

    expect(withAppointmentsIds.has(projectFuture.id)).toBe(true);
    expect(withAppointmentsIds.has(projectPast.id)).toBe(true);
    expect(withAppointmentsIds.has(projectMixed.id)).toBe(true);
    expect(withAppointmentsIds.has(projectNone.id)).toBe(false);

    expect(upcomingIds.has(projectFuture.id)).toBe(true);
    expect(upcomingIds.has(projectMixed.id)).toBe(true);
    expect(upcomingIds.has(projectPast.id)).toBe(false);
    expect(upcomingIds.has(projectNone.id)).toBe(false);

    expect(noAppointmentsIds.has(projectNone.id)).toBe(true);
    expect(noAppointmentsIds.has(projectFuture.id)).toBe(false);
    expect(noAppointmentsIds.has(projectMixed.id)).toBe(false);
    expect(noAppointmentsIds.has(projectPast.id)).toBe(false);

    for (const id of noAppointmentsIds) {
      expect(withAppointmentsIds.has(id)).toBe(false);
    }

    for (const id of withAppointmentsIds) {
      expect(allIds.has(id)).toBe(true);
    }

    for (const id of noAppointmentsIds) {
      expect(allIds.has(id)).toBe(true);
    }

    for (const id of upcomingIds) {
      expect(withAppointmentsIds.has(id)).toBe(true);
      expect(noAppointmentsIds.has(id)).toBe(false);
    }
  });

  it("scope=withAppointments: liefert Projekte mit Terminen (past+future), schliesst Projekte ohne Termine aus", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("FT02-ALL");

    const projectFuture = await createProject(customer.id, "All Future");
    const projectPast = await createProject(customer.id, "All Past");
    const projectNone = await createProject(customer.id, "All None");

    await appointmentsService.createAppointment({
      projectId: projectFuture.id,
      startDate: relativeBerlinDate(1),
      employeeIds: [],
    });

    await insertAppointmentRaw({
      projectId: projectPast.id,
      customerId: projectPast.customerId,
      startDate: relativeBerlinDate(-1),
      title: "All Past",
    });

    const withAppointments = await admin.get("/api/projects?filter=all&scope=withAppointments").expect(200);
    const withAppointmentsIds = new Set((withAppointments.body as Array<{ id: number }>).map((row) => row.id));

    expect(withAppointmentsIds.has(projectFuture.id)).toBe(true);
    expect(withAppointmentsIds.has(projectPast.id)).toBe(true);
    expect(withAppointmentsIds.has(projectNone.id)).toBe(false);
  });

  it("scope=all: liefert auch Projekte ohne Termine", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("FT02-ALL-FULL");

    const projectFuture = await createProject(customer.id, "All Full Future");
    const projectNone = await createProject(customer.id, "All Full None");

    await appointmentsService.createAppointment({
      projectId: projectFuture.id,
      startDate: relativeBerlinDate(1),
      employeeIds: [],
    });

    const all = await admin.get("/api/projects?filter=all&scope=all").expect(200);
    const allIds = new Set((all.body as Array<{ id: number }>).map((row) => row.id));

    expect(allIds.has(projectFuture.id)).toBe(true);
    expect(allIds.has(projectNone.id)).toBe(true);
  });
});
