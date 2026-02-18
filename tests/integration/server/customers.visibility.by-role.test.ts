/**
 * Test Scope:
 *
 * Feature: FT05+ - Rollenbasierte Aktivitaets-Sichtbarkeit
 * Use Case: UC Kundenlisten und Kundendetail nach Rolle
 *
 * Abgedeckte Regeln:
 * - Nicht-Admin sieht bei Kundenlisten nur aktive Kunden, auch bei angefragtem inactive-Scope.
 * - Admin kann aktive und inaktive Kunden explizit ueber Scope abrufen.
 * - Nicht-Admin erhaelt auf inaktive Kundendetails ein 404.
 * - Nicht-Admin darf den Aktiv-Status eines Kunden nicht aendern.
 *
 * Fehlerfaelle:
 * - Nicht-Admin update mit isActive liefert FORBIDDEN.
 * - Inaktiver Kundendetailzugriff fuer Nicht-Admin liefert NOT_FOUND.
 *
 * Ziel:
 * End-to-end-Absicherung der FT05+-Sichtbarkeits- und Berechtigungsregeln fuer Kunden.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersService from "../../../server/services/customersService";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";

let app: express.Express;
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
  customerCounter = 1;
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

async function createCustomerPair() {
  const activeCustomer = await customersService.createCustomer({
    customerNumber: `C-ACT-${customerCounter}`,
    firstName: "Aktiv",
    lastName: `Kunde-${customerCounter}`,
    fullName: `Kunde-${customerCounter}, Aktiv`,
    company: null,
    email: null,
    phone: "11111",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });
  customerCounter += 1;

  const createdInactive = await customersService.createCustomer({
    customerNumber: `C-INACT-${customerCounter}`,
    firstName: "Inaktiv",
    lastName: `Kunde-${customerCounter}`,
    fullName: `Kunde-${customerCounter}, Inaktiv`,
    company: null,
    email: null,
    phone: "22222",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });
  customerCounter += 1;

  const inactiveCustomer = await customersService.updateCustomer(
    createdInactive.id,
    { isActive: false, version: createdInactive.version },
    "ADMIN",
  );
  if (!inactiveCustomer) {
    throw new Error("Expected inactive customer to be updated");
  }

  return { activeCustomer, inactiveCustomer };
}

describe("FT05+ integration: customers visibility by role", () => {
  it("keeps non-admin customer list on active scope even when inactive is requested", async () => {
    const dispatcher = await createDispatcherAgent();
    const { activeCustomer, inactiveCustomer } = await createCustomerPair();

    await dispatcher
      .get("/api/customers?scope=inactive")
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        const ids = res.body.map((entry: { id: number }) => entry.id);
        expect(ids).toContain(activeCustomer.id);
        expect(ids).not.toContain(inactiveCustomer.id);
      });
  });

  it("returns active or inactive customer list for admin based on scope", async () => {
    const admin = await loginAgent("test-admin", "test-admin-password");
    const { activeCustomer, inactiveCustomer } = await createCustomerPair();

    await admin
      .get("/api/customers?scope=active")
      .expect(200)
      .expect((res) => {
        const ids = res.body.map((entry: { id: number }) => entry.id);
        expect(ids).toContain(activeCustomer.id);
        expect(ids).not.toContain(inactiveCustomer.id);
      });

    await admin
      .get("/api/customers?scope=inactive")
      .expect(200)
      .expect((res) => {
        const ids = res.body.map((entry: { id: number }) => entry.id);
        expect(ids).toContain(inactiveCustomer.id);
        expect(ids).not.toContain(activeCustomer.id);
      });
  });

  it("returns 404 for non-admin customer detail when customer is inactive", async () => {
    const dispatcher = await createDispatcherAgent();
    const { inactiveCustomer } = await createCustomerPair();

    await dispatcher
      .get(`/api/customers/${inactiveCustomer.id}`)
      .expect(404);
  });

  it("returns 403 FORBIDDEN when non-admin tries to change customer isActive", async () => {
    const dispatcher = await createDispatcherAgent();
    const { activeCustomer } = await createCustomerPair();

    await dispatcher
      .patch(`/api/customers/${activeCustomer.id}`)
      .send({ version: activeCustomer.version, isActive: false })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });
});
