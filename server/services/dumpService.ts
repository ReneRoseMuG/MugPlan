import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import archiver from "archiver";
import unzipper from "unzipper";
import { drizzle } from "drizzle-orm/mysql2";
import { count, getTableColumns, getTableName } from "drizzle-orm";
import * as schema from "@shared/schema";
import { db, pool } from "../db";
import { getRuntimeConfig, getRuntimeMode } from "../config/runtimeEnv";
import { getAttachmentStoragePath, getBackupBasePath } from "../config/storagePaths";
import { resolveAttachmentStoragePath } from "../lib/attachmentFiles";
import { logError } from "../lib/logger";
import {
  assertSafeAdminDestructiveOperationTarget,
  assertSafeDatabaseTargetForMode,
  assertSqlDatabaseIdentity,
  parseDatabaseLogInfo,
} from "../security/dbSafetyGuards";
import {
  createDumpTransferRun,
  writeDumpTransferBinaryArtifact,
  writeDumpTransferJsonArtifact,
} from "./dumpTransferStorageService";

export class DumpServiceError extends Error {
  status: number;
  code:
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "INTERNAL_ERROR"
    | "FILE_HASH_MISMATCH"
    | "CONFIRMATION_MISMATCH";

  constructor(
    message: string,
    status: number,
    code:
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION_ERROR"
      | "INTERNAL_ERROR"
      | "FILE_HASH_MISMATCH"
      | "CONFIRMATION_MISMATCH",
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

type AnyTable = any;

function requireAdmin(context: RequestContext): void {
  if (context.roleKey !== "ADMIN") {
    throw new DumpServiceError("Keine Berechtigung", 403, "FORBIDDEN");
  }
}

const DUMP_FILENAME_REGEX = /^dump_\d{4}-\d{2}-\d{2}T[\d-]+Z\.zip$/;
export const DUMP_FORMAT_VERSION = 3 as const;
const CURRENT_AND_LEGACY_DUMP_FORMAT_VERSIONS = new Set<number>([
  DUMP_FORMAT_VERSION,
  2,
]);

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
  { key: "tourWeekEmployees", table: schema.tourWeekEmployees },
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
  "employeeAbsences",
] as const;

type DumpTableKey = (typeof DUMP_TABLE_KEYS)[number];

const ATTACHMENT_DUMP_TABLE_KEYS = new Set<DumpTableKey>([
  "projectAttachments",
  "customerAttachments",
  "employeeAttachments",
  "appointmentAttachments",
]);

type DumpPayload = {
  formatVersion: number;
  exportedAt: string;
  dumpId?: string;
  tables: Record<DumpTableKey, unknown[]>;
};

type DumpTableManifestEntry = {
  rowCount: number;
  sha256: string;
};

type DumpUploadFileEntry = {
  relativePath: string;
  sizeBytes: number;
  sha256: string;
};

type DumpUploadsManifest = {
  fileCount: number;
  totalBytes: number;
  sha256: string;
  files: DumpUploadFileEntry[];
};

type DumpManifest = {
  dumpId: string;
  formatVersion: typeof DUMP_FORMAT_VERSION;
  exportedAt: string;
  schemaRevision: string;
  tables: Record<DumpTableKey, DumpTableManifestEntry>;
  uploads: DumpUploadsManifest;
};

type TableSummary = {
  key: DumpTableKey;
  rowCount: number;
  sha256: string;
};

type UploadSummary = {
  fileCount: number;
  totalBytes: number;
  sha256: string;
};

export type DumpImportPreviewResult = {
  fileHash: string;
  dumpId: string;
  targetDatabaseName: string;
  transferReadiness: "ready" | "warning" | "blocked";
  blockingIssues: string[];
  warnings: string[];
  confirmationPhrase: string;
  allowsProductionImport: boolean;
  isLegacyDump: boolean;
  manifestPresent: boolean;
  schemaRevision: string | null;
  expectedTables: TableSummary[];
  expectedUploads: UploadSummary;
};

export type DumpImportApplyResult = {
  transferId: string;
  dumpId: string;
  targetDatabaseName: string;
  targetBackupCreated: boolean;
  verificationPassed: boolean;
  importStatus: "success" | "warning" | "error";
  tablesRestored: number;
  uploadsRestored: boolean;
  durationMs: number;
  warnings: string[];
  blockingIssues: string[];
  journalPath: string;
  targetBackupPath: string | null;
  expectedUploads: UploadSummary;
  verifiedTables: Array<{
    key: DumpTableKey;
    expectedRowCount: number;
    actualRowCount: number;
    matches: boolean;
  }>;
  verifiedUploads: {
    fileCountMatches: boolean;
    totalBytesMatches: boolean;
    sha256Matches: boolean;
  };
};

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

function sha256Buffer(value: Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Json(value: unknown): string {
  return sha256Buffer(Buffer.from(JSON.stringify(value), "utf8"));
}

function getSchemaRevision(): string {
  try {
    const journalPath = path.resolve(process.cwd(), "migrations", "meta", "_journal.json");
    const parsed = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
      entries?: Array<{ idx?: number; tag?: string }>;
    };
    const lastEntry = Array.isArray(parsed.entries)
      ? [...parsed.entries].sort((a, b) => Number(a.idx ?? 0) - Number(b.idx ?? 0)).at(-1)
      : null;
    return typeof lastEntry?.tag === "string" && lastEntry.tag.trim().length > 0
      ? lastEntry.tag
      : "unknown";
  } catch {
    return "unknown";
  }
}

async function listUploadFilesFromDirectory(rootDir: string): Promise<DumpUploadFileEntry[]> {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const results: DumpUploadFileEntry[] = [];
  const walk = (currentDir: string) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const targetPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(targetPath);
        continue;
      }

