import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { backupLog } from "@shared/schema";

export type BackupStatus = "success" | "error" | "skipped";

export type BackupLogRecord = {
  id: number;
  createdAt: Date | string;
  status: BackupStatus;
  errorMessage: string | null;
  exportedRecordCount: number;
  filePath: string | null;
};

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeCode = (error as { code?: unknown }).code;
  const maybeErrno = (error as { errno?: unknown }).errno;
  return maybeCode === "ER_NO_SUCH_TABLE" || maybeErrno === 1146;
}

let ensureBackupLogTablePromise: Promise<void> | null = null;

async function ensureBackupLogTable(): Promise<void> {
  if (!ensureBackupLogTablePromise) {
    ensureBackupLogTablePromise = db.execute(sql`
      CREATE TABLE IF NOT EXISTS backup_log (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(16) NOT NULL,
        error_message TEXT NULL,
        exported_record_count INT NOT NULL DEFAULT 0,
        file_path TEXT NULL
      )
    `).then(() => undefined);
  }
  await ensureBackupLogTablePromise;
}

export async function createBackupLogEntry(input: {
  status: BackupStatus;
  errorMessage?: string | null;
  exportedRecordCount?: number;
  filePath?: string | null;
}): Promise<BackupLogRecord> {
  await ensureBackupLogTable();
  const result = await db.insert(backupLog).values({
    status: input.status,
    errorMessage: input.errorMessage ?? null,
    exportedRecordCount: input.exportedRecordCount ?? 0,
    filePath: input.filePath ?? null,
  });
  const insertId = Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId);
  const [record] = await db.select().from(backupLog).where(eq(backupLog.id, insertId)).limit(1);
  return record as BackupLogRecord;
}

export async function listBackupLogs(limit = 100): Promise<BackupLogRecord[]> {
  try {
    await ensureBackupLogTable();
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 100;
    const rows = await db
      .select()
      .from(backupLog)
      .orderBy(desc(backupLog.createdAt), desc(backupLog.id))
      .limit(safeLimit);
    return rows as BackupLogRecord[];
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function getBackupLogById(id: number): Promise<BackupLogRecord | null> {
  try {
    await ensureBackupLogTable();
    const [row] = await db.select().from(backupLog).where(eq(backupLog.id, id)).limit(1);
    return (row as BackupLogRecord | undefined) ?? null;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

