import fs from "fs/promises";
import path from "path";
import { getBackupBasePath } from "../config/storagePaths";
import { logWarn } from "../lib/logger";

const DAY_DIR_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DUMP_FILE_PATTERN = /^dump_\d{4}-\d{2}-\d{2}T[\d-]+Z\.zip$/;

function dayStart(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function subtractDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - days);
  return copy;
}

function parseDayDirectoryName(name: string): Date | null {
  if (!DAY_DIR_PATTERN.test(name)) return null;
  const parsed = new Date(`${name}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

async function countFilesRecursively(rootDir: string): Promise<number> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    const target = path.resolve(rootDir, entry.name);
    if (entry.isDirectory()) {
      count += await countFilesRecursively(target);
    } else {
      count += 1;
    }
  }
  return count;
}

async function listDirectorySafe(rootDir: string) {
  try {
    return await fs.readdir(rootDir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function cleanupOldBackupDayDirectories(basePath: string, retentionThreshold: Date): Promise<number> {
  const entries = await listDirectorySafe(basePath);
  let deletedCount = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const parsedDate = parseDayDirectoryName(entry.name);
    if (!parsedDate) continue;
    if (parsedDate >= retentionThreshold) continue;

    const targetDir = path.resolve(basePath, entry.name);
    try {
      deletedCount += await countFilesRecursively(targetDir);
      await fs.rm(targetDir, { recursive: true, force: true });
    } catch (error) {
      logWarn("[backup-retention] failed to remove backup directory", {
        targetDir,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return deletedCount;
}

async function cleanupOldManualDumpFiles(basePath: string, retentionThreshold: Date): Promise<number> {
  const dumpsDir = path.resolve(basePath, "dumps");
  const entries = await listDirectorySafe(dumpsDir);
  let deletedCount = 0;

  for (const entry of entries) {
    if (!entry.isFile() || !DUMP_FILE_PATTERN.test(entry.name)) continue;
    const targetFile = path.resolve(dumpsDir, entry.name);
    try {
      const stat = await fs.stat(targetFile);
      if (stat.mtime >= retentionThreshold) continue;
      await fs.rm(targetFile, { force: true });
      deletedCount += 1;
    } catch (error) {
      logWarn("[backup-retention] failed to remove manual dump file", {
        targetFile,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return deletedCount;
}

async function cleanupOldTransferDayDirectories(basePath: string, retentionThreshold: Date): Promise<number> {
  const transfersDir = path.resolve(basePath, "transfers");
  const entries = await listDirectorySafe(transfersDir);
  let deletedCount = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const parsedDate = parseDayDirectoryName(entry.name);
    if (!parsedDate) continue;
    if (parsedDate >= retentionThreshold) continue;

    const targetDir = path.resolve(transfersDir, entry.name);
    try {
      deletedCount += await countFilesRecursively(targetDir);
      await fs.rm(targetDir, { recursive: true, force: true });
    } catch (error) {
      logWarn("[backup-retention] failed to remove dump transfer directory", {
        targetDir,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return deletedCount;
}

export async function cleanupOldBackups(now = new Date()): Promise<{ deletedCount: number }> {
  const basePath = await getBackupBasePath();
  const retentionThreshold = dayStart(subtractDays(now, 30));
  const deletedCount =
    await cleanupOldBackupDayDirectories(basePath, retentionThreshold)
    + await cleanupOldManualDumpFiles(basePath, retentionThreshold)
    + await cleanupOldTransferDayDirectories(basePath, retentionThreshold);

  return { deletedCount };
}
