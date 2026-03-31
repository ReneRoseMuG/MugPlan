/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - importDump ist in der Produktionsumgebung verboten.
 * - Nicht-Admin-Rollen erhalten für alle Dump-Operationen einen 403-Fehler.
 * - Ungültige oder Path-Traversal-Dateinamen werden mit 422 abgelehnt.
 * - Fehlende Dump-Dateien werden mit 404 beantwortet.
 * - Der erlaubte Dump-Tabellensatz bleibt explizit, und ausgeschlossene Tabellen bleiben außen vor.
 * - Das Dump-Format verlangt Version und gültige Arrays je bekannter Tabelle.
 * - Fehlende bekannte Tabellen werden beim Import tolerant als leer behandelt.
 * - Unbekannte Tabellen werden ignoriert und geloggt.
 *
 * Fehlerfälle:
 * - importDump in production → 403 FORBIDDEN
 * - Nicht-Admin → 403 FORBIDDEN
 * - Dateiname mit Path-Traversal → 422 VALIDATION_ERROR
 * - Dump ohne formatVersion/tables → 422 VALIDATION_ERROR
 * - Bekannte Tabelle mit ungültigem Datentyp → 422 VALIDATION_ERROR
 *
 * Ziel:
 * Absicherung von Zugriffskontrolle, Dump-Vertrag und Eingabe-Validierung des Dump-Service
 * ohne echten Datenbank-Restore.
 */
import os from "os";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tempRoot = path.resolve(os.tmpdir(), "mugplan-dump-unit-test");

vi.mock("../../../server/db", () => ({
  db: {},
  pool: {
    getConnection: vi.fn(async () => ({
      execute: vi.fn(async () => undefined),
      beginTransaction: vi.fn(async () => undefined),
      commit: vi.fn(async () => undefined),
      rollback: vi.fn(async () => undefined),
      release: vi.fn(),
    })),
  },
}));

vi.mock("../../../server/config/storagePaths", () => ({
  getBackupBasePath: vi.fn(async () => tempRoot),
  getAttachmentStoragePath: vi.fn(async () => path.join(tempRoot, "uploads")),
}));

vi.mock("../../../server/config/runtimeEnv", () => ({
  getRuntimeMode: vi.fn(() => "development"),
  getRuntimeConfig: vi.fn(() => ({
    mysqlDatabaseUrl: "mysql://root:root@localhost:3306/mugplan_test",
    allowedDatabases: ["mugplan_test"],
    allowedHosts: ["localhost"],
  })),
}));

vi.mock("../../../server/security/dbSafetyGuards", () => ({
  assertSafeAdminDestructiveOperationTarget: vi.fn(() => ({
    dbName: "mugplan_test",
    host: "localhost",
    port: 3306,
  })),
  assertSafeDatabaseTargetForMode: vi.fn(() => ({
    dbName: "mugplan_test",
    host: "localhost",
    port: 3306,
  })),
  parseDatabaseLogInfo: vi.fn((databaseUrl: string) => ({
    dbName: databaseUrl.includes("mugplan_prod") ? "mugplan_prod" : "mugplan_test",
    host: "localhost",
    port: 3306,
  })),
  assertSqlDatabaseIdentity: vi.fn(async () => undefined),
}));

vi.mock("../../../server/lib/logger", () => ({
  logError: vi.fn(),
}));

import {
  applyDumpImport,
  createDump,
  deleteDump,
  DUMP_FORMAT_VERSION,
  DUMP_TABLE_KEYS,
  EXCLUDED_DUMP_TABLE_KEYS,
  importDump,
  isDumpServiceError,
  listDumps,
  previewDumpImport,
  resolveDumpDownloadPath,
} from "../../../server/services/dumpService";
import { getRuntimeConfig, getRuntimeMode } from "../../../server/config/runtimeEnv";
import { logError } from "../../../server/lib/logger";

const adminCtx = { roleKey: "ADMIN" } as const;
const readerCtx = { roleKey: "LESER" } as const;
const emptyArrayHash = crypto.createHash("sha256").update(Buffer.from(JSON.stringify([]), "utf8")).digest("hex");

async function buildZipFromDataJson(data: unknown): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip");
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
    archive.append(JSON.stringify(data), { name: "data.json" });
    void archive.finalize();
  });
}

async function buildZipFromDumpArtifacts(data: unknown, manifest?: unknown): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip");
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
    archive.append(JSON.stringify(data), { name: "data.json" });
    if (manifest) {
      archive.append(JSON.stringify(manifest), { name: "manifest.json" });
    }
    void archive.finalize();
  });
}

