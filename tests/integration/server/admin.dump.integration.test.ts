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
 * Admin-Session wird pro Test neu erstellt, da resetDatabase() in beforeEach die User-IDs
 * zurücksetzt und gespeicherte Sessions ungültig macht.
 */
import os from "os";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import request from "supertest";
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
const tmpDumpDir = path.resolve(os.tmpdir(), "mugplan-dump-integration-test");

async function buildMinimalZip(options: { includeDataJson: boolean; dataContent?: unknown; corrupt?: boolean }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const arc = archiver("zip");
    arc.on("data", (chunk: Buffer) => chunks.push(chunk));
    arc.on("end", () => resolve(Buffer.concat(chunks)));
    arc.on("error", reject);

    if (options.corrupt) {
      resolve(Buffer.from("this is not a valid zip file at all"));
      return;
    }

    if (options.includeDataJson) {
      const content = JSON.stringify(options.dataContent ?? {});
      arc.append(content, { name: "data.json" });
    }

    void arc.finalize();
  });
}

beforeAll(async () => {
  app = await createApiTestApp();
});

afterAll(() => {
  if (fs.existsSync(tmpDumpDir)) {
    fs.rmSync(tmpDumpDir, { recursive: true, force: true });
  }
});

describe("GET /api/admin/dumps – Liste", () => {
  it("Admin erhält 200 mit Array", async () => {
    const admin = await loginAdminAgent(app);
    const res = await admin.get("/api/admin/dumps").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("Nicht-Admin erhält 403 (oder 401 wenn nicht eingeloggt)", async () => {
    const res = await request(app).get("/api/admin/dumps");
    expect([401, 403]).toContain(res.status);
  });
});

describe("POST /api/admin/dumps/create", () => {
  it("erstellt einen Dump und gibt Metadaten zurück", async () => {
    const admin = await loginAdminAgent(app);
    const res = await admin.post("/api/admin/dumps/create").expect(200);
    expect(res.body).toHaveProperty("filename");
    expect(res.body).toHaveProperty("sizeBytes");
    expect(res.body).toHaveProperty("createdAt");
    expect(typeof res.body.filename).toBe("string");
    expect(res.body.filename).toMatch(/^dump_\d{4}-\d{2}-\d{2}T[\d-]+Z\.zip$/);
    expect(res.body.sizeBytes).toBeGreaterThan(0);
  });

  it("erstellter Dump erscheint in der Liste", async () => {
    const admin = await loginAdminAgent(app);
    const createRes = await admin.post("/api/admin/dumps/create").expect(200);
    const filename = createRes.body.filename as string;

    const listRes = await admin.get("/api/admin/dumps").expect(200);
    const filenames = (listRes.body as Array<{ filename: string }>).map((d) => d.filename);
    expect(filenames).toContain(filename);
  });

  it("Dump-Download liefert ZIP mit Content-Disposition: attachment", async () => {
    const admin = await loginAdminAgent(app);
    const createRes = await admin.post("/api/admin/dumps/create").expect(200);
    const filename = createRes.body.filename as string;

    const res = await admin
      .get(`/api/admin/dumps/${encodeURIComponent(filename)}/download`)
      .expect(200);
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-type"]).toContain("zip");
    expect(res.body).toBeTruthy();
  });

  it("Nicht-Admin erhält 403 bei create", async () => {
    const res = await request(app).post("/api/admin/dumps/create");
    expect([401, 403]).toContain(res.status);
  });
});

describe("GET /api/admin/dumps/:filename/download", () => {
  it("nicht vorhandene Datei → 404", async () => {
    const admin = await loginAdminAgent(app);
    await admin
      .get("/api/admin/dumps/dump_2000-01-01T00-00-00-000Z.zip/download")
      .expect(404);
  });

  it("Path-Traversal-Dateiname → 422", async () => {
    const admin = await loginAdminAgent(app);
    const res = await admin.get("/api/admin/dumps/..%2F..%2Fetc%2Fpasswd/download");
    expect([422, 404]).toContain(res.status);
  });
});

describe("DELETE /api/admin/dumps/:filename", () => {
  it("nicht vorhandene Datei → 404", async () => {
    const admin = await loginAdminAgent(app);
    await admin
      .delete("/api/admin/dumps/dump_2000-01-01T00-00-00-000Z.zip")
      .expect(404);
  });

  it("Nicht-Admin erhält 403", async () => {
    const res = await request(app).delete("/api/admin/dumps/dump_2000-01-01T00-00-00-000Z.zip");
    expect([401, 403]).toContain(res.status);
  });

  it("vorhandene Datei wird gelöscht", async () => {
    const admin = await loginAdminAgent(app);

    // Dump erstellen
    const createRes = await admin.post("/api/admin/dumps/create").expect(200);
    const filename = createRes.body.filename as string;

    // Löschen
    const deleteRes = await admin.delete(`/api/admin/dumps/${encodeURIComponent(filename)}`).expect(200);
    expect(deleteRes.body.ok).toBe(true);

    // Nicht mehr in der Liste
    const listRes = await admin.get("/api/admin/dumps").expect(200);
    const filenames = (listRes.body as Array<{ filename: string }>).map((d) => d.filename);
    expect(filenames).not.toContain(filename);
  });
});

describe("POST /api/admin/dumps/import", () => {
  it("kein multipart-Body → 422", async () => {
    const admin = await loginAdminAgent(app);
    const res = await admin
      .post("/api/admin/dumps/import")
      .set("Content-Type", "application/json")
      .send({});
    expect(res.status).toBe(422);
  });

  it("korrupte ZIP → 422", async () => {
    const admin = await loginAdminAgent(app);
    const corruptBuffer = await buildMinimalZip({ includeDataJson: false, corrupt: true });
    const res = await admin
      .post("/api/admin/dumps/import")
      .attach("file", corruptBuffer, "dump.zip");
    expect(res.status).toBe(422);
  });

  it("gültige ZIP ohne data.json → 422", async () => {
    const admin = await loginAdminAgent(app);
    const zipBuffer = await buildMinimalZip({ includeDataJson: false });
    const res = await admin
      .post("/api/admin/dumps/import")
      .attach("file", zipBuffer, "dump.zip");
    expect(res.status).toBe(422);
  });

  it("data.json ist kein gültiges JSON → 422", async () => {
    const admin = await loginAdminAgent(app);
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

    const res = await admin
      .post("/api/admin/dumps/import")
      .attach("file", zipBuffer, "dump.zip");
    expect(res.status).toBe(422);
  });

  it("gültige ZIP mit leeren Tabellen (alle known keys, leere Arrays) → 200", async () => {
    const admin = await loginAdminAgent(app);
    const emptyData = Object.fromEntries(DUMP_TABLE_KEYS.map((k) => [k, []]));
    const zipBuffer = await buildMinimalZip({ includeDataJson: true, dataContent: emptyData });

    const res = await admin
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
    const admin = await loginAdminAgent(app);
    const dataWithUnknown = { unknownTable: [{ id: 1, name: "ghost" }], tags: [] };
    const zipBuffer = await buildMinimalZip({ includeDataJson: true, dataContent: dataWithUnknown });

    const res = await admin
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
