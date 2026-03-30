import fs from "fs";
import os from "os";
import path from "path";
import archiver from "archiver";
import unzipper from "unzipper";
import { drizzle } from "drizzle-orm/mysql2";
import { getTableColumns, getTableName } from "drizzle-orm";
import * as schema from "@shared/schema";
import { db, pool } from "../db";
import { getRuntimeConfig, getRuntimeMode } from "../config/runtimeEnv";
import { getAttachmentStoragePath, getBackupBasePath } from "../config/storagePaths";
import { logError } from "../lib/logger";
import {
  assertSafeAdminDestructiveOperationTarget,
  assertSqlDatabaseIdentity,
} from "../security/dbSafetyGuards";

export class DumpServiceError extends Error {
  status: number;
  code: "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "INTERNAL_ERROR";

  constructor(
    message: string,
    status: number,
    code: "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "INTERNAL_ERROR",
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function isDumpServiceError(e: unknown): e is DumpServiceError {
  return e instanceof DumpServiceError;
}

type RequestContext = {
  roleKey: "LESER" | "DISPONENT" | "ADMIN";
};

function requireAdmin(context: RequestContext): void {
  if (context.roleKey !== "ADMIN") {
    throw new DumpServiceError("Keine Berechtigung", 403, "FORBIDDEN");
  }
}

const DUMP_FILENAME_REGEX = /^dump_\d{4}-\d{2}-\d{2}T[\d-]+Z\.zip$/;
export const DUMP_FORMAT_VERSION = 2 as const;

function validateFilename(filename: string): void {
  if (!DUMP_FILENAME_REGEX.test(filename)) {
    throw new DumpServiceError("Ungültiger Dateiname", 422, "VALIDATION_ERROR");
  }
}

async function getDumpsDir(): Promise<string> {
  const basePath = await getBackupBasePath();
  const dumpsDir = path.join(basePath, "dumps");
  fs.mkdirSync(dumpsDir, { recursive: true });
  return dumpsDir;
}

const DUMP_TABLE_ENTRIES = [
  { key: "tags", table: schema.tags },
  { key: "tours", table: schema.tours },
  { key: "teams", table: schema.teams },
  { key: "productCategories", table: schema.productCategories },
  { key: "componentCategories", table: schema.componentCategories },
  { key: "helpTexts", table: schema.helpTexts },
  { key: "noteTemplates", table: schema.noteTemplates },
  { key: "notes", table: schema.notes },
  { key: "employees", table: schema.employees },
  { key: "customers", table: schema.customers },
  { key: "products", table: schema.products },
  { key: "components", table: schema.components },
  { key: "projects", table: schema.projects },
  { key: "projectOrder", table: schema.projectOrder },
  { key: "projectOrderItems", table: schema.projectOrderItems },
  { key: "projectNotes", table: schema.projectNotes },
  { key: "projectAttachments", table: schema.projectAttachments },
  { key: "projectTags", table: schema.projectTags },
  { key: "appointments", table: schema.appointments },
  { key: "appointmentEmployees", table: schema.appointmentEmployees },
  { key: "appointmentNotes", table: schema.appointmentNotes },
  { key: "appointmentAttachments", table: schema.appointmentAttachments },
  { key: "appointmentTags", table: schema.appointmentTags },
  { key: "customerNotes", table: schema.customerNotes },
  { key: "customerAttachments", table: schema.customerAttachments },
  { key: "customerTags", table: schema.customerTags },
  { key: "employeeNotes", table: schema.employeeNotes },
  { key: "employeeAttachments", table: schema.employeeAttachments },
  { key: "employeeTags", table: schema.employeeTags },
  { key: "calendarWeekNotes", table: schema.calendarWeekNotes },
  { key: "calendarSyncLog", table: schema.calendarSyncLog },
  { key: "userSettingsValue", table: schema.userSettingsValue },
  { key: "backupLog", table: schema.backupLog },
] as const;

export const DUMP_TABLE_KEYS = DUMP_TABLE_ENTRIES.map((entry) => entry.key);
export const EXCLUDED_DUMP_TABLE_KEYS = [
  "users",
  "roles",
  "componentSpecifications",
  "productComponent",
  "employeeAbsences",
  "seedRuns",
  "seedRunEntities",
] as const;

type DumpTableKey = (typeof DUMP_TABLE_KEYS)[number];

type DumpPayload = {
  formatVersion: typeof DUMP_FORMAT_VERSION;
  exportedAt: string;
  tables: Record<DumpTableKey, unknown[]>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any;

function buildArchive(zipPath: string): { archive: archiver.Archiver; finalize: () => Promise<void> } {
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(output);

  const finalize = (): Promise<void> =>
    new Promise((resolve, reject) => {
      output.on("close", resolve);
      output.on("error", reject);
      archive.on("error", reject);
      void archive.finalize();
    });

  return { archive, finalize };
}

function buildDumpPayload(tableRows: Record<DumpTableKey, unknown[]>): DumpPayload {
  return {
    formatVersion: DUMP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    tables: tableRows,
  };
}

function parseDumpPayload(raw: unknown): DumpPayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new DumpServiceError("data.json hat kein gültiges Format", 422, "VALIDATION_ERROR");
  }

  const candidate = raw as Partial<DumpPayload> & { tables?: Record<string, unknown> };
  if (candidate.formatVersion !== DUMP_FORMAT_VERSION) {
    throw new DumpServiceError("Nicht unterstützte Dump-Version", 422, "VALIDATION_ERROR");
  }
  if (typeof candidate.exportedAt !== "string" || candidate.exportedAt.trim().length === 0) {
    throw new DumpServiceError("Dump-Metadaten fehlen", 422, "VALIDATION_ERROR");
  }
  if (!candidate.tables || typeof candidate.tables !== "object" || Array.isArray(candidate.tables)) {
    throw new DumpServiceError("Dump-Tabellen fehlen", 422, "VALIDATION_ERROR");
  }

  const tableKeys = Object.keys(candidate.tables);
  const unknownKeys = tableKeys.filter((key) => !DUMP_TABLE_KEYS.includes(key as DumpTableKey));
  const missingKeys = DUMP_TABLE_KEYS.filter((key) => !(key in candidate.tables!));
  if (unknownKeys.length > 0) {
    throw new DumpServiceError(`Unbekannte Tabellen im Dump: ${unknownKeys.join(", ")}`, 422, "VALIDATION_ERROR");
  }
  if (missingKeys.length > 0) {
    throw new DumpServiceError(`Fehlende Tabellen im Dump: ${missingKeys.join(", ")}`, 422, "VALIDATION_ERROR");
  }

  const tables = {} as Record<DumpTableKey, unknown[]>;
  for (const key of DUMP_TABLE_KEYS) {
    const rows = candidate.tables[key];
    if (!Array.isArray(rows)) {
      throw new DumpServiceError(`Tabelle '${key}' hat kein gültiges Array-Format`, 422, "VALIDATION_ERROR");
    }
    tables[key] = rows;
  }

  return {
    formatVersion: DUMP_FORMAT_VERSION,
    exportedAt: candidate.exportedAt,
    tables,
  };
}

/**
 * Converts ISO date strings back to Date objects for columns that Drizzle maps as Date
 * (MySqlTimestamp and MySqlDate without mode:"string").
 */
function coerceRowDates(table: AnyTable, rows: unknown[]): unknown[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cols = getTableColumns(table as any) as Record<string, any>;
  const dateKeys = new Set<string>();

  for (const [key, col] of Object.entries(cols)) {
    const ct: string = col.columnType ?? "";
    const mode: string | undefined = col.config?.mode;
    if (ct === "MySqlTimestamp" || (ct === "MySqlDate" && mode !== "string")) {
      dateKeys.add(key);
    }
  }

  if (dateKeys.size === 0) return rows;

  const dateKeyList = Array.from(dateKeys);
  return rows.map((row) => {
    const input = row as Record<string, unknown>;
    const result = { ...input };
    for (const key of dateKeyList) {
      const value = result[key];
      if (typeof value === "string" && value.length > 0) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          result[key] = parsed;
        }
      }
    }
    return result;
  });
}

function buildUploadsStageDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mugplan-dump-import-"));
}

async function stageUploads(directory: unzipper.CentralDirectory): Promise<{ stageDir: string | null; hasUploads: boolean }> {
  const uploadFiles = directory.files.filter((file) => file.path.startsWith("uploads/") && !file.path.endsWith("/"));
  if (uploadFiles.length === 0) {
    return { stageDir: null, hasUploads: false };
  }

  const stageDir = buildUploadsStageDir();
  for (const file of uploadFiles) {
    const relativePath = file.path.slice("uploads/".length);
    if (!relativePath || relativePath.includes("..")) {
      throw new DumpServiceError("Ungültiger Upload-Pfad im Dump", 422, "VALIDATION_ERROR");
    }
    const targetPath = path.join(stageDir, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    const content = await file.buffer();
    fs.writeFileSync(targetPath, content);
  }

  return { stageDir, hasUploads: true };
}

function cleanupStageDir(stageDir: string | null): void {
  if (!stageDir) return;
  fs.rmSync(stageDir, { recursive: true, force: true });
}

async function restoreUploadsFromStage(stageDir: string | null): Promise<boolean> {
  if (!stageDir) return false;

  const uploadsPath = await getAttachmentStoragePath();
  const backupPath = `${uploadsPath}.dump-restore-backup`;
  fs.rmSync(backupPath, { recursive: true, force: true });

  const uploadsExists = fs.existsSync(uploadsPath);
  if (uploadsExists) {
    fs.renameSync(uploadsPath, backupPath);
  }

  try {
    fs.mkdirSync(path.dirname(uploadsPath), { recursive: true });
    fs.renameSync(stageDir, uploadsPath);
    fs.rmSync(backupPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    fs.rmSync(uploadsPath, { recursive: true, force: true });
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, uploadsPath);
    }
    throw error;
  }
}

