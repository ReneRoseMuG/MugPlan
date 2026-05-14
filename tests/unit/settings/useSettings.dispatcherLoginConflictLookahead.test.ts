/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das Dispatcher-Login-Konfliktsetting liefert gültige KW-Spannen unverändert.
 * - Fehlende Werte fallen auf den bisherigen Default aktuelle KW plus zwei weitere KWs zurueck.
 * - Ungültige Werte fallen auf den vereinbarten Default zurück.
 *
 * Fehlerfaelle:
 * - Out-of-range Werte dürfen keine ungültige Login-Konfliktspanne erzeugen.
 *
 * Ziel:
 * Sichere Fallback-Logik für die Login-Konfliktspanne im Frontend garantieren.
 */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useSetting } from "../../../client/src/hooks/useSettings";

const useSettingsContextMock = vi.fn();

vi.mock("../../../client/src/providers/SettingsProvider", () => ({
  useSettingsContext: () => useSettingsContextMock(),
}));

describe("useSettings dispatcher login conflict lookahead", () => {
  const readResolvedValue = () => {
    let resolved: unknown;
    function Probe() {
      resolved = useSetting("dispatcherLogin.conflictLookaheadWeeks");
      return null;
    }
    renderToString(createElement(Probe));
    return resolved;
  };

  it("returns valid week values unchanged", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map([["dispatcherLogin.conflictLookaheadWeeks", { resolvedValue: 4 }]]),
    });

    expect(readResolvedValue()).toBe(4);
  });

  it("falls back to the default for missing values", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map(),
    });

    expect(readResolvedValue()).toBe(2);
  });

  it("falls back to the default for invalid values", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map([["dispatcherLogin.conflictLookaheadWeeks", { resolvedValue: 13 }]]),
    });

    expect(readResolvedValue()).toBe(2);
  });
});
