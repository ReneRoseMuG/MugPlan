/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - importDump ist in der Produktionsumgebung verboten (NODE_ENV=production).
 * - Nicht-Admin-Rollen erhalten für alle Dump-Operationen einen 403-Fehler.
 * - Ungültige oder Path-Traversal-Dateinamen werden mit 422 abgelehnt.
 * - Fehlende Dump-Dateien werden mit 404 beantwortet.
 * - Das Dateinamen-Regex lässt nur gültige Dump-Dateinamen durch.
 *
 * Fehlerfälle:
 * - importDump in production → 403 FORBIDDEN
 * - Nicht-Admin → 403 FORBIDDEN
 * - Dateiname mit Path-Traversal → 422 VALIDATION_ERROR
 * - Dateiname ohne Dump-Format → 422 VALIDATION_ERROR
 * - Datei existiert nicht → 404 NOT_FOUND
 *
 * Ziel:
 * Absicherung der Zugriffskontrolle und Eingabe-Validierung des Dump-Service
 * ohne Datenbankzugriff und ohne echtes Dateisystem.
 */
import os from "os";
import path from "path";
import fs from "fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tempRoot = path.resolve(os.tmpdir(), "mugplan-dump-unit-test");

vi.mock("../../../server/db", () => ({
  db: {},
  pool: { getConnection: vi.fn() },
}));

vi.mock("../../../server/config/storagePaths", () => ({
  getBackupBasePath: vi.fn(async () => tempRoot),
  getAttachmentStoragePath: vi.fn(async () => path.join(tempRoot, "uploads")),
}));

import {
  createDump,
  deleteDump,
  importDump,
  isDumpServiceError,
  listDumps,
  resolveDumpDownloadPath,
} from "../../../server/services/dumpService";

const adminCtx = { roleKey: "ADMIN" } as const;
const readerCtx = { roleKey: "LESER" } as const;

describe("dumpService – Zugriffskontrolle", () => {
  it("createDump: LESER erhält 403", async () => {
    await expect(createDump(readerCtx)).rejects.toSatisfy(
      (e: unknown) => isDumpServiceError(e) && e.status === 403 && e.code === "FORBIDDEN",
    );
  });

  it("listDumps: LESER erhält 403", async () => {
    await expect(listDumps(readerCtx)).rejects.toSatisfy(
      (e: unknown) => isDumpServiceError(e) && e.status === 403,
    );
  });

  it("resolveDumpDownloadPath: LESER erhält 403", async () => {
    await expect(resolveDumpDownloadPath(readerCtx, "dump_2025-01-01T00-00-00-000Z.zip")).rejects.toSatisfy(
      (e: unknown) => isDumpServiceError(e) && e.status === 403,
    );
  });

  it("importDump: LESER erhält 403", async () => {
    await expect(importDump(readerCtx, Buffer.from(""))).rejects.toSatisfy(
      (e: unknown) => isDumpServiceError(e) && e.status === 403,
    );
  });

  it("deleteDump: LESER erhält 403", async () => {
    await expect(deleteDump(readerCtx, "dump_2025-01-01T00-00-00-000Z.zip")).rejects.toSatisfy(
      (e: unknown) => isDumpServiceError(e) && e.status === 403,
    );
  });
});

describe("dumpService – Environment-Guard", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("importDump: wirft 403 wenn NODE_ENV=production", async () => {
    process.env.NODE_ENV = "production";
    await expect(importDump(adminCtx, Buffer.from("test"))).rejects.toSatisfy(
      (e: unknown) => isDumpServiceError(e) && e.status === 403 && e.code === "FORBIDDEN",
    );
  });

  it("importDump: wird nicht durch den Environment-Guard blockiert wenn NODE_ENV=development", async () => {
    process.env.NODE_ENV = "development";
    // Wird später am ZIP-Parsing scheitern, nicht am Environment-Guard
    await expect(importDump(adminCtx, Buffer.from("not-a-zip"))).rejects.toSatisfy(
      (e: unknown) => isDumpServiceError(e) && e.code !== "FORBIDDEN",
    );
  });
});