async function assertSafeImportTarget(): Promise<void> {
  const mode = getRuntimeMode();
  const runtimeConfig = getRuntimeConfig();
  const expectedTarget = assertSafeAdminDestructiveOperationTarget({
    mode,
    databaseUrl: runtimeConfig.mysqlDatabaseUrl,
    allowedDatabases: runtimeConfig.allowedDatabases,
    allowedHosts: runtimeConfig.allowedHosts,
  });
  const conn = await pool.getConnection();
  try {
    await assertSqlDatabaseIdentity(conn, expectedTarget.dbName);
  } finally {
    conn.release();
  }
}

export async function createDump(context: RequestContext): Promise<{
  filename: string;
  sizeBytes: number;
  createdAt: string;
}> {
  requireAdmin(context);

  const dumpsDir = await getDumpsDir();
  const isoTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `dump_${isoTimestamp}.zip`;
  const zipPath = path.join(dumpsDir, filename);
  const { archive, finalize } = buildArchive(zipPath);

  const tableRows = {} as Record<DumpTableKey, unknown[]>;
  for (const entry of DUMP_TABLE_ENTRIES) {
    tableRows[entry.key] = await db.select().from(entry.table as AnyTable);
  }

  archive.append(JSON.stringify(buildDumpPayload(tableRows)), { name: "data.json" });

  const uploadsPath = await getAttachmentStoragePath();
  if (fs.existsSync(uploadsPath)) {
    archive.directory(uploadsPath, "uploads");
  }

  await finalize();

  const stat = fs.statSync(zipPath);
  return {
    filename,
    sizeBytes: stat.size,
    createdAt: stat.mtime.toISOString(),
  };
}

export async function listDumps(context: RequestContext): Promise<
  Array<{ filename: string; sizeBytes: number; createdAt: string }>
