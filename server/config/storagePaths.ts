import { constants as fsConstants } from "fs";
import { access, mkdir } from "fs/promises";
import path from "path";
import { getLoadedEnvSource } from "./runtimeEnv";

const ATTACHMENT_STORAGE_PATH_KEY = "ATTACHMENT_STORAGE_PATH";
const BACKUP_BASE_PATH_KEY = "BACKUP_BASE_PATH";

type StoragePaths = {
  attachmentStoragePath: string;
  backupBasePath: string;
};

let cachedStoragePaths: StoragePaths | null = null;

function resolveConfiguredPath(rawValue: string, envKey: string): string {
  const nodeEnv = process.env.NODE_ENV ?? "";
  const value = rawValue.trim();
  const envSource = getLoadedEnvSource();

  if (value.length === 0) {
    throw new Error(`Leere Env-Variable: ${envKey}`);
  }

  const isAbsolute = path.isAbsolute(value);

  if (nodeEnv === "production") {
    // In shared server deployments, enforce relative paths in shared/.env.
    // For local production smoke-runs (fallback root .env), keep absolute paths compatible.
    if (envSource === "shared" && isAbsolute) {
      throw new Error(`${envKey} muss bei shared/.env in production als relativer Pfad gesetzt werden.`);
    }
    if (isAbsolute) {
      return value;
    }
    return path.resolve(process.cwd(), value);
  }

  if (nodeEnv === "development" || nodeEnv === "test") {
    if (!isAbsolute) {
      throw new Error(`${envKey} muss in ${nodeEnv} als absoluter Pfad gesetzt werden.`);
    }
    return value;
  }

  if (!isAbsolute) {
    throw new Error(`${envKey} muss ausserhalb production als absoluter Pfad gesetzt werden.`);
  }
  return value;
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
