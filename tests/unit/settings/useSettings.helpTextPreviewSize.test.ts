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
import { renderHook } from "@testing-library/react";
import { useSetting } from "../../../client/src/hooks/useSettings";

const useSettingsContextMock = vi.fn();

vi.mock("../../../client/src/providers/SettingsProvider", () => ({
  useSettingsContext: () => useSettingsContextMock(),
}));

describe("FT16 useSettings helpTextPreviewSize", () => {
  it("returns valid enum values unchanged", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map([
        ["helpTextPreviewSize", { resolvedValue: "large" }],
      ]),
    });

    const { result } = renderHook(() => useSetting("helpTextPreviewSize"));
    expect(result.current).toBe("large");
  });

  it("falls back to medium for missing values", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map(),
    });

    const { result } = renderHook(() => useSetting("helpTextPreviewSize"));
    expect(result.current).toBe("medium");
  });

  it("falls back to medium for invalid values", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map([
        ["helpTextPreviewSize", { resolvedValue: "x-large" }],
      ]),
    });

    const { result } = renderHook(() => useSetting("helpTextPreviewSize"));
    expect(result.current).toBe("medium");
  });
});
