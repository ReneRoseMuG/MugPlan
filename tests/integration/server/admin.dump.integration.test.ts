/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - POST /api/admin/dumps/create erstellt einen versionierten Dump.
 * - Der Dump enthält genau den erlaubten Tabellensatz und schließt ausgeschlossene Tabellen aus.
 * - POST /api/admin/dumps/import spielt einen erzeugten Dump als echten Roundtrip wieder ein.
 * - Touren und weitere zentrale Fachdaten werden nach dem Reimport korrekt wiederhergestellt.
 * - Ausgeschlossene Tabellen wie users/roles bleiben vom Import unberührt.
 * - Admin-Endpunkte lehnen ungültige Dumps und Nicht-Admins korrekt ab.
 *
 * Fehlerfälle:
 * - Nicht-Admin → 403
 * - Kein multipart-Body beim Import → 422
 * - Korrupte ZIP → 422
 * - ZIP ohne data.json → 422
 * - Legacy-Dump ohne versioniertes Format → 422
 *
 * Ziel:
 * Den Dump-/Import-Flow end-to-end gegen die echte Testdatenbank absichern und
 * nachweisen, dass ein erzeugter Dump denselben erlaubten Datenbestand zuverlässig
 * wiederherstellt, ohne ausgeschlossene Tabellen in Scope zu ziehen.
 */
import archiver from "archiver";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { count, eq } from "drizzle-orm";
import type express from "express";
import * as schema from "@shared/schema";
import { db } from "../../../server/db";
import {
  DUMP_FORMAT_VERSION,
  DUMP_TABLE_KEYS,
  EXCLUDED_DUMP_TABLE_KEYS,
} from "../../../server/services/dumpService";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  attachProjectTagFixture,
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTagFixture,
  createTeamFixture,
  createTourFixture,
} from "../../helpers/testDataFactory";

let app: express.Express;

function binaryParser(
  res: NodeJS.ReadableStream & { setEncoding(encoding: BufferEncoding): void },
  callback: (error: Error | null, data?: Buffer) => void,
) {
  const chunks: Buffer[] = [];
  res.on("data", (chunk: Buffer | string) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "binary"));
  });
  res.on("end", () => callback(null, Buffer.concat(chunks)));
  res.on("error", (error: Error) => callback(error));
}

async function buildZipFromDataJson(data: unknown): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip");
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
    archive.append(JSON.stringify(data), { name: "data.json" });
    void archive.finalize();
  });
}

async function parseDumpDataJson(zipBuffer: Buffer): Promise<unknown> {
  const directory = await (await import("unzipper")).Open.buffer(zipBuffer);
  const file = directory.files.find((entry) => entry.path === "data.json");
  if (!file) {
    throw new Error("data.json not found in dump");
  }
  return JSON.parse((await file.buffer()).toString("utf-8")) as unknown;
}

async function getRowCount(table: any): Promise<number> {
  const rows = await db.select({ value: count() }).from(table);
  return Number(rows[0]?.value ?? 0);
}

async function collectSnapshot() {
  return {
    tours: await getRowCount(schema.tours),
    teams: await getRowCount(schema.teams),
    customers: await getRowCount(schema.customers),
    projects: await getRowCount(schema.projects),
    appointments: await getRowCount(schema.appointments),
    appointmentEmployees: await getRowCount(schema.appointmentEmployees),
    tags: await getRowCount(schema.tags),
    projectTags: await getRowCount(schema.projectTags),
    users: await getRowCount(schema.users),
    roles: await getRowCount(schema.roles),
  };
}

beforeAll(async () => {
  app = await createApiTestApp();
});

afterAll(async () => {
  return Promise.resolve();
});

