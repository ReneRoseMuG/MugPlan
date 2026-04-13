/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - USER-Settings fuer EntityFormShell-Breiten liefern gueltige Pixelwerte unveraendert.
 * - Fehlende Werte fallen auf die vereinbarten Defaults zurueck.
 * - Ungueltige Werte fallen auf die vereinbarten Defaults zurueck.
 *
 * Fehlerfaelle:
 * - Out-of-range Werte duerfen keine ungueltigen Layoutbreiten erzeugen.
 *
 * Ziel:
 * Sichere Fallback-Logik fuer Shell-Breiten im Frontend garantieren.
 */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useSetting } from "../../../client/src/hooks/useSettings";

const useSettingsContextMock = vi.fn();

vi.mock("../../../client/src/providers/SettingsProvider", () => ({
  useSettingsContext: () => useSettingsContextMock(),
}));

describe("useSettings entity form shell widths", () => {
  const readResolvedValues = () => {
    let sidebarWidth: unknown;
    let contentMaxWidth: unknown;
    function Probe() {
      sidebarWidth = useSetting("entityFormShell.sidebarWidthPx");
      contentMaxWidth = useSetting("entityFormShell.contentMaxWidthPx");
      return null;
    }
    renderToString(createElement(Probe));
    return { sidebarWidth, contentMaxWidth };
  };

  it("returns valid width values unchanged", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map([
        ["entityFormShell.sidebarWidthPx", { resolvedValue: 420 }],
        ["entityFormShell.contentMaxWidthPx", { resolvedValue: 980 }],
      ]),
    });

    expect(readResolvedValues()).toEqual({ sidebarWidth: 420, contentMaxWidth: 980 });
  });

  it("falls back to defaults for missing values", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map(),
    });

    expect(readResolvedValues()).toEqual({ sidebarWidth: 360, contentMaxWidth: 960 });
  });

  it("falls back to defaults for invalid values", () => {
    useSettingsContextMock.mockReturnValue({
      settingsByKey: new Map([
        ["entityFormShell.sidebarWidthPx", { resolvedValue: 999 }],
        ["entityFormShell.contentMaxWidthPx", { resolvedValue: 400 }],
      ]),
    });

    expect(readResolvedValues()).toEqual({ sidebarWidth: 360, contentMaxWidth: 960 });
  });
});