describe("dumpService – Zugriffskontrolle", () => {
  it("createDump: LESER erhält 403", async () => {
    await expect(createDump(readerCtx)).rejects.toSatisfy(
      (error: unknown) => isDumpServiceError(error) && error.status === 403 && error.code === "FORBIDDEN",
    );
  });

  it("listDumps: LESER erhält 403", async () => {
    await expect(listDumps(readerCtx)).rejects.toSatisfy(
      (error: unknown) => isDumpServiceError(error) && error.status === 403,
    );
  });

  it("resolveDumpDownloadPath: LESER erhält 403", async () => {
    await expect(resolveDumpDownloadPath(readerCtx, "dump_2025-01-01T00-00-00-000Z.zip")).rejects.toSatisfy(
      (error: unknown) => isDumpServiceError(error) && error.status === 403,
    );
  });

  it("importDump: LESER erhält 403", async () => {
    await expect(importDump(readerCtx, Buffer.from(""))).rejects.toSatisfy(
      (error: unknown) => isDumpServiceError(error) && error.status === 403,
    );
  });

  it("deleteDump: LESER erhält 403", async () => {
    await expect(deleteDump(readerCtx, "dump_2025-01-01T00-00-00-000Z.zip")).rejects.toSatisfy(
      (error: unknown) => isDumpServiceError(error) && error.status === 403,
    );
  });
});

describe("dumpService preview/apply safety", () => {
  it("previewDumpImport returns warning for legacy dumps in development", async () => {
    const zipBuffer = await buildZipFromDataJson({
      formatVersion: 2,
      exportedAt: new Date().toISOString(),
      tables: Object.fromEntries(DUMP_TABLE_KEYS.map((key) => [key, []])),
    });

    const preview = await previewDumpImport(adminCtx, zipBuffer);

    expect(preview.transferReadiness).toBe("warning");
    expect(preview.isLegacyDump).toBe(true);
    expect(preview.manifestPresent).toBe(false);
    expect(preview.warnings.some((entry) => entry.includes("Legacy-Dump"))).toBe(true);
  });

  it("previewDumpImport blocks legacy dumps in production", async () => {
    vi.mocked(getRuntimeMode).mockReturnValue("production");
    vi.mocked(getRuntimeConfig).mockReturnValue({
      mysqlDatabaseUrl: "mysql://root:root@localhost:3306/mugplan_prod",
      allowedDatabases: ["mugplan_prod"],
      allowedHosts: ["localhost"],
    });
    const zipBuffer = await buildZipFromDataJson({
      formatVersion: 2,
      exportedAt: new Date().toISOString(),
      tables: Object.fromEntries(DUMP_TABLE_KEYS.map((key) => [key, []])),
    });

    const preview = await previewDumpImport(adminCtx, zipBuffer);

    expect(preview.transferReadiness).toBe("blocked");
    expect(preview.blockingIssues.some((entry) => entry.includes("Legacy-Dumps"))).toBe(true);
  });

  it("applyDumpImport blocks hash mismatch and wrong confirmation phrase", async () => {
    const exportedAt = new Date().toISOString();
    const dumpId = "dump-apply-test";
    const tables = Object.fromEntries(DUMP_TABLE_KEYS.map((key) => [key, []]));
    const manifest = {
      dumpId,
      formatVersion: DUMP_FORMAT_VERSION,
      exportedAt,
      schemaRevision: "0020_remove_employee_tour_id",
      tables: Object.fromEntries(DUMP_TABLE_KEYS.map((key) => [key, { rowCount: 0, sha256: emptyArrayHash }])),
      uploads: {
        fileCount: 0,
        totalBytes: 0,
        sha256: emptyArrayHash,
        files: [],
      },
    };
    const zipBuffer = await buildZipFromDumpArtifacts({
      formatVersion: DUMP_FORMAT_VERSION,
      exportedAt,
      dumpId,
      tables,
    }, manifest);
    const preview = await previewDumpImport(adminCtx, zipBuffer);

    await expect(applyDumpImport(adminCtx, {
      fileBuffer: zipBuffer,
      fileHash: `${preview.fileHash}x`,
      confirmationPhrase: preview.confirmationPhrase,
      productionConfirmationText: preview.confirmationPhrase,
    })).rejects.toSatisfy(
      (error: unknown) => isDumpServiceError(error) && error.code === "FILE_HASH_MISMATCH",
    );

    await expect(applyDumpImport(adminCtx, {
      fileBuffer: zipBuffer,
      fileHash: preview.fileHash,
      confirmationPhrase: preview.confirmationPhrase,
      productionConfirmationText: "falsch",
    })).rejects.toSatisfy(
      (error: unknown) => isDumpServiceError(error) && error.code === "CONFIRMATION_MISMATCH",
    );
  });
});

