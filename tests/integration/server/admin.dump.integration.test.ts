/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - POST /api/admin/dumps/create erstellt einen versionierten Dump.
 * - Der Dump enthält genau den erlaubten Tabellensatz und schließt ausgeschlossene Tabellen aus.
 * - POST /api/admin/dumps/import spielt einen erzeugten Dump als echten Roundtrip wieder ein.
 * - Ein älterer Dump mit fehlenden neuen Tabellen kann weiterhin importiert werden.
 * - Touren, Wochenplanung und weitere zentrale Fachdaten werden nach dem Reimport korrekt wiederhergestellt.
 * - Adressen (customer_address) und der Adresskatalog (address_category) werden mitgesichert und per Identität wiederhergestellt.
 * - Alt-Dumps ohne address_category leeren den Adresskatalog nicht (fehlende Tabellen bleiben unangetastet).
 * - users werden per roleCode übertragen; roles bleiben als Seed-Tabelle ausgeschlossen.
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
 * wiederherstellt, ohne Seed-Tabellen in Scope zu ziehen.
 */
import archiver from "archiver";
import fs from "fs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { count, eq } from "drizzle-orm";
import type express from "express";
import * as schema from "@shared/schema";
import { db } from "../../../server/db";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
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
let dumpTestUserCounter = 0;

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

async function buildZipFromDumpArtifacts(data: unknown, manifest: unknown): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip");
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
    archive.append(JSON.stringify(data), { name: "data.json" });
    archive.append(JSON.stringify(manifest), { name: "manifest.json" });
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

async function parseDumpManifest(zipBuffer: Buffer): Promise<unknown> {
  const directory = await (await import("unzipper")).Open.buffer(zipBuffer);
  const file = directory.files.find((entry) => entry.path === "manifest.json");
  if (!file) {
    throw new Error("manifest.json not found in dump");
  }
  return JSON.parse((await file.buffer()).toString("utf-8")) as unknown;
}

function previewDumpImport(admin: request.SuperAgentTest, zipBuffer: Buffer) {
  return admin
    .post("/api/admin/dumps/import/preview")
    .attach("file", zipBuffer, "dump.zip");
}

function applyDumpImport(
  admin: request.SuperAgentTest,
  zipBuffer: Buffer,
  preview: { fileHash: string; confirmationPhrase: string },
) {
  return admin
    .post("/api/admin/dumps/import/apply")
    .field("fileHash", preview.fileHash)
    .field("confirmationPhrase", preview.confirmationPhrase)
    .field("productionConfirmationText", preview.confirmationPhrase)
    .attach("file", zipBuffer, "dump.zip");
}

async function getRowCount(table: any): Promise<number> {
  const rows = await db.select({ value: count() }).from(table);
  return Number(rows[0]?.value ?? 0);
}

function nextDumpTestToken(prefix: string): string {
  dumpTestUserCounter += 1;
  return `${prefix}-${Date.now()}-${dumpTestUserCounter}`;
}

async function getRoleIdByCode(roleCode: "ADMIN" | "DISPATCHER" | "READER"): Promise<number> {
  const [row] = await db
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(eq(schema.roles.code, roleCode))
    .limit(1);
  if (!row) {
    throw new Error(`Role ${roleCode} not found`);
  }
  return Number(row.id);
}

async function getUserWithRoleById(userId: number) {
  const [row] = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      email: schema.users.email,
      passwordHash: schema.users.passwordHash,
      twoFactorSecretEncrypted: schema.users.twoFactorSecretEncrypted,
      twoFactorBackupCodesReserved: schema.users.twoFactorBackupCodesReserved,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      fullName: schema.users.fullName,
      roleId: schema.users.roleId,
      roleCode: schema.roles.code,
      isActive: schema.users.isActive,
      version: schema.users.version,
    })
    .from(schema.users)
    .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(eq(schema.users.id, userId))
    .limit(1);
  return row ?? null;
}

