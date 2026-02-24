import cron from "node-cron";
import { getGlobalSettingValue } from "./userSettingsService";
import * as backupService from "./backupService";
import * as backupRepository from "../repositories/backupRepository";
import * as backupRuntimeRepository from "../repositories/backupRuntimeRepository";
import { generateBackupDocuments } from "./exportService";
import { persistBackupFiles } from "./backupStorageService";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { logError, logInfo } from "../lib/logger";

const logPrefix = "[backup-scheduler]";
let isRunning = false;
let schedulerStarted = false;
const schedulerLockKey = "ft07_backup_scheduler_lock";

async function acquireSchedulerLock(): Promise<boolean> {
  if (process.env.FT07_DISABLE_DB_LOCK === "1") {
    return true;
  }
  const [row] = await db.execute(sql`SELECT GET_LOCK(${schedulerLockKey}, 0) AS lock_ok`) as unknown as Array<{ lock_ok?: number }>;
  return Number(row?.lock_ok ?? 0) === 1;
}

async function releaseSchedulerLock(): Promise<void> {
  await db.execute(sql`SELECT RELEASE_LOCK(${schedulerLockKey})`);
}

export async function runBackupSchedulerTick(): Promise<void> {
  if (isRunning) {
    logInfo(`${logPrefix} tick skipped (already running)`);
    return;
  }

  isRunning = true;
  let lockAcquired = false;
  try {
    lockAcquired = await acquireSchedulerLock();
    if (!lockAcquired) {
      logInfo(`${logPrefix} tick skipped (db lock busy)`);
      return;
    }

    const enabledValue = await getGlobalSettingValue("backup_enabled");
    const isEnabled = typeof enabledValue === "boolean" ? enabledValue : true;

    if (!isEnabled) {
      await backupService.createSkippedBackupLog("disabled");
      logInfo(`${logPrefix} tick -> skipped (disabled)`);
      return;
    }

    const lastSuccess = await backupRepository.getLastSuccessfulExportAt();
    const latestChange = await backupRuntimeRepository.getLatestRelevantDataChangeAt();

    if (!latestChange) {
      await backupService.createSkippedBackupLog("no_data_change_marker");
      logInfo(`${logPrefix} tick -> skipped (no data change marker)`);
      return;
    }

    if (lastSuccess && latestChange.getTime() <= lastSuccess.getTime()) {
      await backupService.createSkippedBackupLog("no_changes");
      logInfo(`${logPrefix} tick -> skipped (no changes)`);
      return;
    }

    const documents = await generateBackupDocuments();
    const persisted = await persistBackupFiles({
      excelBuffer: documents.excelBuffer,
      pdfBuffer: documents.pdfBuffer,
    });
    await backupRepository.createBackupLogEntry({
      status: "success",
      errorMessage: null,
      exportedRecordCount: documents.exportedRecordCount,
      filePath: JSON.stringify(persisted),
    });
    logInfo(`${logPrefix} tick -> success`, {
      exportedRecordCount: documents.exportedRecordCount,
      excelPath: persisted.excelPath,
      pdfPath: persisted.pdfPath,
    });
  } catch (error) {
    logError(`${logPrefix} tick failed`, { error });
    try {
      await backupRepository.createBackupLogEntry({
        status: "error",
        errorMessage: error instanceof Error ? error.message : "unknown scheduler error",
      });
    } catch {
      // Last-resort guard: scheduler errors must not crash process.
    }
  } finally {
    if (lockAcquired) {
      try {
        await releaseSchedulerLock();
      } catch {
        // Keep scheduler alive even if lock release fails.
      }
    }
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
