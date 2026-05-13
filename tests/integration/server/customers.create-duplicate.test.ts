/**
 * Test Scope:
 *
 * Feature: FT21 - Kundenanlage Duplicate-Fehlercode
 * Use Case: UC API-Controller mappt Kundennummer-Duplikat auf 409-Code
 *
 * Abgedeckte Regeln:
 * - customersController.createCustomer gibt bei CustomersError den Service-Code durch.
 * - CUSTOMER_NUMBER_CONFLICT wird als 409 mit code-Body ausgeliefert.
 *
 * Fehlerfaelle:
 * - Duplicate-Fehler wird als generischer 500 behandelt.
 *
 * Ziel:
 * Sicherstellen, dass die API Duplicate-Kundennummern fachlich konsistent meldet.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersService from "../../../server/services/customersService";
import { hashPassword } from "../../../server/security/passwordHash";
import { createUser } from "../../../server/repositories/usersRepository";

let app: express.Express;
let roleUserCounter = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username: "test-admin", password: "test-admin-password" })
    .expect(200);
  return agent;
}

async function loginRoleAgent(roleCode: "DISPATCHER" | "READER"): Promise<SuperAgentTest> {
  const suffix = `customers-role-${roleCode.toLowerCase()}-${roleUserCounter++}`;
  const password = `${suffix}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username: suffix,
    email: `${suffix}@example.test`,
    firstName: roleCode === "DISPATCHER" ? "Disponent" : "Leser",
    lastName: "Customers",
    passwordHash,
    roleCode,
  });
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: suffix, password }).expect(200);
  return agent;
}

describe("FT21 integration: customers create duplicate mapping", () => {
  it("creates customer with only customerNumber and supports patching optional fields to null", async () => {
    const agent = await loginAdminAgent();

    const createRes = await agent
      .post("/api/customers")
      .send({
        customerNumber: `NULLABLE-${Date.now()}`,
      })
      .expect(201);

    expect(createRes.body.customerNumber).toMatch(/^NULLABLE-/);
    expect(createRes.body.firstName).toBeNull();
    expect(createRes.body.lastName).toBeNull();
    expect(createRes.body.fullName).toBeNull();
    expect(createRes.body.phone).toBeNull();

    const patchRes = await agent
      .patch(`/api/customers/${createRes.body.id}`)
      .send({
        version: createRes.body.version,
        firstName: null,
        lastName: null,
        company: null,
        phone: null,
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        city: null,
      })
      .expect(200);

    expect(patchRes.body.firstName).toBeNull();
    expect(patchRes.body.lastName).toBeNull();
    expect(patchRes.body.fullName).toBeNull();
    expect(patchRes.body.company).toBeNull();
    expect(patchRes.body.phone).toBeNull();
    expect(patchRes.body.addressLine1).toBeNull();
  });

  it("returns 409 CUSTOMER_NUMBER_CONFLICT when service reports duplicate", async () => {
    const agent = await loginAdminAgent();
    vi.spyOn(customersService, "createCustomer").mockRejectedValueOnce(
      new customersService.CustomersError(409, "CUSTOMER_NUMBER_CONFLICT"),
    );

    await agent
      .post("/api/customers")
      .send({
        customerNumber: "1001",
        firstName: "Erika",
        lastName: "Muster",
        phone: "123",
        company: null,
        email: null,
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        city: null,
        version: 1,
      })
      .expect(409)
      .expect((res) => {
        expect(res.body).toEqual({ code: "CUSTOMER_NUMBER_CONFLICT" });
      });
  });

  it("returns 409 CUSTOMER_NUMBER_CONFLICT for a real duplicate customer number insert", async () => {
    const agent = await loginAdminAgent();
    const customerNumber = `DUP-${Date.now()}`;

    await agent
      .post("/api/customers")
      .send({ customerNumber })
      .expect(201);

    await agent
      .post("/api/customers")
      .send({ customerNumber })
      .expect(409)
      .expect((res) => {
        expect(res.body).toEqual({ code: "CUSTOMER_NUMBER_CONFLICT" });
      });
  });

  it("guards customer create and patch by role", async () => {
    const admin = await loginAdminAgent();
    const dispatcher = await loginRoleAgent("DISPATCHER");
    const reader = await loginRoleAgent("READER");

    await request(app)
      .post("/api/customers")
      .send({ customerNumber: `ANON-${Date.now()}` })
      .expect(401);

    await reader
      .post("/api/customers")
      .send({ customerNumber: `READER-${Date.now()}` })
      .expect(403);

    const dispatcherCreate = await dispatcher
      .post("/api/customers")
      .send({ customerNumber: `DISP-${Date.now()}` })
      .expect(201);

    const adminCreate = await admin
      .post("/api/customers")
      .send({ customerNumber: `ADMIN-${Date.now()}`, firstName: null })
      .expect(201);

    await reader
      .patch(`/api/customers/${adminCreate.body.id}`)
      .send({ version: adminCreate.body.version, firstName: "Nicht erlaubt" })
      .expect(403);

    const dispatcherPatch = await dispatcher
      .patch(`/api/customers/${dispatcherCreate.body.id}`)
      .send({ version: dispatcherCreate.body.version, firstName: "Ergänzt" })
      .expect(200);

    expect(dispatcherPatch.body.firstName).toBe("Ergänzt");
  });
});
