/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die globale Kalendermarker-Darstellung ist als Enum-Setting registriert.
 * - Nur die Varianten `subtle`, `standard` und `highlighted` sind gültig.
 * - Der Default ist `standard` und der Scope ist ausschließlich `GLOBAL`.
 */

import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";
import { resolveCalendarMarkerVisualizationStyle } from "../../../client/src/hooks/useSettings";

describe("settings registry: calendar.markerVisualizationStyle", () => {
  it("defines global calendar marker visualization style", () => {
    const setting = userSettingsRegistry.calendarMarkerVisualizationStyle;

    expect(setting.key).toBe("calendar.markerVisualizationStyle");
    expect(setting.type).toBe("enum");
    expect(setting.options).toEqual(["subtle", "standard", "highlighted"]);
    expect(setting.defaultValue).toBe("standard");
    expect(setting.allowedScopes).toEqual(["GLOBAL"]);
    expect(setting.validate("subtle")).toBe(true);
    expect(setting.validate("standard")).toBe(true);
    expect(setting.validate("highlighted")).toBe(true);
    expect(setting.validate("loud")).toBe(false);
  });

  it("falls back to standard for invalid client values", () => {
    expect(resolveCalendarMarkerVisualizationStyle("subtle")).toBe("subtle");
    expect(resolveCalendarMarkerVisualizationStyle("standard")).toBe("standard");
    expect(resolveCalendarMarkerVisualizationStyle("highlighted")).toBe("highlighted");
    expect(resolveCalendarMarkerVisualizationStyle("invalid")).toBe("standard");
    expect(resolveCalendarMarkerVisualizationStyle(undefined)).toBe("standard");
  });
});
