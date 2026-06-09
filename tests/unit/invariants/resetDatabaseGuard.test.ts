/**
 * Test Scope:
 *
 * Feature: PKG-02 - DB Sicherheitsleitplanken
 * Use Case: Guarding von Runtime-Mode und DB-Zielidentitaet
 *
 * Abgedeckte Regeln:
 * - Runtime-Mode-Guard akzeptiert nur den erwarteten Zielmodus.
 * - DB-/Host-Guard akzeptiert nur explizit erlaubte Zielwerte aus den Allowlists.
 * - Test-Write-Guard akzeptiert zusaetzlich verankerte Worker-DBs (AP04), erzwingt
 *   aber weiterhin Host-Allowlist und _test-Suffix; Fast-Treffer werden abgelehnt.
 * - SQL-Identity-Guard akzeptiert nur die erwartete aktive Datenbank.
 *
 * Fehlerfaelle:
 * - Falscher Runtime-Mode fuehrt zu Guard-Fehler.
 * - Nicht erlaubte DB oder nicht erlaubter Host fuehrt zu Guard-Fehler.
 * - Abweichende oder leere SQL-Datenbankidentitaet fuehrt zu Guard-Fehler.
 *
 * Ziel:
 * Technische Invarianten der zentralen DB-Safety-Guards stabil absichern.
 */
import { describe, expect, it } from "vitest";
import {
  assertSafeAdminDestructiveOperationTarget,
  assertRuntimeMode,
  assertSafeDatabaseTargetForMode,
  assertSafeDestructiveOperationTarget,
  assertSqlDatabaseIdentity,
  assertSafeWriteTargetForTestMode,
  assertTestMode,
} from "../../../server/security/dbSafetyGuards";

