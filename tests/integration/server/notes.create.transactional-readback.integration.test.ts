/**
 * Test Scope:
 *
 * Feature: FT09/FT13 - Notizen an Kunde/Projekt
 * Use Case: UC Notiz erstellen im Kundenformular und Projektformular
 *
 * Abgedeckte Regeln:
 * - Create-Endpoints fuer Kunden- und Projektnotizen liefern bei gueltigem Kontext 201 inkl. Notizdaten.
 * - Notiz-Create antwortet 404 bei nicht existierender Zielentitaet.
 * - Notiz-Create antwortet 404 bei nicht existierender Notizvorlage.
 *
 * Fehlerfaelle:
 * - Zielkunde oder Zielprojekt existiert nicht.
 * - templateId verweist auf keine vorhandene Notizvorlage.
 *
 * Ziel:
 * Absicherung des transaktionskonsistenten Create-Readback-Verhaltens fuer Notizen inkl. zentraler 404-Regressionen.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { nextDeterministicToken } from "../../helpers/deterministic";

let app: express.Express;

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

async function createCustomer(agent: SuperAgentTest): Promise<number> {
  const token = nextDeterministicToken("notes-create-customer");
  const res = await agent
    .post("/api/customers")
    .send({
      customerNumber: `NOTE-${token}`,
      firstName: "Note",
      lastName: "Customer",
      company: null,
      email: null,
      phone: null,
      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      city: null,
      version: 1,
    })
    .expect(201);
  return Number(res.body.id);
}

async function createProject(agent: SuperAgentTest, customerId: number): Promise<number> {
  const res = await agent
    .post("/api/projects")
    .send({
      name: `Projekt ${nextDeterministicToken("notes-create-project")}`,
      customerId,
      descriptionMd: null,
      orderNumber: null,
      version: 1,
    })
    .expect(201);
  return Number(res.body.id);
}

describe("FT09/FT13 integration: notes create transactional readback", () => {
  it("returns 422 VALIDATION_ERROR when creating customer note without title", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent);

    await agent
      .post(`/api/customers/${customerId}/notes`)
      .send({
        body: "<p>Inhalt</p>",
      })
      .expect(422)
      .expect((res) => {
        expect(res.body).toEqual({ code: "VALIDATION_ERROR" });
      });
  });

  it("returns 422 VALIDATION_ERROR when creating customer note without body", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent);

    await agent
      .post(`/api/customers/${customerId}/notes`)
      .send({
        title: "Neue Kundennotiz",
      })
      .expect(422)
      .expect((res) => {
        expect(res.body).toEqual({ code: "VALIDATION_ERROR" });
      });
  });

  it("creates customer note and returns 201 with persisted note payload", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent);

    const response = await agent
      .post(`/api/customers/${customerId}/notes`)
      .send({
        title: "Neue Kundennotiz",
        body: "<p>Inhalt</p>",
      })
      .expect(201);

    expect(response.body.id).toEqual(expect.any(Number));
    expect(response.body.title).toBe("Neue Kundennotiz");
    expect(response.body.body).toBe("<p>Inhalt</p>");
    expect(response.body.version).toBeGreaterThanOrEqual(1);
  });

  it("creates project note and returns 201 with persisted note payload", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent);
    const projectId = await createProject(agent, customerId);

    const response = await agent
      .post(`/api/projects/${projectId}/notes`)
      .send({
        title: "Neue Projektnotiz",
        body: "<p>Projektinhalt</p>",
      })
      .expect(201);

    expect(response.body.id).toEqual(expect.any(Number));
    expect(response.body.title).toBe("Neue Projektnotiz");
    expect(response.body.body).toBe("<p>Projektinhalt</p>");
    expect(response.body.version).toBeGreaterThanOrEqual(1);
  });

  it("returns 404 NOT_FOUND for customer note when customer does not exist", async () => {
    const agent = await loginAdminAgent();

    await agent
      .post("/api/customers/999999999/notes")
      .send({
        title: "Fehlt",
        body: "Fehlt",
      })
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual({ code: "NOT_FOUND" });
      });
  });

  it("returns 404 NOT_FOUND for project note when project does not exist", async () => {
    const agent = await loginAdminAgent();

    await agent
      .post("/api/projects/999999999/notes")
      .send({
        title: "Fehlt",
        body: "Fehlt",
      })
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual({ code: "NOT_FOUND" });
      });
  });

  it("returns 404 when customer note template does not exist", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent);

    await agent
      .post(`/api/customers/${customerId}/notes`)
      .send({
        title: "Vorlage fehlt",
        body: "Vorlage fehlt",
        templateId: 999999999,
      })
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual({ message: "Notizvorlage nicht gefunden" });
      });
  });

  it("returns 404 when project note template does not exist", async () => {
    const agent = await loginAdminAgent();
    const customerId = await createCustomer(agent);
    const projectId = await createProject(agent, customerId);

    await agent
      .post(`/api/projects/${projectId}/notes`)
      .send({
        title: "Vorlage fehlt",
        body: "Vorlage fehlt",
        templateId: 999999999,
      })
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual({ message: "Notizvorlage nicht gefunden" });
      });
  });
});
