/**
 * Test Scope:
 *
 * Feature: FT24 - Attachment Queries und Kontextaggregation
 * Use Case: UC Sidebar-Aggregate und Duplikatpruefung
 *
 * Abgedeckte Regeln:
 * - Customer-Projektattachment-Aggregation liefert gruppierte Projektanhaenge mit Paging-Metadaten.
 * - Termin-Attachment-Kontext liefert Projekt- und Kundenanhaenge gemeinsam.
 * - Duplikatpruefung aggregiert Treffer domänenuebergreifend nach originalName.
 *
 * Fehlerfaelle:
 * - Fehlende Kontextaggregation fuer Terminseitenleiste.
 *
 * Ziel:
 * API-Integration fuer neue Attachment-Query-Endpunkte end-to-end absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as appointmentsService from "../../../server/services/appointmentsService";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";

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

async function createFixtureGraph() {
  const token = `FT24-ATT-${Date.now()}-${seq++}`;
  const customer = await customersService.createCustomer({
    customerNumber: token,
    firstName: "Attach",
    lastName: token,
    fullName: `${token}, Attach`,
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
    name: "Attachment Query Project",
    orderNumber: `ORD-${token}`,
    descriptionMd: null,
    version: 1,
  });

  const appointment = await appointmentsService.createAppointment({
    projectId: project.id,
    startDate: "2099-01-10",
    endDate: null,
    startTime: null,
    employeeIds: [],
  });

  return { customer, project, appointment };
}

describe("FT24 integration: attachment query endpoints", () => {
  it("aggregates customer project attachments and appointment context, and reports duplicates", async () => {
    const admin = await loginAdminAgent();
    const fixture = await createFixtureGraph();
    expect(fixture.appointment?.id).toBeTruthy();

    const duplicateName = `angebot-${Date.now()}.pdf`;

    const customerUpload = await admin
      .post(`/api/customers/${fixture.customer.id}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4 customer"), duplicateName)
      .expect(201);
    const projectUpload = await admin
      .post(`/api/projects/${fixture.project.id}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4 project"), duplicateName)
      .expect(201);

    expect(Number(customerUpload.body.id)).toBeGreaterThan(0);
    expect(Number(projectUpload.body.id)).toBeGreaterThan(0);

    const aggregate = await admin
      .get(`/api/customers/${fixture.customer.id}/project-attachments?page=1&pageSize=20`)
      .expect(200);
    expect(Array.isArray(aggregate.body.items)).toBe(true);
    expect(aggregate.body.totalProjects).toBeGreaterThanOrEqual(1);
    expect(aggregate.body.totalAttachments).toBeGreaterThanOrEqual(1);
    expect(aggregate.body.page).toBe(1);
    expect(aggregate.body.pageSize).toBe(20);

    const context = await admin
      .get(`/api/appointments/${fixture.appointment?.id}/attachment-context`)
      .expect(200);
    expect(context.body.project.id).toBe(fixture.project.id);
    expect(context.body.customer.id).toBe(fixture.customer.id);
    expect(Array.isArray(context.body.projectAttachments)).toBe(true);
    expect(Array.isArray(context.body.customerAttachments)).toBe(true);
    expect(context.body.projectAttachments.some((row: { id: number }) => row.id === Number(projectUpload.body.id))).toBe(true);
    expect(context.body.customerAttachments.some((row: { id: number }) => row.id === Number(customerUpload.body.id))).toBe(true);

    const duplicates = await admin
      .post("/api/attachments/duplicates/check-original-name")
      .send({ originalName: duplicateName })
      .expect(200);
    expect(duplicates.body.duplicate).toBe(true);
    expect(duplicates.body.summary.customer).toBeGreaterThanOrEqual(1);
    expect(duplicates.body.summary.project).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(duplicates.body.hits)).toBe(true);
  });
});
