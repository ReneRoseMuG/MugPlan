import { getGlobalSettingValue } from "./userSettingsService";
import * as backupRepository from "../repositories/backupRepository";
import * as backupRuntimeRepository from "../repositories/backupRuntimeRepository";
import { generateBackupDocuments } from "./exportService";
import { persistBackupFiles } from "./backupStorageService";
import { cleanupOldBackups } from "./backupRetentionService";
import { pool } from "../db";
import type { PoolConnection } from "mysql2/promise";
import { logError, logInfo } from "../lib/logger";
import cron from "node-cron";

const logPrefix = "[backup-scheduler]";
let isRunning = false;
let schedulerStarted = false;
const schedulerLockKey = "ft07_backup_scheduler_lock";

export type BackupRunStatus = "success" | "error" | "skipped";
export type BackupRunTrigger = "scheduler" | "manual";
export type BackupRunResult = {
  status: BackupRunStatus;
  logId: number | null;
  exportedRecordCount: number;
  filePath: string | null;
  cleanupDeletedCount: number;
  reason: string | null;
};

async function acquireSchedulerLock(connection: PoolConnection): Promise<boolean> {
  if (process.env.FT07_DISABLE_DB_LOCK === "1") {
    return true;
  }
  const [rows] = await connection.query("SELECT GET_LOCK(?, 0) AS lock_ok", [schedulerLockKey]);
  const firstRow = Array.isArray(rows) ? (rows[0] as { lock_ok?: number } | undefined) : undefined;
  return Number(firstRow?.lock_ok ?? 0) === 1;
}

async function releaseSchedulerLock(connection: PoolConnection): Promise<void> {
  await connection.query("SELECT RELEASE_LOCK(?)", [schedulerLockKey]);
}

async function createSkippedLog(reason: string): Promise<number | null> {
  const record = await backupRepository.createBackupLogEntry({
    status: "skipped",
    errorMessage: reason,
    exportedRecordCount: 0,
    filePath: null,
  });
  return record?.id ?? null;
}

export async function runBackupCycle(input: {
  trigger: BackupRunTrigger;
  force: boolean;
}): Promise<BackupRunResult> {
  const enabledValue = await getGlobalSettingValue("backup_enabled");
  const isEnabled = typeof enabledValue === "boolean" ? enabledValue : true;

  if (!isEnabled && input.trigger === "scheduler") {
    const logId = await createSkippedLog("disabled");
    logInfo(`${logPrefix} run -> skipped (disabled)`);
    const cleanup = await cleanupOldBackups();
    return {
      status: "skipped",
      logId,
      exportedRecordCount: 0,
      filePath: null,
      cleanupDeletedCount: cleanup.deletedCount,
      reason: "disabled",
    };
  }

  if (!input.force) {
    const lastSuccess = await backupRepository.getLastSuccessfulExportAt();
    const latestChange = await backupRuntimeRepository.getLatestRelevantDataChangeAt();

    if (!latestChange) {
      const logId = await createSkippedLog("no_data_change_marker");
      logInfo(`${logPrefix} run -> skipped (no data change marker)`);
      const cleanup = await cleanupOldBackups();
      return {
        status: "skipped",
        logId,
        exportedRecordCount: 0,
        filePath: null,
        cleanupDeletedCount: cleanup.deletedCount,
        reason: "no_data_change_marker",
      };
    }

    if (lastSuccess && latestChange.getTime() <= lastSuccess.getTime()) {
      const logId = await createSkippedLog("no_changes");
      logInfo(`${logPrefix} run -> skipped (no changes)`);
      const cleanup = await cleanupOldBackups();
      return {
        status: "skipped",
        logId,
        exportedRecordCount: 0,
        filePath: null,
        cleanupDeletedCount: cleanup.deletedCount,
        reason: "no_changes",
      };
    }
  }

  try {
    const documents = await generateBackupDocuments();
    const persisted = await persistBackupFiles({
      excelBuffer: documents.excelBuffer,
      pdfBuffer: documents.pdfBuffer,
    });
    const logRecord = await backupRepository.createBackupLogEntry({
      status: "success",
      errorMessage: null,
      exportedRecordCount: documents.exportedRecordCount,
      filePath: JSON.stringify(persisted),
    });
    logInfo(`${logPrefix} run -> success`, {
      trigger: input.trigger,
      force: input.force,
      exportedRecordCount: documents.exportedRecordCount,
      excelPath: persisted.excelPath,
      pdfPath: persisted.pdfPath,
    });
    const cleanup = await cleanupOldBackups();
    return {
      status: "success",
      logId: logRecord?.id ?? null,
      exportedRecordCount: documents.exportedRecordCount,
      filePath: JSON.stringify(persisted),
      cleanupDeletedCount: cleanup.deletedCount,
      reason: null,
    };
  } catch (error) {
    logError(`${logPrefix} run failed`, { trigger: input.trigger, error });
    let logId: number | null = null;
    try {
      const errRecord = await backupRepository.createBackupLogEntry({
        status: "error",
        errorMessage: error instanceof Error ? error.message : "unknown scheduler error",
      });
      logId = errRecord?.id ?? null;
    } catch {
      // Last-resort guard: backup run errors must not crash process.
    }
    const cleanup = await cleanupOldBackups();
    return {
      status: "error",
      logId,
      exportedRecordCount: 0,
      filePath: null,
      cleanupDeletedCount: cleanup.deletedCount,
      reason: error instanceof Error ? error.message : "unknown scheduler error",
    };
  }
}