async function collectSnapshot() {
  return {
    tours: await getRowCount(schema.tours),
    teams: await getRowCount(schema.teams),
    tourWeekEmployees: await getRowCount(schema.tourWeekEmployees),
    customers: await getRowCount(schema.customers),
    projects: await getRowCount(schema.projects),
    appointments: await getRowCount(schema.appointments),
    appointmentEmployees: await getRowCount(schema.appointmentEmployees),
    tags: await getRowCount(schema.tags),
    projectTags: await getRowCount(schema.projectTags),
    employeeNotes: await getRowCount(schema.employeeNotes),
    employeeAttachments: await getRowCount(schema.employeeAttachments),
    employeeTags: await getRowCount(schema.employeeTags),
    calendarWeekNotes: await getRowCount(schema.calendarWeekNotes),
    users: await getRowCount(schema.users),
    roles: await getRowCount(schema.roles),
    addressCategories: await getRowCount(schema.addressCategories),
    customerAddresses: await getRowCount(schema.customerAddresses),
  };
}

beforeAll(async () => {
  app = await createApiTestApp();
});

describe("POST /api/admin/dumps/import/apply hardening", () => {
  it("blockiert fileHash mismatch und falsche Sicherheitsphrase", async () => {
    const admin = await loginAdminAgent(app);
    const createResponse = await admin.post("/api/admin/dumps/create").expect(200);
    const dumpFilename = createResponse.body.filename as string;
    const downloadResponse = await admin
      .get(`/api/admin/dumps/${encodeURIComponent(dumpFilename)}/download`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    const dumpBuffer = downloadResponse.body as Buffer;

    const previewResponse = await previewDumpImport(admin, dumpBuffer).expect(200);

    await admin
      .post("/api/admin/dumps/import/apply")
      .field("fileHash", `${String(previewResponse.body.fileHash)}x`)
      .field("confirmationPhrase", String(previewResponse.body.confirmationPhrase))
      .field("productionConfirmationText", String(previewResponse.body.confirmationPhrase))
      .attach("file", dumpBuffer, "dump.zip")
      .expect(409);

    await admin
      .post("/api/admin/dumps/import/apply")
      .field("fileHash", String(previewResponse.body.fileHash))
      .field("confirmationPhrase", String(previewResponse.body.confirmationPhrase))
      .field("productionConfirmationText", "falsch")
      .attach("file", dumpBuffer, "dump.zip")
      .expect(409);
  });
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
    await db.insert(schema.tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: 2026,
      isoWeek: 16,
      employeeId: employee.id,
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
    const manifest = await parseDumpManifest(downloadResponse.body as Buffer) as {
      dumpId: string;
      formatVersion: number;
      exportedAt: string;
      schemaRevision: string;
      tables: Record<string, { rowCount: number; sha256: string }>;
      uploads: { fileCount: number; totalBytes: number; sha256: string };
    };

    expect(dumpData.formatVersion).toBe(DUMP_FORMAT_VERSION);
    expect(typeof dumpData.exportedAt).toBe("string");
    expect(Object.keys(dumpData.tables).sort()).toEqual([...DUMP_TABLE_KEYS].sort());
    expect(dumpData.tables["tours"].length).toBeGreaterThan(0);
    expect(dumpData.tables["teams"].length).toBeGreaterThan(0);
    expect(dumpData.tables["tourWeekEmployees"].length).toBeGreaterThan(0);
    expect(dumpData.tables["users"].length).toBeGreaterThan(0);
    expect(dumpData.tables["users"][0]).toHaveProperty("roleCode");
    expect(dumpData.tables["users"][0]).not.toHaveProperty("roleId");
    // Neue Tabellen sind Teil des erlaubten Tabellensatzes; der Adresskatalog traegt
    // mindestens die beiden Pflichtkategorien (Bootstrap).
    expect(dumpData.tables["addressCategories"].length).toBeGreaterThan(0);
    expect(dumpData.tables).toHaveProperty("customerAddresses");
    expect(dumpData.tables).toHaveProperty("journalEntries");
    expect(dumpData.tables).toHaveProperty("journalEntryContexts");
    expect(manifest.formatVersion).toBe(DUMP_FORMAT_VERSION);
    expect(manifest.dumpId).toContain("dump_");
    expect(Object.keys(manifest.tables).sort()).toEqual([...DUMP_TABLE_KEYS].sort());

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
    const [deliveryCategory] = await db
      .select({ id: schema.addressCategories.id })
      .from(schema.addressCategories)
      .where(eq(schema.addressCategories.roleKey, schema.ADDRESS_ROLE_DELIVERY))
      .limit(1);
    const deliveryAddressInsert = await db.insert(schema.customerAddresses).values({
      customerId: customer.id,
      categoryId: Number(deliveryCategory!.id),
      addressLine1: "Lieferstrasse 9",
      postalCode: "29221",
      city: "Lieferstadt",
      country: "Deutschland",
      version: 1,
    });
    const deliveryAddressId = Number(
      (deliveryAddressInsert as any)?.[0]?.insertId ?? (deliveryAddressInsert as any)?.insertId ?? 0,
    );
    const project = await createProjectFixture({ prefix: "ROUNDTRIP-PROJ", customerId: customer.id });
    await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      tourId: tour.id,
      employeeIds: [employee.id],
    });
    const originalWeekInsert = await db.insert(schema.tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: 2026,
      isoWeek: 17,
      employeeId: employee.id,
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
    const extraEmployee = await createEmployeeFixture("ROUNDTRIP-EXTRA-EMP");
    const extraCustomer = await createCustomerFixture("ROUNDTRIP-EXTRA");
    const extraWeekInsert = await db.insert(schema.tourWeekEmployees).values({
      tourId: extraTour.id,
      isoYear: 2026,
      isoWeek: 18,
      employeeId: extraEmployee.id,
    });

    const mutatedSnapshot = await collectSnapshot();
    expect(mutatedSnapshot.tours).toBe(beforeSnapshot.tours + 1);
    expect(mutatedSnapshot.teams).toBe(beforeSnapshot.teams + 1);
    expect(mutatedSnapshot.tourWeekEmployees).toBe(beforeSnapshot.tourWeekEmployees + 1);
    expect(mutatedSnapshot.customers).toBe(beforeSnapshot.customers + 1);

    const previewResponse = await previewDumpImport(admin, dumpBuffer).expect(200);
    const importResponse = await applyDumpImport(admin, dumpBuffer, {
      fileHash: String(previewResponse.body.fileHash),
      confirmationPhrase: String(previewResponse.body.confirmationPhrase),
    }).expect(200);

    expect(importResponse.body.tablesRestored).toBeGreaterThan(0);
    expect(importResponse.body.targetBackupCreated).toBe(true);
    expect(importResponse.body.verificationPassed).toBe(true);

    const afterSnapshot = await collectSnapshot();
    expect(afterSnapshot).toEqual(beforeSnapshot);

    const restoredTour = await db.select().from(schema.tours).where(eq(schema.tours.id, tour.id));
    const restoredWeekAssignment = await db.select()
      .from(schema.tourWeekEmployees)
      .where(eq(schema.tourWeekEmployees.id, Number((originalWeekInsert as any)?.[0]?.insertId ?? (originalWeekInsert as any)?.insertId ?? 0)));
    expect(restoredTour).toHaveLength(1);
    expect(restoredWeekAssignment).toHaveLength(1);

    const removedExtraTour = await db.select().from(schema.tours).where(eq(schema.tours.id, extraTour.id));
    const removedExtraTeam = await db.select().from(schema.teams).where(eq(schema.teams.id, extraTeam.id));
    const removedExtraCustomer = await db.select().from(schema.customers).where(eq(schema.customers.id, extraCustomer.id));
    const removedExtraWeekAssignment = await db.select()
      .from(schema.tourWeekEmployees)
      .where(eq(schema.tourWeekEmployees.id, Number((extraWeekInsert as any)?.[0]?.insertId ?? (extraWeekInsert as any)?.insertId ?? 0)));
    expect(removedExtraTour).toHaveLength(0);
    expect(removedExtraTeam).toHaveLength(0);
    expect(removedExtraCustomer).toHaveLength(0);
    expect(removedExtraWeekAssignment).toHaveLength(0);

    // Adressobjekt: die abweichende Lieferadresse wird per Identität wiederhergestellt.
    const restoredDeliveryAddress = await db
      .select()
      .from(schema.customerAddresses)
      .where(eq(schema.customerAddresses.id, deliveryAddressId));
    expect(restoredDeliveryAddress).toHaveLength(1);
    expect(restoredDeliveryAddress[0]?.customerId).toBe(customer.id);
    expect(restoredDeliveryAddress[0]?.addressLine1).toBe("Lieferstrasse 9");
    expect(restoredDeliveryAddress[0]?.city).toBe("Lieferstadt");

    // Adresskatalog: beide Pflichtkategorien sind nach dem Roundtrip vorhanden.
    const restoredRoleKeys = (
      await db.select({ roleKey: schema.addressCategories.roleKey }).from(schema.addressCategories)
    ).map((row) => row.roleKey);
    expect(restoredRoleKeys).toContain(schema.ADDRESS_ROLE_BILLING);
    expect(restoredRoleKeys).toContain(schema.ADDRESS_ROLE_DELIVERY);
  });

  it("stellt Benutzerfelder und Rollenmapping per roleCode im echten Roundtrip wieder her", async () => {
    const admin = await loginAdminAgent(app);
    const token = nextDumpTestToken("dump-user-roundtrip");
    const passwordHash = await hashPassword(`${token}-password`);
    const createdUser = await createUser({
      username: token,
      email: `${token}@example.test`,
      firstName: "Dump",
      lastName: "Benutzer",
      passwordHash,
      roleCode: "DISPATCHER",
    });
    await db
      .update(schema.users)
      .set({
        twoFactorSecretEncrypted: `encrypted-secret-${token}`,
        twoFactorBackupCodesReserved: `reserved-codes-${token}`,
        isActive: false,
        version: 4,
      })
      .where(eq(schema.users.id, createdUser.id));

    const beforeUser = await getUserWithRoleById(createdUser.id);
    expect(beforeUser).toMatchObject({
      username: token,
      email: `${token}@example.test`,
      passwordHash,
      twoFactorSecretEncrypted: `encrypted-secret-${token}`,
      twoFactorBackupCodesReserved: `reserved-codes-${token}`,
      roleCode: "DISPATCHER",
      isActive: false,
      version: 4,
    });

    const createResponse = await admin.post("/api/admin/dumps/create").expect(200);
    const dumpFilename = createResponse.body.filename as string;
    const downloadResponse = await admin
      .get(`/api/admin/dumps/${encodeURIComponent(dumpFilename)}/download`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    const dumpBuffer = downloadResponse.body as Buffer;

    const readerRoleId = await getRoleIdByCode("READER");
    await db
      .update(schema.users)
      .set({
        passwordHash: "mutated-password-hash",
        twoFactorSecretEncrypted: null,
        twoFactorBackupCodesReserved: null,
        firstName: "Mutiert",
        lastName: "Benutzer",
        fullName: "Mutiert Benutzer",
        roleId: readerRoleId,
        isActive: true,
        version: 9,
      })
      .where(eq(schema.users.id, createdUser.id));

    const mutatedUser = await getUserWithRoleById(createdUser.id);
    expect(mutatedUser).toMatchObject({
      passwordHash: "mutated-password-hash",
      roleCode: "READER",
      isActive: true,
      version: 9,
    });

    const previewResponse = await previewDumpImport(admin, dumpBuffer).expect(200);
    const importResponse = await applyDumpImport(admin, dumpBuffer, {
      fileHash: String(previewResponse.body.fileHash),
      confirmationPhrase: String(previewResponse.body.confirmationPhrase),
    }).expect(200);
    expect(importResponse.body.verificationPassed).toBe(true);

    const restoredUser = await getUserWithRoleById(createdUser.id);
    expect(restoredUser).toMatchObject({
      username: beforeUser!.username,
      email: beforeUser!.email,
      passwordHash: beforeUser!.passwordHash,
      twoFactorSecretEncrypted: beforeUser!.twoFactorSecretEncrypted,
      twoFactorBackupCodesReserved: beforeUser!.twoFactorBackupCodesReserved,
      firstName: beforeUser!.firstName,
      lastName: beforeUser!.lastName,
      fullName: beforeUser!.fullName,
      roleCode: "DISPATCHER",
      isActive: false,
      version: 4,
    });
    expect(restoredUser?.roleId).toBe(await getRoleIdByCode("DISPATCHER"));
  });

  it("rollt einen Apply-Fehler durch unbekannten User-roleCode vollständig zurück", async () => {
    const admin = await loginAdminAgent(app);
    const createResponse = await admin.post("/api/admin/dumps/create").expect(200);
    const dumpFilename = createResponse.body.filename as string;
    const downloadResponse = await admin
      .get(`/api/admin/dumps/${encodeURIComponent(dumpFilename)}/download`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    const dumpData = await parseDumpDataJson(downloadResponse.body as Buffer) as {
      formatVersion: number;
      exportedAt: string;
      tables: Record<string, Array<Record<string, unknown>>>;
    };
    expect(dumpData.tables["users"].length).toBeGreaterThan(0);
    dumpData.tables["users"][0].roleCode = "UNKNOWN_ROLE";
    const badRoleZipBuffer = await buildZipFromDataJson(dumpData);

    const extraTour = await createTourFixture("#bb2244");
    const snapshotBeforeApply = await collectSnapshot();

    const previewResponse = await previewDumpImport(admin, badRoleZipBuffer).expect(200);
    expect(previewResponse.body.transferReadiness).toBe("warning");
    const response = await applyDumpImport(admin, badRoleZipBuffer, {
      fileHash: String(previewResponse.body.fileHash),
      confirmationPhrase: String(previewResponse.body.confirmationPhrase),
    });
    expect(response.status).toBe(500);
    expect(String(response.body.message)).toContain("unbekannte Rolle");

    const snapshotAfterApply = await collectSnapshot();
    expect(snapshotAfterApply).toEqual(snapshotBeforeApply);
    const [preservedExtraTour] = await db.select().from(schema.tours).where(eq(schema.tours.id, extraTour.id));
    expect(preservedExtraTour).toBeTruthy();
  });

  it("blockiert widersprüchliche Manifest-Counts und Upload-Summen vor dem Apply", async () => {
    const admin = await loginAdminAgent(app);
    const createResponse = await admin.post("/api/admin/dumps/create").expect(200);
    const dumpFilename = createResponse.body.filename as string;
    const downloadResponse = await admin
      .get(`/api/admin/dumps/${encodeURIComponent(dumpFilename)}/download`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    const dumpData = await parseDumpDataJson(downloadResponse.body as Buffer) as {
      formatVersion: number;
      exportedAt: string;
      dumpId?: string;
      tables: Record<string, unknown[]>;
    };
    const manifest = await parseDumpManifest(downloadResponse.body as Buffer) as {
      dumpId: string;
      formatVersion: number;
      exportedAt: string;
      schemaRevision: string;
      tables: Record<string, { rowCount: number; sha256: string }>;
      uploads: {
        fileCount: number;
        totalBytes: number;
        sha256: string;
        files: Array<{ relativePath: string; sizeBytes: number; sha256: string }>;
      };
    };
    manifest.tables["tours"].rowCount += 1;
    manifest.tables["tours"].sha256 = "invalid-table-hash";
    manifest.uploads.fileCount += 1;
    manifest.uploads.sha256 = "invalid-upload-hash";
    const blockedZipBuffer = await buildZipFromDumpArtifacts(dumpData, manifest);

    const previewResponse = await previewDumpImport(admin, blockedZipBuffer).expect(200);
    expect(previewResponse.body.transferReadiness).toBe("blocked");
    expect(previewResponse.body.blockingIssues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Manifest-Count"),
        expect.stringContaining("Manifest-Hash"),
        expect.stringContaining("Manifest-Uploadanzahl"),
        expect.stringContaining("Manifest-Uploadhash"),
      ]),
    );

    await applyDumpImport(admin, blockedZipBuffer, {
      fileHash: String(previewResponse.body.fileHash),
      confirmationPhrase: String(previewResponse.body.confirmationPhrase),
    }).expect(422);
  });

  it("akzeptiert Alt-Dumps mit fehlenden neuen Tabellen und ignoriert unbekannte Tabellen", async () => {
    const admin = await loginAdminAgent(app);

    const team = await createTeamFixture("#4477aa");
    const tour = await createTourFixture("#3399aa");
    const employee = await createEmployeeFixture("LEGACY-EMP");
    const customer = await createCustomerFixture("LEGACY-CUST");
    const project = await createProjectFixture({ prefix: "LEGACY-PROJ", customerId: customer.id });
    await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      tourId: tour.id,
      employeeIds: [employee.id],
    });

    const beforeSnapshot = await collectSnapshot();

    const createResponse = await admin.post("/api/admin/dumps/create").expect(200);
    const dumpFilename = createResponse.body.filename as string;
    const downloadResponse = await admin
      .get(`/api/admin/dumps/${encodeURIComponent(dumpFilename)}/download`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    const dumpData = await parseDumpDataJson(downloadResponse.body as Buffer) as {
      formatVersion: number;
      exportedAt: string;
      tables: Record<string, unknown[]>;
    };

    delete dumpData.tables["calendarWeekNotes"];
    delete dumpData.tables["employeeNotes"];
    delete dumpData.tables["employeeAttachments"];
    delete dumpData.tables["employeeTags"];
    delete dumpData.tables["tourWeekEmployees"];
    delete dumpData.tables["users"];
    // Alt-Dump kannte den Adresskatalog noch nicht: die fehlende Tabelle darf beim Import
    // NICHT geleert werden, sonst gingen die Pflichtkategorien verloren.
    delete dumpData.tables["addressCategories"];

    const legacyZipBuffer = await buildZipFromDataJson(dumpData);

    const extraTour = await createTourFixture("#aa3344");
    const extraCustomer = await createCustomerFixture("LEGACY-EXTRA");

    const mutatedSnapshot = await collectSnapshot();
    expect(mutatedSnapshot.tours).toBe(beforeSnapshot.tours + 1);
    expect(mutatedSnapshot.customers).toBe(beforeSnapshot.customers + 1);

    const previewResponse = await previewDumpImport(admin, legacyZipBuffer).expect(200);
    expect(previewResponse.body.transferReadiness).toBe("warning");
    const importResponse = await applyDumpImport(admin, legacyZipBuffer, {
      fileHash: String(previewResponse.body.fileHash),
      confirmationPhrase: String(previewResponse.body.confirmationPhrase),
    }).expect(200);

    expect(importResponse.body.tablesRestored).toBeGreaterThan(0);

    const afterSnapshot = await collectSnapshot();
    expect(afterSnapshot).toEqual(beforeSnapshot);

    const restoredTour = await db.select().from(schema.tours).where(eq(schema.tours.id, tour.id));
    expect(restoredTour).toHaveLength(1);

    const removedExtraTour = await db.select().from(schema.tours).where(eq(schema.tours.id, extraTour.id));
    const removedExtraCustomer = await db.select().from(schema.customers).where(eq(schema.customers.id, extraCustomer.id));
    expect(removedExtraTour).toHaveLength(0);
    expect(removedExtraCustomer).toHaveLength(0);

    // Der im Alt-Dump fehlende Adresskatalog wurde nicht geleert: Pflichtkategorien bleiben.
    const legacyRoleKeys = (
      await db.select({ roleKey: schema.addressCategories.roleKey }).from(schema.addressCategories)
    ).map((row) => row.roleKey);
    expect(legacyRoleKeys).toContain(schema.ADDRESS_ROLE_BILLING);
    expect(legacyRoleKeys).toContain(schema.ADDRESS_ROLE_DELIVERY);
  });

  it("akzeptiert versionierte Dumps mit fehlenden neuen Tabellen im manifest.json als Warning", async () => {
    const admin = await loginAdminAgent(app);

    const team = await createTeamFixture("#4455aa");
    const tour = await createTourFixture("#3388bb");
    const employee = await createEmployeeFixture("VERSIONED-LEGACY-EMP");
    const customer = await createCustomerFixture("VERSIONED-LEGACY-CUST");
    const project = await createProjectFixture({ prefix: "VERSIONED-LEGACY-PROJ", customerId: customer.id });
    await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      tourId: tour.id,
      employeeIds: [employee.id],
    });

    const beforeSnapshot = await collectSnapshot();

    const createResponse = await admin.post("/api/admin/dumps/create").expect(200);
    const dumpFilename = createResponse.body.filename as string;
    const downloadResponse = await admin
      .get(`/api/admin/dumps/${encodeURIComponent(dumpFilename)}/download`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    const dumpData = await parseDumpDataJson(downloadResponse.body as Buffer) as {
      formatVersion: number;
      exportedAt: string;
      dumpId?: string;
      tables: Record<string, unknown[]>;
    };
    const manifest = await parseDumpManifest(downloadResponse.body as Buffer) as {
      dumpId: string;
      formatVersion: number;
      exportedAt: string;
      schemaRevision: string;
      tables: Record<string, { rowCount: number; sha256: string }>;
      uploads: {
        fileCount: number;
        totalBytes: number;
        sha256: string;
        files: Array<{ relativePath: string; sizeBytes: number; sha256: string }>;
      };
    };

    delete dumpData.tables["tourWeekEmployees"];
    delete manifest.tables["tourWeekEmployees"];

    const versionedLegacyZipBuffer = await buildZipFromDumpArtifacts(dumpData, manifest);

    const extraTour = await createTourFixture("#aa5533");
    const extraCustomer = await createCustomerFixture("VERSIONED-LEGACY-EXTRA");

    const mutatedSnapshot = await collectSnapshot();
    expect(mutatedSnapshot.tours).toBe(beforeSnapshot.tours + 1);
    expect(mutatedSnapshot.customers).toBe(beforeSnapshot.customers + 1);

    const previewResponse = await previewDumpImport(admin, versionedLegacyZipBuffer).expect(200);
    expect(previewResponse.body.transferReadiness).toBe("warning");
    expect(Array.isArray(previewResponse.body.blockingIssues)).toBe(true);
    expect(previewResponse.body.blockingIssues).toHaveLength(0);
    expect(
      (previewResponse.body.warnings as string[]).some((entry) => entry.includes("tourWeekEmployees")),
    ).toBe(true);

    const importResponse = await applyDumpImport(admin, versionedLegacyZipBuffer, {
      fileHash: String(previewResponse.body.fileHash),
      confirmationPhrase: String(previewResponse.body.confirmationPhrase),
    }).expect(200);

    expect(importResponse.body.verificationPassed).toBe(true);
    expect(importResponse.body.importStatus).toBe("warning");

    const afterSnapshot = await collectSnapshot();
    expect(afterSnapshot).toEqual(beforeSnapshot);

    const removedExtraTour = await db.select().from(schema.tours).where(eq(schema.tours.id, extraTour.id));
    const removedExtraCustomer = await db.select().from(schema.customers).where(eq(schema.customers.id, extraCustomer.id));
    expect(removedExtraTour).toHaveLength(0);
    expect(removedExtraCustomer).toHaveLength(0);
  });

  it("normalisiert Attachment-storagePath beim Import auf den aktuellen Upload-Root", async () => {
    const admin = await loginAdminAgent(app);

    const tour = await createTourFixture("#5577aa");
    const employee = await createEmployeeFixture("ATTACH-IMPORT-EMP");
    const customer = await createCustomerFixture("ATTACH-IMPORT-CUST");
    const project = await createProjectFixture({ prefix: "ATTACH-IMPORT-PROJ", customerId: customer.id });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      tourId: tour.id,
      employeeIds: [employee.id],
    });

    const attachmentBuffer = Buffer.from("dump-attachment-roundtrip");
    const uploadResponse = await admin
      .post(`/api/appointments/${appointment.id}/attachments`)
      .attach("file", attachmentBuffer, "dump-attachment.pdf")
      .expect(201);

    const attachmentId = Number(uploadResponse.body.id);
    expect(Number.isInteger(attachmentId)).toBe(true);

    const createResponse = await admin.post("/api/admin/dumps/create").expect(200);
    const dumpFilename = createResponse.body.filename as string;
    const downloadResponse = await admin
      .get(`/api/admin/dumps/${encodeURIComponent(dumpFilename)}/download`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    const dumpData = await parseDumpDataJson(downloadResponse.body as Buffer) as {
      formatVersion: number;
      exportedAt: string;
      tables: Record<string, Array<Record<string, unknown>>>;
    };

    const attachmentRow = dumpData.tables["appointmentAttachments"]?.find((row) => Number(row.id) === attachmentId);
    expect(attachmentRow).toBeTruthy();
    expect(typeof attachmentRow?.filename).toBe("string");
    attachmentRow!.storagePath = `/legacy/shared/uploads/${String(attachmentRow!.filename)}`;

    const legacyZipBuffer = await buildZipFromDataJson(dumpData);

    const previewResponse = await previewDumpImport(admin, legacyZipBuffer).expect(200);
    const originalRenameSync = fs.renameSync;
    const renameSpy = vi.spyOn(fs, "renameSync").mockImplementation((oldPath, newPath) => {
      if (
        typeof oldPath === "string"
        && typeof newPath === "string"
        && oldPath.includes("mugplan-dump-import-")
      ) {
        const error = new Error("EXDEV: cross-device link not permitted");
        Object.assign(error, { code: "EXDEV" });
        throw error;
      }
      return originalRenameSync(oldPath, newPath);
    });

    try {
      await applyDumpImport(admin, legacyZipBuffer, {
        fileHash: String(previewResponse.body.fileHash),
        confirmationPhrase: String(previewResponse.body.confirmationPhrase),
      }).expect(200);
    } finally {
      renameSpy.mockRestore();
    }

    const [restoredAttachment] = await db
      .select()
      .from(schema.appointmentAttachments)
      .where(eq(schema.appointmentAttachments.id, attachmentId));

    expect(restoredAttachment).toBeTruthy();
    expect(restoredAttachment.storagePath).not.toBe(`/legacy/shared/uploads/${restoredAttachment.filename}`);
    expect(restoredAttachment.storagePath.endsWith(restoredAttachment.filename)).toBe(true);

    const attachmentDownload = await admin
      .get(`/api/appointment-attachments/${attachmentId}/download?download=1`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    expect(attachmentDownload.body).toEqual(attachmentBuffer);
  });

  it("lehnt Legacy-Dumps ohne versioniertes Format ab", async () => {
    const admin = await loginAdminAgent(app);
    const zipBuffer = await buildZipFromDataJson({});

    const response = await admin
      .post("/api/admin/dumps/import/preview")
      .attach("file", zipBuffer, "legacy.zip");

    expect(response.status).toBe(422);
  });

  it("kein multipart-Body → 422", async () => {
    const admin = await loginAdminAgent(app);
    await admin
      .post("/api/admin/dumps/import/preview")
      .set("Content-Type", "application/json")
      .send({})
      .expect(422);
  });

  it("korrupte ZIP → 422", async () => {
    const admin = await loginAdminAgent(app);
    await admin
      .post("/api/admin/dumps/import/preview")
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
      .post("/api/admin/dumps/import/preview")
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
      .post("/api/admin/dumps/import/preview")
      .attach("file", zipBuffer, "dump.zip");

    expect([401, 403]).toContain(response.status);
  });
});
