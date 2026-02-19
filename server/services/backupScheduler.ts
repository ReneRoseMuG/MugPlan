import cron from "node-cron";
import { getGlobalSettingValue } from "./userSettingsService";
import * as backupService from "./backupService";
import * as backupRepository from "../repositories/backupRepository";
import * as backupRuntimeRepository from "../repositories/backupRuntimeRepository";
import { generateBackupDocuments } from "./exportService";
import { persistBackupFiles } from "./backupStorageService";
import { db } from "../db";
import { sql } from "drizzle-orm";

const logPrefix = "[backup-scheduler]";
let isRunning = false;
let schedulerStarted = false;
const schedulerLockKey = "ft07_backup_scheduler_lock";

async function acquireSchedulerLock(): Promise<boolean> {
  const [row] = await db.execute(sql`SELECT GET_LOCK(${schedulerLockKey}, 0) AS lock_ok`) as unknown as Array<{ lock_ok?: number }>;
  return Number(row?.lock_ok ?? 0) === 1;
}

async function releaseSchedulerLock(): Promise<void> {
  await db.execute(sql`SELECT RELEASE_LOCK(${schedulerLockKey})`);
}

export async function runBackupSchedulerTick(): Promise<void> {
  if (isRunning) {
    console.info(`${logPrefix} tick skipped (already running)`);
    return;
  }

  isRunning = true;
  let lockAcquired = false;
  try {
    lockAcquired = await acquireSchedulerLock();
    if (!lockAcquired) {
      console.info(`${logPrefix} tick skipped (db lock busy)`);
      return;
    }

    const enabledValue = await getGlobalSettingValue("backup_enabled");
    const isEnabled = typeof enabledValue === "boolean" ? enabledValue : true;

    if (!isEnabled) {
      await backupService.createSkippedBackupLog("disabled");
      console.info(`${logPrefix} tick -> skipped (disabled)`);
      return;
    }

    const lastSuccess = await backupRepository.getLastSuccessfulExportAt();
    const latestChange = await backupRuntimeRepository.getLatestRelevantDataChangeAt();

    if (!latestChange) {
      await backupService.createSkippedBackupLog("no_data_change_marker");
      console.info(`${logPrefix} tick -> skipped (no data change marker)`);
      return;
    }

    if (lastSuccess && latestChange.getTime() <= lastSuccess.getTime()) {
      await backupService.createSkippedBackupLog("no_changes");
      console.info(`${logPrefix} tick -> skipped (no changes)`);
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
    console.info(`${logPrefix} tick -> success`, {
      exportedRecordCount: documents.exportedRecordCount,
      excelPath: persisted.excelPath,
      pdfPath: persisted.pdfPath,
    });
  } catch (error) {
    console.error(`${logPrefix} tick failed`, error);
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

  console.info(`${logPrefix} started (cron: 0 2 * * *)`);
}
