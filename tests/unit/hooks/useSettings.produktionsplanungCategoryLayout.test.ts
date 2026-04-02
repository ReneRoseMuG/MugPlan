/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - useSetting("reports.categoryLayout") faellt bei fehlenden oder ungueltigen Werten auf [] zurueck.
 * - Gueltige Kategorie-Eintraege werden clientseitig normalisiert.
 * - Kategorien duerfen im aufgeloesten Layout nicht mehrfach vorkommen.
 *
 * Fehlerfaelle:
 * - Ungueltige Resolver-Eingaben bleiben sichtbar.
 * - Doppelte Kategorie-IDs oder ungueltige Spalten werden nicht verworfen.
 *
 * Ziel:
 * Den Frontend-Resolver fuer das globale Kategorie-Layout der Produktionsplanung absichern.
 */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { useSetting } from "../../../client/src/hooks/useSettings";

const useSettingsContextMock = vi.fn();

vi.mock("../../../client/src/providers/SettingsProvider", () => ({
  useSettingsContext: () => useSettingsContextMock(),
}));

describe("useSettings: reports.categoryLayout", () => {
  const readResolvedValue = () => {
    let resolved: unknown;
    function Probe() {
      resolved = useSetting("reports.categoryLayout");
      return null;
    }

    renderToString(createElement(Probe));
    return resolved;
  };

  it("falls back to an empty layout for missing or invalid values", () => {
    useSettingsContextMock.mockReturnValue({ settingsByKey: new Map() });
    expect(readResolvedValue()).toEqual([]);

    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map([
        ["reports.categoryLayout", { resolvedValue: [{ categoryId: 11, block: 1, columns: 4 }] }],
      ]),
    });
    expect(readResolvedValue()).toEqual([]);
  });

  it("keeps valid category entries unchanged", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map([
        [
          "reports.categoryLayout",
          {
            resolvedValue: [
              { categoryId: 11, block: 2, columns: 2 },
              { categoryId: 12, block: 2, columns: 3 },
            ],
          },
        ],
      ]),
    });

    expect(readResolvedValue()).toEqual([
      { categoryId: 11, block: 2, columns: 2 },
      { categoryId: 12, block: 2, columns: 3 },
    ]);
  });

  it("maps the legacy block format to category entries with derived block numbers", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map([
        [
          "reports.categoryLayout",
          {
            resolvedValue: [
              { categoryIds: [11, 12], columns: 2 },
              { categoryIds: [21], columns: 1 },
            ],
          },
        ],
      ]),
    });

    expect(readResolvedValue()).toEqual([
      { categoryId: 11, block: 1, columns: 2 },
      { categoryId: 12, block: 1, columns: 2 },
      { categoryId: 21, block: 2, columns: 1 },
    ]);
  });

  it("drops duplicate categories across multiple blocks", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map([
        [
          "reports.categoryLayout",
          {
            resolvedValue: [
              { categoryId: 11, block: 1, columns: 2 },
              { categoryId: 11, block: 2, columns: 1 },
            ],
          },
        ],
      ]),
    });

    expect(readResolvedValue()).toEqual([]);
  });
});
