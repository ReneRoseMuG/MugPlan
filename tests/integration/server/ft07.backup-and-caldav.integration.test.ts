/**
 * Test Scope:
 *
 * Feature: FT07 - Automatischer Kalenderbackup + CalDAV-Outbound-Sync
 * Use Case: UC07 - Echte Integrationspruefung mit _test DB und Dateiausgaben
 *
 * Abgedeckte Regeln:
 * - Scheduler erzeugt bei relevanten Datenaenderungen ein success-Backup mit Excel/PDF/ZIP-Dateien.
 * - Zweiter Lauf ohne relevante Datenaenderung erzeugt skipped (no_changes).
 * - Manueller Admin-Backup-Run erzeugt erzwungen einen Exportlauf.
 * - Admin-Backuplog-API und Download-Endpunkte liefern echte Daten aus backup_log/file_path fuer Excel/PDF/ZIP.
 * - CalDAV-Outbound-Sync sendet PUT/DELETE bei Termin create/update/delete an HTTPS-Endpoint.
 * - CalDAV-Persistenz schreibt external_event_id und calendar_sync_log.
 *
 * Fehlerfaelle:
 * - Fehlende Dateierzeugung trotz success-Log.
 * - Fehlende Skip-Logik bei unveraenderten Daten.
 * - CalDAV-Aufrufe blockieren nicht, aber werden nicht ausgeliefert.
 *
 * Ziel:
 * End-to-End-Absicherung des FT07-Kerns mit echter Testdatenbank und echten Ausgabedateien.
 */
import express from "express";
import { createServer as createHttpServer } from "http";
import { createServer as createHttpsServer } from "https";
import mysql from "mysql2/promise";
import request, { type SuperAgentTest } from "supertest";
import fs from "fs/promises";
import path from "path";
import XlsxPopulate from "xlsx-populate";
import selfsigned from "selfsigned";
import { sql } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersRepository from "../../../server/repositories/customersRepository";
import * as projectsRepository from "../../../server/repositories/projectsRepository";
import * as toursRepository from "../../../server/repositories/toursRepository";
import * as appointmentsService from "../../../server/services/appointmentsService";
import * as backupRepository from "../../../server/repositories/backupRepository";
import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import * as calendarSyncRepository from "../../../server/repositories/calendarSyncRepository";
import { runBackupSchedulerTick } from "../../../server/services/backupScheduler";
import { getAuthUserByUsername } from "../../../server/repositories/usersRepository";
import * as userSettingsService from "../../../server/services/userSettingsService";
import { getRuntimeConfig, getRuntimeMode } from "../../../server/config/runtimeEnv";
import * as dbSafetyGuards from "../../../server/security/dbSafetyGuards";
import { db } from "../../../server/db";

let app: express.Express;
const backupBaseDir = path.resolve(process.cwd(), ".tmp", "ft07-integration-backups");

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createHttpServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