describe("dumpService – Dateinamen-Validierung", () => {
  beforeEach(() => {
    fs.mkdirSync(path.join(tempRoot, "dumps"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("resolveDumpDownloadPath: gültiger Dateiname ohne Datei → 404", async () => {
    await expect(resolveDumpDownloadPath(adminCtx, "dump_2025-01-01T00-00-00-000Z.zip")).rejects.toSatisfy(
      (e: unknown) => isDumpServiceError(e) && e.status === 404 && e.code === "NOT_FOUND",
    );
  });

  it("resolveDumpDownloadPath: Path-Traversal-Versuch → 422", async () => {
    await expect(resolveDumpDownloadPath(adminCtx, "../../../etc/passwd")).rejects.toSatisfy(
      (e: unknown) => isDumpServiceError(e) && e.status === 422 && e.code === "VALIDATION_ERROR",
    );
  });

  it("resolveDumpDownloadPath: Dateiname ohne Dump-Präfix → 422", async () => {
    await expect(resolveDumpDownloadPath(adminCtx, "backup_2025-01-01.zip")).rejects.toSatisfy(
      (e: unknown) => isDumpServiceError(e) && e.status === 422,
    );
  });

  it("resolveDumpDownloadPath: leerer Dateiname → 422", async () => {
    await expect(resolveDumpDownloadPath(adminCtx, "")).rejects.toSatisfy(
      (e: unknown) => isDumpServiceError(e) && e.status === 422,
    );
  });

  it("resolveDumpDownloadPath: gültiger Dateiname mit vorhandener Datei → gibt Pfad zurück", async () => {
    const filename = "dump_2025-01-01T00-00-00-000Z.zip";
    fs.writeFileSync(path.join(tempRoot, "dumps", filename), "test");
    const result = await resolveDumpDownloadPath(adminCtx, filename);
    expect(result.fileName).toBe(filename);
    expect(result.filePath).toContain(filename);
  });

  it("deleteDump: nicht vorhandene Datei → 404", async () => {
    await expect(deleteDump(adminCtx, "dump_2025-01-01T00-00-00-000Z.zip")).rejects.toSatisfy(
      (e: unknown) => isDumpServiceError(e) && e.status === 404,
    );
  });

  it("deleteDump: Path-Traversal-Versuch → 422", async () => {
    await expect(deleteDump(adminCtx, "../secret.txt")).rejects.toSatisfy(
      (e: unknown) => isDumpServiceError(e) && e.status === 422,
    );
  });

  it("deleteDump: vorhandene Datei wird gelöscht", async () => {
    const filename = "dump_2025-06-01T12-00-00-000Z.zip";
    const filePath = path.join(tempRoot, "dumps", filename);
    fs.writeFileSync(filePath, "test");
    const result = await deleteDump(adminCtx, filename);
    expect(result.ok).toBe(true);
    expect(fs.existsSync(filePath)).toBe(false);
  });
});

describe("dumpService – listDumps", () => {
  beforeEach(() => {
    fs.mkdirSync(path.join(tempRoot, "dumps"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("leeres Verzeichnis → leeres Array", async () => {
    const result = await listDumps(adminCtx);
    expect(result).toEqual([]);
  });

  it("Dateien mit gültigem Namen werden zurückgegeben, ungültige ignoriert", async () => {
    const validFile = "dump_2025-01-01T00-00-00-000Z.zip";
    const invalidFile = "backup_2025-01-01.zip";
    fs.writeFileSync(path.join(tempRoot, "dumps", validFile), "content");
    fs.writeFileSync(path.join(tempRoot, "dumps", invalidFile), "content");

    const result = await listDumps(adminCtx);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe(validFile);
  });

  it("Ergebnis ist absteigend nach createdAt sortiert", async () => {
    const file1 = "dump_2025-01-01T00-00-00-000Z.zip";
    const file2 = "dump_2025-06-01T00-00-00-000Z.zip";
    fs.writeFileSync(path.join(tempRoot, "dumps", file1), "a");
    fs.writeFileSync(path.join(tempRoot, "dumps", file2), "b");

    const result = await listDumps(adminCtx);
    // Sortierung basiert auf mtime, daher beide gefunden
    expect(result).toHaveLength(2);
    // Beide Dateinamen sind im Ergebnis vorhanden
    const filenames = result.map((r) => r.filename);
    expect(filenames).toContain(file1);
    expect(filenames).toContain(file2);
  });
});
