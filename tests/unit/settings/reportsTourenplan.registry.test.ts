/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Tourenplan besitzt ein USER-Range-Setting mit Date-/KW-Payload.
 * - Der Druckmodus ist als GLOBAL-Enum auf Farb- und Sparmodus begrenzt.
 * - Die Schriftgröße ist als USER-Enum auf Small, Medium und Large begrenzt.
 *
 * Fehlerfaelle:
 * - Ungueltige Tabs oder KW-Werte werden fuer den Tourenplan akzeptiert.
 * - Der Druckmodus akzeptiert beliebige Strings statt nur der beiden Modi.
 * - Die Schriftgröße akzeptiert beliebige Strings statt nur der drei Stufen.
 *
 * Ziel:
 * Die Registry-Vertraege der neuen Tourenplan-Settings regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: Tourenplan", () => {
  it("validates the user-scoped range config", () => {
    const definition = userSettingsRegistry.reportsTourenplanRangeConfig;

    expect(definition.key).toBe("reports.tourenplan.rangeConfig");
    expect(definition.type).toBe("json");
    expect(definition.allowedScopes).toEqual(["USER"]);
    expect(definition.defaultValue).toEqual({ activeTab: "date" });
    expect(definition.validate({
      activeTab: "calendarWeek",
      fromDate: "2026-04-06",
      toDate: "2026-04-19",
      kwStart: 15,
      weekCount: 2,
    })).toBe(true);
    expect(definition.validate({
      activeTab: "columns",
    })).toBe(false);
    expect(definition.validate({
      kwStart: 0,
    })).toBe(false);
  });

  it("stores the print mode as a global enum", () => {
    const definition = userSettingsRegistry.reportsTourenplanPrintMode;

    expect(definition.key).toBe("reports.tourenplan.printMode");
    expect(definition.type).toBe("enum");
    expect(definition.allowedScopes).toEqual(["GLOBAL"]);
    expect(definition.defaultValue).toBe("farbdruck");
    expect(definition.validate("farbdruck")).toBe(true);
    expect(definition.validate("spardruck")).toBe(true);
    expect(definition.validate("graustufen")).toBe(false);
  });

  it("stores the font size as a user enum", () => {
    const definition = userSettingsRegistry.reportsTourenplanFontSize;

    expect(definition.key).toBe("reports.tourenplan.fontSize");
    expect(definition.type).toBe("enum");
    expect(definition.allowedScopes).toEqual(["USER"]);
    expect(definition.defaultValue).toBe("medium");
    expect(definition.validate("small")).toBe(true);
    expect(definition.validate("medium")).toBe(true);
    expect(definition.validate("large")).toBe(true);
    expect(definition.validate("x-large")).toBe(false);
  });
});
