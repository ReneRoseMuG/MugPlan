/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das USER-Setting calendar.weekTileBodyMode ist als Enum registriert.
 * - Default, erlaubte Scopes und Optionen entsprechen dem UI-Verhalten.
 *
 * Fehlerfaelle:
 * - Das Setting wird mit falschem Scope oder falschem Default registriert.
 *
 * Ziel:
 * Den Registry-Vertrag fuer den Wochenkachel-Body-Modus absichern.
 */
import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: week tile body mode", () => {
  it("registers the week tile body mode as a user enum with semiexpanded default", () => {
    const definition = userSettingsRegistry.calendarWeekTileBodyMode;

    expect(definition.key).toBe("calendar.weekTileBodyMode");
    expect(definition.type).toBe("enum");
    expect(definition.defaultValue).toBe("semiexpanded");
    expect(definition.allowedScopes).toEqual(["USER"]);
    expect(definition.options).toEqual(["collapsed", "semiexpanded", "expanded"]);
  });
});
