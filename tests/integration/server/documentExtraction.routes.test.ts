/**
 * Test Scope:
 *
 * Feature: FT20 - Dokumentextraktion
 * Use Case: UC PDF-Upload und Kundenauflösung über API-Routen
 *
 * Abgedeckte Regeln:
 * - Extract-Route validiert Scope, Dateityp und Fehlerpfade mit korrekten Statuscodes.
 * - Extract-Route liefert bei Erfolg die erwartete Extraktionsstruktur.
 * - Customer-Duplicate und Resolve-Routen liefern none/single/multiple korrekt.
 *
 * Fehlerfaelle:
 * - Ungueltiger Scope -> 400.
 * - Nicht-PDF Upload -> 400.
 * - Payload too large -> 413.
 * - Kein extrahierbarer Text -> 422.
 * - Strukturfehler aus KI/Validator -> 422.
 * - Unerwarteter Servicefehler -> 500.
 *
 * Ziel:
 * Vollstaendige API-Absicherung der Dokumentextraktionsrouten ohne Live-KI-Abhaengigkeit.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { resetDatabase } from "../../helpers/resetDatabase";
import * as documentProcessingService from "../../../server/services/documentProcessingService";
import * as multipart from "../../../server/lib/multipart";
import * as customersService from "../../../server/services/customersService";

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
  await resetDatabase();
  customerCounter = 1;
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

describe("FT20 integration: document extraction routes", () => {
  it("returns 400 for invalid extraction scope", async () => {
    const agent = await loginAdminAgent();
    await agent
      .post("/api/document-extraction/extract?scope=invalid_scope")
      .expect(400);
  });

  it("returns 400 for non-pdf uploads", async () => {
    const agent = await loginAdminAgent();
    await agent
      .post("/api/document-extraction/extract?scope=project_form")
      .attach("file", Buffer.from("plain text"), { filename: "not-a-pdf.txt", contentType: "text/plain" })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain("Nur PDF-Dokumente");
      });
  });

  it("returns 413 when multipart parser reports payload too large", async () => {
    const agent = await loginAdminAgent();
    vi.spyOn(multipart, "parseMultipartFile").mockRejectedValueOnce(new Error("Payload too large"));

    await agent
      .post("/api/document-extraction/extract?scope=project_form")
      .attach("file", Buffer.from("%PDF-1.4"), { filename: "sample.pdf", contentType: "application/pdf" })
      .expect(413);
  });

  it("returns 422 when extraction has no extractable text", async () => {
    const agent = await loginAdminAgent();
    vi.spyOn(documentProcessingService, "extractFromPdf").mockRejectedValueOnce(
      new Error("Das Dokument enthaelt keinen extrahierbaren Text."),
    );

    await agent
      .post("/api/document-extraction/extract?scope=project_form")
      .attach("file", Buffer.from("%PDF-1.4"), { filename: "sample.pdf", contentType: "application/pdf" })
      .expect(422)
      .expect((res) => {
        expect(res.body.field).toBe("file");
      });
  });

  it("returns 422 for validator structure errors (ZodError)", async () => {
    const agent = await loginAdminAgent();
    const zodError = new z.ZodError([
      {
        code: "custom",
        message: "customer.firstName invalid",
        path: ["customer", "firstName"],
      },
    ]);
    vi.spyOn(documentProcessingService, "extractFromPdf").mockRejectedValueOnce(zodError);

    await agent
      .post("/api/document-extraction/extract?scope=project_form")
      .attach("file", Buffer.from("%PDF-1.4"), { filename: "sample.pdf", contentType: "application/pdf" })
      .expect(422)
      .expect((res) => {
        expect(res.body.field).toBe("customer.firstName");
      });
  });

  it("returns 500 on unexpected service errors", async () => {
    const agent = await loginAdminAgent();
    vi.spyOn(documentProcessingService, "extractFromPdf").mockRejectedValueOnce(new Error("unexpected"));

    await agent
      .post("/api/document-extraction/extract?scope=project_form")
      .attach("file", Buffer.from("%PDF-1.4"), { filename: "sample.pdf", contentType: "application/pdf" })
      .expect(500);
  });

  it("returns normalized extraction on successful request", async () => {
    const agent = await loginAdminAgent();
    vi.spyOn(documentProcessingService, "extractFromPdf").mockResolvedValueOnce({
      customer: {
        customerNumber: "1001",
        firstName: "Erika",
        lastName: "Mustermann",
        company: null,
        email: null,
        phone: "123",
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        city: null,
      },
      saunaModel: "Sauna Pro",
      articleItems: [{ quantity: "1x", description: "Ofen", category: "Ofen" }],
      categorizedItems: [{ category: "Ofen", items: [{ quantity: "1x", description: "Ofen", category: "Ofen" }] }],
      articleListHtml: "<ul><li>Ofen</li></ul>",
      warnings: [],
    });

    await agent
      .post("/api/document-extraction/extract?scope=appointment_form")
      .attach("file", Buffer.from("%PDF-1.4"), { filename: "sample.pdf", contentType: "application/pdf" })
      .expect(200)
      .expect((res) => {
        expect(res.body.saunaModel).toBe("Sauna Pro");
        expect(res.body.customer.customerNumber).toBe("1001");
        expect(Array.isArray(res.body.articleItems)).toBe(true);
      });
  });

  it("returns duplicate=false/count=0 for missing customer number", async () => {
    const agent = await loginAdminAgent();
    await agent
      .post("/api/document-extraction/check-customer-duplicate")
      .send({ customerNumber: "404-X" })
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ duplicate: false, count: 0 });
      });
  });

  it("returns duplicate=true/count=1 for existing customer number", async () => {
    const agent = await loginAdminAgent();
    const suffix = customerCounter++;
    await customersService.createCustomer({
      customerNumber: `DUP-${suffix}`,
      firstName: "Test",
      lastName: `Kunde-${suffix}`,
      fullName: `Kunde-${suffix}, Test`,
      company: null,
      email: null,
      phone: "12345",
      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      city: null,
      version: 1,
    });

    await agent
      .post("/api/document-extraction/check-customer-duplicate")
      .send({ customerNumber: `DUP-${suffix}` })
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ duplicate: true, count: 1 });
      });
  });

  it("returns none/single/multiple in resolve-customer-by-number", async () => {
    const agent = await loginAdminAgent();
    const suffix = customerCounter++;
    const created = await customersService.createCustomer({
      customerNumber: `RES-${suffix}`,
      firstName: "A",
      lastName: "B",
      fullName: "B, A",
      company: null,
      email: null,
      phone: "12345",
      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      city: null,
      version: 1,
    });

    await agent
      .post("/api/document-extraction/resolve-customer-by-number")
      .send({ customerNumber: "NOT-FOUND" })
      .expect(200)
      .expect((res) => {
        expect(res.body.resolution).toBe("none");
      });

    await agent
      .post("/api/document-extraction/resolve-customer-by-number")
      .send({ customerNumber: `RES-${suffix}` })
      .expect(200)
      .expect((res) => {
        expect(res.body.resolution).toBe("single");
        expect(res.body.customer.id).toBe(created.id);
      });

    vi.spyOn(customersService, "getCustomersByCustomerNumber").mockResolvedValueOnce([created, created]);
    await agent
      .post("/api/document-extraction/resolve-customer-by-number")
      .send({ customerNumber: `RES-${suffix}` })
      .expect(200)
      .expect((res) => {
        expect(res.body.resolution).toBe("multiple");
        expect(res.body.customer).toBeNull();
      });
  });
});
