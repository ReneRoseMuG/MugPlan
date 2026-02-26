/**
 * Test Scope:
 *
 * Feature: FT02 - Projekte
 * Use Case: UC 02/03
 *
 * Abgedeckte Regeln:
 * - Projektdetail soll laut FT02 Kunde, Statuse, Notizen, Anhaenge und Termine konsistent bereitstellen.
 *
 * Fehlerfaelle:
 * - Endpoint liefert nur Teilobjekte und verletzt den geforderten Aggregate-Vertrag.
 *
 * Ziel:
 * Fachliche Soll-Luecke am bestehenden Detail-Endpoint transparent als bewusst fehlschlagenden Test ausweisen.
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

async function createProjectFixture() {
  const token = `FT02-DETAIL-${Date.now()}-${seq++}`;
  const customer = await customersService.createCustomer({
    customerNumber: token,
    firstName: "Detail",
    lastName: token,
    fullName: `${token}, Detail`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });

  const project = await projectsService.createProject({
    customerId: customer.id,
    name: "Aggregate Contract",
    descriptionMd: null,
    version: 1,
  });

  await appointmentsService.createAppointment({
    projectId: project.id,
    startDate: "2099-11-20",
    employeeIds: [],
  });

  return { customer, project };
}

describe("FT02 integration: project detail aggregate contract", () => {
  it("UC 02/03 requirement: detail response contains full aggregate sections", async () => {
    const admin = await loginAdminAgent();
    const { project } = await createProjectFixture();

    const response = await admin.get(`/api/projects/${project.id}`).expect(200);
    const body = response.body as Record<string, unknown>;

    // FT02 aggregate contract expectation (intentional gap exposure)
    expect(body).toHaveProperty("project");
    expect(body).toHaveProperty("customer");
    expect(body).toHaveProperty("projectStatuses");
    expect(body).toHaveProperty("projectNotes");
    expect(body).toHaveProperty("projectAttachments");
    expect(body).toHaveProperty("projectAppointments");

    expect(Array.isArray(body.projectStatuses)).toBe(true);
    expect(Array.isArray(body.projectNotes)).toBe(true);
    expect(Array.isArray(body.projectAttachments)).toBe(true);
    expect(Array.isArray(body.projectAppointments)).toBe(true);
  });
});
