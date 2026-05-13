/**
 * Test Scope:
 *
 * Feature: FT19 - Customer Attachments
 * Use Case: UC 19/01 Customer-Anhaenge verwalten
 *
 * Abgedeckte Regeln:
 * - Attachments koennen fuer Kunden hochgeladen, gelistet und heruntergeladen werden.
 * - Upload prueft customerId-Parameter sowie Payload-Groesse.
 * - Download auf unbekannte Attachment-ID liefert 404.
 *
 * Fehlerfaelle:
 * - Ungueltige customerId liefert 400.
 * - Zu grosse Datei liefert 413.
 *
 * Ziel:
 * Customer-Attachment-Flow als gruene Ist-Suite absichern, ohne bekannte Soll-Luecke
 * fuer Upload auf unbekannten Parent als Red-Test in die Suite zu uebernehmen.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersService from "../../../server/services/customersService";

let app: express.Express;
let seq = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username: "test-admin", password: "test-admin-password" })
    .expect(200);
  return agent;
}

async function createCustomerForAttachments() {
  const token = `FT19-CUST-ATT-${Date.now()}-${seq++}`;
  return customersService.createCustomer({
    customerNumber: token,
    firstName: "Attach",
    lastName: token,
    fullName: `${token}, Attach`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });
}

describe("FT19 integration: customer attachments", () => {
  it("uploads, lists and downloads customer attachment", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomerForAttachments();

    const initial = await admin.get(`/api/customers/${customer.id}/attachments`).expect(200);
    expect(Array.isArray(initial.body)).toBe(true);
    expect(initial.body).toHaveLength(0);

    const upload = await admin
      .post(`/api/customers/${customer.id}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4 customer"), "kundenangebot.pdf")
      .expect(201);

    const attachmentId = Number(upload.body.id);
    expect(Number.isInteger(attachmentId)).toBe(true);
    expect(upload.body.customerId).toBe(customer.id);

    await admin
      .get(`/api/customers/${customer.id}/attachments`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe(attachmentId);
      });

    await admin
      .get(`/api/customer-attachments/${attachmentId}/download`)
      .expect(200)
      .expect((res) => {
        expect(String(res.headers["content-type"] ?? "")).toContain("application/pdf");
        expect(String(res.headers["content-disposition"] ?? "")).toContain("inline");
      });

    await admin
      .get(`/api/customer-attachments/${attachmentId}/download?download=1`)
      .expect(200)
      .expect((res) => {
        expect(String(res.headers["content-type"] ?? "")).toContain("application/pdf");
        expect(String(res.headers["content-disposition"] ?? "")).toContain("attachment");
      });
  });

  it("returns 400 for invalid customerId in list and create routes", async () => {
    const admin = await loginAdminAgent();

    await admin.get("/api/customers/not-a-number/attachments").expect(400);
    await admin
      .post("/api/customers/not-a-number/attachments")
      .attach("file", Buffer.from("x"), "x.txt")
      .expect(400);
  });

  it("returns 413 for oversized upload payload", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomerForAttachments();
    const tooLarge = Buffer.alloc(10 * 1024 * 1024 + 1, 1);

    await admin
      .post(`/api/customers/${customer.id}/attachments`)
      .attach("file", tooLarge, "too-large.bin")
      .expect(413);
  });

  it("returns 404 for unknown customer attachment download id", async () => {
    const admin = await loginAdminAgent();
    await admin.get("/api/customer-attachments/999999999/download").expect(404);
  });
});
