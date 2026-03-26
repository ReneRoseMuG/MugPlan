/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - importDump ist in der Produktionsumgebung verboten.
 * - Nicht-Admin-Rollen erhalten für alle Dump-Operationen einen 403-Fehler.
 * - Ungültige oder Path-Traversal-Dateinamen werden mit 422 abgelehnt.
 * - Fehlende Dump-Dateien werden mit 404 beantwortet.
 * - Der erlaubte Dump-Tabellensatz bleibt explizit, und ausgeschlossene Tabellen bleiben außen vor.
 * - Das Dump-Format verlangt Version und vollständigen Tabellenblock.
 *
 * Fehlerfälle:
 * - importDump in production → 403 FORBIDDEN
 * - Nicht-Admin → 403 FORBIDDEN
 * - Dateiname mit Path-Traversal → 422 VALIDATION_ERROR
 * - Dump ohne formatVersion/tables → 422 VALIDATION_ERROR
 * - Dump mit unbekannten oder fehlenden Tabellen → 422 VALIDATION_ERROR
 *
 * Ziel:
 * Absicherung von Zugriffskontrolle, Dump-Vertrag und Eingabe-Validierung des Dump-Service
 * ohne echten Datenbank-Restore.
 */
import os from "os";
import path from "path";
import fs from "fs";
import archiver from "archiver";
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
  assertSqlDatabaseIdentity: vi.fn(async () => undefined),
}));

import {
  createDump,
  deleteDump,
  DUMP_FORMAT_VERSION,
  DUMP_TABLE_KEYS,
  EXCLUDED_DUMP_TABLE_KEYS,
  importDump,
  isDumpServiceError,
  listDumps,
  resolveDumpDownloadPath,
} from "../../../server/services/dumpService";
import { getRuntimeMode } from "../../../server/config/runtimeEnv";

const adminCtx = { roleKey: "ADMIN" } as const;
const readerCtx = { roleKey: "LESER" } as const;

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

describe("dumpService – Environment-Guard", () => {
  afterEach(() => {
    vi.mocked(getRuntimeMode).mockReturnValue("development");
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
  it("lehnt ZIP ohne versioniertes Format ab", async () => {
    const zipBuffer = await buildZipFromDataJson({});
    await expect(importDump(adminCtx, zipBuffer)).rejects.toSatisfy(
      (error: unknown) =>
        isDumpServiceError(error) &&
        error.status === 422 &&
        error.message.includes("Dump-Version"),
    );
  });

  it("lehnt Dump mit unbekannten Tabellen ab", async () => {
    const zipBuffer = await buildZipFromDataJson({
      formatVersion: DUMP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      tables: {
        ...Object.fromEntries(DUMP_TABLE_KEYS.map((key) => [key, []])),
        users: [],
      },
    });

    await expect(importDump(adminCtx, zipBuffer)).rejects.toSatisfy(
      (error: unknown) =>
        isDumpServiceError(error) &&
        error.status === 422 &&
        error.message.includes("Unbekannte Tabellen"),
    );
  });

  it("lehnt Dump mit fehlenden Tabellen ab", async () => {
    const partialTables = Object.fromEntries(DUMP_TABLE_KEYS.slice(1).map((key) => [key, []]));
    const zipBuffer = await buildZipFromDataJson({
      formatVersion: DUMP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      tables: partialTables,
    });

    await expect(importDump(adminCtx, zipBuffer)).rejects.toSatisfy(
      (error: unknown) =>
        isDumpServiceError(error) &&
        error.status === 422 &&
        error.message.includes("Fehlende Tabellen"),
    );
  });
});
