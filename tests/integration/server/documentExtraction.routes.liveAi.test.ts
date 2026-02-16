/**
 * Test Scope:
 *
 * Feature: FT20 - Dokumentextraktion
 * Use Case: UC Live-KI Pipeline über API-Routen
 *
 * Abgedeckte Regeln:
 * - Extract-Route funktioniert mit lokalem Ollama-Provider für project_form.
 * - Extract-Route funktioniert mit lokalem Ollama-Provider für appointment_form.
 * - Antwort erfüllt den strukturellen Vertrag der Extraktions-API.
 *
 * Fehlerfaelle:
 * - Nicht erreichbare lokale KI/Modellverfügbarkeit führt zu testrelevantem Fehler.
 *
 * Ziel:
 * Sicherstellen, dass die reale KI-Integration Bestandteil des Standardtestlaufs ist.
 */
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { resetDatabase } from "../../helpers/resetDatabase";

let app: express.Express;
const fixturePath = path.resolve(process.cwd(), "tests/fixtures/Gotthardt Anke 163214 AB.pdf");
const LIVE_AI_TEST_TIMEOUT_MS = 300_000;

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
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username: "test-admin", password: "test-admin-password" })
    .expect(200);
  return agent;
}

describe("FT20 integration: live ai extraction routes", () => {
  it("extracts via live KI for project_form", async () => {
    const agent = await loginAdminAgent();
    expect(fs.existsSync(fixturePath)).toBe(true);

    await agent
      .post("/api/document-extraction/extract?scope=project_form")
      .attach("file", fixturePath)
      .expect(200)
      .expect((res) => {
        expect(typeof res.body?.saunaModel).toBe("string");
        expect(res.body?.saunaModel?.trim().length).toBeGreaterThan(0);
        expect(typeof res.body?.customer?.customerNumber).toBe("string");
        expect(Array.isArray(res.body?.articleItems)).toBe(true);
        expect(Array.isArray(res.body?.categorizedItems)).toBe(true);
        expect(typeof res.body?.articleListHtml).toBe("string");
      });
  }, LIVE_AI_TEST_TIMEOUT_MS);

  it("extracts via live KI for appointment_form", async () => {
    const agent = await loginAdminAgent();
    expect(fs.existsSync(fixturePath)).toBe(true);

    await agent
      .post("/api/document-extraction/extract?scope=appointment_form")
      .attach("file", fixturePath)
      .expect(200)
      .expect((res) => {
        expect(typeof res.body?.saunaModel).toBe("string");
        expect(res.body?.saunaModel?.trim().length).toBeGreaterThan(0);
        expect(typeof res.body?.customer?.customerNumber).toBe("string");
        expect(Array.isArray(res.body?.articleItems)).toBe(true);
        expect(Array.isArray(res.body?.warnings)).toBe(true);
      });
  }, LIVE_AI_TEST_TIMEOUT_MS);
});
