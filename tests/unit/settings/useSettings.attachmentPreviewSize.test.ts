/**
 * Test Scope:
 *
 * Feature: FT18 - User Settings
 * Use Case: UC Settings-Aufloesung fuer Attachment Preview Size
 *
 * Abgedeckte Regeln:
 * - Gueltige Enum-Werte werden unveraendert uebernommen.
 * - Fehlende Werte fallen auf large zurueck.
 * - Ungueltige Werte fallen auf large zurueck.
 *
 * Fehlerfaelle:
 * - Nicht-Enum-Werte duerfen keine ungueltige Preview-Groesse erzeugen.
 *
 * Ziel:
 * Sichere Fallback-Logik fuer attachmentPreviewSize im Frontend garantieren.
 */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useSetting } from "../../../client/src/hooks/useSettings";

const useSettingsContextMock = vi.fn();

vi.mock("../../../client/src/providers/SettingsProvider", () => ({
  useSettingsContext: () => useSettingsContextMock(),
}));

describe("FT18 useSettings attachmentPreviewSize", () => {
  const readResolvedValue = () => {
    let resolved: unknown;
    function Probe() {
      resolved = useSetting("attachmentPreviewSize");
      return null;
    }
    renderToString(createElement(Probe));
    return resolved;
  };

  it("returns valid enum values unchanged", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map([
        ["attachmentPreviewSize", { resolvedValue: "large" }],
      ]),
    });

    expect(readResolvedValue()).toBe("large");
  });

  it("falls back to large for missing values", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map(),
    });

    expect(readResolvedValue()).toBe("large");
  });

  it("falls back to large for invalid values", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map([
        ["attachmentPreviewSize", { resolvedValue: "x-large" }],
      ]),
    });

    expect(readResolvedValue()).toBe("large");
  });
});
