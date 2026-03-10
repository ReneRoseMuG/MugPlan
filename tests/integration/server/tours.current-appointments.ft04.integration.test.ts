/**
 * Test Scope:
 *
 * Feature: FT04 - Tourenverwaltung
 * Use Case: UC Tour-Termine abrufen (Sidebar im Tour-Edit-Dialog)
 *
 * Abgedeckte Regeln:
 * - Endpoint liefert 200 mit Array-Struktur bei gueltiger Tour-ID.
 * - Ungueltige tourId und ungueltiges fromDate liefern 400.
 * - Nicht existente Tour-ID liefert als IST ein leeres Array.
 *
 * Fehlerfaelle:
 * - Nicht numerische tourId.
 * - Falsches Datumsformat in fromDate.
 *
 * Ziel:
 * Das Serververhalten von /api/tours/:tourId/current-appointments fuer die Sidebar-Wiederverwendung absichern.
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
let counter = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

function nextSeq() {
  counter += 1;
  return counter;
}

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createProjectForTourTest() {
  const seq = nextSeq();
  const customer = await customersService.createCustomer({
    customerNumber: `TOUR-CUR-${Date.now()}-${seq}`,
    firstName: "Tour",
    lastName: `Customer-${seq}`,
    fullName: `Customer-${seq}, Tour`,
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
    name: `Tour Current Project ${seq}`,
    customerId: customer.id,
    orderNumber: `ORD-TOUR-CURR-${seq}`,
    descriptionMd: null,
    version: 1,
  });
}

describe("FT04 integration: tours current appointments", () => {
  it("returns 200 and array payload for valid tour id", async () => {
    const admin = await loginAdminAgent();
    const tour = await admin.post("/api/tours").send({ color: "#1188cc" }).expect(201);
    const project = await createProjectForTourTest();

    await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-06-20",
      tourId: tour.body.id,
      employeeIds: [],
    });

    await admin
      .get(`/api/tours/${tour.body.id}/current-appointments?fromDate=2000-01-01`)
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

  it("returns 400 for non-numeric tour id", async () => {
    const admin = await loginAdminAgent();
    await admin.get("/api/tours/not-a-number/current-appointments").expect(400);
  });

  it("returns 400 for invalid fromDate format", async () => {
    const admin = await loginAdminAgent();
    const tour = await admin.post("/api/tours").send({ color: "#334455" }).expect(201);

    await admin
      .get(`/api/tours/${tour.body.id}/current-appointments?fromDate=20-06-2099`)
      .expect(400);
  });

  it("returns 200 with empty array for non-existing tour id", async () => {
    const admin = await loginAdminAgent();

    await admin
      .get("/api/tours/999999/current-appointments?fromDate=2000-01-01")
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(0);
      });
  });
});
