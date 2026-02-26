/**
 * Test Scope:
 *
 * Feature: PKG-02 - SQL Reset Guard
 * Use Case: UC Schutz des absoluten SQL-Reset-Skripts vor falschem Zielschema
 *
 * Abgedeckte Regeln:
 * - reset_absolute_state.sql enthaelt einen vorgelagerten Guard-Block.
 * - Der Guard signalisiert SQLSTATE 45000 bei unerlaubtem Ziel.
 * - Der Guard erlaubt nur Datenbanken mit Suffix *_test.
 *
 * Fehlerfaelle:
 * - Skript ohne SQLSTATE-Guard oder ohne *_test-Namensregel.
 *
 * Ziel:
 * Nachweis, dass das absolute Reset-Skript fail-fast auf nicht erlaubten DB-Zielen ist.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("PKG-02 Invariant: reset_absolute_state.sql guard", () => {
  it("contains SQLSTATE 45000 guard and *_test-only database rule", () => {
    const scriptPath = path.resolve(process.cwd(), "script/sql/reset_absolute_state.sql");
    const sql = fs.readFileSync(scriptPath, "utf8");

    expect(sql).toContain("BLOCK: GUARD");
    expect(sql).toContain("SIGNAL SQLSTATE '45000'");
    expect(sql).toContain("v_db_name NOT LIKE '%\\\\_test'");
    expect(sql).toContain("ABSOLUTE RESET ABGEBROCHEN");
  });
});
