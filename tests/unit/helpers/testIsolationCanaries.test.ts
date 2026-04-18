/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Storage-Canaries schreiben Altdateien in Upload- und Backup-Pfade.
 * - Canary-Beschreibungen liefern fuer Diagnose-Laeufe sprechende Texte.
 *
 * Fehlerfaelle:
 * - Storage-Canaries landen im falschen Verzeichnis.
 * - Canary-Profile sind fuer Diagnose-Laeufe nicht erklaerbar.
 *
 * Ziel:
 * Die Canary-Helfer fuer Storage und Diagnosebeschreibung isoliert absichern.
 */
import fs from "fs/promises";
import { describe, expect, it } from "vitest";

import {
  describeDatabaseCanaryExpectation,
  describeStorageCanaryExpectation,
  injectStorageCanaries,
} from "../../helpers/testIsolationCanaries";
import {
  configureTestStorageIsolationSync,
  getIsolatedTestStoragePaths,
  resetIsolatedTestStorage,
} from "../../helpers/testStorageIsolation";

describe("test isolation canaries helper", () => {
  it("describes database and storage canary expectations", () => {
    expect(describeDatabaseCanaryExpectation("project-list-confusion")).toContain("Listen");
    expect(describeStorageCanaryExpectation("backup-confusion")).toContain("Backup");
  });

  it("writes upload canaries into the isolated attachment path", async () => {
    configureTestStorageIsolationSync();
    await resetIsolatedTestStorage();
    const paths = getIsolatedTestStoragePaths();

    const result = await injectStorageCanaries("attachment-confusion", "upload-canary");

    expect(result.createdFiles).toHaveLength(1);
    expect(result.createdFiles[0]).toContain(paths.uploadsPath);
    await expect(fs.readFile(result.createdFiles[0], "utf8")).resolves.toContain("attachment-confusion");
  });

  it("writes backup canaries into the isolated backup path", async () => {
    configureTestStorageIsolationSync();
    await resetIsolatedTestStorage();
    const paths = getIsolatedTestStoragePaths();

    const result = await injectStorageCanaries("backup-confusion", "backup-canary");

    expect(result.createdFiles).toHaveLength(1);
    expect(result.createdFiles[0]).toContain(paths.backupsPath);
    await expect(fs.readFile(result.createdFiles[0], "utf8")).resolves.toContain("backup-confusion");
  });
});
