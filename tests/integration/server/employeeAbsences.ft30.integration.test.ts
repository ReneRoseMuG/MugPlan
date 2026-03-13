/**
 * Test Scope:
 *
 * Feature: FT30 - Mitarbeiterabwesenheiten API
 *
 * Abgedeckte Regeln:
 * - FT30 bietet isoliertes CRUD fuer employee_absence im Mitarbeiterkontext.
 * - Die Relation employee -> employee_absence wird persistiert.
 * - ADMIN und DISPONENT duerfen FT30 nutzen, READER nicht.
 * - Update/Delete nutzen Optimistic Locking.
 * - Multi-User-Zugriffe auf dieselbe Abwesenheit liefern deterministische Konflikte.
 *
 * Fehlerfaelle:
 * - Vergangene oder ungueltige Datumsbereiche.
 * - READER-Zugriff.
 * - Stale Version bei paralleler Bearbeitung.
 *
 * Ziel:
 * Den isolierten FT30-API-Vertrag ohne Appointment-Bezug end-to-end absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { db } from "../../../server/db";
import { employeeAbsences } from "../../../shared/schema";
import { nextDeterministicToken } from "../../helpers/deterministic";
import {
  createEmployeeAbsenceFixture,
  createEmployeeFixture,
  getRelativeBerlinDate,
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

async function createRoleAgent(roleCode: "DISPATCHER" | "READER"): Promise<SuperAgentTest> {
  const username = `ft30-${roleCode.toLowerCase()}-${nextDeterministicToken("employee-absences-role")}`;
  const password = "test-password";
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "FT30",
    lastName: roleCode,
    passwordHash,
    roleCode,
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

describe("FT30 integration: employee absences", () => {
  it("creates, lists, gets, updates and deletes employee absences", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployeeFixture("FT30-CRUD");
    const from = getRelativeBerlinDate(2);
    const until = getRelativeBerlinDate(4);

    const created = await admin
      .post(`/api/employees/${employee.id}/absences`)
      .send({ type: "vacation", from, until })
      .expect(201);

    expect(created.body.employeeId).toBe(employee.id);
    expect(created.body.version).toBe(1);

    const [persisted] = await db
      .select()
      .from(employeeAbsences)
      .where(eq(employeeAbsences.id, created.body.id));
    expect(persisted?.employeeId).toBe(employee.id);

    await admin
      .get(`/api/employees/${employee.id}/absences`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe(created.body.id);
      });

    await admin
      .get(`/api/employees/${employee.id}/absences/${created.body.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.type).toBe("vacation");
      });

    const updated = await admin
      .put(`/api/employees/${employee.id}/absences/${created.body.id}`)
      .send({ version: created.body.version, type: "sick", until: getRelativeBerlinDate(5) })
      .expect(200);

    expect(updated.body.type).toBe("sick");
    expect(updated.body.version).toBe(2);

    await admin
      .delete(`/api/employees/${employee.id}/absences/${created.body.id}`)
      .send({ version: updated.body.version })
      .expect(204);

    await admin.get(`/api/employees/${employee.id}/absences`).expect(200).expect((res) => {
      expect(res.body).toHaveLength(0);
    });
  });

  it("allows DISPONENT and blocks READER", async () => {
    const employee = await createEmployeeFixture("FT30-ROLES");
    const dispatcher = await createRoleAgent("DISPATCHER");
    const reader = await createRoleAgent("READER");
    const payload = { type: "vacation", from: getRelativeBerlinDate(1), until: getRelativeBerlinDate(2) };

    await dispatcher.post(`/api/employees/${employee.id}/absences`).send(payload).expect(201);

    await reader.get(`/api/employees/${employee.id}/absences`).expect(403).expect((res) => {
      expect(res.body.code).toBe("FORBIDDEN");
    });

    await reader.post(`/api/employees/${employee.id}/absences`).send(payload).expect(403).expect((res) => {
      expect(res.body.code).toBe("FORBIDDEN");
    });
  });

  it("rejects invalid create dates", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployeeFixture("FT30-DATES");

    await admin
      .post(`/api/employees/${employee.id}/absences`)
      .send({ type: "vacation", from: getRelativeBerlinDate(-1), until: getRelativeBerlinDate(1) })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("VALIDATION_ERROR");
      });

    await admin
      .post(`/api/employees/${employee.id}/absences`)
      .send({ type: "vacation", from: getRelativeBerlinDate(3), until: getRelativeBerlinDate(2) })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("VALIDATION_ERROR");
      });
  });

  it("blocks update and delete once the absence start lies in the past", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployeeFixture("FT30-PAST");
    const absence = await createEmployeeAbsenceFixture({
      employeeId: employee.id,
      from: getRelativeBerlinDate(2),
      until: getRelativeBerlinDate(3),
    });

    await db
      .update(employeeAbsences)
      .set({ from: getRelativeBerlinDate(-2), until: getRelativeBerlinDate(-1) })
      .where(eq(employeeAbsences.id, absence.id));

    await admin
      .put(`/api/employees/${employee.id}/absences/${absence.id}`)
      .send({ version: absence.version, until: getRelativeBerlinDate(4) })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("VALIDATION_ERROR");
      });

    await admin
      .delete(`/api/employees/${employee.id}/absences/${absence.id}`)
      .send({ version: absence.version })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("VALIDATION_ERROR");
      });
  });

  it("returns VERSION_CONFLICT for concurrent updates on the same absence", async () => {
    const adminA = await loginAdminAgent();
    const adminB = await loginAdminAgent();
    const employee = await createEmployeeFixture("FT30-MULTI");
    const absence = await createEmployeeAbsenceFixture({
      employeeId: employee.id,
      from: getRelativeBerlinDate(2),
      until: getRelativeBerlinDate(3),
    });

    const snapshotA = await adminA.get(`/api/employees/${employee.id}/absences/${absence.id}`).expect(200);
    const snapshotB = await adminB.get(`/api/employees/${employee.id}/absences/${absence.id}`).expect(200);
    expect(snapshotA.body.version).toBe(snapshotB.body.version);

    const [resA, resB] = await Promise.all([
      adminA.put(`/api/employees/${employee.id}/absences/${absence.id}`).send({
        version: snapshotA.body.version,
        until: getRelativeBerlinDate(4),
      }),
      adminB.put(`/api/employees/${employee.id}/absences/${absence.id}`).send({
        version: snapshotB.body.version,
        type: "sick",
      }),
    ]);

    const statuses = [resA.status, resB.status].sort((left, right) => left - right);
    expect(statuses).toEqual([200, 409]);
  });
});
