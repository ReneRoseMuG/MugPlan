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
});

