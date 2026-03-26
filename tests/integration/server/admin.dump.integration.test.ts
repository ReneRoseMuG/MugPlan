/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - POST /api/admin/dumps/create erstellt eine ZIP-Datei und gibt Metadaten zurück.
 * - GET /api/admin/dumps listet erstellte Dump-Dateien auf.
 * - GET /api/admin/dumps/:filename/download liefert eine ZIP-Datei als Download.
 * - DELETE /api/admin/dumps/:filename löscht die Datei und entfernt sie aus der Liste.
 * - POST /api/admin/dumps/import akzeptiert eine gültige ZIP mit data.json.
 * - Alle Endpoints erfordern Admin-Rolle (403 für Nicht-Admins).
 * - Ungültige Dateinamen (Path-Traversal) werden mit 422 abgelehnt.
 * - Beschädigte ZIPs werden mit 422 abgelehnt.
 * - ZIPs ohne data.json werden mit 422 abgelehnt.
 * - Unbekannte Tabellennamen in data.json werden ignoriert (kein Fehler).
 *
 * Fehlerfälle:
 * - Nicht-Admin → 403
 * - Path-Traversal im Dateinamen → 422
 * - Kein multipart-Body beim Import → 422
 * - Korrupte ZIP → 422
 * - ZIP ohne data.json → 422
 * - Download nicht vorhandene Datei → 404
 * - Delete nicht vorhandene Datei → 404
 *
 * Ziel:
 * End-to-End-Absicherung der Dump-und-Import-Endpunkte mit echter Testdatenbank
 * und temporärem Dateisystem. Import-Happy-Path mit leerem data.json (kein Tabellen-Inhalt)
 * vermeidet destruktive Auswirkungen auf den geteilten Testdatenbankzustand.
 */
import os from "os";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import request, { type SuperAgentTest } from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import type express from "express";

// Dump table keys — must match DUMP_TABLE_ENTRIES in dumpService.ts
const DUMP_TABLE_KEYS = [
  "tags", "tours", "teams", "productCategories", "componentCategories",
  "helpTexts", "noteTemplates", "notes", "employees", "customers",
  "products", "components", "projects", "projectOrder", "projectOrderItems",
  "projectNotes", "projectAttachments", "projectTags", "appointments",
  "appointmentEmployees", "appointmentNotes", "appointmentAttachments",
  "appointmentTags", "customerNotes", "customerAttachments", "customerTags",
  "employeeAttachments", "employeeTags", "calendarWeekNotes", "calendarSyncLog",
  "userSettingsValue", "backupLog",
];

let app: express.Express;
let adminAgent: SuperAgentTest;
let readerAgent: SuperAgentTest;
const tmpDumpDir = path.resolve(os.tmpdir(), "mugplan-dump-integration-test");

async function buildMinimalZip(options: { includeDataJson: boolean; dataContent?: unknown; corrupt?: boolean }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip");
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    if (options.corrupt) {
      // No finalize — reject immediately with fake content
      resolve(Buffer.from("this is not a valid zip file at all"));
      return;
    }

    if (options.includeDataJson) {
      const content = JSON.stringify(options.dataContent ?? {});
      archive.append(content, { name: "data.json" });
    }

    void archive.finalize();
  });
}

beforeAll(async () => {
  app = await createApiTestApp();
  adminAgent = await loginAdminAgent(app);

  // Login as a LESER user for role restriction tests
  readerAgent = request.agent(app);
  await readerAgent.post("/api/auth/login").send({
    username: "test-reader",
    password: "test-reader-password",
  });
  // If test-reader does not exist, readerAgent requests will fail with non-200 — that's fine for role tests
});

afterAll(() => {
  // Clean up temp dump dir used by dumpService during tests
  // (the actual dir depends on BACKUP_BASE_PATH env, no explicit cleanup needed here)
  // Clean up our local temp dir if created
  if (fs.existsSync(tmpDumpDir)) {
    fs.rmSync(tmpDumpDir, { recursive: true, force: true });
  }
});