describe("GET /api/admin/dumps", () => {
  it("Admin erhält 200 mit Array", async () => {
    const admin = await loginAdminAgent(app);
    const response = await admin.get("/api/admin/dumps").expect(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("Nicht-Admin erhält 401 oder 403", async () => {
    const response = await request(app).get("/api/admin/dumps");
    expect([401, 403]).toContain(response.status);
  });
});

describe("POST /api/admin/dumps/create und Download", () => {
  it("erzeugt einen versionierten Dump mit erlaubtem Tabellensatz", async () => {
    const team = await createTeamFixture("#1188aa");
    const tour = await createTourFixture("#2266aa");
    const employee = await createEmployeeFixture("DUMP-EMP");
    const customer = await createCustomerFixture("DUMP-CUST");
    const project = await createProjectFixture({ prefix: "DUMP-PROJ", customerId: customer.id });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      tourId: tour.id,
      employeeIds: [employee.id],
    });
    const tag = await createTagFixture("DUMP-TAG");
    await attachProjectTagFixture(project.id, tag.id);

    expect(team.id).toBeGreaterThan(0);
    expect(appointment.id).toBeGreaterThan(0);

    const admin = await loginAdminAgent(app);
    const createResponse = await admin.post("/api/admin/dumps/create").expect(200);
    expect(createResponse.body.filename).toMatch(/^dump_\d{4}-\d{2}-\d{2}T[\d-]+Z\.zip$/);

    const downloadResponse = await admin
      .get(`/api/admin/dumps/${encodeURIComponent(createResponse.body.filename as string)}/download`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    const dumpData = await parseDumpDataJson(downloadResponse.body as Buffer) as {
      formatVersion: number;
      exportedAt: string;
      tables: Record<string, unknown[]>;
    };

    expect(dumpData.formatVersion).toBe(DUMP_FORMAT_VERSION);
    expect(typeof dumpData.exportedAt).toBe("string");
    expect(Object.keys(dumpData.tables).sort()).toEqual([...DUMP_TABLE_KEYS].sort());
    expect(dumpData.tables["tours"].length).toBeGreaterThan(0);
    expect(dumpData.tables["teams"].length).toBeGreaterThan(0);

    for (const excludedKey of EXCLUDED_DUMP_TABLE_KEYS) {
      expect(dumpData.tables).not.toHaveProperty(excludedKey);
    }
  });
});

describe("POST /api/admin/dumps/import", () => {
  it("stellt einen erzeugten Dump als echten Roundtrip wieder her", async () => {
    const admin = await loginAdminAgent(app);

    const team = await createTeamFixture("#1188aa");
    const tour = await createTourFixture("#2266aa");
    const employee = await createEmployeeFixture("ROUNDTRIP-EMP");
    const customer = await createCustomerFixture("ROUNDTRIP-CUST");
    const project = await createProjectFixture({ prefix: "ROUNDTRIP-PROJ", customerId: customer.id });
    await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      tourId: tour.id,
      employeeIds: [employee.id],
    });
    const tag = await createTagFixture("ROUNDTRIP-TAG");
    await attachProjectTagFixture(project.id, tag.id);

    const beforeSnapshot = await collectSnapshot();

    const createResponse = await admin.post("/api/admin/dumps/create").expect(200);
    const dumpFilename = createResponse.body.filename as string;
    const downloadResponse = await admin
      .get(`/api/admin/dumps/${encodeURIComponent(dumpFilename)}/download`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    const dumpBuffer = downloadResponse.body as Buffer;

    const extraTour = await createTourFixture("#cc2244");
    const extraTeam = await createTeamFixture("#cc7722");
    const extraCustomer = await createCustomerFixture("ROUNDTRIP-EXTRA");

    const mutatedSnapshot = await collectSnapshot();
    expect(mutatedSnapshot.tours).toBe(beforeSnapshot.tours + 1);
    expect(mutatedSnapshot.teams).toBe(beforeSnapshot.teams + 1);
    expect(mutatedSnapshot.customers).toBe(beforeSnapshot.customers + 1);

    const importResponse = await admin
      .post("/api/admin/dumps/import")
      .attach("file", dumpBuffer, "dump.zip")
      .expect(200);

    expect(importResponse.body.tablesRestored).toBeGreaterThan(0);

    const afterSnapshot = await collectSnapshot();
    expect(afterSnapshot).toEqual(beforeSnapshot);

    const restoredTour = await db.select().from(schema.tours).where(eq(schema.tours.id, tour.id));
    expect(restoredTour).toHaveLength(1);

    const removedExtraTour = await db.select().from(schema.tours).where(eq(schema.tours.id, extraTour.id));
    const removedExtraTeam = await db.select().from(schema.teams).where(eq(schema.teams.id, extraTeam.id));
    const removedExtraCustomer = await db.select().from(schema.customers).where(eq(schema.customers.id, extraCustomer.id));
    expect(removedExtraTour).toHaveLength(0);
    expect(removedExtraTeam).toHaveLength(0);
    expect(removedExtraCustomer).toHaveLength(0);
  });

  it("lehnt Legacy-Dumps ohne versioniertes Format ab", async () => {
    const admin = await loginAdminAgent(app);
    const zipBuffer = await buildZipFromDataJson({});

    const response = await admin
      .post("/api/admin/dumps/import")
      .attach("file", zipBuffer, "legacy.zip");

    expect(response.status).toBe(422);
  });

  it("kein multipart-Body → 422", async () => {
    const admin = await loginAdminAgent(app);
    await admin
      .post("/api/admin/dumps/import")
      .set("Content-Type", "application/json")
      .send({})
      .expect(422);
  });

  it("korrupte ZIP → 422", async () => {
    const admin = await loginAdminAgent(app);
    await admin
      .post("/api/admin/dumps/import")
      .attach("file", Buffer.from("this is not a valid zip"), "dump.zip")
      .expect(422);
  });

  it("ZIP ohne data.json → 422", async () => {
    const admin = await loginAdminAgent(app);
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver("zip");
      archive.on("data", (chunk: Buffer) => chunks.push(chunk));
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);
      archive.append("hello", { name: "readme.txt" });
      void archive.finalize();
    });

    await admin
      .post("/api/admin/dumps/import")
      .attach("file", zipBuffer, "dump.zip")
      .expect(422);
  });

  it("Nicht-Admin erhält 401 oder 403", async () => {
    const zipBuffer = await buildZipFromDataJson({
      formatVersion: DUMP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      tables: Object.fromEntries(DUMP_TABLE_KEYS.map((key) => [key, []])),
    });

    const response = await request(app)
      .post("/api/admin/dumps/import")
      .attach("file", zipBuffer, "dump.zip");

    expect([401, 403]).toContain(response.status);
  });
});
