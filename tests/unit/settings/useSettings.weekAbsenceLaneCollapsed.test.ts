/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Gültige Boolean-Werte für calendar.weekAbsenceLane.collapsed werden unverändert übernommen.
 * - Fehlende und ungültige Werte fallen auf false zurück.
 *
 * Fehlerfaelle:
 * - Nicht-Boolean-Werte dürfen keine kollabierte Abwesenheitsspur erzeugen.
 *
 * Ziel:
 * Sichere Fallback-Logik für die einklappbare Abwesenheitsspur im Frontend garantieren.
 */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useSetting } from "../../../client/src/hooks/useSettings";

const useSettingsContextMock = vi.fn();

vi.mock("../../../client/src/providers/SettingsProvider", () => ({
  useSettingsContext: () => useSettingsContextMock(),
}));

describe("FT03 useSettings week absence lane collapsed", () => {
  const readResolvedValue = (resolvedValue?: unknown) => {
    let resolved: unknown;
    function Probe() {
      resolved = useSetting("calendar.weekAbsenceLane.collapsed");
      return null;
    }

    useSettingsContextMock.mockReturnValue({
      settingsByKey: typeof resolvedValue === "undefined"
        ? new Map()
        : new Map([["calendar.weekAbsenceLane.collapsed", { resolvedValue }]]),
    });

    renderToString(createElement(Probe));
    return resolved;
  };

  it("returns stored booleans unchanged", () => {
    expect(readResolvedValue(true)).toBe(true);
    expect(readResolvedValue(false)).toBe(false);
  });

  it("falls back to false for missing and invalid booleans", () => {
    expect(readResolvedValue()).toBe(false);
    expect(readResolvedValue("true")).toBe(false);
    expect(readResolvedValue(1)).toBe(false);
  });
});
