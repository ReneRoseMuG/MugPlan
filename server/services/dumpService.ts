import fs from "fs";
import path from "path";
import archiver from "archiver";
import unzipper from "unzipper";
import { drizzle } from "drizzle-orm/mysql2";
import { getTableColumns, getTableName } from "drizzle-orm";
import * as schema from "@shared/schema";
import { db, pool } from "../db";
import { getAttachmentStoragePath, getBackupBasePath } from "../config/storagePaths";
import { logError, logInfo } from "../lib/logger";

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

// Tables included in the dump, in FK dependency order (parents before children).
// Excluded: users, roles, projectStatus, componentSpecifications, productComponent,
//           projectProjectStatus, employeeAbsences, seedRuns, seedRunEntities
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
  { key: "employeeAttachments", table: schema.employeeAttachments },
  { key: "employeeTags", table: schema.employeeTags },
  { key: "calendarWeekNotes", table: schema.calendarWeekNotes },
  { key: "calendarSyncLog", table: schema.calendarSyncLog },
  { key: "userSettingsValue", table: schema.userSettingsValue },
  { key: "backupLog", table: schema.backupLog },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any;

/**
 * Converts ISO date strings back to Date objects for columns that Drizzle maps as Date
 * (MySqlTimestamp and MySqlDate without mode:"string"). Required because JSON roundtrip
 * serializes Date → string, and Drizzle's mysql2 driver calls .toISOString() on insert.
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
    const r = { ...(row as Record<string, unknown>) };
    for (const key of dateKeyList) {
      const val = r[key];
      if (typeof val === "string" && val.length > 0) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) r[key] = d;
      }
    }
    return r;
  });
}

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

  // Export all table data via Drizzle (returns camelCase keys — consistent with import)
  const data: Record<string, unknown[]> = {};
  for (const entry of DUMP_TABLE_ENTRIES) {
    const rows = await db.select().from(entry.table as AnyTable);
    data[entry.key] = rows;
  }

  archive.append(JSON.stringify(data, null, 0), { name: "data.json" });

  // Include uploads directory
  const uploadsPath = await getAttachmentStoragePath();
  if (fs.existsSync(uploadsPath)) {
    archive.directory(uploadsPath, "uploads");
  }

  await finalize();

  const stat = fs.statSync(zipPath);
  const createdAt = stat.mtime.toISOString();

  return { filename, sizeBytes: stat.size, createdAt };
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

  const result = files
    .filter((f) => DUMP_FILENAME_REGEX.test(f))
    .map((f) => {
      const stat = fs.statSync(path.join(dumpsDir, f));
      return {
        filename: f,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return result;
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

  if (process.env.NODE_ENV === "production") {
    throw new DumpServiceError("Import ist in der Produktionsumgebung nicht erlaubt", 403, "FORBIDDEN");
  }

  const startMs = Date.now();

  // Step 1: Validate ZIP and extract data.json before touching the DB
  let directory: unzipper.CentralDirectory;
  try {
    directory = await unzipper.Open.buffer(fileBuffer);
  } catch {
    throw new DumpServiceError("Ungültige oder beschädigte ZIP-Datei", 422, "VALIDATION_ERROR");
  }

  const dataFile = directory.files.find((f) => f.path === "data.json");
  if (!dataFile) {
    throw new DumpServiceError("ZIP enthält keine data.json", 422, "VALIDATION_ERROR");
  }

  let tableData: Record<string, unknown[]>;
  try {
    const content = await dataFile.buffer();
    const parsed = JSON.parse(content.toString("utf-8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("data.json hat kein gültiges Format");
    }
    tableData = parsed as Record<string, unknown[]>;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ungültiges JSON in data.json";
    throw new DumpServiceError(message, 422, "VALIDATION_ERROR");
  }

  // Step 2: Run DB restore on a dedicated connection with FK checks disabled
  const conn = await pool.getConnection();
  let tablesRestored = 0;

  try {
    await conn.execute("SET FOREIGN_KEY_CHECKS=0");
    await conn.beginTransaction();

    // Create a Drizzle instance scoped to this connection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connDb = drizzle(conn as any, { schema, mode: "default" });

    // Truncate in reverse order to respect FK dependencies
    for (const entry of [...DUMP_TABLE_ENTRIES].reverse()) {
      await conn.execute(`TRUNCATE TABLE \`${getTableName(entry.table)}\``);
    }

    // Insert in forward order
    for (const entry of DUMP_TABLE_ENTRIES) {
      const rows = tableData[entry.key];
      if (!Array.isArray(rows) || rows.length === 0) {
        logInfo("importDump: Tabelle übersprungen", { key: entry.key, reason: !Array.isArray(rows) ? "kein Array" : "leer" });
        continue;
      }

      // Restore Date objects lost during JSON serialization
      const coercedRows = coerceRowDates(entry.table, rows);

      // Insert in batches of 500
      const BATCH_SIZE = 500;
      for (let i = 0; i < coercedRows.length; i += BATCH_SIZE) {
        const batch = coercedRows.slice(i, i + BATCH_SIZE);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await connDb.insert(entry.table as AnyTable).values(batch as any[]);
      }
      logInfo("importDump: Tabelle eingespielt", { key: entry.key, rows: coercedRows.length });
      tablesRestored++;
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    const detail = e instanceof Error ? e.message : String(e);
    logError("importDump: Datenbankfehler", { detail, stack: e instanceof Error ? e.stack : undefined });
    throw new DumpServiceError(
      `Datenbankfehler beim Import: ${detail}`,
      500,
      "INTERNAL_ERROR",
    );
  } finally {
    await conn.execute("SET FOREIGN_KEY_CHECKS=1");
    conn.release();
  }

  // Step 3: Restore uploads directory
  let uploadsRestored = false;
  try {
    const uploadsPath = await getAttachmentStoragePath();
    const uploadsFiles = directory.files.filter(
      (f) => f.path.startsWith("uploads/") && !f.path.endsWith("/"),
    );

    if (uploadsFiles.length > 0) {
      // Clear existing uploads
      fs.rmSync(uploadsPath, { recursive: true, force: true });
      fs.mkdirSync(uploadsPath, { recursive: true });

      for (const file of uploadsFiles) {
        const relativePath = file.path.slice("uploads/".length);
        const targetPath = path.join(uploadsPath, relativePath);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        const content = await file.buffer();
        fs.writeFileSync(targetPath, content);
      }
      uploadsRestored = true;
    }
  } catch {
    // Uploads restore failure is non-fatal
    uploadsRestored = false;
  }

  return { tablesRestored, uploadsRestored, durationMs: Date.now() - startMs };
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
