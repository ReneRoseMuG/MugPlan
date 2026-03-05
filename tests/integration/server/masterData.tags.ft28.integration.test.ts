/**
 * Test Scope:
 *
 * Feature: FT28 - Tag Verwaltung im Admin-Bereich
 * Use Case: UC28 - Admin verwaltet Tags in Stammdaten (CRUD)
 *
 * Abgedeckte Regeln:
 * - FT28-Tag-Endpunkte unter /api/admin/master-data/tags sind ADMIN-only.
 * - Tag-Crud folgt Optimistic Locking mit VERSION_CONFLICT bei stale Version.
 * - Tags duerfen nur ohne Relationen geloescht werden.
 * - isDefault bleibt bei neuen Tags serverseitig false.
 *
 * Fehlerfaelle:
 * - Nicht-Admin kann Tag-Endpunkte aufrufen.
 * - Tag-Loeschung trotz bestehender Relation.
 *
 * Ziel:
 * Integrative Absicherung des FT28-Tag-CRUD-Vertrags im Admin-Bereich.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { attachProjectTagFixture, createProjectFixture } from "../../helpers/testDataFactory";

let app: express.Express;
let userCounter = 1;

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

async function createAndLoginReaderAgent(admin: SuperAgentTest): Promise<SuperAgentTest> {
  const idx = userCounter++;
  const username = `reader-ft28-tags-${idx}`;
  const email = `${username}@example.test`;
  await admin
    .post("/api/users")
    .send({
      username,
      email,
      firstName: "Reader",
      lastName: `FT28-TAGS-${idx}`,
      roleCode: "READER",
      password: "reader-ft28-tags-password",
    })
    .expect(201);

  const reader = request.agent(app);
  await reader
    .post("/api/auth/login")
    .send({ username, password: "reader-ft28-tags-password" })
    .expect(200);
  return reader;
}

describe("FT28 integration: master data tags admin API", () => {
  it("creates, updates and deletes a tag as admin", async () => {
    const admin = await loginAdminAgent();

    const created = await admin
      .post("/api/admin/master-data/tags")
      .send({ name: "TAG-FT28-A", color: "#112233" })
      .expect(201);

    expect(created.body.name).toBe("TAG-FT28-A");
    expect(created.body.color).toBe("#112233");
    expect(created.body.isDefault).toBe(false);
    expect(created.body.version).toBe(1);

    const updated = await admin
      .put(`/api/admin/master-data/tags/${created.body.id}`)
      .send({ name: "TAG-FT28-A-EDIT", color: "#334455", version: created.body.version })
      .expect(200);

    expect(updated.body.name).toBe("TAG-FT28-A-EDIT");
    expect(updated.body.color).toBe("#334455");
    expect(updated.body.version).toBe(created.body.version + 1);

    await admin
      .delete(`/api/admin/master-data/tags/${created.body.id}`)
      .send({ version: updated.body.version })
      .expect(204);
  });

  it("returns FORBIDDEN for non-admin on tag list endpoint", async () => {
    const admin = await loginAdminAgent();
    const reader = await createAndLoginReaderAgent(admin);

    await reader
      .get("/api/admin/master-data/tags")
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });

  it("blocks deleting tags with relations using BUSINESS_CONFLICT", async () => {
    const admin = await loginAdminAgent();
    const project = await createProjectFixture({ prefix: "FT28-TAG-REL" });

    const createdTag = await admin
      .post("/api/admin/master-data/tags")
      .send({ name: "TAG-FT28-INUSE", color: "#556677" })
      .expect(201);

    await attachProjectTagFixture(project.id, Number(createdTag.body.id));

    await admin
      .delete(`/api/admin/master-data/tags/${createdTag.body.id}`)
      .send({ version: createdTag.body.version })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });
  });

  it("returns VERSION_CONFLICT for stale tag update version", async () => {
    const admin = await loginAdminAgent();

    const created = await admin
      .post("/api/admin/master-data/tags")
      .send({ name: "TAG-FT28-STALE", color: "#778899" })
      .expect(201);

    await admin
      .put(`/api/admin/master-data/tags/${created.body.id}`)
      .send({ name: "TAG-FT28-STALE-NEW", version: created.body.version })
      .expect(200);

    await admin
      .put(`/api/admin/master-data/tags/${created.body.id}`)
      .send({ name: "TAG-FT28-STALE-OLD", version: created.body.version })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("VERSION_CONFLICT");
      });
  });
});

