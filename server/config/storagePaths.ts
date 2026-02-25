import { constants as fsConstants } from "fs";
import { access, mkdir } from "fs/promises";
import path from "path";

const ATTACHMENT_STORAGE_PATH_KEY = "ATTACHMENT_STORAGE_PATH";
const BACKUP_BASE_PATH_KEY = "BACKUP_BASE_PATH";

type StoragePaths = {
  attachmentStoragePath: string;
  backupBasePath: string;
};

let cachedStoragePaths: StoragePaths | null = null;

function resolveConfiguredPath(rawValue: string, envKey: string): string {
  const value = rawValue.trim();

  if (value.length === 0) {
    throw new Error(`Leere Env-Variable: ${envKey}`);
  }

  if (path.isAbsolute(value)) {
    return value;
  }

  return path.resolve(process.cwd(), value);
}

async function ensureWritableDirectory(absolutePath: string, envKey: string): Promise<void> {
  try {
    await mkdir(absolutePath, { recursive: true });
    await access(absolutePath, fsConstants.W_OK);
  } catch {
    throw new Error(`${envKey} ist nicht beschreibbar: ${absolutePath}`);
  }
}

export async function initStoragePathsFromEnv(): Promise<StoragePaths> {
  if (cachedStoragePaths) {
    return cachedStoragePaths;
  }

  const attachmentRaw = process.env[ATTACHMENT_STORAGE_PATH_KEY];
  if (typeof attachmentRaw !== "string") {
    throw new Error(`Fehlende Env-Variable: ${ATTACHMENT_STORAGE_PATH_KEY}`);
  }

  const backupRaw = process.env[BACKUP_BASE_PATH_KEY];
  if (typeof backupRaw !== "string") {
    throw new Error(`Fehlende Env-Variable: ${BACKUP_BASE_PATH_KEY}`);
  }

  const attachmentStoragePath = resolveConfiguredPath(attachmentRaw, ATTACHMENT_STORAGE_PATH_KEY);
  const backupBasePath = resolveConfiguredPath(backupRaw, BACKUP_BASE_PATH_KEY);

  await ensureWritableDirectory(attachmentStoragePath, ATTACHMENT_STORAGE_PATH_KEY);
  await ensureWritableDirectory(backupBasePath, BACKUP_BASE_PATH_KEY);

  cachedStoragePaths = {
    attachmentStoragePath,
    backupBasePath,
  };
  return cachedStoragePaths;
}

export async function getAttachmentStoragePath(): Promise<string> {
  const paths = await initStoragePathsFromEnv();
  return paths.attachmentStoragePath;
}

export async function getBackupBasePath(): Promise<string> {
  const paths = await initStoragePathsFromEnv();
  return paths.backupBasePath;
}
