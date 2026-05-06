/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das USER-Setting calendar.weekAbsenceLane.collapsed ist als Boolean registriert.
 * - Default und erlaubte Scopes erhalten das bestehende expandierte Verhalten.
 *
 * Fehlerfaelle:
 * - Das Setting wird mit falschem Scope, falschem Typ oder falschem Default registriert.
 *
 * Ziel:
 * Den Registry-Vertrag für die einklappbare Abwesenheitsspur absichern.
 */
import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: week absence lane collapsed", () => {
  it("registers the week absence lane collapse flag as a user boolean with expanded default", () => {
    const definition = userSettingsRegistry.calendarWeekAbsenceLaneCollapsed;

    expect(definition.key).toBe("calendar.weekAbsenceLane.collapsed");
    expect(definition.type).toBe("boolean");
    expect(definition.defaultValue).toBe(false);
    expect(definition.allowedScopes).toEqual(["USER"]);
    expect(definition.validate(true)).toBe(true);
    expect(definition.validate(false)).toBe(true);
    expect(definition.validate("true")).toBe(false);
  });
});
