/**
 * Test Scope:
 *
 * Feature: PKG-02 - Globaler DB-Startup-Guard
 * Use Case: Guarding des zentralen DB-Pool-Starts gegen nicht erlaubte Targets
 *
 * Abgedeckte Regeln:
 * - Der DB-Startup akzeptiert nur Ziele, die in den mode-spezifischen Allowlists liegen.
 * - Im Testmodus akzeptiert der Startup zusaetzlich verankerte Worker-DBs (AP04).
 * - Nicht erlaubte Datenbankziele brechen den Startup fail-fast vor createPool ab.
 * - Nicht erlaubte Hostziele brechen den Startup fail-fast vor createPool ab.
 *
 * Fehlerfaelle:
 * - MYSQL_DATABASE_URL zeigt auf eine DB außerhalb von DB_ALLOWED_DATABASES_*.
 * - MYSQL_DATABASE_URL zeigt auf einen Host außerhalb von DB_ALLOWED_HOSTS_*.
 *
 * Ziel:
 * Sicherstellen, dass der zentrale DB-Importpfad dieselben Safety-Grenzen wie Wartungs-/Reset-Pfade erzwingt.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type RuntimeConfigMock = {
  mode: "development" | "test" | "production";
  envSource: "dev_file" | "test_file" | "process";
  mysqlDatabaseUrl: string;
  allowedDatabases: string[];
  allowedHosts: string[];
};

const createPoolMock = vi.fn(() => ({ mockPool: true }));

function installBaseMocks(runtimeConfig: RuntimeConfigMock) {
  vi.doMock("mysql2/promise", () => ({
    default: {
      createPool: createPoolMock,
    },
  }));
  vi.doMock("drizzle-orm/mysql2", () => ({
    drizzle: vi.fn(() => ({ mockDb: true })),
  }));
  vi.doMock("@shared/schema", () => ({}));
  vi.doMock("../../../server/lib/logger", () => ({
    isSqlLoggingEnabled: vi.fn(() => false),
    logSql: vi.fn(),
  }));
  vi.doMock("../../../server/config/runtimeEnv", () => ({
    initializeRuntimeEnv: vi.fn(),
    getRuntimeConfig: vi.fn(() => runtimeConfig),
  }));
}

describe("PKG-02 Invariant: db startup guardrails", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.MUGPLAN_MODE = "test";
  });

  it("accepts allowed database + host and creates pool", async () => {
    installBaseMocks({
      mode: "test",
      envSource: "test_file",
      mysqlDatabaseUrl: "mysql://u:p@localhost:3306/tenant_01_test",
      allowedDatabases: ["tenant_01_test", "tenant_02_test"],
      allowedHosts: ["localhost"],
    });

    await import("../../../server/db");

    expect(createPoolMock).toHaveBeenCalledTimes(1);
    expect(createPoolMock).toHaveBeenCalledWith("mysql://u:p@localhost:3306/tenant_01_test");
  });

  it("accepts a worker test database via the anchored pattern even if not exactly allowlisted (AP04)", async () => {
    installBaseMocks({
      mode: "test",
      envSource: "test_file",
      mysqlDatabaseUrl: "mysql://u:p@localhost:3306/mugplan_w2_test",
      allowedDatabases: ["mugplan_test"],
      allowedHosts: ["localhost"],
    });

    await import("../../../server/db");

    expect(createPoolMock).toHaveBeenCalledTimes(1);
    expect(createPoolMock).toHaveBeenCalledWith("mysql://u:p@localhost:3306/mugplan_w2_test");
  });

  it("fails fast when database is outside allowlist", async () => {
    installBaseMocks({
      mode: "test",
      envSource: "test_file",
      mysqlDatabaseUrl: "mysql://u:p@localhost:3306/tenant_dev_01",
      allowedDatabases: ["tenant_01_test", "tenant_02_test"],
      allowedHosts: ["localhost"],
    });

    const loadDbModule = import("../../../server/db");
    await expect(loadDbModule).rejects.toThrow("DB startup guard rejected target for mode 'test'");
    await expect(loadDbModule).rejects.toThrow("Unsafe database target for mode 'test'");
    await expect(loadDbModule).rejects.toThrow("allowedDatabases='tenant_01_test, tenant_02_test'");
    expect(createPoolMock).not.toHaveBeenCalled();
  });

  it("fails fast when host is outside allowlist", async () => {
    installBaseMocks({
      mode: "test",
      envSource: "test_file",
      mysqlDatabaseUrl: "mysql://u:p@db.example.com:3306/tenant_01_test",
      allowedDatabases: ["tenant_01_test"],
      allowedHosts: ["localhost"],
    });

    const loadDbModule = import("../../../server/db");
    await expect(loadDbModule).rejects.toThrow("DB startup guard rejected target for mode 'test'");
    await expect(loadDbModule).rejects.toThrow("Unsafe host target for mode 'test'");
    await expect(loadDbModule).rejects.toThrow("allowedHosts='localhost'");
    expect(createPoolMock).not.toHaveBeenCalled();
  });
});
