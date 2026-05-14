/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Dispatcher-Login-Konfliktspanne ist als USER-Setting im Registry-Modell vorhanden.
 * - Das Setting nutzt den bisherigen Default aktuelle KW plus zwei weitere KWs.
 * - Die editierbare Spanne bleibt auf realistische Ganzzahlwerte begrenzt.
 *
 * Fehlerfaelle:
 * - Fehlender Registry-Key für den Login-Hinweis.
 * - Falscher Scope oder ungültige Default-/Grenzwerte.
 *
 * Ziel:
 * Die zentrale Settings-Definition für den Dispatcher-Login-Hinweis regressionssicher absichern.
 */

import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: dispatcher login conflict lookahead", () => {
  it("defines the user setting with stable default and bounds", () => {
    expect(userSettingsRegistry.dispatcherLoginConflictLookaheadWeeks.key).toBe("dispatcherLogin.conflictLookaheadWeeks");
    expect(userSettingsRegistry.dispatcherLoginConflictLookaheadWeeks.defaultValue).toBe(2);
    expect(userSettingsRegistry.dispatcherLoginConflictLookaheadWeeks.allowedScopes).toEqual(["USER"]);
    expect(userSettingsRegistry.dispatcherLoginConflictLookaheadWeeks.min).toBe(0);
    expect(userSettingsRegistry.dispatcherLoginConflictLookaheadWeeks.max).toBe(12);
    expect(userSettingsRegistry.dispatcherLoginConflictLookaheadWeeks.integer).toBe(true);
  });
});
