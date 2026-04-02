/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Setting-Key reports.categoryLayout ist ein GLOBALes JSON-Setting mit leerem Default.
 * - Gueltige Kategorie-Eintraege akzeptieren positive Kategorie-IDs, positive Blocknummern und Spalten 1 bis 3.
 * - Kategorien duerfen im Layout nur einmal vorkommen.
 *
 * Fehlerfaelle:
 * - Undefinierte Strukturen, ungueltige Spalten oder doppelte Kategorien werden akzeptiert.
 *
 * Ziel:
 * Den Registry-Vertrag fuer das globale Kategorie-Layout der Produktionsplanung absichern.
 */
import { describe, expect, it } from "vitest";

import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: reports.categoryLayout", () => {
  const definition = userSettingsRegistry.reportsCategoryLayout;

  it("uses a GLOBAL-scoped json setting with an empty-array default", () => {
    expect(definition.key).toBe("reports.categoryLayout");
    expect(definition.type).toBe("json");
    expect(definition.allowedScopes).toEqual(["GLOBAL"]);
    expect(definition.defaultValue).toEqual([]);
  });

  it("accepts valid category entries with unique ids and blocks", () => {
    expect(definition.validate([
      { categoryId: 11, block: 1, columns: 2 },
      { categoryId: 12, block: 1, columns: 3 },
      { categoryId: 21, block: 2, columns: 1 },
    ])).toBe(true);
  });

  it("accepts the legacy block format for bestehende persisted values", () => {
    expect(definition.validate([
      { categoryIds: [11, 12], columns: 2 },
      { categoryIds: [21], columns: 1 },
    ])).toBe(true);
  });

  it("rejects invalid payloads, duplicate ids and invalid columns", () => {
    expect(definition.validate(null)).toBe(false);
    expect(definition.validate({ categoryId: 11, block: 1, columns: 2 })).toBe(false);
    expect(definition.validate([
      { categoryId: 11, block: 0, columns: 2 },
    ])).toBe(false);
    expect(definition.validate([
      { categoryId: 11, block: 1, columns: 2 },
      { categoryId: 11, block: 2, columns: 1 },
    ])).toBe(false);
    expect(definition.validate([
      { categoryId: 11, block: 1, columns: 4 },
    ])).toBe(false);
  });
});
