/**
 * Test Scope:
 *
 * Feature: FT07 - Storage-Pfad-Konfiguration
 * Use Case: UC07 - Einheitliche Pfadauflosung fuer Uploads und Backups
 *
 * Abgedeckte Regeln:
 * - Relative Pfade sind in development/test/production erlaubt.
 * - Relative Pfade werden gegen process.cwd() aufgeloest.
 * - Absolute Pfade bleiben unveraendert.
 * - Zielverzeichnisse werden erstellt und aufloesbar zurueckgegeben.
 * - Fehlende oder leere Env-Werte werden mit klaren Fehlern abgelehnt.
 *
 * Fehlerfaelle:
 * - Fehlende ATTACHMENT_STORAGE_PATH/BACKUP_BASE_PATH Variablen.
 * - Leere Env-Werte nach Trim.
 *
 * Ziel:
 * Sicherstellen, dass die Storage-Pfadlogik in allen Modi konsistent funktioniert.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalCwd = process.cwd();
const originalEnv = { ...process.env };

function resetStorageEnv(): void {
  process.env = { ...originalEnv };
}

async function loadStoragePathsModule() {
  return import("../../../server/config/storagePaths");
}

describe("FT07 unit: storage paths resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    resetStorageEnv();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    resetStorageEnv();
  });

  it("resolves relative paths in development against process.cwd()", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mugplan-storage-dev-"));
    process.chdir(tempRoot);
    process.env.NODE_ENV = "development";
    process.env.ATTACHMENT_STORAGE_PATH = "./uploads";
    process.env.BACKUP_BASE_PATH = "./backups";

    const { initStoragePathsFromEnv } = await loadStoragePathsModule();
    const resolved = await initStoragePathsFromEnv();

    expect(resolved.attachmentStoragePath).toBe(path.resolve(tempRoot, "uploads"));
    expect(resolved.backupBasePath).toBe(path.resolve(tempRoot, "backups"));
    await expect(fs.access(resolved.attachmentStoragePath)).resolves.toBeUndefined();
    await expect(fs.access(resolved.backupBasePath)).resolves.toBeUndefined();
  });

  it("resolves relative paths in test and production against process.cwd()", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mugplan-storage-modes-"));
    process.chdir(tempRoot);

    for (const mode of ["test", "production"] as const) {
      vi.resetModules();
      process.env.NODE_ENV = mode;
      process.env.ATTACHMENT_STORAGE_PATH = "./uploads";
      process.env.BACKUP_BASE_PATH = "./backups";

      const { initStoragePathsFromEnv } = await loadStoragePathsModule();
      const resolved = await initStoragePathsFromEnv();
      expect(resolved.attachmentStoragePath).toBe(path.resolve(tempRoot, "uploads"));
      expect(resolved.backupBasePath).toBe(path.resolve(tempRoot, "backups"));
    }
  });

  it("keeps absolute paths unchanged", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mugplan-storage-abs-"));
    process.chdir(tempRoot);
    process.env.NODE_ENV = "development";
    process.env.ATTACHMENT_STORAGE_PATH = path.resolve(tempRoot, "absolute/uploads");
    process.env.BACKUP_BASE_PATH = path.resolve(tempRoot, "absolute/backups");

    const { initStoragePathsFromEnv } = await loadStoragePathsModule();
    const resolved = await initStoragePathsFromEnv();

    expect(resolved.attachmentStoragePath).toBe(path.resolve(tempRoot, "absolute/uploads"));
    expect(resolved.backupBasePath).toBe(path.resolve(tempRoot, "absolute/backups"));
  });

  it("fails on missing env variables", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.ATTACHMENT_STORAGE_PATH;
    delete process.env.BACKUP_BASE_PATH;

    const { initStoragePathsFromEnv } = await loadStoragePathsModule();
    await expect(initStoragePathsFromEnv()).rejects.toThrow("Fehlende Env-Variable: ATTACHMENT_STORAGE_PATH");
  });

  it("fails on empty env value after trim", async () => {
    process.env.NODE_ENV = "development";
    process.env.ATTACHMENT_STORAGE_PATH = "   ";
    process.env.BACKUP_BASE_PATH = "./backups";

    const { initStoragePathsFromEnv } = await loadStoragePathsModule();
    await expect(initStoragePathsFromEnv()).rejects.toThrow("Leere Env-Variable: ATTACHMENT_STORAGE_PATH");
  });
});
