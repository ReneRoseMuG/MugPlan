/**
 * Test Scope:
 *
 * Feature: FT21 - Dokumentextraktion und Kundenkonflikt-Aufloesung
 * Use Case: UC Projektanlage aus Doc-Extract bei neuer oder bereits vergebener Kundennummer
 *
 * Abgedeckte Regeln:
 * - Doc-Extract kann mit echter DB zu Customer-Resolve/Create und Project-Create verkettet werden.
 * - Bei bestehender Kundennummer wird der vorhandene Kunde verwendet und nur das Projekt neu angelegt.
 * - Bei Race-Conflict (CUSTOMER_NUMBER_CONFLICT) wird per erneutem Resolve auf bestehenden Kunden aufgeloest.
 * - Projektname wird serverseitig als reiner saunaModel-Name persistiert.
 * - Resolve multiple bleibt ein harter Abbruchpfad.
 *
 * Fehlerfaelle:
 * - Kundennummer mehrfach (multiple) bricht den Uebernahme-Flow deterministisch ab.
 * - Create-Customer-Konflikt ohne anschliessendes single-Resolve wird nicht still ignoriert.
 *
 * Ziel:
 * End-to-end-Absicherung des konfliktrobusten Doc-Extract-Projektflusses mit echter Test-DB.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import type { Customer, Project } from "@shared/schema";
import * as documentProcessingService from "../../../server/services/documentProcessingService";
import * as customersService from "../../../server/services/customersService";

type ResolvePayload = {
  resolution: "none" | "single" | "multiple";
  count: number;
  customer: Customer | null;
};

type ExtractionPayload = {
  customer: {
    customerNumber: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
    city: string | null;
  };
  orderNumber: string | null;
  saunaModel: string;
  articleItems: Array<{ quantity: string; description: string; category: string }>;
  categorizedItems: Array<{ category: string; items: Array<{ quantity: string; description: string; category: string }> }>;
  articleListHtml: string;
  warnings: string[];
};

let app: express.Express;
let counter = 1;

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

function buildExtractionPayload(customerNumber: string): ExtractionPayload {
  const local = counter++;
  return {
    customer: {
      customerNumber,
      firstName: "Doc",
      lastName: `Extract-${local}`,
      company: null,
      email: null,
      phone: null,
      addressLine1: "Musterstrasse 1",
      addressLine2: null,
      postalCode: "12345",
      city: "Musterstadt",
    },
    orderNumber: `A-FLOW-${local}`,
    saunaModel: `Sauna Flow ${local}`,
    articleItems: [{ quantity: "1x", description: "Ofen", category: "Artikel" }],
    categorizedItems: [{ category: "Artikel", items: [{ quantity: "1x", description: "Ofen", category: "Artikel" }] }],
    articleListHtml: "<ul><li>1x Ofen</li></ul>",
    warnings: [],
  };
}

async function resolveCustomer(agent: SuperAgentTest, customerNumber: string): Promise<ResolvePayload> {
  const response = await agent
    .post("/api/document-extraction/resolve-customer-by-number")
    .send({ customerNumber })
    .expect(200);
  return response.body as ResolvePayload;
}

async function runProjectAdoptionFlow(agent: SuperAgentTest, extraction: ExtractionPayload): Promise<{
  project: Project;
  customer: Customer;
  customerSource: "created" | "existing";
}> {
  vi.spyOn(documentProcessingService, "extractFromPdf").mockResolvedValueOnce(extraction);

  const extractResponse = await agent
    .post("/api/document-extraction/extract?scope=appointment_form")
    .attach("file", Buffer.from("%PDF-1.4\n%EOF"), {
      filename: "flow.pdf",
      contentType: "application/pdf",
    })
    .expect(200);

  const payload = extractResponse.body as ExtractionPayload;
  const customerNumber = payload.customer.customerNumber.trim();
  let customerSource: "created" | "existing" = "existing";
  let customer: Customer | null = null;

  const initialResolution = await resolveCustomer(agent, customerNumber);
  if (initialResolution.resolution === "multiple") {
    throw new Error("Dateninkonsistenz: Kundennummer ist mehrfach vorhanden. Prozess wurde abgebrochen.");
  }

  if (initialResolution.resolution === "single") {
    if (!initialResolution.customer) {
      throw new Error("Dateninkonsistenz: Vorhandener Kunde konnte nicht geladen werden.");
    }
    customer = initialResolution.customer;
    customerSource = "existing";
  } else {
    const createCustomerResponse = await agent
      .post("/api/customers")
      .send({
        customerNumber: payload.customer.customerNumber,
        firstName: payload.customer.firstName,
        lastName: payload.customer.lastName,
        company: payload.customer.company,
        email: payload.customer.email,
        phone: payload.customer.phone,
        addressLine1: payload.customer.addressLine1,
        addressLine2: payload.customer.addressLine2,
        postalCode: payload.customer.postalCode,
        city: payload.customer.city,
      });

    if (createCustomerResponse.status === 201) {
      customer = createCustomerResponse.body as Customer;
      customerSource = "created";
    } else if (createCustomerResponse.status === 409 && createCustomerResponse.body?.code === "CUSTOMER_NUMBER_CONFLICT") {
      const retryResolution = await resolveCustomer(agent, customerNumber);
      if (retryResolution.resolution !== "single" || !retryResolution.customer) {
        throw new Error("Kundennummer-Konflikt konnte nicht auf bestehenden Kunden aufgeloest werden.");
      }
      customer = retryResolution.customer;
      customerSource = "existing";
    } else {
      throw new Error(`Kunde konnte nicht angelegt werden (${createCustomerResponse.status})`);
    }
  }

  if (!customer) {
    throw new Error("Kein Kunde fuer Projektanlage aufgeloest.");
  }

  const createProjectResponse = await agent
    .post("/api/projects")
    .send({
      name: payload.saunaModel.trim(),
      orderNumber: payload.orderNumber,
      customerId: customer.id,
      descriptionMd: payload.articleListHtml,
    })
    .expect(201);

  return {
    project: createProjectResponse.body as Project,
    customer,
    customerSource,
  };
}

describe("FT21 integration: document extraction project conflict flow", () => {
  it("creates customer and project when customerNumber does not exist", async () => {
    const agent = await loginAdminAgent();
    const number = `FLOW-NEW-${Date.now()}`;
    const extraction = buildExtractionPayload(number);

    const result = await runProjectAdoptionFlow(agent, extraction);

    expect(result.customerSource).toBe("created");
    expect(result.customer.customerNumber).toBe(number);
    expect(result.project.customerId).toBe(result.customer.id);
    expect(result.project.orderNumber).toBe(extraction.orderNumber);
    expect(result.project.name).toBe(extraction.saunaModel);
  });

  it("uses existing customer and only creates a new project when customerNumber already exists", async () => {
    const agent = await loginAdminAgent();
    const number = `FLOW-EXIST-${Date.now()}`;
    const existingCustomerResponse = await agent
      .post("/api/customers")
      .send({ customerNumber: number })
      .expect(201);
    const existingCustomer = existingCustomerResponse.body as Customer;

    const extraction = buildExtractionPayload(number);
    const result = await runProjectAdoptionFlow(agent, extraction);

    expect(result.customerSource).toBe("existing");
    expect(result.customer.id).toBe(existingCustomer.id);
    expect(result.project.customerId).toBe(existingCustomer.id);
    expect(result.project.name).toBe(extraction.saunaModel);
  });

  it("resolves race conflict on customer create and still links project to existing customer", async () => {
    const agent = await loginAdminAgent();
    const number = `FLOW-RACE-${Date.now()}`;
    const extraction = buildExtractionPayload(number);

    vi.spyOn(documentProcessingService, "extractFromPdf").mockResolvedValueOnce(extraction);
    await agent
      .post("/api/document-extraction/extract?scope=appointment_form")
      .attach("file", Buffer.from("%PDF-1.4\n%EOF"), {
        filename: "flow-race.pdf",
        contentType: "application/pdf",
      })
      .expect(200);

    const before = await resolveCustomer(agent, number);
    expect(before.resolution).toBe("none");

    const existingCustomerResponse = await agent
      .post("/api/customers")
      .send({ customerNumber: number })
      .expect(201);
    const existingCustomer = existingCustomerResponse.body as Customer;

    const createConflict = await agent
      .post("/api/customers")
      .send({
        customerNumber: number,
        firstName: extraction.customer.firstName,
        lastName: extraction.customer.lastName,
      })
      .expect(409);
    expect(createConflict.body.code).toBe("CUSTOMER_NUMBER_CONFLICT");

    const after = await resolveCustomer(agent, number);
    expect(after.resolution).toBe("single");
    expect(after.customer?.id).toBe(existingCustomer.id);

    const projectResponse = await agent
      .post("/api/projects")
      .send({
        name: extraction.saunaModel,
        orderNumber: extraction.orderNumber,
        customerId: existingCustomer.id,
        descriptionMd: extraction.articleListHtml,
      })
      .expect(201);

    expect(projectResponse.body.customerId).toBe(existingCustomer.id);
    expect(projectResponse.body.orderNumber).toBe(extraction.orderNumber);
    expect(projectResponse.body.name).toBe(extraction.saunaModel);
  });

  it("aborts deterministically when resolve endpoint reports multiple", async () => {
    const agent = await loginAdminAgent();
    const number = `FLOW-MULTI-${Date.now()}`;
    const extraction = buildExtractionPayload(number);
    const fakeCustomer: Customer = {
      id: 991001,
      customerNumber: number,
      firstName: "A",
      lastName: "B",
      fullName: "B, A",
      company: null,
      email: null,
      phone: null,
      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      city: null,
      notesCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    vi.spyOn(customersService, "getCustomersByCustomerNumber").mockResolvedValueOnce([fakeCustomer, fakeCustomer]);

    vi.spyOn(documentProcessingService, "extractFromPdf").mockResolvedValueOnce(extraction);
    await agent
      .post("/api/document-extraction/extract?scope=appointment_form")
      .attach("file", Buffer.from("%PDF-1.4\n%EOF"), {
        filename: "flow-multiple.pdf",
        contentType: "application/pdf",
      })
      .expect(200);

    const resolution = await resolveCustomer(agent, number);
    expect(resolution.resolution).toBe("multiple");
    expect(resolution.customer).toBeNull();
  });
});