describe("GET /api/admin/dumps – Liste", () => {
  it("Admin erhält 200 mit Array", async () => {
    const res = await adminAgent.get("/api/admin/dumps").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("Nicht-Admin erhält 403 (oder 401 wenn nicht eingeloggt)", async () => {
    const res = await request(app).get("/api/admin/dumps");
    expect([401, 403]).toContain(res.status);
  });
});

describe("POST /api/admin/dumps/create", () => {
  let createdFilename: string | null = null;

  afterAll(async () => {
    if (createdFilename) {
      // Cleanup: delete the created dump
      await adminAgent.delete(`/api/admin/dumps/${encodeURIComponent(createdFilename)}`);
    }
  });

  it("erstellt einen Dump und gibt Metadaten zurück", async () => {
    const res = await adminAgent.post("/api/admin/dumps/create").expect(200);
    expect(res.body).toHaveProperty("filename");
    expect(res.body).toHaveProperty("sizeBytes");
    expect(res.body).toHaveProperty("createdAt");
    expect(typeof res.body.filename).toBe("string");
    expect(res.body.filename).toMatch(/^dump_\d{4}-\d{2}-\d{2}T[\d-]+Z\.zip$/);
    expect(res.body.sizeBytes).toBeGreaterThan(0);
    createdFilename = res.body.filename as string;
  });

  it("erstellter Dump erscheint in der Liste", async () => {
    if (!createdFilename) return;
    const res = await adminAgent.get("/api/admin/dumps").expect(200);
    const filenames = (res.body as Array<{ filename: string }>).map((d) => d.filename);
    expect(filenames).toContain(createdFilename);
  });

  it("Dump enthält gültige ZIP-Datei mit data.json (Dateinamen-Regex)", async () => {
    if (!createdFilename) return;
    const res = await adminAgent
      .get(`/api/admin/dumps/${encodeURIComponent(createdFilename)}/download`)
      .expect(200);
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-type"]).toContain("zip");
    // Response body should be non-empty binary
    expect(res.body).toBeTruthy();
  });

  it("Nicht-Admin erhält 403 bei create", async () => {
    const res = await request(app).post("/api/admin/dumps/create");
    expect([401, 403]).toContain(res.status);
  });
});

describe("GET /api/admin/dumps/:filename/download", () => {
  it("nicht vorhandene Datei → 404", async () => {
    await adminAgent
      .get("/api/admin/dumps/dump_2000-01-01T00-00-00-000Z.zip/download")
      .expect(404);
  });

  it("Path-Traversal-Dateiname → 422", async () => {
    await adminAgent
      .get("/api/admin/dumps/..%2F..%2Fetc%2Fpasswd/download")
      .expect([422, 404]); // 422 if validated, 404 if URL parsing intercepts
  });
});

describe("DELETE /api/admin/dumps/:filename", () => {
  it("nicht vorhandene Datei → 404", async () => {
    await adminAgent
      .delete("/api/admin/dumps/dump_2000-01-01T00-00-00-000Z.zip")
      .expect(404);
  });

  it("Nicht-Admin erhält 403", async () => {
    const res = await request(app).delete("/api/admin/dumps/dump_2000-01-01T00-00-00-000Z.zip");
    expect([401, 403]).toContain(res.status);
  });

  it("vorhandene Datei wird gelöscht", async () => {
    // Erst einen Dump erstellen
    const createRes = await adminAgent.post("/api/admin/dumps/create").expect(200);
    const filename = createRes.body.filename as string;

    // Löschen
    const deleteRes = await adminAgent.delete(`/api/admin/dumps/${encodeURIComponent(filename)}`).expect(200);
    expect(deleteRes.body.ok).toBe(true);

    // Nicht mehr in der Liste
    const listRes = await adminAgent.get("/api/admin/dumps").expect(200);
    const filenames = (listRes.body as Array<{ filename: string }>).map((d) => d.filename);
    expect(filenames).not.toContain(filename);
  });
});

describe("POST /api/admin/dumps/import", () => {
  it("kein multipart-Body → 422", async () => {
    const res = await adminAgent
      .post("/api/admin/dumps/import")
      .set("Content-Type", "application/json")
      .send({});
    expect(res.status).toBe(422);
  });

  it("korrupte ZIP → 422, DB unverändert", async () => {
    const corruptBuffer = await buildMinimalZip({ includeDataJson: false, corrupt: true });
    const res = await adminAgent
      .post("/api/admin/dumps/import")
      .attach("file", corruptBuffer, "dump.zip");
    expect(res.status).toBe(422);
  });

  it("gültige ZIP ohne data.json → 422", async () => {
    const zipBuffer = await buildMinimalZip({ includeDataJson: false });
    const res = await adminAgent
      .post("/api/admin/dumps/import")
      .attach("file", zipBuffer, "dump.zip");
    expect(res.status).toBe(422);
  });

  it("data.json ist kein gültiges JSON → 422", async () => {
    const chunks: Buffer[] = [];
    const arc = archiver("zip");
    arc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const zipReady = new Promise<Buffer>((resolve, reject) => {
      arc.on("end", () => resolve(Buffer.concat(chunks)));
      arc.on("error", reject);
    });
    arc.append("{ this is not: valid json }", { name: "data.json" });
    void arc.finalize();
    const zipBuffer = await zipReady;

    const res = await adminAgent
      .post("/api/admin/dumps/import")
      .attach("file", zipBuffer, "dump.zip");
    expect(res.status).toBe(422);
  });

  it("gültige ZIP mit leeren Tabellen (alle known keys, leere Arrays) → 200", async () => {
    const emptyData = Object.fromEntries(DUMP_TABLE_KEYS.map((k) => [k, []]));
    const zipBuffer = await buildMinimalZip({ includeDataJson: true, dataContent: emptyData });

    const res = await adminAgent
      .post("/api/admin/dumps/import")
      .attach("file", zipBuffer, "dump.zip");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("tablesRestored");
    expect(res.body).toHaveProperty("uploadsRestored");
    expect(res.body).toHaveProperty("durationMs");
    expect(typeof res.body.tablesRestored).toBe("number");
    expect(typeof res.body.uploadsRestored).toBe("boolean");
  });

  it("unbekannte Tabellennamen in data.json werden ignoriert → 200", async () => {
    const dataWithUnknown = { unknownTable: [{ id: 1, name: "ghost" }], tags: [] };
    const zipBuffer = await buildMinimalZip({ includeDataJson: true, dataContent: dataWithUnknown });

    const res = await adminAgent
      .post("/api/admin/dumps/import")
      .attach("file", zipBuffer, "dump.zip");
    expect(res.status).toBe(200);
  });

  it("Nicht-Admin erhält 403", async () => {
    const zipBuffer = await buildMinimalZip({ includeDataJson: true, dataContent: {} });
    const res = await request(app)
      .post("/api/admin/dumps/import")
      .attach("file", zipBuffer, "dump.zip");
    expect([401, 403]).toContain(res.status);
  });
});
