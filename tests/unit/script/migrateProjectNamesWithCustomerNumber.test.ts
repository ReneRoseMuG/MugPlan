/**
 * Test Scope:
 *
 * Feature: FT02 - Projektnamenmigration
 * Use Case: UC Entfernen des Kundennummer-Praefix aus bestehenden Projektnamen
 *
 * Abgedeckte Regeln:
 * - Prefix wird nur entfernt, wenn Kundennummer im Namen exakt zur zugeordneten Kunden-Nr. passt.
 * - Bei Mismatch bleibt der Datensatz unveraendert (Skip).
 * - Namen ohne Prefix-Muster bleiben unveraendert (Skip).
 *
 * Fehlerfaelle:
 * - Falsche Migration bei legitimen Namen mit "K: ... - ..." aber abweichender Kundennummer.
 *
 * Ziel:
 * Deterministische und sichere Entscheidungslogik fuer die einmalige Datenmigration absichern.
 */
import { describe, expect, it } from "vitest";
import { decideProjectNameMigration } from "../../../script/project-name-migration";

describe("FT02 migration: strip customer-number prefix from project names", () => {
  it("returns update when prefix customer number matches related customer", () => {
    const decision = decideProjectNameMigration({
      projectId: 1,
      currentName: "K: 4711 - Sauna Modern",
      customerNumber: "4711",
    });

    expect(decision).toEqual({
      kind: "update",
      projectId: 1,
      from: "K: 4711 - Sauna Modern",
      to: "Sauna Modern",
    });
  });

  it("returns skip on mismatching embedded customer number", () => {
    const decision = decideProjectNameMigration({
      projectId: 2,
      currentName: "K: 9999 - Sauna Modern",
      customerNumber: "4711",
    });

    expect(decision).toEqual({
      kind: "skip",
      projectId: 2,
      reason: "prefix_customer_number_mismatch",
      currentName: "K: 9999 - Sauna Modern",
    });
  });

  it("returns skip when no prefix pattern is present", () => {
    const decision = decideProjectNameMigration({
      projectId: 3,
      currentName: "Sauna Modern",
      customerNumber: "4711",
    });

    expect(decision).toEqual({
      kind: "skip",
      projectId: 3,
      reason: "name_has_no_prefix_pattern",
      currentName: "Sauna Modern",
    });
  });
});
