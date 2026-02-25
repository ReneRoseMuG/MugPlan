/**
 * Test Scope:
 *
 * Feature: PKG-02 - Demo-Seed Purge Safety Gate
 * Use Case: UC Guarding vor destruktivem Purge-Lauf
 *
 * Abgedeckte Regeln:
 * - Purge-Safety-Gate erzwingt Testmodus-Zielpruefung vor DB-Operation.
 * - SQL-Identity-Mismatch fuehrt zu Hard-Fail.
 * - Safety-Connection wird auch bei Fehlerfall geschlossen.
 *
 * Fehlerfaelle:
 * - Active SQL database ungleich erwarteter Test-DB-Name.
 *
 * Ziel:
 * Nachweis, dass Demo-Seed-Purge ohne passende SQL-Identity nicht ausgefuehrt werden kann.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("PKG-02 Invariant: demo seed purge safety gate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("passes when target guard and SQL identity check succeed", async () => {
    const endMock = vi.fn();
    vi.doMock("../../../server/config/runtimeEnv", () => ({
      getRuntimeMode: vi.fn(() => "test"),
      getRuntimeConfig: vi.fn(() => ({
        mysqlDatabaseUrl: "mysql://u:p@localhost:3306/mugplan_test",
        allowedDatabases: ["mugplan_test"],
        allowedHosts: ["localhost"],
      })),
    }));
    vi.doMock("../../../server/security/dbSafetyGuards", () => ({
      assertSafeDestructiveOperationTarget: vi.fn(() => ({ dbName: "mugplan_test", host: "localhost", port: 3306 })),
      assertSqlDatabaseIdentity: vi.fn(async () => undefined),
    }));
    vi.doMock("mysql2/promise", () => ({
      default: {
        createConnection: vi.fn(async () => ({ end: endMock })),
      },
    }));

    const { assertSafeDemoSeedPurgeTarget } = await import("../../../server/services/demoSeedPurgeSafety");
    await expect(assertSafeDemoSeedPurgeTarget()).resolves.toBeUndefined();
    expect(endMock).toHaveBeenCalledTimes(1);
  });

  it("hard-fails when SQL identity does not match expected test database", async () => {
    const endMock = vi.fn();
    vi.doMock("../../../server/config/runtimeEnv", () => ({
      getRuntimeMode: vi.fn(() => "test"),
      getRuntimeConfig: vi.fn(() => ({
        mysqlDatabaseUrl: "mysql://u:p@localhost:3306/mugplan_test",
        allowedDatabases: ["mugplan_test"],
        allowedHosts: ["localhost"],
      })),
    }));
    vi.doMock("../../../server/security/dbSafetyGuards", () => ({
      assertSafeDestructiveOperationTarget: vi.fn(() => ({ dbName: "mugplan_test", host: "localhost", port: 3306 })),
      assertSqlDatabaseIdentity: vi.fn(async () => {
        throw new Error("Active SQL database 'mugplan_dev' does not match expected 'mugplan_test'.");
      }),
    }));
    vi.doMock("mysql2/promise", () => ({
      default: {
        createConnection: vi.fn(async () => ({ end: endMock })),
      },
    }));

    const { assertSafeDemoSeedPurgeTarget } = await import("../../../server/services/demoSeedPurgeSafety");
    await expect(assertSafeDemoSeedPurgeTarget()).rejects.toThrow("does not match expected");
    expect(endMock).toHaveBeenCalledTimes(1);
  });
});
