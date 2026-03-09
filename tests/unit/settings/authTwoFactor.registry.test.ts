/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das globale 2FA-Setting ist im Registry-Modell vorhanden.
 * - Der Default fuer die globale 2FA-Steuerung ist ausgeschaltet.
 *
 * Fehlerfaelle:
 * - Fehlender Registry-Key fuer die Admin-Steuerung.
 * - Falscher Default oder falscher Scope fuer das globale 2FA-Setting.
 *
 * Ziel:
 * Die zentrale Settings-Definition fuer FT-29 gegen versehentliche Regressionen absichern.
 */

import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: auth_two_factor_enabled", () => {
  it("defines global two-factor toggle with default false", () => {
    expect(userSettingsRegistry.authTwoFactorEnabled.key).toBe("auth_two_factor_enabled");
    expect(userSettingsRegistry.authTwoFactorEnabled.defaultValue).toBe(false);
    expect(userSettingsRegistry.authTwoFactorEnabled.allowedScopes).toEqual(["GLOBAL"]);
  });
});
