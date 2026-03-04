/**
 * Test Scope:
 *
 * Feature: FT04 - Tourenverwaltung
 * Use Case: UC Mitarbeiter einer Tour zuweisen / entfernen
 *
 * Abgedeckte Regeln:
 * - Mitarbeiter koennen Touren zugewiesen und wieder entfernt werden.
 * - Explizites Setzen einer Mitarbeiterliste erfolgt ueber Assign-Calls; Leeren ueber Remove-Calls.
 * - Ein Mitarbeiter kann gleichzeitig nur einer Tour zugeordnet sein (Ablosung bei neuer Zuweisung).
 * - Entfernen des letzten Mitarbeiters fuehrt zu leerer Tour-Liste.
 *
 * Fehlerfaelle:
 * - Mehrfachzuweisung mit stale Version liefert VERSION_CONFLICT.
 * - Verhalten fuer deaktivierte Mitarbeiter wird als Ist-Zustand dokumentiert.
 *
 * Ziel:
 * FT04-Beziehungslogik Mitarbeiter <-> Tour serverseitig als Ist-Zustand absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";

let app: express.Express;
let employeeCounter = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

beforeEach(async () => {
  employeeCounter = 1;
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createTour(agent: SuperAgentTest, color: string) {
  const response = await agent.post("/api/tours").send({ color }).expect(201);
  return response.body as { id: number; version: number };
}

async function createEmployee(agent: SuperAgentTest) {
  const idx = employeeCounter++;
  const response = await agent
    .post("/api/employees")
    .send({
      firstName: `Emp-${idx}`,
      lastName: `FT04-${idx}`,
      phone: null,
      email: null,
    })
    .expect(201);
  return response.body as { id: number; version: number; tourId: number | null };
}

describe("FT04 integration: EmployeeTourRelationshipTests", () => {
  it("sets two employees on a tour and clears the list via remove operations", async () => {
    const admin = await loginAdminAgent();
    const tour = await createTour(admin, "#335577");
    const employeeA = await createEmployee(admin);
    const employeeB = await createEmployee(admin);

    const assigned = await admin
      .post(`/api/tours/${tour.id}/employees`)
      .send({
        items: [
          { employeeId: employeeA.id, version: employeeA.version },
          { employeeId: employeeB.id, version: employeeB.version },
        ],
      })
      .expect(200);

    const assignedA = assigned.body.find((entry: { id: number; version: number }) => entry.id === employeeA.id);
    const assignedB = assigned.body.find((entry: { id: number; version: number }) => entry.id === employeeB.id);
    expect(assignedA).toBeTruthy();
    expect(assignedB).toBeTruthy();
    expect(assignedA?.tourId).toBe(tour.id);
    expect(assignedB?.tourId).toBe(tour.id);

    await admin
      .delete(`/api/tours/${tour.id}/employees/${employeeA.id}`)
      .send({ version: assignedA!.version })
      .expect(200);
    await admin
      .delete(`/api/tours/${tour.id}/employees/${employeeB.id}`)
      .send({ version: assignedB!.version })
      .expect(200);

    await admin.get(`/api/tours/${tour.id}/employees`).expect(200).expect((res) => {
      expect(res.body).toHaveLength(0);
    });
  });

  it("assigns and removes an employee from a tour", async () => {
    const admin = await loginAdminAgent();
    const tour = await createTour(admin, "#1188aa");
    const employee = await createEmployee(admin);

    const assigned = await admin
      .post(`/api/tours/${tour.id}/employees`)
      .send({ items: [{ employeeId: employee.id, version: employee.version }] })
      .expect(200);

    expect(assigned.body).toHaveLength(1);
    expect(assigned.body[0].id).toBe(employee.id);
    expect(assigned.body[0].tourId).toBe(tour.id);

    await admin
      .delete(`/api/tours/${tour.id}/employees/${employee.id}`)
      .send({ version: assigned.body[0].version })
      .expect(200)
      .expect((res) => {
        expect(res.body.tourId).toBeNull();
      });
  });

  it("reassigns employee to another tour (single tour membership)", async () => {
    const admin = await loginAdminAgent();
    const tourA = await createTour(admin, "#aa4400");
    const tourB = await createTour(admin, "#00aa44");
    const employee = await createEmployee(admin);

    const firstAssign = await admin
      .post(`/api/tours/${tourA.id}/employees`)
      .send({ items: [{ employeeId: employee.id, version: employee.version }] })
      .expect(200);

    const firstVersion = firstAssign.body[0].version as number;

    await admin
      .post(`/api/tours/${tourB.id}/employees`)
      .send({ items: [{ employeeId: employee.id, version: firstVersion }] })
      .expect(200);

    await admin.get(`/api/tours/${tourA.id}/employees`).expect(200).expect((res) => {
      const ids = res.body.map((entry: { id: number }) => entry.id);
      expect(ids).not.toContain(employee.id);
    });

    await admin.get(`/api/tours/${tourB.id}/employees`).expect(200).expect((res) => {
      const ids = res.body.map((entry: { id: number }) => entry.id);
      expect(ids).toContain(employee.id);
    });
  });

  it("documents duplicate assignment attempt in one batch", async () => {
    const admin = await loginAdminAgent();
    const tour = await createTour(admin, "#5511aa");
    const employee = await createEmployee(admin);

    await admin
      .post(`/api/tours/${tour.id}/employees`)
      .send({
        items: [
          { employeeId: employee.id, version: employee.version },
          { employeeId: employee.id, version: employee.version },
        ],
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("VERSION_CONFLICT");
      });
  });

  it("keeps empty tour members list after removing the last employee", async () => {
    const admin = await loginAdminAgent();
    const tour = await createTour(admin, "#333399");
    const employee = await createEmployee(admin);

    const assigned = await admin
      .post(`/api/tours/${tour.id}/employees`)
      .send({ items: [{ employeeId: employee.id, version: employee.version }] })
      .expect(200);

    await admin
      .delete(`/api/tours/${tour.id}/employees/${employee.id}`)
      .send({ version: assigned.body[0].version })
      .expect(200);

    await admin.get(`/api/tours/${tour.id}/employees`).expect(200).expect((res) => {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });
  });

  it("documents assignment behavior for deactivated employees", async () => {
    const admin = await loginAdminAgent();
    const tour = await createTour(admin, "#009999");
    const employee = await createEmployee(admin);

    const deactivated = await admin
      .patch(`/api/employees/${employee.id}/active`)
      .send({ isActive: false, version: employee.version })
      .expect(200);

    await admin
      .post(`/api/tours/${tour.id}/employees`)
      .send({ items: [{ employeeId: employee.id, version: deactivated.body.version }] })
      .expect(200)
      .expect((res) => {
        expect(res.body[0].id).toBe(employee.id);
        expect(res.body[0].tourId).toBe(tour.id);
        expect(res.body[0].isActive).toBe(false);
      });
  });
});
