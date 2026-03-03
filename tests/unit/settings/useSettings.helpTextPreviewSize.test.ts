/**
 * Test Scope:
 *
 * Feature: FT16 - Hilfetext Vorschaugroesse
 * Use Case: UC Settings-Aufloesung fuer HelpText Preview Size
 *
 * Abgedeckte Regeln:
 * - Gueltige Enum-Werte werden unveraendert uebernommen.
 * - Fehlende Werte fallen auf medium zurueck.
 * - Ungueltige Werte fallen auf medium zurueck.
 *
 * Fehlerfaelle:
 * - Nicht-Enum-Werte duerfen keine ungueltige Preview-Groesse erzeugen.
 *
 * Ziel:
 * Sichere Fallback-Logik fuer helpTextPreviewSize im Frontend garantieren.
 */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useSetting } from "../../../client/src/hooks/useSettings";

const useSettingsContextMock = vi.fn();

vi.mock("../../../client/src/providers/SettingsProvider", () => ({
  useSettingsContext: () => useSettingsContextMock(),
}));

describe("FT16 useSettings helpTextPreviewSize", () => {
  const readResolvedValue = () => {
    let resolved: unknown;
    function Probe() {
      resolved = useSetting("helpTextPreviewSize");
      return null;
    }
    renderToString(createElement(Probe));
    return resolved;
  };

  it("returns valid enum values unchanged", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map([
        ["helpTextPreviewSize", { resolvedValue: "large" }],
      ]),
    });

    expect(readResolvedValue()).toBe("large");
  });

  it("falls back to medium for missing values", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map(),
    });

    expect(readResolvedValue()).toBe("medium");
  });

  it("falls back to medium for invalid values", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map([
        ["helpTextPreviewSize", { resolvedValue: "x-large" }],
      ]),
    });

    expect(readResolvedValue()).toBe("medium");
  });
});
