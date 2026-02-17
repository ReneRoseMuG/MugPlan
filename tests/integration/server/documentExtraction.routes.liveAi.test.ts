/**
 * Test Scope:
 *
 * Feature: FT21 - Deterministische Dokumentextraktion
 * Use Case: UC End-to-End Extract-Route mit Fixture-PDF ohne KI
 *
 * Abgedeckte Regeln:
 * - Extract-Route funktioniert fuer project_form ohne KI.
 * - Extract-Route funktioniert fuer appointment_form ohne KI.
 * - Antwort erfuellt den strukturellen Vertrag der Extraktions-API.
 *
 * Fehlerfaelle:
 * - Fixture fehlt oder unlesbar -> Test bricht reproduzierbar ab.
 *
 * Ziel:
 * Sicherstellen, dass die produktive Route deterministic und lokal reproduzierbar arbeitet.
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

describe("FT21 integration: deterministic extraction routes", () => {
  it("extracts deterministically for project_form", async () => {
    const agent = await loginAdminAgent();
    expect(fs.existsSync(fixturePath)).toBe(true);

    await agent
      .post("/api/document-extraction/extract?scope=project_form")
      .attach("file", fixturePath)
      .expect(200)
      .expect((res) => {
        expect(res.body?.customer?.customerNumber).toBe("163214");
        expect(res.body?.customer?.firstName).toBe("Anke");
        expect(Array.isArray(res.body?.articleItems)).toBe(true);
        expect(res.body?.articleItems?.length).toBeGreaterThan(0);
        expect(typeof res.body?.articleListHtml).toBe("string");
      });
  });

  it("extracts deterministically for appointment_form", async () => {
    const agent = await loginAdminAgent();
    expect(fs.existsSync(fixturePath)).toBe(true);

    await agent
      .post("/api/document-extraction/extract?scope=appointment_form")
      .attach("file", fixturePath)
      .expect(200)
      .expect((res) => {
        expect(res.body?.customer?.customerNumber).toBe("163214");
        expect(Array.isArray(res.body?.articleItems)).toBe(true);
        expect(Array.isArray(res.body?.categorizedItems)).toBe(true);
        expect(Array.isArray(res.body?.warnings)).toBe(true);
      });
  });
});

