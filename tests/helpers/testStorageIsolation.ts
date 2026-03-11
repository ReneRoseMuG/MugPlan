import fs from "fs/promises";
import os from "os";
import path from "path";

let tempRootPromise: Promise<string> | null = null;

async function getTempRoot(): Promise<string> {
  if (!tempRootPromise) {
    tempRootPromise = fs.mkdtemp(path.join(os.tmpdir(), "mugplan-test-storage-"));
  }
  return tempRootPromise;
}

export async function configureTestStorageIsolation(): Promise<void> {
  const tempRoot = await getTempRoot();
  process.env.ATTACHMENT_STORAGE_PATH = path.join(tempRoot, "uploads");
  process.env.BACKUP_BASE_PATH = path.join(tempRoot, "backups");
}

export async function resetIsolatedTestStorage(): Promise<void> {
  const tempRoot = await getTempRoot();
  await fs.rm(path.join(tempRoot, "uploads"), { recursive: true, force: true });
  await fs.rm(path.join(tempRoot, "backups"), { recursive: true, force: true });
}
