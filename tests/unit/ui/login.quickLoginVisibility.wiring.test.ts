/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Login-Seite liest den oeffentlichen Setup-Status vor dem Rendern der Schnelllogins.
 * - Schnelllogins werden bei global aktivierter 2FA nicht sichtbar gemacht.
 *
 * Fehlerfaelle:
 * - Schnelllogin bleibt trotz globaler 2FA sichtbar.
 *
 * Ziel:
 * Die UI-Verdrahtung des FT-29-Quick-Login-Hide-Fixes absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT29 UI: login quick login visibility wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/pages/Login.tsx"), "utf8");

  it("gates quick login visibility behind setup-status two-factor flag", () => {
    expect(source).toContain("getSetupStatus()");
    expect(source).toContain("status.isTwoFactorEnabled");
    expect(source).toContain("setIsQuickLoginVisible(false)");
    expect(source).toContain("quickLoginEnabled && isQuickLoginVisible && step.kind === \"password\"");
  });
});
