/**
 * Test Scope:
 *
 * Feature: FT05+ - Rollenbasierte Aktivitaets-Sichtbarkeit
 * Use Case: UC Mitarbeiterlisten und Mitarbeiterdetail nach Rolle
 *
 * Abgedeckte Regeln:
 * - Nicht-Admin sieht bei Mitarbeiterlisten nur aktive Mitarbeiter, auch bei angefragtem inactive-Scope.
 * - Admin kann aktive und inaktive Mitarbeiter explizit ueber Scope abrufen.
 * - Nicht-Admin erhaelt auf inaktive Mitarbeiterdetails ein 404.
 * - Toggle des Aktiv-Status ist nur fuer Admin erlaubt.
 *
 * Fehlerfaelle:
 * - Nicht-Admin toggleActive liefert FORBIDDEN.
 * - Inaktiver Mitarbeiterdetailzugriff fuer Nicht-Admin liefert NOT_FOUND.
 *
 * Ziel:
 * End-to-end-Absicherung der FT05+-Sichtbarkeits- und Berechtigungsregeln fuer Mitarbeiter.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as employeesService from "../../../server/services/employeesService";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";

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

async function loginAgent(username: string, password: string): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username, password })
    .expect(200);
  return agent;
}

async function createDispatcherAgent(): Promise<SuperAgentTest> {
  const username = "test-dispatcher";
  const password = "test-dispatcher-password";
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: "test-dispatcher@local.test",
    firstName: "Test",
    lastName: "Dispatcher",
    passwordHash,
    roleCode: "DISPATCHER",
  });
  return loginAgent(username, password);
}

async function createEmployeePair() {
  const activeEmployee = await employeesService.createEmployee({
    firstName: "Aktiv",
    lastName: `Mitarbeiter-${employeeCounter}`,
    fullName: `Mitarbeiter-${employeeCounter}, Aktiv`,
    phone: null,
    email: null,
    version: 1,
  });
  employeeCounter += 1;

  const createdInactive = await employeesService.createEmployee({
    firstName: "Inaktiv",
    lastName: `Mitarbeiter-${employeeCounter}`,
    fullName: `Mitarbeiter-${employeeCounter}, Inaktiv`,
    phone: null,
    email: null,
    version: 1,
  });
  employeeCounter += 1;

  const inactiveEmployee = await employeesService.updateEmployee(
    createdInactive.id,
    { isActive: false, version: createdInactive.version },
    "ADMIN",
  );
  if (!inactiveEmployee) {
    throw new Error("Expected inactive employee to be updated");
  }

  return { activeEmployee, inactiveEmployee };
}

describe("FT05+ integration: employees visibility by role", () => {
  it("keeps non-admin employee list on active scope even when inactive is requested", async () => {
    const dispatcher = await createDispatcherAgent();
    const { activeEmployee, inactiveEmployee } = await createEmployeePair();

    await dispatcher
      .get("/api/employees?scope=inactive")
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        const ids = res.body.map((entry: { id: number }) => entry.id);
        expect(ids).toContain(activeEmployee.id);
        expect(ids).not.toContain(inactiveEmployee.id);
      });
  });

  it("returns active or inactive employee list for admin based on scope", async () => {
    const admin = await loginAgent("test-admin", "test-admin-password");
    const { activeEmployee, inactiveEmployee } = await createEmployeePair();

    await admin
      .get("/api/employees?scope=active")
      .expect(200)
      .expect((res) => {
        const ids = res.body.map((entry: { id: number }) => entry.id);
        expect(ids).toContain(activeEmployee.id);
        expect(ids).not.toContain(inactiveEmployee.id);
      });

    await admin
      .get("/api/employees?scope=inactive")
      .expect(200)
      .expect((res) => {
        const ids = res.body.map((entry: { id: number }) => entry.id);
        expect(ids).toContain(inactiveEmployee.id);
        expect(ids).not.toContain(activeEmployee.id);
      });
  });

  it("returns 404 for non-admin employee detail when employee is inactive", async () => {
    const dispatcher = await createDispatcherAgent();
    const { inactiveEmployee } = await createEmployeePair();

    await dispatcher
      .get(`/api/employees/${inactiveEmployee.id}`)
      .expect(404);
  });

  it("returns 403 FORBIDDEN when non-admin tries to toggle employee isActive", async () => {
    const dispatcher = await createDispatcherAgent();
    const { activeEmployee } = await createEmployeePair();

    await dispatcher
      .patch(`/api/employees/${activeEmployee.id}/active`)
      .send({ version: activeEmployee.version, isActive: false })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });
});
