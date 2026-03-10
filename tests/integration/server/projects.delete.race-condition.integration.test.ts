/**
 * Test Scope:
 *
 * Feature: FT02 - Projekte
 * Use Case: UC 02/18
 *
 * Abgedeckte Regeln:
 * - Gleichzeitiges Projektloeschen und Terminanlage darf keinen inkonsistenten Endzustand erzeugen.
 * - Endzustand muss referenziell konsistent sein (kein Termin ohne gueltiges Projekt).
 *
 * Fehlerfaelle:
 * - Beide Requests werden erfolgreich, obwohl Projekt und Termin inkonsistent enden.
 *
 * Ziel:
 * Race-Condition-Verhalten bei Projektloeschung explizit sichtbar machen.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import { db } from "../../../server/db";
import { appointments, projects } from "../../../shared/schema";

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

async function createProjectForRace() {
  const token = `FT02-RACE-${Date.now()}-${seq++}`;
  const customer = await customersService.createCustomer({
    customerNumber: token,
    firstName: "Race",
    lastName: token,
    fullName: `${token}, Race`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });

  return projectsService.createProject({
    customerId: customer.id,
    name: "Race Project",
    orderNumber: `ORD-RACE-${customer.id}`,
    descriptionMd: null,
    version: 1,
  });
}

describe("FT02 integration: race condition project delete", () => {
  it("UC 02/18: delete and concurrent appointment create keep referential integrity", async () => {
    const adminA = await loginAdminAgent();
    const adminB = await loginAdminAgent();
    const project = await createProjectForRace();

    const deletePromise = adminA
      .delete(`/api/projects/${project.id}`)
      .send({ version: project.version });

    const createPromise = adminB
      .post("/api/appointments")
      .send({
        projectId: project.id,
        startDate: "2099-11-11",
        employeeIds: [],
      });

    const [deleteResponse, createResponse] = await Promise.all([deletePromise, createPromise]);

    const deleteStatus = deleteResponse.status;
    const createStatus = createResponse.status;

    const deleteSucceeded = deleteStatus === 204;
    const createSucceeded = createStatus === 201;

    // A fully inconsistent "both success" situation must not happen.
    if (deleteSucceeded && createSucceeded) {
      throw new Error(
        `UC 02/18 violation: concurrent delete/create both succeeded (delete=${deleteStatus}, create=${createStatus}).`,
      );
    }

    const [projectRow] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, project.id));

    const projectExists = Boolean(projectRow);

    const appointmentRows = await db
      .select({ id: appointments.id, projectId: appointments.projectId })
      .from(appointments)
      .where(eq(appointments.projectId, project.id));

    if (!projectExists) {
      expect(appointmentRows).toHaveLength(0);
    } else {
      // If project still exists, at least one of the requests must have been rejected.
      expect(deleteSucceeded && createSucceeded).toBe(false);
    }
  });

  it("UC 02/18 explicit conflict expectation (may fail if implementation differs)", async () => {
    const admin = await loginAdminAgent();
    const project = await createProjectForRace();

    await admin
      .post("/api/appointments")
      .send({
        projectId: project.id,
        startDate: "2099-11-12",
        employeeIds: [],
      })
      .expect(201);

    // FT02 UC text expects deletion conflict once appointment exists.
    await admin
      .delete(`/api/projects/${project.id}`)
      .send({ version: project.version })
      .expect(409);
  });
});
