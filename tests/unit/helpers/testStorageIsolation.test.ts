/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Test-Storage-Isolation liefert stabile Upload- und Backup-Pfade.
 * - Die synchrone Konfiguration schreibt dieselben Pfade in die Env-Variablen wie der asynchrone Pfad.
 * - Ein Reset entfernt Restdateien in Uploads und Backups.
 *
 * Fehlerfaelle:
 * - Playwright und Vitest nutzen unterschiedliche Test-Storage-Pfade.
 * - Reset laesst Altdateien im isolierten Storage liegen.
 *
 * Ziel:
 * Die gemeinsame Storage-Isolation fuer Vitest und Playwright regressionssicher absichern.
 */
import fs from "fs/promises";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  configureTestStorageIsolationSync,
  getIsolatedTestStoragePaths,
  resetIsolatedTestStorage,
} from "../../helpers/testStorageIsolation";

describe("test storage isolation helper", () => {
  it("configures stable isolated upload and backup env paths", () => {
    configureTestStorageIsolationSync();
    const paths = getIsolatedTestStoragePaths();

    expect(process.env.ATTACHMENT_STORAGE_PATH).toBe(paths.uploadsPath);
    expect(process.env.BACKUP_BASE_PATH).toBe(paths.backupsPath);
  });

  it("removes leftover files during reset", async () => {
    configureTestStorageIsolationSync();
    const paths = getIsolatedTestStoragePaths();

    await fs.mkdir(paths.uploadsPath, { recursive: true });
    await fs.mkdir(paths.backupsPath, { recursive: true });
    await fs.writeFile(path.join(paths.uploadsPath, "upload.txt"), "upload", "utf8");
    await fs.writeFile(path.join(paths.backupsPath, "backup.txt"), "backup", "utf8");

    await resetIsolatedTestStorage();

    await expect(fs.readdir(paths.uploadsPath)).resolves.toEqual([]);
    await expect(fs.readdir(paths.backupsPath)).resolves.toEqual([]);
  });
});