> {
  requireAdmin(context);

  const dumpsDir = await getDumpsDir();
  let files: string[];
  try {
    files = fs.readdirSync(dumpsDir);
  } catch {
    return [];
  }

  return files
    .filter((filename) => DUMP_FILENAME_REGEX.test(filename))
    .map((filename) => {
      const stat = fs.statSync(path.join(dumpsDir, filename));
      return {
        filename,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function resolveDumpDownloadPath(
  context: RequestContext,
  filename: string,
): Promise<{ filePath: string; fileName: string }> {
  requireAdmin(context);
  validateFilename(filename);

  const dumpsDir = await getDumpsDir();
  const filePath = path.join(dumpsDir, filename);
  if (!fs.existsSync(filePath)) {
    throw new DumpServiceError("Dump-Datei nicht gefunden", 404, "NOT_FOUND");
  }

  return { filePath, fileName: filename };
}

export async function importDump(
  context: RequestContext,
  fileBuffer: Buffer,
): Promise<{ tablesRestored: number; uploadsRestored: boolean; durationMs: number }> {
  requireAdmin(context);

  const mode = getRuntimeMode();
  if (mode === "production") {
    throw new DumpServiceError("Import ist in der Produktionsumgebung nicht erlaubt", 403, "FORBIDDEN");
  }

  const startMs = Date.now();
  let directory: unzipper.CentralDirectory;
  try {
    directory = await unzipper.Open.buffer(fileBuffer);
  } catch {
    throw new DumpServiceError("Ungültige oder beschädigte ZIP-Datei", 422, "VALIDATION_ERROR");
  }

  const dataFile = directory.files.find((file) => file.path === "data.json");
  if (!dataFile) {
    throw new DumpServiceError("ZIP enthält keine data.json", 422, "VALIDATION_ERROR");
  }

  let payload: DumpPayload;
  try {
    const parsed = JSON.parse((await dataFile.buffer()).toString("utf-8")) as unknown;
    payload = parseDumpPayload(parsed);
  } catch (error) {
    if (isDumpServiceError(error)) throw error;
    const message = error instanceof Error ? error.message : "Ungültiges JSON in data.json";
    throw new DumpServiceError(message, 422, "VALIDATION_ERROR");
  }

  const { stageDir, hasUploads } = await stageUploads(directory);
  await assertSafeImportTarget();

  const conn = await pool.getConnection();
  let tablesRestored = 0;
  try {
    await conn.execute("SET FOREIGN_KEY_CHECKS=0");
    await conn.beginTransaction();
    await assertSqlDatabaseIdentity(conn, assertSafeAdminDestructiveOperationTarget({
      mode,
      databaseUrl: getRuntimeConfig().mysqlDatabaseUrl,
      allowedDatabases: getRuntimeConfig().allowedDatabases,
      allowedHosts: getRuntimeConfig().allowedHosts,
    }).dbName);

    const connDb = drizzle(conn as any, { schema, mode: "default" });

    for (const entry of [...DUMP_TABLE_ENTRIES].reverse()) {
      await conn.execute(`DELETE FROM \`${getTableName(entry.table)}\``);
    }

    for (const entry of DUMP_TABLE_ENTRIES) {
      const rows = payload.tables[entry.key];
      if (rows.length === 0) {
        continue;
      }

      const coercedRows = coerceRowDates(entry.table, rows);
      const batchSize = 500;
      for (let index = 0; index < coercedRows.length; index += batchSize) {
        const batch = coercedRows.slice(index, index + batchSize);
        await connDb.insert(entry.table as AnyTable).values(batch as any[]);
      }
      tablesRestored += 1;
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    const detail = error instanceof Error ? error.message : String(error);
    logError("importDump: Datenbankfehler", {
      detail,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new DumpServiceError(`Datenbankfehler beim Import: ${detail}`, 500, "INTERNAL_ERROR");
  } finally {
    await conn.execute("SET FOREIGN_KEY_CHECKS=1");
    conn.release();
  }

  try {
    const uploadsRestored = await restoreUploadsFromStage(stageDir);
    return {
      tablesRestored,
      uploadsRestored,
      durationMs: Date.now() - startMs,
    };
  } catch (error) {
    cleanupStageDir(stageDir);
    const detail = error instanceof Error ? error.message : String(error);
    logError("importDump: Upload-Wiederherstellung fehlgeschlagen", { detail });
    throw new DumpServiceError(`Upload-Wiederherstellung fehlgeschlagen: ${detail}`, 500, "INTERNAL_ERROR");
  } finally {
    if (!hasUploads) {
      cleanupStageDir(stageDir);
    }
  }
}

export async function deleteDump(context: RequestContext, filename: string): Promise<{ ok: true }> {
  requireAdmin(context);
  validateFilename(filename);

  const dumpsDir = await getDumpsDir();
  const filePath = path.join(dumpsDir, filename);
  if (!fs.existsSync(filePath)) {
    throw new DumpServiceError("Dump-Datei nicht gefunden", 404, "NOT_FOUND");
  }

  fs.unlinkSync(filePath);
  return { ok: true };
}
