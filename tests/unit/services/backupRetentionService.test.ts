/**
 * Test Scope:
 *
 * Feature: FT07 - Automatischer Kalenderbackup
 * Use Case: UC07 - Retention fuer Backup-Dateien
 *
 * Abgedeckte Regeln:
 * - Backup-Verzeichnisse aelter als 30 Tage werden geloescht.
 * - Aktuelle Backup-Verzeichnisse bleiben erhalten.
 *
 * Fehlerfaelle:
 * - Retention loescht auch frische Backups.
 * - Retention ignoriert alte Backup-Verzeichnisse.
 *
 * Ziel:
 * Sicherstellen, dass die 30-Tage-Retention deterministisch arbeitet.
 */
import fs from "fs/promises";
import path from "path";
import os from "os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tempRoot = path.resolve(os.tmpdir(), "mugplan-ft07-retention-test");

vi.mock("../../../server/config/storagePaths", () => ({
  getBackupBasePath: vi.fn(async () => tempRoot),
}));

import { cleanupOldBackups } from "../../../server/services/backupRetentionService";

async function ensureDirWithFile(dir: string, fileName: string) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.resolve(dir, fileName), "x");
}

async function ensureFileWithMtime(filePath: string, mtime: Date) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, "x");
  await fs.utimes(filePath, mtime, mtime);
}

describe("FT07 service: backup retention", () => {
  beforeEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
    await fs.mkdir(tempRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("removes backup folders older than 30 days and keeps newer ones", async () => {
    await ensureDirWithFile(path.resolve(tempRoot, "2025-12-31"), "old.txt");
    await ensureDirWithFile(path.resolve(tempRoot, "2026-02-15"), "new.txt");

    const result = await cleanupOldBackups(new Date("2026-03-03T10:00:00.000Z"));

    await expect(fs.access(path.resolve(tempRoot, "2025-12-31"))).rejects.toBeTruthy();
    await expect(fs.access(path.resolve(tempRoot, "2026-02-15"))).resolves.toBeUndefined();
    expect(result.deletedCount).toBeGreaterThanOrEqual(1);
  });

  it("removes old manual dump files and keeps fresh dump files", async () => {
    const oldDump = path.resolve(tempRoot, "dumps", "dump_2026-01-01T00-00-00-000Z.zip");
    const freshDump = path.resolve(tempRoot, "dumps", "dump_2026-02-20T00-00-00-000Z.zip");
    await ensureFileWithMtime(oldDump, new Date("2026-01-01T10:00:00.000Z"));
    await ensureFileWithMtime(freshDump, new Date("2026-02-20T10:00:00.000Z"));

    const result = await cleanupOldBackups(new Date("2026-03-03T10:00:00.000Z"));

    await expect(fs.access(oldDump)).rejects.toBeTruthy();
    await expect(fs.access(freshDump)).resolves.toBeUndefined();
    expect(result.deletedCount).toBeGreaterThanOrEqual(1);
  });

  it("removes old transfer day folders and keeps fresh transfer folders", async () => {
    await ensureDirWithFile(path.resolve(tempRoot, "transfers", "2026-01-01", "transfer-old"), "journal.json");
    await ensureDirWithFile(path.resolve(tempRoot, "transfers", "2026-02-20", "transfer-new"), "journal.json");

    const result = await cleanupOldBackups(new Date("2026-03-03T10:00:00.000Z"));

    await expect(fs.access(path.resolve(tempRoot, "transfers", "2026-01-01"))).rejects.toBeTruthy();
    await expect(fs.access(path.resolve(tempRoot, "transfers", "2026-02-20"))).resolves.toBeUndefined();
    expect(result.deletedCount).toBeGreaterThanOrEqual(1);
  });
});