export async function runBackupSchedulerTick(): Promise<void> {
  if (isRunning) {
    logInfo(`${logPrefix} tick skipped (already running)`);
    return;
  }

  isRunning = true;
  let lockAcquired = false;
  let lockConnection: PoolConnection | null = null;
  try {
    lockConnection = await pool.getConnection();
    lockAcquired = await acquireSchedulerLock(lockConnection);
    if (!lockAcquired) {
      logInfo(`${logPrefix} tick skipped (db lock busy)`);
      return;
    }
    await runBackupCycle({ trigger: "scheduler", force: false });
  } catch (error) {
    logError(`${logPrefix} tick failed`, { error });
  } finally {
    if (lockAcquired && lockConnection) {
      try {
        await releaseSchedulerLock(lockConnection);
      } catch {
        // Keep scheduler alive even if lock release fails.
      }
    }
    lockConnection?.release();
    isRunning = false;
  }
}

export async function runBackupManualTick(): Promise<BackupRunResult> {
  if (isRunning) {
    logInfo(`${logPrefix} manual run skipped (already running)`);
    return {
      status: "skipped",
      logId: null,
      exportedRecordCount: 0,
      filePath: null,
      cleanupDeletedCount: 0,
      reason: "already_running",
    };
  }

  isRunning = true;
  let lockAcquired = false;
  let lockConnection: PoolConnection | null = null;
  try {
    lockConnection = await pool.getConnection();
    lockAcquired = await acquireSchedulerLock(lockConnection);
    if (!lockAcquired) {
      logInfo(`${logPrefix} manual run skipped (db lock busy)`);
      return {
        status: "skipped",
        logId: null,
        exportedRecordCount: 0,
        filePath: null,
        cleanupDeletedCount: 0,
        reason: "db_lock_busy",
      };
    }
    return await runBackupCycle({ trigger: "manual", force: true });
  } finally {
    if (lockAcquired && lockConnection) {
      try {
        await releaseSchedulerLock(lockConnection);
      } catch {
        // Keep service alive even if lock release fails.
      }
    }
    lockConnection?.release();
    isRunning = false;
  }
}

export function startBackupScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  cron.schedule("0 2 * * *", () => {
    void runBackupSchedulerTick();
  }, { timezone: "Europe/Berlin" });

  logInfo(`${logPrefix} started (cron: 0 2 * * *)`);
}