afterEach(async () => {
  await fs.rm(backupBaseDir, { recursive: true, force: true });
  delete process.env.CALDAV_URL;
  delete process.env.CALDAV_USER;
  delete process.env.CALDAV_PASS;
  delete process.env.CALDAV_ALLOW_INSECURE_TLS;
  delete process.env.FT07_DISABLE_DB_LOCK;
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function setGlobalSetting(key: string, value: unknown): Promise<void> {
  const admin = await getAuthUserByUsername("test-admin");
  if (!admin) throw new Error("test-admin missing");
  const resolved = await userSettingsService.getResolvedSettingsForUser(admin.userId);
  const row = resolved.find((entry) => entry.key === key);
  if (!row) throw new Error(`setting missing: ${key}`);
  const currentVersion = typeof row.globalVersion === "number" && row.globalVersion >= 1 ? row.globalVersion : 1;
  await userSettingsService.setSettingForUser(admin.userId, {
    key,
    scopeType: "GLOBAL",
    version: currentVersion,
    value,
  });
}

function futureDate(days = 3): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function seedDomainData() {
  const customer = await customersRepository.createCustomer({
    customerNumber: `FT07-CUST-${Date.now()}`,
    firstName: "Max",
    lastName: "Mustermann",
    fullName: "Mustermann, Max",
    company: null,
    email: null,
    phone: "12345",
    addressLine1: "Musterstrasse 1",
    addressLine2: null,
    postalCode: "12345",
    city: "Berlin",
    version: 1,
  });

  const project = await projectsRepository.createProject({
    name: `FT07 Projekt ${Date.now()}`,
    orderNumber: "A-FT07",
    customerId: customer.id,
    descriptionMd: "Backup Test Projekt",
    version: 1,
  });

  const tour = await toursRepository.createTour(`Tour ${Date.now()}`, "#22c55e");

  const created = await appointmentsService.createAppointment({
    projectId: project.id,
    tourId: tour.id,
    startDate: futureDate(5),
    endDate: null,
    startTime: "09:00",
    employeeIds: [],
  });

  if (!created) throw new Error("appointment create failed");
  return { customer, project, tour, appointmentId: created.id };
}

function parseFilePathJson(value: string | null): { excelPath?: string; pdfPath?: string } {
  if (!value) return {};
  try {
    return JSON.parse(value) as { excelPath?: string; pdfPath?: string; zipPath?: string };
  } catch {
    return {};
  }
}

async function waitFor(condition: () => boolean | Promise<boolean>, timeoutMs = 4000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("waitFor timeout");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function clearBackupLogs(): Promise<void> {
  const runtimeMode = getRuntimeMode();
  const runtimeConfig = getRuntimeConfig();
  const target = dbSafetyGuards.assertSafeDestructiveOperationTarget({
    mode: runtimeMode,
    databaseUrl: runtimeConfig.mysqlDatabaseUrl,
    allowedDatabases: runtimeConfig.allowedDatabases,
    allowedHosts: runtimeConfig.allowedHosts,
  });

  const safetyConnection = await mysql.createConnection(runtimeConfig.mysqlDatabaseUrl);
  try {
    await dbSafetyGuards.assertSqlDatabaseIdentity(safetyConnection, target.dbName);
  } finally {
    await safetyConnection.end();
  }

  try {
    await db.execute(sql`DELETE FROM backup_log`);
  } catch {
    // Ignore when table does not exist yet; scheduler/repo creates it lazily.
  }
  try {
    await db.execute(sql`DELETE FROM calendar_sync_log`);
  } catch {
    // Ignore when table does not exist yet.
  }
}

describe("FT07 integration: backup scheduler + caldav outbound", () => {
  it("blocks backup-log cleanup when destructive target guard fails", async () => {
    const guardSpy = vi
      .spyOn(dbSafetyGuards, "assertSafeDestructiveOperationTarget")
      .mockImplementation(() => {
        throw new Error("UNSAFE_DATABASE_TARGET");
      });

    await expect(clearBackupLogs()).rejects.toThrow("UNSAFE_DATABASE_TARGET");
    guardSpy.mockRestore();
  });

  it("creates real backup files and logs success, then skips on no_changes", async () => {
    await clearBackupLogs();
    process.env.FT07_DISABLE_DB_LOCK = "1";
    await setGlobalSetting("backup_enabled", true);
    process.env.BACKUP_BASE_PATH = backupBaseDir;
    await sleep(1200);
    await seedDomainData();

    await runBackupSchedulerTick();
    const firstLogs = await backupRepository.listBackupLogs(10);
    expect(firstLogs.length).toBeGreaterThan(0);
    expect(firstLogs[0]?.status).toBe("success");

    const fileInfo = parseFilePathJson(firstLogs[0]?.filePath ?? null);
    expect(fileInfo.excelPath).toBeTruthy();
    expect(fileInfo.pdfPath).toBeTruthy();
    expect(fileInfo.zipPath).toBeTruthy();
    await expect(fs.stat(fileInfo.excelPath!)).resolves.toBeTruthy();
    await expect(fs.stat(fileInfo.pdfPath!)).resolves.toBeTruthy();
    await expect(fs.stat(fileInfo.zipPath!)).resolves.toBeTruthy();

    const workbook = await XlsxPopulate.fromFileAsync(fileInfo.excelPath!);
    expect(workbook.sheet("Kalender")).toBeTruthy();
    expect(workbook.sheet("Termine")).toBeTruthy();
    expect(workbook.sheet("Projekte")).toBeTruthy();
    expect(workbook.sheet("Kunden")).toBeTruthy();
    expect(workbook.sheet("Mitarbeiter")).toBeTruthy();
    expect((workbook.sheet("Termine")?.usedRange()?.value()?.length ?? 0)).toBeGreaterThan(1);

    const pdfBuffer = await fs.readFile(fileInfo.pdfPath!);
    expect(pdfBuffer.byteLength).toBeGreaterThan(100);
    expect(pdfBuffer.slice(0, 4).toString()).toBe("%PDF");

    await runBackupSchedulerTick();
    const secondLogs = await backupRepository.listBackupLogs(10);
    expect(secondLogs[0]?.status).toBe("skipped");
    expect(secondLogs[0]?.errorMessage).toBe("no_changes");
  });

  it("exposes backup logs and downloads via admin API", async () => {
    await clearBackupLogs();
    process.env.FT07_DISABLE_DB_LOCK = "1";
    await setGlobalSetting("backup_enabled", true);
    process.env.BACKUP_BASE_PATH = backupBaseDir;
    await sleep(1200);
    await seedDomainData();
    await runBackupSchedulerTick();

    const agent = await loginAdminAgent();
    const logsResponse = await agent.get("/api/admin/backups/logs").expect(200);
    expect(Array.isArray(logsResponse.body)).toBe(true);
    const success = logsResponse.body.find((row: any) => row.status === "success");
    expect(success).toBeTruthy();
    expect(typeof success.createdAt).toBe("string");

    await agent.get(`/api/admin/backups/${success.id}/download/excel`).expect(200);
    await agent.get(`/api/admin/backups/${success.id}/download/pdf`).expect(200);
    await agent.get(`/api/admin/backups/${success.id}/download/zip`).expect(200);
  });

  it("runs forced backup via admin API even without data changes", async () => {
    await clearBackupLogs();
    process.env.FT07_DISABLE_DB_LOCK = "1";
    await setGlobalSetting("backup_enabled", false);
    process.env.BACKUP_BASE_PATH = backupBaseDir;
    await sleep(1200);
    await seedDomainData();

    const agent = await loginAdminAgent();
    const runResponse = await agent.post("/api/admin/backups/run").expect(200);
    expect(runResponse.body.status).toBe("success");
    expect(runResponse.body.reason).toBeNull();
    const fileInfo = parseFilePathJson(runResponse.body.filePath ?? null);
    expect(fileInfo.excelPath).toBeTruthy();
    expect(fileInfo.pdfPath).toBeTruthy();
    expect(fileInfo.zipPath).toBeTruthy();
    await expect(fs.stat(fileInfo.excelPath!)).resolves.toBeTruthy();
    await expect(fs.stat(fileInfo.pdfPath!)).resolves.toBeTruthy();
    await expect(fs.stat(fileInfo.zipPath!)).resolves.toBeTruthy();

    const logsResponse = await agent.get("/api/admin/backups/logs").expect(200);
    expect(logsResponse.body[0]?.status).toBe("success");
  });

  it("dispatches CalDAV PUT/DELETE on appointment create/update/delete against HTTPS test endpoint", async () => {
    process.env.FT07_DISABLE_DB_LOCK = "1";
    const requests: Array<{ method: string; url: string; body: string }> = [];
    const pems = await selfsigned.generate(
      [{ name: "commonName", value: "127.0.0.1" }],
      {
        days: 1,
        keySize: 2048,
        algorithm: "sha256",
      },
    );
    process.env.CALDAV_ALLOW_INSECURE_TLS = "1";

    const httpsApp = express();
    httpsApp.use(express.text({ type: "*/*" }));
    httpsApp.use((req, res) => {
      requests.push({ method: req.method, url: req.url, body: typeof req.body === "string" ? req.body : "" });
      res.status(204).send();
    });

    let port = 0;
    const server = createHttpsServer({ key: pems.private, cert: pems.cert }, httpsApp);
    try {
      await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", () => {
          const address = server.address();
          if (address && typeof address === "object") port = address.port;
          resolve();
        });
      });

      process.env.CALDAV_URL = `https://127.0.0.1:${port}/caldav`;
      process.env.CALDAV_USER = "user";
      process.env.CALDAV_PASS = "pass";

      const seeded = await seedDomainData();
      const createdCountBefore = requests.length;
      await waitFor(() => requests.length > createdCountBefore);
      expect(requests.some((r) => r.method === "PUT" && r.url.includes("mugplan-appointment"))).toBe(true);
      await waitFor(async () => {
        const appointment = await appointmentsRepository.getAppointment(seeded.appointmentId);
        return Boolean(appointment?.externalEventId);
      });
      const afterCreate = await appointmentsRepository.getAppointment(seeded.appointmentId);
      expect(afterCreate?.externalEventId).toContain(`mugplan-appointment-${seeded.appointmentId}`);

      const details = await appointmentsService.getAppointmentDetails(seeded.appointmentId);
      if (!details) throw new Error("details missing");
      await appointmentsService.updateAppointment(
        seeded.appointmentId,
        {
          version: details.version,
          projectId: details.projectId,
          tourId: details.tourId,
          startDate: details.startDate,
          endDate: details.endDate,
          startTime: "10:00",
          employeeIds: [],
        },
        "ADMIN",
      );
      await waitFor(() => requests.filter((r) => r.method === "PUT").length >= 2);

      const latest = await appointmentsService.getAppointmentDetails(seeded.appointmentId);
      if (!latest) throw new Error("latest missing");
      await appointmentsService.deleteAppointment(seeded.appointmentId, latest.version, "ADMIN");
      await waitFor(() => requests.some((r) => r.method === "DELETE"));
      await waitFor(async () => {
        const rows = await calendarSyncRepository.listCalendarSyncLogs(10);
        return rows.length >= 3;
      });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
