/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Direkttermine erscheinen in Kunden-, Kalender- und Terminlistenprojektionen.
 * - Direkttermine bleiben ueber customerId filterbar, auch wenn projectId null ist.
 * - Loeschen eines Direkttermins entfernt seine Mitarbeiter-Joins vollstaendig.
 *
 * Fehlerfaelle:
 * - Direkttermine fehlen in aggregierten Listen oder Kalenderdaten.
 * - Listen filtern nur projektgebundene Termine.
 * - Loeschen hinterlaesst verwaiste appointment_employee-Joins.
 *
 * Ziel:
 * Die wichtigsten Read- und Delete-Projektionen fuer Direkttermine ueber die oeffentlichen Endpunkte absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { appointmentEmployees } from "@shared/schema";
import { db } from "../../../server/db";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { registerRoutes } from "../../../server/routes";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createProjectFixture,
  resetTestDataFactoryState,
} from "../../helpers/testDataFactory";

let app: express.Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

beforeEach(() => {
  resetTestDataFactoryState();
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function fetchAppointmentVersion(agent: SuperAgentTest, appointmentId: number): Promise<number> {
  const response = await agent.get(`/api/appointments/${appointmentId}`).expect(200);
  return Number(response.body.version);
}

describe("FT01 integration: direct appointment projections", () => {
  it("includes direct appointments in customer scope=all alongside project appointments", async () => {
    const agent = await loginAdminAgent();
    const customer = await createCustomerFixture("DIR-LIST-CUST");
    const project = await createProjectFixture({
      prefix: "DIR-LIST-PROJ",
      customerId: customer.id,
    });
    const direct = await createAppointmentFixture({
      customerId: customer.id,
      startDate: "2099-06-01",
    });
    const projectBound = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-06-02",
    });

    const response = await agent.get(`/api/customers/${customer.id}/appointments?scope=all`).expect(200);
    const items = response.body as Array<{ id: number; projectId: number | null; customer: { id: number } }>;

    expect(items.map((item) => item.id).sort((a, b) => a - b)).toEqual([projectBound.id, direct.id].sort((a, b) => a - b));
    expect(items.find((item) => item.id === direct.id)).toMatchObject({
      id: direct.id,
      projectId: null,
      customer: { id: customer.id },
    });
  });

  it("includes direct appointments in the calendar aggregation", async () => {
    const agent = await loginAdminAgent();
    const customer = await createCustomerFixture("DIR-CALENDAR");
    const direct = await createAppointmentFixture({
      customerId: customer.id,
      startDate: "2099-07-03",
    });

    const response = await agent
      .get("/api/calendar/appointments?fromDate=2099-07-01&toDate=2099-07-31&detail=full")
      .expect(200);

    const items = response.body as Array<{ id: number; projectId: number | null; customer: { id: number } }>;
    expect(items.find((item) => item.id === direct.id)).toMatchObject({
      id: direct.id,
      projectId: null,
      customer: { id: customer.id },
    });
  });

  it("includes direct appointments in /api/appointments/list filtered by customerId", async () => {
    const agent = await loginAdminAgent();
    const customer = await createCustomerFixture("DIR-APPT-LIST");
    const foreignCustomer = await createCustomerFixture("DIR-APPT-LIST-FOREIGN");
    const direct = await createAppointmentFixture({
      customerId: customer.id,
      startDate: "2099-08-01",
    });
    await createAppointmentFixture({
      customerId: foreignCustomer.id,
      startDate: "2099-08-02",
    });

    const response = await agent
      .get(`/api/appointments/list?customerId=${customer.id}&page=1&pageSize=50`)
      .expect(200);

    const items = response.body.items as Array<{ id: number; projectId: number | null; customer: { id: number } }>;
    expect(items.map((item) => item.id)).toEqual([direct.id]);
    expect(items[0]).toMatchObject({
      id: direct.id,
      projectId: null,
      customer: { id: customer.id },
    });
  });

  it("removes appointment_employee joins when deleting a direct appointment", async () => {
    const agent = await loginAdminAgent();
    const customer = await createCustomerFixture("DIR-DELETE");
    const employee = await createEmployeeFixture("DIR-DELETE-EMP");
    const direct = await createAppointmentFixture({
      customerId: customer.id,
      startDate: "2099-09-01",
      employeeIds: [employee.id],
    });

    const beforeRows = await db
      .select()
      .from(appointmentEmployees)
      .where(eq(appointmentEmployees.appointmentId, direct.id));
    expect(beforeRows).toHaveLength(1);

    const version = await fetchAppointmentVersion(agent, direct.id);
    await agent.delete(`/api/appointments/${direct.id}`).send({ version }).expect(204);

    const afterRows = await db
      .select()
      .from(appointmentEmployees)
      .where(eq(appointmentEmployees.appointmentId, direct.id));
    expect(afterRows).toHaveLength(0);
  });
});
