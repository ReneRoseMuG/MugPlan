/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit (reiner Schema-/Konstanten-Abgleich, keine DB, kein FS)
 *
 * Realitätsgrad:
 * - Echte Schema-Definitionen (@shared/schema) und echte Dump-Konfiguration (dumpService).
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Keine (kein DB-/FS-Zugriff).
 *
 * Abgedeckte Regeln:
 * - Jede im Schema definierte Tabelle ist im Dump entweder enthalten (DUMP_TABLE_KEYS)
 *   oder bewusst ausgeschlossen (EXCLUDED_DUMP_TABLE_KEYS).
 * - Dump-Konfiguration referenziert keine nicht (mehr) existierenden Tabellen.
 *
 * Fehlerfälle:
 * - Eine neue Tabelle wird ohne Dump-Aufnahme und ohne dokumentierten Ausschluss eingeführt
 *   -> Test wird rot und nennt die nicht abgedeckte Tabelle.
 * - Eine in der Dump-Konfiguration gelistete Tabelle existiert im Schema nicht mehr.
 *
 * Ziel:
 * - Strukturell verhindern, dass künftige Tabellen unbemerkt aus Dump/Restore herausfallen
 *   (Backup-/Restore-Vollständigkeit als Invariante statt als Erinnerungsleistung).
 */
import { describe, expect, it } from "vitest";
import { is } from "drizzle-orm";
import { MySqlTable } from "drizzle-orm/mysql-core";
import * as schema from "@shared/schema";
import { DUMP_TABLE_KEYS, EXCLUDED_DUMP_TABLE_KEYS } from "../../../server/services/dumpService";

function schemaTableKeys(): string[] {
  return Object.entries(schema)
    .filter(([, value]) => is(value, MySqlTable))
    .map(([key]) => key)
    .sort();
}

describe("Invariante: Dump deckt alle Schema-Tabellen ab", () => {
  it("jede Schema-Tabelle ist gedumpt oder bewusst ausgeschlossen", () => {
    const covered = new Set<string>([...DUMP_TABLE_KEYS, ...EXCLUDED_DUMP_TABLE_KEYS]);
    const uncovered = schemaTableKeys().filter((key) => !covered.has(key));

    expect(
      uncovered,
      `Nicht im Dump berücksichtigte Tabellen (weder in DUMP_TABLE_ENTRIES noch in EXCLUDED_DUMP_TABLE_KEYS): ${uncovered.join(", ")}`,
    ).toEqual([]);
  });

  it("erfasst die Adress- und Journal-Tabellen explizit", () => {
    const covered = new Set<string>([...DUMP_TABLE_KEYS, ...EXCLUDED_DUMP_TABLE_KEYS]);
    for (const key of ["addressCategories", "customerAddresses", "journalEntries", "journalEntryContexts"]) {
      expect(covered.has(key), `Tabelle '${key}' fehlt in der Dump-Abdeckung`).toBe(true);
    }
  });

  it("jeder Dump- und Ausschluss-Key entspricht einer existierenden Schema-Tabelle", () => {
    const existing = new Set(schemaTableKeys());
    const configured = [...DUMP_TABLE_KEYS, ...EXCLUDED_DUMP_TABLE_KEYS];
    const stale = configured.filter((key) => !existing.has(key));

    expect(
      stale,
      `Dump-Konfiguration referenziert nicht (mehr) existierende Tabellen: ${stale.join(", ")}`,
    ).toEqual([]);
  });
});
