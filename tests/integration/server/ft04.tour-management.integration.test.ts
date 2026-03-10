/**
 * Test Scope:
 *
 * Feature: FT04 - Tourenverwaltung
 * Use Case: UC Tour anlegen / bearbeiten / loeschen
 *
 * Abgedeckte Regeln:
 * - Tour-CRUD ueber API mit Versionierung fuer Update/Delete.
 * - Tour-Create folgt dem Contract: Name wird serverseitig erzeugt, Farbe hat Default.
 * - Tour-Create erzeugt keine impliziten Mitarbeiterzuweisungen.
 * - Mehrfache Farbaenderung erhoeht Version deterministisch.
 * - Tour-Delete ist gesperrt, solange Termine mit tour_id verknuepft sind.
 * - Loeschen einer Tour setzt employee.tourId auf NULL.
 * - Tour-Update veraendert referenzierte Termine nicht ausser fortbestehender tour_id-Verknuepfung.
 * - Nicht existierende Tour-IDs liefern NOT_FOUND.
 *
 * Fehlerfaelle:
 * - Unerlaubter Datentyp in Create-Payload liefert VALIDATION_ERROR.
 * - Loeschen bei verknuepften Terminen liefert BUSINESS_CONFLICT.
 * - Name-Felder in Requests werden aktuell nicht als editierbares Tourmerkmal verarbeitet.
 *
 * Ziel:
 * End-to-end-Absicherung der FT04-Loeschregeln inklusive Termin-Referenzschutz.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as appointmentsService from "../../../server/services/appointmentsService";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import { resetDatabase } from "../../helpers/resetDatabase";

let app: express.Express;
let employeeCounter = 1;
let customerCounter = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

beforeEach(async () => {
  await resetDatabase();
  employeeCounter = 1;
  customerCounter = 1;
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createEmployee(agent: SuperAgentTest) {
  const idx = employeeCounter++;
  const response = await agent
    .post("/api/employees")
    .send({
      firstName: `E${idx}`,
      lastName: `Tour-${idx}`,
      phone: null,
      email: null,
    })
    .expect(201);
  return response.body as { id: number; version: number; tourId: number | null };
}

async function createProjectForTourDeleteTest() {
  const customer = await customersService.createCustomer({
    customerNumber: `FT04-DEL-${customerCounter}`,
    firstName: "Test",
    lastName: `Tour-${customerCounter}`,
    fullName: `Tour-${customerCounter}, Test`,
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
    name: `FT04-TourDelete-${customerCounter}`,
    customerId: customer.id,
    orderNumber: `ORD-FT04-TOUR-${customerCounter}`,
    descriptionMd: null,
    version: 1,
  });
}

describe("FT04 integration: TourTests", () => {
  it("creates a tour with valid color", async () => {
    const admin = await loginAdminAgent();

    const response = await admin.post("/api/tours").send({ color: "#2255aa" }).expect(201);

    expect(response.body.id).toBeTypeOf("number");
    expect(response.body.name).toBe("Tour 1");
    expect(response.body.color).toBe("#2255aa");
    expect(response.body.version).toBe(1);
  });

  it("applies default color on empty create payload and rejects invalid color datatype", async () => {
    const admin = await loginAdminAgent();

    await admin.post("/api/tours").send({}).expect(201).expect((res) => {
      expect(res.body.color).toBe("#2563eb");
      expect(res.body.name).toMatch(/^Tour \d+$/);
    });

    await admin.post("/api/tours").send({ color: 123 }).expect(422).expect((res) => {
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });
  });

  it("creates a tour without employee payload and keeps member list empty", async () => {
    const admin = await loginAdminAgent();

    const created = await admin.post("/api/tours").send({ color: "#446688" }).expect(201);

    await admin.get(`/api/tours/${created.body.id}/employees`).expect(200).expect((res) => {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });
  });

  it("documents empty-name request handling on create", async () => {
    const admin = await loginAdminAgent();

    const response = await admin.post("/api/tours").send({ color: "#123456", name: "" }).expect(201);

    expect(response.body.name).toMatch(/^Tour \d+$/);
    expect(response.body.name).not.toBe("");
  });

  it("updates tour color repeatedly and persists after reload", async () => {
    const admin = await loginAdminAgent();
    const created = await admin.post("/api/tours").send({ color: "#111111" }).expect(201);

    const firstUpdate = await admin
      .patch(`/api/tours/${created.body.id}`)
      .send({ color: "#222222", version: created.body.version })
      .expect(200);

    const secondUpdate = await admin
      .patch(`/api/tours/${created.body.id}`)
      .send({ color: "#333333", version: firstUpdate.body.version })
      .expect(200);

    expect(firstUpdate.body.version).toBe(created.body.version + 1);
    expect(secondUpdate.body.version).toBe(firstUpdate.body.version + 1);

    const list = await admin.get("/api/tours").expect(200);
    const persisted = list.body.find((tour: { id: number }) => tour.id === created.body.id);

    expect(persisted).toBeTruthy();
    expect(persisted.color).toBe("#333333");
    expect(persisted.version).toBe(secondUpdate.body.version);
  });

  it("documents name-change attempt behavior on update", async () => {
    const admin = await loginAdminAgent();
    const created = await admin.post("/api/tours").send({ color: "#aabbcc" }).expect(201);

    const response = await admin
      .patch(`/api/tours/${created.body.id}`)
      .send({ color: "#ccbb11", version: created.body.version, name: "Umbennenung" })
      .expect(200);

    expect(response.body.name).toBe(created.body.name);
    expect(response.body.color).toBe("#ccbb11");
  });

  it("updates tour color without side effects on referenced appointment data", async () => {
    const admin = await loginAdminAgent();
    const tour = await admin.post("/api/tours").send({ color: "#cc8800" }).expect(201);
    const project = await createProjectForTourDeleteTest();

    const createdAppointment = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-02-15",
      endDate: "2099-02-16",
      startTime: "08:30",
      tourId: tour.body.id,
      employeeIds: [],
    });
    expect(createdAppointment).toBeTruthy();

    const appointmentId = (createdAppointment as { id: number }).id;

    const before = await admin.get(`/api/appointments/${appointmentId}`).expect(200);

    await admin
      .patch(`/api/tours/${tour.body.id}`)
      .send({ color: "#00aa99", version: tour.body.version })
      .expect(200);

    await admin.get(`/api/appointments/${appointmentId}`).expect(200).expect((res) => {
      expect(res.body.id).toBe(before.body.id);
      expect(res.body.version).toBe(before.body.version);
      expect(res.body.projectId).toBe(before.body.projectId);
      expect(res.body.startDate).toBe(before.body.startDate);
      expect(res.body.endDate).toBe(before.body.endDate);
      expect(res.body.startTime).toBe(before.body.startTime);
      expect(res.body.endTime).toBe(before.body.endTime);
      expect(res.body.tourId).toBe(before.body.tourId);
    });
  });

  it("deletes a tour and resets assigned employee tourId to null", async () => {
    const admin = await loginAdminAgent();
    const tour = await admin.post("/api/tours").send({ color: "#343434" }).expect(201);
    const employee = await createEmployee(admin);

    const assigned = await admin
      .post(`/api/tours/${tour.body.id}/employees`)
      .send({ items: [{ employeeId: employee.id, version: employee.version }] })
      .expect(200);

    const assignedEmployee = assigned.body.find((entry: { id: number }) => entry.id === employee.id);
    expect(assignedEmployee.tourId).toBe(tour.body.id);

    await admin.delete(`/api/tours/${tour.body.id}`).send({ version: tour.body.version }).expect(204);

    await admin.get(`/api/employees/${employee.id}`).expect(200).expect((res) => {
      expect(res.body.employee.tourId).toBeNull();
    });
  });

  it("returns BUSINESS_CONFLICT when deleting a tour that is referenced by appointments", async () => {
    const admin = await loginAdminAgent();
    const tour = await admin.post("/api/tours").send({ color: "#a0a0a0" }).expect(201);
    const project = await createProjectForTourDeleteTest();

    const appointment = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-01-10",
      tourId: tour.body.id,
      employeeIds: [],
    });
    expect(appointment).toBeTruthy();

    await admin.delete(`/api/tours/${tour.body.id}`).send({ version: tour.body.version }).expect(409).expect((res) => {
      expect(res.body.code).toBe("BUSINESS_CONFLICT");
    });

    await admin.get("/api/tours").expect(200).expect((res) => {
      expect(res.body.some((entry: { id: number }) => entry.id === tour.body.id)).toBe(true);
    });

    await admin.get(`/api/appointments/${(appointment as { id: number }).id}`).expect(200).expect((res) => {
      expect(res.body.tourId).toBe(tour.body.id);
    });
  });

  it("returns NOT_FOUND when deleting non-existing tour id", async () => {
    const admin = await loginAdminAgent();

    await admin.delete("/api/tours/999999").send({ version: 1 }).expect(404).expect((res) => {
      expect(res.body.code).toBe("NOT_FOUND");
    });
  });

  it("keeps generated names unique across multiple creates", async () => {
    const admin = await loginAdminAgent();

    await admin.post("/api/tours").send({ color: "#110000" }).expect(201);
    await admin.post("/api/tours").send({ color: "#220000" }).expect(201);
    await admin.post("/api/tours").send({ color: "#330000" }).expect(201);

    const list = await admin.get("/api/tours").expect(200);
    const names = list.body.map((tour: { name: string }) => tour.name);

    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(3);
    expect(names.every((name: string) => /^Tour \d+$/.test(name))).toBe(true);
  });
});
