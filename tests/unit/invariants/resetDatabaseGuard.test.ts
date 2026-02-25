/**
 * Test Scope:
 *
 * Feature: PKG-02 - DB Sicherheitsleitplanken
 * Use Case: Guarding von Runtime-Mode und DB-Zielidentitaet
 *
 * Abgedeckte Regeln:
 * - Runtime-Mode-Guard akzeptiert nur den erwarteten Zielmodus.
 * - DB-/Host-Guard akzeptiert nur explizit erlaubte Zielwerte aus den Allowlists.
 *
 * Fehlerfaelle:
 * - Falscher Runtime-Mode fuehrt zu Guard-Fehler.
 * - Nicht erlaubte DB oder nicht erlaubter Host fuehrt zu Guard-Fehler.
 *
 * Ziel:
 * Technische Invarianten der zentralen DB-Safety-Guards stabil absichern.
 */
import { describe, expect, it } from "vitest";
import {
  assertRuntimeMode,
  assertSafeDatabaseTargetForMode,
  assertSafeDestructiveOperationTarget,
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
        [3306],
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
          [3306],
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
          [3306],
        ),
    ).toThrow("Unsafe host target");
  });

  it("rejects non-allowed port", () => {
    expect(
      () =>
        assertSafeDatabaseTargetForMode(
          "mysql://u:p@localhost:3307/dbu_test_9ak2",
          "test",
          ["dbu_test_9ak2"],
          ["localhost"],
          [3306],
        ),
    ).toThrow("Unsafe port target");
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
          [3306],
        ),
    ).toThrow("Expected '*_test' suffix");
  });

  it("checks destructive targets with combined mode and target guards", () => {
    expect(
      assertSafeDestructiveOperationTarget({
        mode: "test",
        mugplanModeRaw: "test",
        databaseUrl: "mysql://u:p@localhost:3306/mugplan_test",
        allowedDatabases: ["mugplan_test"],
        allowedHosts: ["localhost"],
        allowedPorts: [3306],
      }),
    ).toEqual({ dbName: "mugplan_test", host: "localhost", port: 3306 });
  });
});
