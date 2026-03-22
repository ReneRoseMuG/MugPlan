/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die USER-Settings fuer EntityFormShell Sidebar- und Content-Breite sind im Registry-Modell vorhanden.
 * - Beide Settings nutzen stabile Defaults und begrenzte Zahlenbereiche.
 *
 * Fehlerfaelle:
 * - Fehlender Registry-Key fuer Shell-Breiten.
 * - Falscher Scope oder ungueltige Default-Werte fuer die Layout-Settings.
 *
 * Ziel:
 * Die zentrale Settings-Definition fuer das generische Formularlayout regressionssicher absichern.
 */

import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: entity form shell widths", () => {
  it("defines the user shell width settings with stable defaults", () => {
    expect(userSettingsRegistry.entityFormShellSidebarWidthPx.key).toBe("entityFormShell.sidebarWidthPx");
    expect(userSettingsRegistry.entityFormShellSidebarWidthPx.defaultValue).toBe(360);
    expect(userSettingsRegistry.entityFormShellSidebarWidthPx.allowedScopes).toEqual(["USER"]);
    expect(userSettingsRegistry.entityFormShellSidebarWidthPx.min).toBe(260);
    expect(userSettingsRegistry.entityFormShellSidebarWidthPx.max).toBe(480);

    expect(userSettingsRegistry.entityFormShellContentMaxWidthPx.key).toBe("entityFormShell.contentMaxWidthPx");
    expect(userSettingsRegistry.entityFormShellContentMaxWidthPx.defaultValue).toBe(760);
    expect(userSettingsRegistry.entityFormShellContentMaxWidthPx.allowedScopes).toEqual(["USER"]);
    expect(userSettingsRegistry.entityFormShellContentMaxWidthPx.min).toBe(640);
    expect(userSettingsRegistry.entityFormShellContentMaxWidthPx.max).toBe(1100);
  });
});
