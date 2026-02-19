/**
 * Test Scope:
 *
 * Feature: FT07 - Automatischer Kalenderbackup + CalDAV-Outbound-Sync
 * Use Case: UC07 - Echte Integrationspruefung mit _test DB und Dateiausgaben
 *
 * Abgedeckte Regeln:
 * - Scheduler erzeugt bei relevanten Datenaenderungen ein success-Backup mit Excel/PDF-Dateien.
 * - Zweiter Lauf ohne relevante Datenaenderung erzeugt skipped (no_changes).
 * - Admin-Backuplog-API und Download-Endpunkte liefern echte Daten aus backup_log/file_path.
 * - CalDAV-Outbound-Sync sendet PUT/DELETE bei Termin create/update/delete an HTTPS-Endpoint.
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
import request, { type SuperAgentTest } from "supertest";
import fs from "fs/promises";
import path from "path";
import ExcelJS from "exceljs";
import selfsigned from "selfsigned";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersRepository from "../../../server/repositories/customersRepository";
import * as projectsRepository from "../../../server/repositories/projectsRepository";
import * as toursRepository from "../../../server/repositories/toursRepository";
import * as appointmentsService from "../../../server/services/appointmentsService";
import * as backupRepository from "../../../server/repositories/backupRepository";
import { runBackupSchedulerTick } from "../../../server/services/backupScheduler";
import { getAuthUserByUsername } from "../../../server/repositories/usersRepository";
import * as userSettingsService from "../../../server/services/userSettingsService";

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
  delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
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
    return JSON.parse(value) as { excelPath?: string; pdfPath?: string };
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

describe("FT07 integration: backup scheduler + caldav outbound", () => {
  it("creates real backup files and logs success, then skips on no_changes", async () => {
    process.env.FT07_DISABLE_DB_LOCK = "1";
    await setGlobalSetting("backup_enabled", true);
    await setGlobalSetting("backup_base_path", backupBaseDir);
    await seedDomainData();

    await runBackupSchedulerTick();
    const firstLogs = await backupRepository.listBackupLogs(10);
    expect(firstLogs.length).toBeGreaterThan(0);
    expect(firstLogs[0]?.status).toBe("success");

    const fileInfo = parseFilePathJson(firstLogs[0]?.filePath ?? null);
    expect(fileInfo.excelPath).toBeTruthy();
    expect(fileInfo.pdfPath).toBeTruthy();
    await expect(fs.stat(fileInfo.excelPath!)).resolves.toBeTruthy();
    await expect(fs.stat(fileInfo.pdfPath!)).resolves.toBeTruthy();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(fileInfo.excelPath!);
    expect(workbook.getWorksheet("Kalender")).toBeTruthy();
    expect(workbook.getWorksheet("Termine")).toBeTruthy();
    expect(workbook.getWorksheet("Projekte")).toBeTruthy();
    expect(workbook.getWorksheet("Kunden")).toBeTruthy();
    expect(workbook.getWorksheet("Mitarbeiter")).toBeTruthy();
    expect((workbook.getWorksheet("Termine")?.actualRowCount ?? 0)).toBeGreaterThan(1);

    const pdfBuffer = await fs.readFile(fileInfo.pdfPath!);
    expect(pdfBuffer.byteLength).toBeGreaterThan(100);
    expect(pdfBuffer.slice(0, 4).toString()).toBe("%PDF");

    await runBackupSchedulerTick();
    const secondLogs = await backupRepository.listBackupLogs(10);
    expect(secondLogs[0]?.status).toBe("skipped");
    expect(secondLogs[0]?.errorMessage).toBe("no_changes");
  });

  it("exposes backup logs and downloads via admin API", async () => {
    process.env.FT07_DISABLE_DB_LOCK = "1";
    await setGlobalSetting("backup_enabled", true);
    await setGlobalSetting("backup_base_path", backupBaseDir);
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
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