describe("dumpService – Environment-Guard", () => {
  afterEach(() => {
    vi.mocked(getRuntimeMode).mockReturnValue("development");
    vi.mocked(getRuntimeConfig).mockReturnValue({
      mysqlDatabaseUrl: "mysql://root:root@localhost:3306/mugplan_test",
      allowedDatabases: ["mugplan_test"],
      allowedHosts: ["localhost"],
    });
  });

  it("importDump: wirft 403 wenn Laufzeitmodus production ist", async () => {
    vi.mocked(getRuntimeMode).mockReturnValue("production");
    await expect(importDump(adminCtx, Buffer.from("test"))).rejects.toSatisfy(
      (error: unknown) => isDumpServiceError(error) && error.status === 403 && error.code === "FORBIDDEN",
    );
  });

  it("importDump: scheitert in development am ZIP-Parsing statt am Environment-Guard", async () => {
    vi.mocked(getRuntimeMode).mockReturnValue("development");
    await expect(importDump(adminCtx, Buffer.from("not-a-zip"))).rejects.toSatisfy(
      (error: unknown) => isDumpServiceError(error) && error.code !== "FORBIDDEN",
    );
  });
});

describe("dumpService – Tabellenvertrag", () => {
  it("enthält tours im erlaubten Dump-Satz", () => {
    expect(DUMP_TABLE_KEYS).toContain("tours");
  });

  it("schließt users und roles explizit aus", () => {
    expect(EXCLUDED_DUMP_TABLE_KEYS).toContain("users");
    expect(EXCLUDED_DUMP_TABLE_KEYS).toContain("roles");
    expect(DUMP_TABLE_KEYS).not.toContain("users");
    expect(DUMP_TABLE_KEYS).not.toContain("roles");
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
      (error: unknown) => isDumpServiceError(error) && error.status === 404 && error.code === "NOT_FOUND",
    );
  });

  it("resolveDumpDownloadPath: Path-Traversal-Versuch → 422", async () => {
    await expect(resolveDumpDownloadPath(adminCtx, "../../../etc/passwd")).rejects.toSatisfy(
      (error: unknown) => isDumpServiceError(error) && error.status === 422 && error.code === "VALIDATION_ERROR",
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

describe("dumpService – Dump-Formatvalidierung", () => {
  beforeEach(() => {
    vi.mocked(logError).mockReset();
  });

  it("lehnt ZIP ohne versioniertes Format ab", async () => {
    const zipBuffer = await buildZipFromDataJson({});
    await expect(importDump(adminCtx, zipBuffer)).rejects.toSatisfy(
      (error: unknown) =>
        isDumpServiceError(error) &&
        error.status === 422 &&
        error.message.includes("Dump-Version"),
    );
  });

  it("ignoriert unbekannte Tabellen und loggt sie einmal", async () => {
    const zipBuffer = await buildZipFromDataJson({
      formatVersion: DUMP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      tables: {
        ...Object.fromEntries(DUMP_TABLE_KEYS.map((key) => [key, []])),
        users: [],
      },
    });

    await expect(importDump(adminCtx, zipBuffer)).resolves.toMatchObject({
      tablesRestored: 0,
      uploadsRestored: false,
    });
    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(
      "parseDumpPayload: unbekannte Tabellen im Dump ignoriert",
      expect.objectContaining({
        unknownKeys: ["users"],
      }),
    );
  });

  it("füllt fehlende bekannte Tabellen tolerant mit leeren Arrays auf", async () => {
    const partialTables = Object.fromEntries(DUMP_TABLE_KEYS.slice(1).map((key) => [key, []]));
    const zipBuffer = await buildZipFromDataJson({
      formatVersion: DUMP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      tables: partialTables,
    });

    await expect(importDump(adminCtx, zipBuffer)).resolves.toMatchObject({
      tablesRestored: 0,
      uploadsRestored: false,
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it("lehnt bekannte Tabellen mit ungültigem Datentyp weiter ab", async () => {
    const zipBuffer = await buildZipFromDataJson({
      formatVersion: DUMP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      tables: {
        ...Object.fromEntries(DUMP_TABLE_KEYS.map((key) => [key, []])),
        tours: {},
      },
    });

    await expect(importDump(adminCtx, zipBuffer)).rejects.toSatisfy(
      (error: unknown) =>
        isDumpServiceError(error) &&
        error.status === 422 &&
        error.message.includes("Tabelle 'tours'"),
    );
  });
});
