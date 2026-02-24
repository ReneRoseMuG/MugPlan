/**
 * Test Scope:
 *
 * Feature: PKG-02 - DB Sicherheitsleitplanken
 * Use Case: Guarding von Runtime-Mode und DB-Zielidentitaet
 *
 * Abgedeckte Regeln:
 * - Runtime-Mode-Guard akzeptiert nur den erwarteten Zielmodus.
 * - DB-Zielguard akzeptiert nur mode-konforme Suffixe (_test/_dev/_production).
 *
 * Fehlerfaelle:
 * - Falscher Runtime-Mode fuehrt zu Guard-Fehler.
 * - Falsches DB-Suffix fuehrt zu Guard-Fehler.
 *
 * Ziel:
 * Technische Invarianten der zentralen DB-Safety-Guards stabil absichern.
 */
import { describe, expect, it } from "vitest";
import { assertRuntimeMode, assertSafeDatabaseUrlForMode } from "../../../server/security/dbSafetyGuards";

describe("PKG-02 Invariant: resetDatabase guardrails", () => {
  it("throws when runtime mode differs from expected test mode", () => {
    expect(() => assertRuntimeMode("test", "development")).toThrow("Invalid runtime mode");
  });

  it("accepts _test database in test mode", () => {
    expect(assertSafeDatabaseUrlForMode("mysql://u:p@localhost:3306/mugplan_test", "test")).toBe("mugplan_test");
  });

  it("rejects non-test database in test mode", () => {
    expect(() => assertSafeDatabaseUrlForMode("mysql://u:p@localhost:3306/mugplan_prod", "test")).toThrow(
      "Unsafe database target",
    );
  });
});
