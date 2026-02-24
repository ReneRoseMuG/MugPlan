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
import { assertRuntimeMode, assertSafeDatabaseTargetForMode } from "../../../server/security/dbSafetyGuards";

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
    ).toEqual({ dbName: "dbu_test_9ak2", host: "localhost" });
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
});
