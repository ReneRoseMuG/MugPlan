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

let app: express.Express;

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
});
