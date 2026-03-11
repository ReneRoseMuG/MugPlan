/**
 * Test Scope:
 *
 * Feature: FT27 - Seed-Dateiverwaltung fuer Admin-Stammdaten
 *
 * Abgedeckte Regeln:
 * - Seed-Dateien werden unterhalb des konfigurierten Uploads-Ordners im Unterordner `seed` angelegt.
 * - Status, Schreiben und Lesen arbeiten gegen einen externen Testdatenordner ausserhalb des Projekts.
 * - Fehlende Seed-Dateien werden als `exists = false` gemeldet.
 *
 * Fehlerfaelle:
 * - Status meldet fehlende Dateien als vorhanden.
 * - Schreiben oder Lesen landet ausserhalb des Seed-Unterordners.
 *
 * Ziel:
 * Die grundlegende Dateisystem-Kapselung fuer alle Seed-Panels isoliert absichern.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

async function setupExternalSeedRoot() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mugplan-seed-store-unit-"));
  process.env = {
    ...originalEnv,
    NODE_ENV: "test",
    ATTACHMENT_STORAGE_PATH: path.join(tempRoot, "uploads"),
    BACKUP_BASE_PATH: path.join(tempRoot, "backups"),
  };
  vi.resetModules();
  return tempRoot;
}

describe("FT27 unit: seed file store service", () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await setupExternalSeedRoot();
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    vi.resetModules();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("resolves seed file paths below the configured external uploads directory", async () => {
    const { getSeedFilePath } = await import("../../../server/services/seedFileStoreService");

    const seedPath = await getSeedFilePath("employees.csv");

    expect(seedPath).toBe(path.join(tempRoot, "uploads", "seed", "employees.csv"));
    await expect(fs.access(path.dirname(seedPath))).resolves.toBeUndefined();
  });

  it("writes, reads and reports status for seed files", async () => {
    const { getSeedFileStatus, readSeedFileUtf8, writeSeedFileUtf8 } = await import("../../../server/services/seedFileStoreService");

    await expect(getSeedFileStatus("employees.csv")).resolves.toEqual({
      sourceFile: "employees.csv",
      exists: false,
    });

    await writeSeedFileUtf8("employees.csv", "Vorname;Nachname;IsActive\nAda;Lovelace;true\n");

    await expect(getSeedFileStatus("employees.csv")).resolves.toEqual({
      sourceFile: "employees.csv",
      exists: true,
    });
    await expect(readSeedFileUtf8("employees.csv")).resolves.toBe("Vorname;Nachname;IsActive\nAda;Lovelace;true\n");
  });
});
