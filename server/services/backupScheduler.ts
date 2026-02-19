import cron from "node-cron";
import { getGlobalSettingValue } from "./userSettingsService";
import * as backupService from "./backupService";
import * as backupRepository from "../repositories/backupRepository";

const logPrefix = "[backup-scheduler]";
let isRunning = false;
let schedulerStarted = false;

export async function runBackupSchedulerTick(): Promise<void> {
  if (isRunning) {
    console.info(`${logPrefix} tick skipped (already running)`);
    return;
  }

  isRunning = true;
  try {
    const enabledValue = await getGlobalSettingValue("backup_enabled");
    const isEnabled = typeof enabledValue === "boolean" ? enabledValue : true;

    if (!isEnabled) {
      await backupService.createSkippedBackupLog("disabled");
      console.info(`${logPrefix} tick -> skipped (disabled)`);
      return;
    }

    console.info(`${logPrefix} tick -> enabled (export pipeline not configured in this step)`);
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

