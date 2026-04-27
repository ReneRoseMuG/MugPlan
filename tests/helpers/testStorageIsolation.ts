import fs from "fs/promises";
import { mkdtempSync } from "fs";
import os from "os";
import path from "path";

let tempRootPromise: Promise<string> | null = null;
let tempRootSync: string | null = null;

function ensureTempRootSync(): string {
  if (!tempRootSync) {
    tempRootSync = mkdtempSync(path.join(os.tmpdir(), "mugplan-test-storage-"));
  }
  return tempRootSync;
}

async function getTempRoot(): Promise<string> {
  if (!tempRootPromise) {
    tempRootPromise = Promise.resolve(ensureTempRootSync());
  }
  return tempRootPromise;
}

export function getIsolatedTestStoragePaths() {
  const tempRoot = ensureTempRootSync();
  return {
    tempRoot,
    uploadsPath: path.join(tempRoot, "uploads"),
    backupsPath: path.join(tempRoot, "backups"),
  };
}

export function configureTestStorageIsolationSync(): void {
  const paths = getIsolatedTestStoragePaths();
  process.env.ATTACHMENT_STORAGE_PATH = paths.uploadsPath;
  process.env.BACKUP_BASE_PATH = paths.backupsPath;
}

export async function configureTestStorageIsolation(): Promise<void> {
  await getTempRoot();
  configureTestStorageIsolationSync();
}

export async function resetIsolatedTestStorage(): Promise<void> {
  await getTempRoot();
  const paths = getIsolatedTestStoragePaths();
  await fs.rm(paths.uploadsPath, { recursive: true, force: true });
  await fs.rm(paths.backupsPath, { recursive: true, force: true });
  await fs.mkdir(paths.uploadsPath, { recursive: true });
  await fs.mkdir(paths.backupsPath, { recursive: true });
}
