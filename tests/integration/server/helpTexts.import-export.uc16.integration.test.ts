/**
 * Test Scope:
 *
 * Feature: FT16 - Hilfetexte verwalten
 * Use Case: UC 16/09 + UC 16/10 - YAML Import/Export fuer Hilfetexte
 *
 * Abgedeckte Regeln:
 * - Export liefert alle Hilfetexte als gueltiges YAML mit exakt help_key/title/body.
 * - Import legt neue Keys an, ueberschreibt leere Bodies still und behandelt Konflikte per Entscheidung.
 * - Import anwenden parst/validiert erneut und blockiert bei fileHash-Mismatch.
 *
 * Fehlerfaelle:
 * - Ungueltige YAML-Datei oder doppelte help_key-Werte fuehren zu VALIDATION_ERROR/INVALID_IMPORT_FORMAT ohne Persistenz.
 * - Nicht-Admin darf Export/Import nicht ausfuehren (FORBIDDEN).
 *
 * Ziel:
 * Den End-to-End-Vertrag der UC 16/09 und UC 16/10 ueber HTTP/Service/Repository deterministisch absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import YAML from "yaml";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { db } from "../../../server/db";
import { helpTexts } from "../../../shared/schema";
import { eq } from "drizzle-orm";
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
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createReaderAgent(): Promise<SuperAgentTest> {
  const username = `test-reader-${nextDeterministicToken("helptexts-import-reader")}`;
  const password = "test-reader-password";
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Test",
    lastName: "Reader",
    passwordHash,
    roleCode: "READER",
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function createHelpText(
  agent: SuperAgentTest,
  payload: { helpKey: string; title: string; body: string; isActive?: boolean },
): Promise<void> {
  await agent.post("/api/help-texts").send({
    helpKey: payload.helpKey,
    title: payload.title,
    body: payload.body,
    isActive: payload.isActive ?? true,
  }).expect(201);
}

describe("FT16 integration: help texts import/export yaml", () => {
  it("exports all help texts as valid YAML with exact fields", async () => {
    const admin = await loginAdminAgent();
    await createHelpText(admin, { helpKey: "ft16.export.a", title: "Export A", body: "Line 1\nLine 2" });
    await createHelpText(admin, { helpKey: "ft16.export.b", title: "Export B", body: "" });

    const response = await admin.get("/api/help-texts/export-yaml").expect(200);
    expect(response.header["content-type"]).toContain("text/yaml");
    expect(response.header["content-disposition"]).toContain('filename="helptexts.yaml"');

    const parsed = YAML.parse(String(response.text));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);
    const keys = parsed.map((item: any) => item.help_key).sort();
    expect(keys).toEqual(["ft16.export.a", "ft16.export.b"]);
    for (const item of parsed) {
      expect(Object.keys(item).sort()).toEqual(["body", "help_key", "title"]);
    }
  });

  it("imports new items, silently overwrites empty body, and applies overwrite/skip decisions for conflicts", async () => {
    const admin = await loginAdminAgent();
    await createHelpText(admin, { helpKey: "ft16.import.empty", title: "Existing Empty", body: "   " });
    await createHelpText(admin, { helpKey: "ft16.import.conflict.overwrite", title: "Old Overwrite", body: "old body overwrite" });
    await createHelpText(admin, { helpKey: "ft16.import.conflict.skip", title: "Old Skip", body: "old body skip" });

    const importYaml = YAML.stringify([
      { help_key: "ft16.import.new", title: "New Title", body: "new body" },
      { help_key: "ft16.import.empty", title: "Updated Empty", body: "updated from import" },
      { help_key: "ft16.import.conflict.overwrite", title: "Overwrite Title", body: "overwrite body" },
      { help_key: "ft16.import.conflict.skip", title: "Skip Title", body: "skip body import" },
    ]);

    const previewRes = await admin
      .post("/api/help-texts/import-yaml/preview")
      .attach("file", Buffer.from(importYaml, "utf8"), "helptexts.yaml")
      .expect(200);

    expect(previewRes.body.summary.totalItems).toBe(4);
    expect(previewRes.body.summary.createCount).toBe(1);
    expect(previewRes.body.summary.silentOverwriteCount).toBe(1);
    expect(previewRes.body.summary.conflictCount).toBe(2);

    const decisions = [
      { helpKey: "ft16.import.conflict.overwrite", decision: "OVERWRITE" },
      { helpKey: "ft16.import.conflict.skip", decision: "SKIP" },
    ];

    const applyRes = await admin
      .post("/api/help-texts/import-yaml/apply")
      .field("fileHash", String(previewRes.body.fileHash))
      .field("decisions", JSON.stringify(decisions))
      .attach("file", Buffer.from(importYaml, "utf8"), "helptexts.yaml")
      .expect(200);

    expect(applyRes.body.createdCount).toBe(1);
    expect(applyRes.body.silentOverwrittenCount).toBe(1);
    expect(applyRes.body.decisionOverwrittenCount).toBe(1);
    expect(applyRes.body.skippedCount).toBe(1);

    const [created] = await db.select().from(helpTexts).where(eq(helpTexts.helpKey, "ft16.import.new"));
    expect(created.title).toBe("New Title");
    expect(created.body).toBe("new body");

    const [silentOverwrite] = await db.select().from(helpTexts).where(eq(helpTexts.helpKey, "ft16.import.empty"));
    expect(silentOverwrite.title).toBe("Updated Empty");
    expect(silentOverwrite.body).toBe("updated from import");

    const [decisionOverwrite] = await db.select().from(helpTexts).where(eq(helpTexts.helpKey, "ft16.import.conflict.overwrite"));
    expect(decisionOverwrite.title).toBe("Overwrite Title");
    expect(decisionOverwrite.body).toBe("overwrite body");

    const [decisionSkip] = await db.select().from(helpTexts).where(eq(helpTexts.helpKey, "ft16.import.conflict.skip"));
    expect(decisionSkip.title).toBe("Old Skip");
    expect(decisionSkip.body).toBe("old body skip");
  });

  it("rejects invalid files and duplicate help_key without persistence", async () => {
    const admin = await loginAdminAgent();
    await createHelpText(admin, { helpKey: "ft16.invalid.base", title: "Base", body: "base" });

    const invalidYaml = ":\n  - ???";
    await admin
      .post("/api/help-texts/import-yaml/preview")
      .attach("file", Buffer.from(invalidYaml, "utf8"), "helptexts.yaml")
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("INVALID_IMPORT_FORMAT");
      });

    const duplicateYaml = YAML.stringify([
      { help_key: "ft16.dup", title: "A", body: "A" },
      { help_key: "ft16.dup", title: "B", body: "B" },
    ]);
    await admin
      .post("/api/help-texts/import-yaml/preview")
      .attach("file", Buffer.from(duplicateYaml, "utf8"), "helptexts.yaml")
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("VALIDATION_ERROR");
      });

    const allRows = await db.select().from(helpTexts);
    expect(allRows).toHaveLength(1);
    expect(allRows[0].helpKey).toBe("ft16.invalid.base");
  });

  it("blocks apply on fileHash mismatch and blocks non-admin on import/export", async () => {
    const admin = await loginAdminAgent();
    await createHelpText(admin, { helpKey: "ft16.hash.conflict", title: "Old", body: "old body" });

    const yamlPayload = YAML.stringify([
      { help_key: "ft16.hash.conflict", title: "New", body: "new body" },
    ]);

    const previewRes = await admin
      .post("/api/help-texts/import-yaml/preview")
      .attach("file", Buffer.from(yamlPayload, "utf8"), "helptexts.yaml")
      .expect(200);

    await admin
      .post("/api/help-texts/import-yaml/apply")
      .field("fileHash", `${previewRes.body.fileHash}x`)
      .field("decisions", JSON.stringify([{ helpKey: "ft16.hash.conflict", decision: "OVERWRITE" }]))
      .attach("file", Buffer.from(yamlPayload, "utf8"), "helptexts.yaml")
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("FILE_HASH_MISMATCH");
      });

    const [unchanged] = await db.select().from(helpTexts).where(eq(helpTexts.helpKey, "ft16.hash.conflict"));
    expect(unchanged.body).toBe("old body");

    const reader = await createReaderAgent();
    await reader.get("/api/help-texts/export-yaml").expect(403);
    await reader
      .post("/api/help-texts/import-yaml/preview")
      .attach("file", Buffer.from(yamlPayload, "utf8"), "helptexts.yaml")
      .expect(403);
    await reader
      .post("/api/help-texts/import-yaml/apply")
      .field("fileHash", String(previewRes.body.fileHash))
      .field("decisions", JSON.stringify([{ helpKey: "ft16.hash.conflict", decision: "OVERWRITE" }]))
      .attach("file", Buffer.from(yamlPayload, "utf8"), "helptexts.yaml")
      .expect(403);
  });

  it("allows help text display for readers but blocks all management endpoints", async () => {
    const admin = await loginAdminAgent();
    const createResponse = await admin.post("/api/help-texts").send({
      helpKey: "ft16.reader.display",
      title: "Reader Display",
      body: "visible body",
      isActive: true,
    }).expect(201);

    const reader = await createReaderAgent();

    await reader
      .get("/api/help-texts/ft16.reader.display")
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          helpKey: "ft16.reader.display",
          title: "Reader Display",
          body: "visible body",
        });
      });

    await reader.get("/api/help-texts").expect(403);
    await reader.get(`/api/help-texts/by-id/${createResponse.body.id}`).expect(403);
    await reader.post("/api/help-texts/seed-missing-from-frontend").expect(403);
    await reader.post("/api/help-texts").send({
      helpKey: "ft16.reader.blocked",
      title: "Blocked",
      body: "blocked",
      isActive: true,
    }).expect(403);
    await reader.put(`/api/help-texts/${createResponse.body.id}`).send({
      helpKey: "ft16.reader.display",
      title: "Blocked Update",
      body: "blocked",
      isActive: true,
      version: createResponse.body.version,
    }).expect(403);
    await reader.patch(`/api/help-texts/${createResponse.body.id}/active`).send({
      isActive: false,
      version: createResponse.body.version,
    }).expect(403);
    await reader.delete(`/api/help-texts/${createResponse.body.id}`).send({
      version: createResponse.body.version,
    }).expect(403);
  });
});