      const relativePath = path.relative(rootDir, targetPath).replace(/\\/g, "/");
      const buffer = fs.readFileSync(targetPath);
      results.push({
        relativePath,
        sizeBytes: buffer.length,
        sha256: sha256Buffer(buffer),
      });
    }
  };

  walk(rootDir);
  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
}

async function listUploadFilesFromZip(directory: unzipper.CentralDirectory): Promise<DumpUploadFileEntry[]> {
  const uploadFiles = directory.files
    .filter((file) => file.path.startsWith("uploads/") && !file.path.endsWith("/"))
    .sort((a, b) => a.path.localeCompare(b.path, "en"));

  const entries: DumpUploadFileEntry[] = [];
  for (const file of uploadFiles) {
    const relativePath = file.path.slice("uploads/".length);
    const buffer = await file.buffer();
    entries.push({
      relativePath,
      sizeBytes: buffer.length,
      sha256: sha256Buffer(buffer),
    });
  }

  return entries;
}

function buildUploadsSummary(files: DumpUploadFileEntry[]): DumpUploadsManifest {
  const totalBytes = files.reduce((sum, entry) => sum + entry.sizeBytes, 0);
  const normalizedFiles = files.map((entry) => ({
    relativePath: entry.relativePath,
    sizeBytes: entry.sizeBytes,
    sha256: entry.sha256,
  }));
  return {
    fileCount: normalizedFiles.length,
    totalBytes,
    sha256: sha256Json(normalizedFiles),
    files: normalizedFiles,
  };
}

function buildDumpPayload(
  dumpId: string,
  exportedAt: string,
  tableRows: Record<DumpTableKey, unknown[]>,
): DumpPayload {
  return {
    formatVersion: DUMP_FORMAT_VERSION,
    exportedAt,
    dumpId,
    tables: tableRows,
  };
}

function buildDumpManifest(
  dumpId: string,
  exportedAt: string,
  tableRows: Record<DumpTableKey, unknown[]>,
  uploads: DumpUploadFileEntry[],
): DumpManifest {
  const tables = {} as Record<DumpTableKey, DumpTableManifestEntry>;
  for (const key of DUMP_TABLE_KEYS) {
    const rows = tableRows[key] ?? [];
    tables[key] = {
      rowCount: rows.length,
      sha256: sha256Json(rows),
    };
  }

  return {
    dumpId,
    formatVersion: DUMP_FORMAT_VERSION,
    exportedAt,
    schemaRevision: getSchemaRevision(),
    tables,
    uploads: buildUploadsSummary(uploads),
  };
}