describe("PKG-02 Invariant: resetDatabase guardrails", () => {
  it("throws when runtime mode differs from expected test mode", () => {
    expect(() => assertRuntimeMode("test", "development")).toThrow("Invalid runtime mode");
  });

  it("accepts database and host from allowlists", () => {
    expect(
      assertSafeDatabaseTargetForMode(
        "mysql://u:p@localhost:3306/dbu_test_9ak2",
        "test",
        ["dbu_test_9ak2"],
        ["localhost"],
      ),
    ).toEqual({ dbName: "dbu_test_9ak2", host: "localhost", port: 3306 });
  });

  it("rejects database outside allowed list", () => {
    expect(
      () =>
        assertSafeDatabaseTargetForMode(
          "mysql://u:p@localhost:3306/dbu_prod_77",
          "test",
          ["dbu_test_9ak2"],
          ["localhost"],
        ),
    ).toThrow("Unsafe database target");
  });

  it("rejects host outside allowed list", () => {
    expect(
      () =>
        assertSafeDatabaseTargetForMode(
          "mysql://u:p@db.example.com:3306/dbu_test_9ak2",
          "test",
          ["dbu_test_9ak2"],
          ["localhost"],
        ),
    ).toThrow("Unsafe host target");
  });

  it("requires MUGPLAN_MODE=test for test operations", () => {
    expect(() => assertTestMode("test", "development")).toThrow("Invalid MUGPLAN_MODE");
  });

  it("rejects test write target without *_test suffix", () => {
    expect(
      () =>
        assertSafeWriteTargetForTestMode(
          "mysql://u:p@localhost:3306/mugplan_testing",
          ["mugplan_testing"],
          ["localhost"],
        ),
    ).toThrow("Expected '*_test' suffix");
  });

  it("accepts worker test databases via the anchored worker pattern (AP04)", () => {
    for (const workerDb of ["mugplan_w0_test", "mugplan_w3_test", "mugplan_w15_test"]) {
      expect(
        assertSafeWriteTargetForTestMode(
          `mysql://u:p@localhost:3306/${workerDb}`,
          ["mugplan_test"],
          ["localhost"],
        ),
      ).toEqual({ dbName: workerDb, host: "localhost", port: 3306 });
    }
  });

  it("rejects a worker-like database on a non-allowlisted host (AP04)", () => {
    expect(
      () =>
        assertSafeWriteTargetForTestMode(
          "mysql://u:p@db.example.com:3306/mugplan_w1_test",
          ["mugplan_test"],
          ["localhost"],
        ),
    ).toThrow("Unsafe host target");
  });

  it("rejects names that only resemble the worker pattern (AP04)", () => {
    for (const badDb of [
      "mugplan_w1", // fehlendes _test-Suffix -> kein Mustertreffer
      "mugplan_wx_test", // nicht-numerischer Index
      "tenant_w1_test", // falscher Praefix
      "evil_mugplan_w1_test", // nicht verankert vorne
      "mugplan_w1_test_evil", // nicht verankert hinten
      "mugplan_prod", // Produktionsname
    ]) {
      expect(
        () =>
          assertSafeWriteTargetForTestMode(
            `mysql://u:p@localhost:3306/${badDb}`,
            ["mugplan_test"],
            ["localhost"],
          ),
        `expected '${badDb}' to be rejected`,
      ).toThrow("Unsafe database target");
    }
  });

  it("checks destructive targets with combined mode and target guards", () => {
    expect(
      assertSafeDestructiveOperationTarget({
        mode: "test",
        mugplanModeRaw: "test",
        databaseUrl: "mysql://u:p@localhost:3306/mugplan_test",
        allowedDatabases: ["mugplan_test"],
        allowedHosts: ["localhost"],
      }),
    ).toEqual({ dbName: "mugplan_test", host: "localhost", port: 3306 });
  });

  it("allows admin destructive operations in development when target is allowlisted", () => {
    expect(
      assertSafeAdminDestructiveOperationTarget({
        mode: "development",
        databaseUrl: "mysql://u:p@localhost:3306/mugplan_dev",
        allowedDatabases: ["mugplan_dev"],
        allowedHosts: ["localhost"],
      }),
    ).toEqual({ dbName: "mugplan_dev", host: "localhost", port: 3306 });
  });

  it("rejects admin destructive operations in development when target is not allowlisted", () => {
    expect(
      () =>
        assertSafeAdminDestructiveOperationTarget({
          mode: "development",
          databaseUrl: "mysql://u:p@localhost:3306/mugplan_dev",
          allowedDatabases: ["other_dev"],
          allowedHosts: ["localhost"],
        }),
    ).toThrow("Unsafe database target");
  });

  it("blocks admin destructive operations in production", () => {
    expect(
      () =>
        assertSafeAdminDestructiveOperationTarget({
          mode: "production",
          databaseUrl: "mysql://u:p@localhost:3306/mugplan_prod",
          allowedDatabases: ["mugplan_prod"],
          allowedHosts: ["localhost"],
        }),
    ).toThrow("blocked in production");
  });

  it("requires strict test guards for admin destructive operations in test mode", () => {
    expect(
      () =>
        assertSafeAdminDestructiveOperationTarget({
          mode: "test",
          mugplanModeRaw: "development",
          databaseUrl: "mysql://u:p@localhost:3306/mugplan_test",
          allowedDatabases: ["mugplan_test"],
          allowedHosts: ["localhost"],
        }),
    ).toThrow("Invalid MUGPLAN_MODE");

    expect(
      () =>
        assertSafeAdminDestructiveOperationTarget({
          mode: "test",
          mugplanModeRaw: "test",
          databaseUrl: "mysql://u:p@localhost:3306/mugplan_testing",
          allowedDatabases: ["mugplan_testing"],
          allowedHosts: ["localhost"],
        }),
    ).toThrow("Expected '*_test' suffix");
  });

  it("accepts SQL identity when active database matches expected test db", async () => {
    const connection = {
      query: async () => [[{ dbName: "mugplan_test" }]],
    };

    await expect(assertSqlDatabaseIdentity(connection as any, "mugplan_test")).resolves.toBeUndefined();
  });

  it("rejects SQL identity when active database differs from expected test db", async () => {
    const connection = {
      query: async () => [[{ dbName: "mugplan_dev" }]],
    };

    await expect(assertSqlDatabaseIdentity(connection as any, "mugplan_test")).rejects.toThrow(
      "does not match expected",
    );
  });

  it("rejects SQL identity when active database cannot be resolved", async () => {
    const connection = {
      query: async () => [[{ dbName: null }]],
    };

    await expect(assertSqlDatabaseIdentity(connection as any, "mugplan_test")).rejects.toThrow(
      "Could not resolve active SQL database name.",
    );
  });
});
