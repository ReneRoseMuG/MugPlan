/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Direkttermine duerfen mit customerId ohne projectId erstellt und aktualisiert werden.
 * - Bei gesetzter projectId wird customerId aus dem Projekt abgeleitet und gegen mitgesendete Werte validiert.
 * - Projektwechsel und Projektentfernung halten die Termin-Kundenbeziehung konsistent.
 *
 * Fehlerfaelle:
 * - Termin ohne projectId und ohne customerId wird akzeptiert.
 * - Termin mit projectId und fremder customerId wird akzeptiert.
 * - Projektentfernung oder Kundenwechsel hinterlaesst eine inkonsistente Relation.
 *
 * Ziel:
 * Die aktuelle Fachregel fuer Direkttermine und projektgebundene Termine ueber die oeffentlichen Appointment-Endpunkte regressionssicher absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { errorHandler } from "../../../server/middleware/errorHandler";
import { registerRoutes } from "../../../server/routes";
import {
  createAppointmentFixture,
  createCustomerFixture,
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

async function fetchAppointment(agent: SuperAgentTest, appointmentId: number) {
  const response = await agent.get(`/api/appointments/${appointmentId}`).expect(200);
  return response.body as {
    id: number;
    version: number;
    projectId: number | null;
    customerId: number;
    startDate: string;
    startTime: string | null;
    tourId: number | null;
    employees: Array<{ id: number }>;
  };
}

describe("FT01 integration: direct appointment relation rules", () => {
  it("creates a direct appointment with customer only", async () => {
    const agent = await loginAdminAgent();
    const customer = await createCustomerFixture("DIR-CREATE");

    const response = await agent.post("/api/appointments").send({
      customerId: customer.id,
      startDate: "2099-05-01",
      employeeIds: [],
    }).expect(201);

    expect(response.body).toMatchObject({
      projectId: null,
      customerId: customer.id,
    });
    expect(String(response.body.startDate)).toContain("2099-05-01");
  });

  it("rejects create when project and customer are both missing", async () => {
    const agent = await loginAdminAgent();

    const response = await agent.post("/api/appointments").send({
      startDate: "2099-05-01",
      employeeIds: [],
    }).expect(422);

    expect(response.body).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("derives customer from project when only projectId is sent", async () => {
    const agent = await loginAdminAgent();
    const project = await createProjectFixture({ prefix: "DIR-PROJ-ONLY" });

    const response = await agent.post("/api/appointments").send({
      projectId: project.id,
      startDate: "2099-05-02",
      employeeIds: [],
    }).expect(201);

    expect(response.body).toMatchObject({
      projectId: project.id,
      customerId: project.customerId,
    });
  });

  it("accepts matching customerId together with projectId", async () => {
    const agent = await loginAdminAgent();
    const project = await createProjectFixture({ prefix: "DIR-MATCH" });

    const response = await agent.post("/api/appointments").send({
      projectId: project.id,
      customerId: project.customerId,
      startDate: "2099-05-03",
      employeeIds: [],
    }).expect(201);

    expect(response.body).toMatchObject({
      projectId: project.id,
      customerId: project.customerId,
    });
  });

  it("rejects mismatching customerId for a project appointment", async () => {
    const agent = await loginAdminAgent();
    const project = await createProjectFixture({ prefix: "DIR-MISMATCH-PROJ" });
    const foreignCustomer = await createCustomerFixture("DIR-MISMATCH-CUST");

    const response = await agent.post("/api/appointments").send({
      projectId: project.id,
      customerId: foreignCustomer.id,
      startDate: "2099-05-04",
      employeeIds: [],
    }).expect(422);

    expect(response.body).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("assigns a same-customer project to an existing direct appointment", async () => {
    const agent = await loginAdminAgent();
    const customer = await createCustomerFixture("DIR-UPD-SAME");
    const project = await createProjectFixture({
      prefix: "DIR-UPD-SAME-PROJ",
      customerId: customer.id,
    });
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: "2099-05-05",
    });
    const before = await fetchAppointment(agent, appointment.id);

    const response = await agent.patch(`/api/appointments/${appointment.id}`).send({
      version: before.version,
      projectId: project.id,
      startDate: before.startDate,
      startTime: before.startTime,
      tourId: before.tourId,
      employeeIds: [],
    }).expect(200);

    expect(response.body).toMatchObject({
      id: appointment.id,
      projectId: project.id,
      customerId: customer.id,
    });
  });

  it("rebinds customer to the project's customer when assigning a foreign-customer project", async () => {
    const agent = await loginAdminAgent();
    const customer = await createCustomerFixture("DIR-UPD-FOREIGN");
    const foreignProject = await createProjectFixture({ prefix: "DIR-UPD-FOREIGN-PROJ" });
    const appointment = await createAppointmentFixture({
      customerId: customer.id,
      startDate: "2099-05-06",
    });
    const before = await fetchAppointment(agent, appointment.id);

    const response = await agent.patch(`/api/appointments/${appointment.id}`).send({
      version: before.version,
      projectId: foreignProject.id,
      startDate: before.startDate,
      startTime: before.startTime,
      tourId: before.tourId,
      employeeIds: [],
    }).expect(200);

    expect(response.body).toMatchObject({
      projectId: foreignProject.id,
      customerId: foreignProject.customerId,
    });
    expect(response.body.customerId).not.toBe(customer.id);
  });

  it("removes projectId on update and keeps the derived customer", async () => {
    const agent = await loginAdminAgent();
    const project = await createProjectFixture({ prefix: "DIR-REMOVE-PROJ" });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-05-07",
    });
    const before = await fetchAppointment(agent, appointment.id);

    const response = await agent.patch(`/api/appointments/${appointment.id}`).send({
      version: before.version,
      projectId: null,
      customerId: project.customerId,
      startDate: before.startDate,
      startTime: before.startTime,
      tourId: before.tourId,
      employeeIds: [],
    }).expect(200);

    expect(response.body).toMatchObject({
      projectId: null,
      customerId: project.customerId,
    });
  });

  it("changes customer on a direct appointment without project", async () => {
    const agent = await loginAdminAgent();
    const originalCustomer = await createCustomerFixture("DIR-CHANGE-OLD");
    const nextCustomer = await createCustomerFixture("DIR-CHANGE-NEW");
    const appointment = await createAppointmentFixture({
      customerId: originalCustomer.id,
      startDate: "2099-05-08",
    });
    const before = await fetchAppointment(agent, appointment.id);

    const response = await agent.patch(`/api/appointments/${appointment.id}`).send({
      version: before.version,
      projectId: null,
      customerId: nextCustomer.id,
      startDate: before.startDate,
      startTime: before.startTime,
      tourId: before.tourId,
      employeeIds: [],
    }).expect(200);

    expect(response.body).toMatchObject({
      projectId: null,
      customerId: nextCustomer.id,
    });
  });

  it("rejects changing customer on a project appointment to a foreign customer", async () => {
    const agent = await loginAdminAgent();
    const project = await createProjectFixture({ prefix: "DIR-UPD-MISMATCH" });
    const foreignCustomer = await createCustomerFixture("DIR-UPD-MISMATCH-CUST");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-05-09",
    });
    const before = await fetchAppointment(agent, appointment.id);

    const response = await agent.patch(`/api/appointments/${appointment.id}`).send({
      version: before.version,
      projectId: project.id,
      customerId: foreignCustomer.id,
      startDate: before.startDate,
      startTime: before.startTime,
      tourId: before.tourId,
      employeeIds: [],
    }).expect(422);

    expect(response.body).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