function parseDumpPayload(raw: unknown): DumpPayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new DumpServiceError("data.json hat kein gültiges Format", 422, "VALIDATION_ERROR");
  }

  const candidate = raw as Partial<DumpPayload> & { tables?: Record<string, unknown> };
  if (!CURRENT_AND_LEGACY_DUMP_FORMAT_VERSIONS.has(Number(candidate.formatVersion))) {
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
  if (unknownKeys.length > 0) {
    logError("parseDumpPayload: unbekannte Tabellen im Dump ignoriert", {
      unknownKeys,
    });
  }

  const tables = {} as Record<DumpTableKey, unknown[]>;
  for (const key of DUMP_TABLE_KEYS) {
    const rows = key in candidate.tables ? candidate.tables[key] : [];
    if (!Array.isArray(rows)) {
      throw new DumpServiceError(`Tabelle '${key}' hat kein gültiges Array-Format`, 422, "VALIDATION_ERROR");
    }
    tables[key] = rows;
  }

  return {
    formatVersion: Number(candidate.formatVersion),
    exportedAt: candidate.exportedAt,
    dumpId: typeof candidate.dumpId === "string" && candidate.dumpId.trim().length > 0
      ? candidate.dumpId
      : undefined,
    tables,
  };
}

function parseDumpManifest(raw: unknown): DumpManifest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new DumpServiceError("manifest.json hat kein gueltiges Format", 422, "VALIDATION_ERROR");
  }

  const candidate = raw as {
    dumpId?: unknown;
    formatVersion?: unknown;
    exportedAt?: unknown;
    schemaRevision?: unknown;
    tables?: Record<string, unknown>;
    uploads?: {
      fileCount?: unknown;
      totalBytes?: unknown;
      sha256?: unknown;
      files?: unknown;
    };
  };

  if (candidate.formatVersion !== DUMP_FORMAT_VERSION) {
    throw new DumpServiceError("manifest.json hat eine ungueltige Dump-Version", 422, "VALIDATION_ERROR");
  }
  if (typeof candidate.dumpId !== "string" || candidate.dumpId.trim().length === 0) {
    throw new DumpServiceError("manifest.json enthaelt keine dumpId", 422, "VALIDATION_ERROR");
  }
  if (typeof candidate.exportedAt !== "string" || candidate.exportedAt.trim().length === 0) {
    throw new DumpServiceError("manifest.json enthaelt kein exportedAt", 422, "VALIDATION_ERROR");
  }
  if (typeof candidate.schemaRevision !== "string" || candidate.schemaRevision.trim().length === 0) {
    throw new DumpServiceError("manifest.json enthaelt keine schemaRevision", 422, "VALIDATION_ERROR");
  }
  if (!candidate.tables || typeof candidate.tables !== "object" || Array.isArray(candidate.tables)) {
    throw new DumpServiceError("manifest.json enthaelt keine Tabellenbeschreibung", 422, "VALIDATION_ERROR");
  }
  if (!candidate.uploads || typeof candidate.uploads !== "object") {
    throw new DumpServiceError("manifest.json enthaelt keine Upload-Beschreibung", 422, "VALIDATION_ERROR");
  }

  const tables = {} as Record<DumpTableKey, DumpTableManifestEntry>;
  for (const key of DUMP_TABLE_KEYS) {
    const value = candidate.tables[key];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new DumpServiceError(`manifest.json enthaelt keinen gueltigen Tabellen-Eintrag fuer '${key}'`, 422, "VALIDATION_ERROR");
    }
    const rowCount = Number((value as { rowCount?: unknown }).rowCount);
    const sha256 = (value as { sha256?: unknown }).sha256;
    if (!Number.isInteger(rowCount) || rowCount < 0 || typeof sha256 !== "string" || sha256.length === 0) {
      throw new DumpServiceError(`manifest.json ist fuer Tabelle '${key}' ungueltig`, 422, "VALIDATION_ERROR");
    }
    tables[key] = { rowCount, sha256 };
  }

  const uploadFilesRaw = candidate.uploads.files;
  if (!Array.isArray(uploadFilesRaw)) {
    throw new DumpServiceError("manifest.json enthaelt keine gueltige Upload-Dateiliste", 422, "VALIDATION_ERROR");
  }

  const files = uploadFilesRaw.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new DumpServiceError("manifest.json enthaelt einen ungueltigen Upload-Dateieintrag", 422, "VALIDATION_ERROR");
    }
    const relativePath = (entry as { relativePath?: unknown }).relativePath;
    const sizeBytes = Number((entry as { sizeBytes?: unknown }).sizeBytes);
    const sha256 = (entry as { sha256?: unknown }).sha256;
    if (
      typeof relativePath !== "string"
      || relativePath.length === 0
      || !Number.isInteger(sizeBytes)
      || sizeBytes < 0
      || typeof sha256 !== "string"
      || sha256.length === 0
    ) {
      throw new DumpServiceError("manifest.json enthaelt einen ungueltigen Upload-Dateieintrag", 422, "VALIDATION_ERROR");
    }
    return { relativePath, sizeBytes, sha256 };
  });

  const fileCount = Number(candidate.uploads.fileCount);
  const totalBytes = Number(candidate.uploads.totalBytes);
  const sha256 = candidate.uploads.sha256;
  if (
    !Number.isInteger(fileCount)
    || fileCount < 0
    || !Number.isInteger(totalBytes)
    || totalBytes < 0
    || typeof sha256 !== "string"
    || sha256.length === 0
  ) {
    throw new DumpServiceError("manifest.json enthaelt ungueltige Upload-Summen", 422, "VALIDATION_ERROR");
  }

  return {
    dumpId: candidate.dumpId,
    formatVersion: DUMP_FORMAT_VERSION,
    exportedAt: candidate.exportedAt,
    schemaRevision: candidate.schemaRevision,
    tables,
    uploads: {
      fileCount,
      totalBytes,
      sha256,
      files,
    },
  };
}

