/**
 * Test Scope:
 *
 * Feature: FT07 - Runtime Env Loading
 * Use Case: UC07 - Eindeutiges Laden der Env-Dateien aus dem Projekt-Root
 *
 * Abgedeckte Regeln:
 * - development laedt exakt .env.dev ausgehend von process.cwd().
 * - test laedt exakt .env.test ausgehend von process.cwd().
 * - production laedt intern keine Datei und nutzt nur process.env.
 * - Fehlende erwartete Env-Dateien in development/test brechen fail-fast ab.
 *
 * Fehlerfaelle:
 * - Fehlende .env.dev Datei.
 * - Fehlende .env.test Datei.
 *
 * Ziel:
 * Sicherstellen, dass die Runtime-Env-Logik strikt und ohne Fallbacks arbeitet.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalCwd = process.cwd();
const originalEnv = { ...process.env };

function resetEnv(): void {
  process.env = { ...originalEnv };
  delete process.env.MYSQL_DATABASE_URL;
  delete process.env.DB_ALLOWED_DATABASES_DEV;
  delete process.env.DB_ALLOWED_DATABASES_TEST;
  delete process.env.DB_ALLOWED_DATABASES_PROD;
  delete process.env.DB_ALLOWED_HOSTS_DEV;
  delete process.env.DB_ALLOWED_HOSTS_TEST;
  delete process.env.DB_ALLOWED_HOSTS_PROD;
}

async function createReleaseLayout(prefix: string): Promise<{ releaseDir: string }> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const releaseDir = path.join(tempRoot, "instance-a");
  await fs.mkdir(releaseDir, { recursive: true });
  return { releaseDir };
}

async function importRuntimeEnvModule() {
  return import("../../../server/config/runtimeEnv");
}

function writeEnvFile(releaseDir: string, fileName: ".env.dev" | ".env.test", mysqlDb: string, modeSuffix: "DEV" | "TEST") {
  const content = [
    `MYSQL_DATABASE_URL=mysql://user:pass@localhost:3306/${mysqlDb}`,
    `DB_ALLOWED_DATABASES_${modeSuffix}=${mysqlDb}`,
    `DB_ALLOWED_HOSTS_${modeSuffix}=localhost`,
    "",
  ].join("\n");
  return fs.writeFile(path.join(releaseDir, fileName), content, "utf8");
}

describe("FT07 unit: runtime env loading", () => {
  beforeEach(() => {
    vi.resetModules();
    process.chdir(originalCwd);
    resetEnv();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    resetEnv();
  });

  it("loads development env exactly from .env.dev", async () => {
    const { releaseDir } = await createReleaseLayout("mugplan-runtime-dev-");
    await writeEnvFile(releaseDir, ".env.dev", "mugplan_dev", "DEV");
    process.chdir(releaseDir);
    process.env.NODE_ENV = "development";

    const { initializeRuntimeEnv } = await importRuntimeEnvModule();
    const runtime = initializeRuntimeEnv();

    expect(runtime.mode).toBe("development");
    expect(runtime.envSource).toBe("dev_file");
    expect(runtime.envFilePath).toBe(path.resolve(releaseDir, ".env.dev"));
  });

  it("loads test env exactly from .env.test", async () => {
    const { releaseDir } = await createReleaseLayout("mugplan-runtime-test-");
    await writeEnvFile(releaseDir, ".env.test", "mugplan_test", "TEST");
    process.chdir(releaseDir);
    process.env.NODE_ENV = "test";

    const { initializeRuntimeEnv } = await importRuntimeEnvModule();
    const runtime = initializeRuntimeEnv();

    expect(runtime.mode).toBe("test");
    expect(runtime.envSource).toBe("test_file");
    expect(runtime.envFilePath).toBe(path.resolve(releaseDir, ".env.test"));
  });

  it("accepts changed .env.test allowlist database names without code changes", async () => {
    const { releaseDir } = await createReleaseLayout("mugplan-runtime-test-allowlist-");
    await writeEnvFile(releaseDir, ".env.test", "tenant_test_blue_42", "TEST");
    process.chdir(releaseDir);
    process.env.NODE_ENV = "test";

    const { initializeRuntimeEnv } = await importRuntimeEnvModule();
    const runtime = initializeRuntimeEnv();

    expect(runtime.mode).toBe("test");
    expect(runtime.mysqlDatabaseUrl).toContain("/tenant_test_blue_42");
    expect(runtime.allowedDatabases).toEqual(["tenant_test_blue_42"]);
  });

  it("fails fast with cwd and expected path for missing development env file", async () => {
    const { releaseDir } = await createReleaseLayout("mugplan-runtime-dev-missing-");
    process.chdir(releaseDir);
    process.env.NODE_ENV = "development";

    const { initializeRuntimeEnv } = await importRuntimeEnvModule();
    const expectedPath = path.resolve(releaseDir, ".env.dev");

    expect(() => initializeRuntimeEnv()).toThrow(
      `Missing required env file for mode 'development'. cwd='${releaseDir}', expected='${expectedPath}'`,
    );
  });

  it("fails fast with cwd and expected path for missing test env file", async () => {
    const { releaseDir } = await createReleaseLayout("mugplan-runtime-test-missing-");
    process.chdir(releaseDir);
    process.env.NODE_ENV = "test";

    const { initializeRuntimeEnv } = await importRuntimeEnvModule();
    const expectedPath = path.resolve(releaseDir, ".env.test");

    expect(() => initializeRuntimeEnv()).toThrow(
      `Missing required env file for mode 'test'. cwd='${releaseDir}', expected='${expectedPath}'`,
    );
  });

  it("does not load file in production and uses process env", async () => {
    const { releaseDir } = await createReleaseLayout("mugplan-runtime-prod-");
    process.chdir(releaseDir);
    process.env.NODE_ENV = "production";
    process.env.MYSQL_DATABASE_URL = "mysql://user:pass@localhost:3306/mugplan_prod";
    process.env.DB_ALLOWED_DATABASES_PROD = "mugplan_prod";
    process.env.DB_ALLOWED_HOSTS_PROD = "localhost";

    const { initializeRuntimeEnv } = await importRuntimeEnvModule();
    const runtime = initializeRuntimeEnv();

    expect(runtime.mode).toBe("production");
    expect(runtime.envSource).toBe("process");
    expect(runtime.envFilePath).toBeUndefined();
    expect(runtime.mysqlDatabaseUrl).toContain("/mugplan_prod");
  });
});