/**
 * Converts ISO date strings back to Date objects for columns that Drizzle maps as Date
 * (MySqlTimestamp and MySqlDate without mode:"string").
 */
function coerceRowDates(table: AnyTable, rows: unknown[]): unknown[] {
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

async function normalizeImportedAttachmentRows(rows: unknown[]): Promise<unknown[]> {
  return Promise.all(rows.map(async (row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return row;
    }

    const candidate = row as Record<string, unknown>;
    const filename = candidate.filename;
    if (typeof filename !== "string" || filename.trim().length === 0) {
      return row;
    }

    return {
      ...candidate,
      storagePath: await resolveAttachmentStoragePath(filename),
    };
  }));
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

function isCrossDeviceRenameError(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === "object"
    && "code" in error
    && (error as { code?: unknown }).code === "EXDEV",
  );
}

function moveDirectorySync(sourcePath: string, targetPath: string): void {
  try {
    fs.renameSync(sourcePath, targetPath);
  } catch (error) {
    if (!isCrossDeviceRenameError(error)) {
      throw error;
    }

    fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
    fs.rmSync(sourcePath, { recursive: true, force: true });
  }
}

async function restoreUploadsFromStage(stageDir: string | null): Promise<boolean> {
  if (!stageDir) return false;

  const uploadsPath = await getAttachmentStoragePath();
  const backupPath = `${uploadsPath}.dump-restore-backup`;
  fs.rmSync(backupPath, { recursive: true, force: true });

  const uploadsExists = fs.existsSync(uploadsPath);
  if (uploadsExists) {
    moveDirectorySync(uploadsPath, backupPath);
  }

  try {
    fs.mkdirSync(path.dirname(uploadsPath), { recursive: true });
    moveDirectorySync(stageDir, uploadsPath);
    fs.rmSync(backupPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    fs.rmSync(uploadsPath, { recursive: true, force: true });
    if (fs.existsSync(backupPath)) {
      moveDirectorySync(backupPath, uploadsPath);
    }
    throw error;
  }
}

function deriveTargetDatabaseName(): string {
  return parseDatabaseLogInfo(getRuntimeConfig().mysqlDatabaseUrl).dbName;
}

function buildConfirmationPhrase(dumpId: string, targetDatabaseName: string): string {
  return `IMPORTIERE DUMP ${dumpId} NACH ${targetDatabaseName}`;
}

function summarizeTablesFromManifest(manifest: DumpManifest): TableSummary[] {
  return DUMP_TABLE_KEYS.map((key) => ({
    key,
    rowCount: manifest.tables[key].rowCount,
    sha256: manifest.tables[key].sha256,
  }));
}

function summarizeTablesFromPayload(payload: DumpPayload): TableSummary[] {
  return DUMP_TABLE_KEYS.map((key) => ({
    key,
    rowCount: payload.tables[key]?.length ?? 0,
    sha256: sha256Json(payload.tables[key] ?? []),
  }));
}

function deriveLegacyDumpId(payload: DumpPayload, fileHash: string): string {
  if (typeof payload.dumpId === "string" && payload.dumpId.trim().length > 0) {
    return payload.dumpId;
  }
  const exportedAtPart = payload.exportedAt.replace(/[^0-9TZ]/g, "").slice(0, 15) || "legacy";
  return `legacy_${exportedAtPart}_${fileHash.slice(0, 8)}`;
}

async function collectDumpTableRows(): Promise<Record<DumpTableKey, unknown[]>> {
  const tableRows = {} as Record<DumpTableKey, unknown[]>;
  for (const entry of DUMP_TABLE_ENTRIES) {
    tableRows[entry.key] = await db.select().from(entry.table as AnyTable);
  }
  return tableRows;
}

async function buildDumpArtifacts(): Promise<{
  dumpId: string;
  exportedAt: string;
  payload: DumpPayload;
  manifest: DumpManifest;
}> {
  const exportedAt = new Date().toISOString();
  const dumpId = `dump_${exportedAt.replace(/[:.]/g, "-")}`;
  const tableRows = await collectDumpTableRows();
  const uploadsPath = await getAttachmentStoragePath();
  const uploads = await listUploadFilesFromDirectory(uploadsPath);
  return {
    dumpId,
    exportedAt,
    payload: buildDumpPayload(dumpId, exportedAt, tableRows),
    manifest: buildDumpManifest(dumpId, exportedAt, tableRows, uploads),
  };
}

export async function writeDumpArchive(zipPath: string): Promise<void> {
  const artifacts = await buildDumpArtifacts();
  const { archive, finalize } = buildArchive(zipPath);
  archive.append(JSON.stringify(artifacts.payload), { name: "data.json" });
  archive.append(JSON.stringify(artifacts.manifest), { name: "manifest.json" });

  const uploadsPath = await getAttachmentStoragePath();
  if (fs.existsSync(uploadsPath)) {
    archive.directory(uploadsPath, "uploads");
  }

  await finalize();
}

async function assertSafeImportTarget(): Promise<{ dbName: string; host: string; port: number }> {
  const mode = getRuntimeMode();
  const runtimeConfig = getRuntimeConfig();
  const expectedTarget = mode === "production"
    ? assertSafeDatabaseTargetForMode(
        runtimeConfig.mysqlDatabaseUrl,
        mode,
        runtimeConfig.allowedDatabases,
        runtimeConfig.allowedHosts,
      )
    : assertSafeAdminDestructiveOperationTarget({
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
  return expectedTarget;
}

async function inspectDumpArchive(fileBuffer: Buffer): Promise<DumpImportPreviewResult & {
  payload: DumpPayload;
  directory: unzipper.CentralDirectory;
}> {
  const fileHash = sha256Buffer(fileBuffer);
  let directory: unzipper.CentralDirectory;
  try {
    directory = await unzipper.Open.buffer(fileBuffer);
  } catch {
    throw new DumpServiceError("Ungueltige oder beschaedigte ZIP-Datei", 422, "VALIDATION_ERROR");
  }

  const dataFile = directory.files.find((file) => file.path === "data.json");
  if (!dataFile) {
    throw new DumpServiceError("ZIP enthaelt keine data.json", 422, "VALIDATION_ERROR");
  }

  const payload = parseDumpPayload(JSON.parse((await dataFile.buffer()).toString("utf8")) as unknown);
  const manifestFile = directory.files.find((file) => file.path === "manifest.json");
  const manifest = manifestFile
    ? parseDumpManifest(JSON.parse((await manifestFile.buffer()).toString("utf8")) as unknown)
    : null;
  const uploadSummary = buildUploadsSummary(await listUploadFilesFromZip(directory));
  const mode = getRuntimeMode();
  const warnings: string[] = [];
  const blockingIssues: string[] = [];
  const dumpId = manifest?.dumpId ?? deriveLegacyDumpId(payload, fileHash);
  const targetDatabaseName = deriveTargetDatabaseName();
  const expectedTables = manifest ? summarizeTablesFromManifest(manifest) : summarizeTablesFromPayload(payload);
  const expectedUploads: UploadSummary = manifest
    ? {
        fileCount: manifest.uploads.fileCount,
        totalBytes: manifest.uploads.totalBytes,
        sha256: manifest.uploads.sha256,
      }
    : {
        fileCount: uploadSummary.fileCount,
        totalBytes: uploadSummary.totalBytes,
        sha256: uploadSummary.sha256,
      };

  if (!manifest) {
    warnings.push("Legacy-Dump ohne manifest.json erkannt.");
  } else {
    for (const table of expectedTables) {
      const actualRows = payload.tables[table.key] ?? [];
      if (actualRows.length !== table.rowCount) {
        blockingIssues.push(`Manifest-Count stimmt fuer Tabelle '${table.key}' nicht mit data.json ueberein.`);
      }
      if (sha256Json(actualRows) !== table.sha256) {
        blockingIssues.push(`Manifest-Hash stimmt fuer Tabelle '${table.key}' nicht mit data.json ueberein.`);
      }
    }
    if (manifest.uploads.fileCount !== uploadSummary.fileCount) {
      blockingIssues.push("Manifest-Uploadanzahl stimmt nicht mit dem ZIP-Inhalt ueberein.");
    }
    if (manifest.uploads.totalBytes !== uploadSummary.totalBytes) {
      blockingIssues.push("Manifest-Uploadgroesse stimmt nicht mit dem ZIP-Inhalt ueberein.");
    }
    if (manifest.uploads.sha256 !== uploadSummary.sha256) {
      blockingIssues.push("Manifest-Uploadhash stimmt nicht mit dem ZIP-Inhalt ueberein.");
    }
    if (manifest.schemaRevision !== getSchemaRevision()) {
      warnings.push(`Schema-Revision weicht ab: Dump=${manifest.schemaRevision}, Ziel=${getSchemaRevision()}.`);
    }
  }

  if (mode === "production") {
    if (!manifest) {
      blockingIssues.push("Legacy-Dumps ohne manifest.json sind fuer Produktionsimport gesperrt.");
    }
  }

  return {
    payload,
    directory,
    fileHash,
    dumpId,
    targetDatabaseName,
    transferReadiness: blockingIssues.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready",
    blockingIssues,
    warnings,
    confirmationPhrase: buildConfirmationPhrase(dumpId, targetDatabaseName),
    allowsProductionImport: mode !== "production" || manifest !== null,
    isLegacyDump: manifest === null,
    manifestPresent: manifest !== null,
    schemaRevision: manifest?.schemaRevision ?? null,
    expectedTables,
    expectedUploads,
  };
}

async function buildVerifiedTables(expectedTables: TableSummary[]): Promise<DumpImportApplyResult["verifiedTables"]> {
  return Promise.all(DUMP_TABLE_ENTRIES.map(async (entry) => {
    const actual = await db.select({ value: count() }).from(entry.table as AnyTable);
    const actualRowCount = Number(actual[0]?.value ?? 0);
    const expected = expectedTables.find((item) => item.key === entry.key)?.rowCount ?? 0;
    return {
      key: entry.key,
      expectedRowCount: expected,
      actualRowCount,
      matches: actualRowCount === expected,
    };
  }));
}

async function buildVerifiedUploads(expectedUploads: UploadSummary): Promise<DumpImportApplyResult["verifiedUploads"]> {
  const uploadsPath = await getAttachmentStoragePath();
  const actual = buildUploadsSummary(await listUploadFilesFromDirectory(uploadsPath));
  return {
    fileCountMatches: actual.fileCount === expectedUploads.fileCount,
    totalBytesMatches: actual.totalBytes === expectedUploads.totalBytes,
    sha256Matches: actual.sha256 === expectedUploads.sha256,
  };
}

function buildJournalContent(input: {
  preview: DumpImportPreviewResult;
  transferId: string;
  targetBackupCreated: boolean;
  targetBackupPath: string | null;
  incomingDumpPath: string | null;
  verifiedTables: DumpImportApplyResult["verifiedTables"];
  verifiedUploads: DumpImportApplyResult["verifiedUploads"];
  importStatus: DumpImportApplyResult["importStatus"];
  warnings: string[];
  blockingIssues: string[];
  tablesRestored: number;
  uploadsRestored: boolean;
  verificationPassed: boolean;
  durationMs: number;
}): unknown {
  return {
    summary: {
      transferId: input.transferId,
      dumpId: input.preview.dumpId,
      targetDatabaseName: input.preview.targetDatabaseName,
      transferReadiness: input.preview.transferReadiness,
      importStatus: input.importStatus,
      targetBackupCreated: input.targetBackupCreated,
      verificationPassed: input.verificationPassed,
      tablesRestored: input.tablesRestored,
      uploadsRestored: input.uploadsRestored,
      warnings: input.warnings,
      blockingIssues: input.blockingIssues,
      durationMs: input.durationMs,
    },
    details: {
      fileHash: input.preview.fileHash,
      confirmationPhrase: input.preview.confirmationPhrase,
      manifestPresent: input.preview.manifestPresent,
      isLegacyDump: input.preview.isLegacyDump,
      schemaRevision: input.preview.schemaRevision,
      expectedTables: input.preview.expectedTables,
      expectedUploads: input.preview.expectedUploads,
      verifiedTables: input.verifiedTables,
      verifiedUploads: input.verifiedUploads,
      targetBackupPath: input.targetBackupPath,
      incomingDumpPath: input.incomingDumpPath,
    },
  };
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
  await writeDumpArchive(zipPath);

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

export async function previewDumpImport(
  context: RequestContext,
  fileBuffer: Buffer,
): Promise<DumpImportPreviewResult> {
  requireAdmin(context);
  const preview = await inspectDumpArchive(fileBuffer);
  return preview;
}

export async function applyDumpImport(
  context: RequestContext,
  params: {
    fileBuffer: Buffer;
    fileHash: string;
    confirmationPhrase: string;
    productionConfirmationText: string;
  },
): Promise<DumpImportApplyResult> {
  requireAdmin(context);

  const preview = await inspectDumpArchive(params.fileBuffer);
  if (preview.fileHash !== params.fileHash) {
    throw new DumpServiceError("Datei wurde seit der Vorschau geaendert", 409, "FILE_HASH_MISMATCH");
  }
  if (
    params.confirmationPhrase !== preview.confirmationPhrase
    || params.productionConfirmationText !== preview.confirmationPhrase
  ) {
    throw new DumpServiceError("Sicherheitsbestaetigung stimmt nicht", 409, "CONFIRMATION_MISMATCH");
  }
  if (preview.blockingIssues.length > 0) {
    throw new DumpServiceError(
      `Import ist blockiert: ${preview.blockingIssues.join(" | ")}`,
      422,
      "VALIDATION_ERROR",
    );
  }

  const startMs = Date.now();
  const safeTarget = await assertSafeImportTarget();
  const transferRun = await createDumpTransferRun();
  let incomingDumpPath: string | null = null;
  let targetBackupPath: string | null = null;
  let targetBackupCreated = false;
  let tablesRestored = 0;
  let uploadsRestored = false;
  let verifiedTables: DumpImportApplyResult["verifiedTables"] = [];
  let verifiedUploads: DumpImportApplyResult["verifiedUploads"] = {
    fileCountMatches: false,
    totalBytesMatches: false,
    sha256Matches: false,
  };
  let journalPath = path.resolve(transferRun.transferDir, "journal.json");

  try {
    incomingDumpPath = await writeDumpTransferBinaryArtifact(transferRun.transferDir, "incoming-dump.zip", params.fileBuffer);
    targetBackupPath = path.resolve(transferRun.transferDir, "target-before-import.zip");
    await writeDumpArchive(targetBackupPath);
    targetBackupCreated = true;

    const { stageDir, hasUploads } = await stageUploads(preview.directory);
    const conn = await pool.getConnection();
    try {
      await conn.execute("SET FOREIGN_KEY_CHECKS=0");
      await conn.beginTransaction();
      await assertSqlDatabaseIdentity(conn, safeTarget.dbName);

      const connDb = drizzle(conn as any, { schema, mode: "default" });

      for (const entry of [...DUMP_TABLE_ENTRIES].reverse()) {
        await conn.execute(`DELETE FROM \`${getTableName(entry.table)}\``);
      }

      for (const entry of DUMP_TABLE_ENTRIES) {
        const rawRows = preview.payload.tables[entry.key];
        const rows = ATTACHMENT_DUMP_TABLE_KEYS.has(entry.key)
          ? await normalizeImportedAttachmentRows(rawRows)
          : rawRows;
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
      logError("applyDumpImport: Datenbankfehler", {
        detail,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new DumpServiceError(`Datenbankfehler beim Import: ${detail}`, 500, "INTERNAL_ERROR");
    } finally {
      await conn.execute("SET FOREIGN_KEY_CHECKS=1");
      conn.release();
    }

    try {
      uploadsRestored = await restoreUploadsFromStage(stageDir);
    } catch (error) {
      cleanupStageDir(stageDir);
      const detail = error instanceof Error ? error.message : String(error);
      logError("applyDumpImport: Upload-Wiederherstellung fehlgeschlagen", { detail });
      throw new DumpServiceError(`Upload-Wiederherstellung fehlgeschlagen: ${detail}`, 500, "INTERNAL_ERROR");
    } finally {
      if (!hasUploads) {
        cleanupStageDir(stageDir);
      }
    }

    verifiedTables = await buildVerifiedTables(preview.expectedTables);
    verifiedUploads = await buildVerifiedUploads(preview.expectedUploads);

    const blockingIssues = [
      ...verifiedTables
        .filter((entry) => !entry.matches)
        .map((entry) => `Soll/Ist-Abweichung fuer Tabelle '${entry.key}'.`),
      ...(!verifiedUploads.fileCountMatches ? ["Upload-Anzahl weicht nach dem Import ab."] : []),
      ...(!verifiedUploads.totalBytesMatches ? ["Upload-Gesamtgroesse weicht nach dem Import ab."] : []),
      ...(!verifiedUploads.sha256Matches ? ["Upload-Hash weicht nach dem Import ab."] : []),
    ];
    const verificationPassed = blockingIssues.length === 0;
    const importStatus: DumpImportApplyResult["importStatus"] = verificationPassed
      ? (preview.warnings.length > 0 ? "warning" : "success")
      : "error";

    journalPath = await writeDumpTransferJsonArtifact(
      transferRun.transferDir,
      "journal.json",
      buildJournalContent({
        preview,
        transferId: transferRun.transferId,
        targetBackupCreated,
        targetBackupPath,
        incomingDumpPath,
        verifiedTables,
        verifiedUploads,
        importStatus,
        warnings: preview.warnings,
        blockingIssues,
        tablesRestored,
        uploadsRestored,
        verificationPassed,
        durationMs: Date.now() - startMs,
      }),
    );

    return {
      transferId: transferRun.transferId,
      dumpId: preview.dumpId,
      targetDatabaseName: preview.targetDatabaseName,
      targetBackupCreated,
      verificationPassed,
      importStatus,
      tablesRestored,
      uploadsRestored,
      durationMs: Date.now() - startMs,
      warnings: preview.warnings,
      blockingIssues,
      journalPath,
      targetBackupPath,
      expectedUploads: preview.expectedUploads,
      verifiedTables,
      verifiedUploads,
    };
  } catch (error) {
    const blockingIssues = isDumpServiceError(error) ? [error.message] : ["Import fehlgeschlagen."];
    try {
      journalPath = await writeDumpTransferJsonArtifact(
        transferRun.transferDir,
        "journal.json",
        buildJournalContent({
          preview,
          transferId: transferRun.transferId,
          targetBackupCreated,
          targetBackupPath,
          incomingDumpPath,
          verifiedTables,
          verifiedUploads,
          importStatus: "error",
          warnings: preview.warnings,
          blockingIssues,
          tablesRestored,
          uploadsRestored,
          verificationPassed: false,
          durationMs: Date.now() - startMs,
        }),
      );
    } catch {
      // Preserve original error if journal writing also fails.
    }

    if (isDumpServiceError(error)) {
      throw error;
    }
    throw new DumpServiceError("Import fehlgeschlagen", 500, "INTERNAL_ERROR");
  }
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
      const rawRows = payload.tables[entry.key];
      const rows = ATTACHMENT_DUMP_TABLE_KEYS.has(entry.key)
        ? await normalizeImportedAttachmentRows(rawRows)
        : rawRows;
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
