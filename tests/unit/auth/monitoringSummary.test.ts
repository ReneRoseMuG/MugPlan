/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Finale Authentifizierungen liefern keinen FT31-Monitoring-Zusatz mehr im Auth-Payload.
 * - Login fuer aktive Benutzer bleibt ohne Monitoring-Nebenpfad erfolgreich.
 * - LESER und DISPONENT erhalten denselben schlanken Auth-Vertrag.
 *
 * Fehlerfaelle:
 * - Auth-Antwort enthaelt weiterhin ein `monitoringSummary`.
 * - Rollenabhaengige Login-Payloads driften beim Entfernen des Monitoring-Zusatzes auseinander.
 *
 * Ziel:
 * Den bereinigten FT31-Auth-Vertrag im Service isoliert absichern.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/usersRepository", () => ({
  getAuthUserByIdentifier: vi.fn(),
}));

vi.mock("../../../server/bootstrap/getBootstrapState", () => ({
  getBootstrapState: vi.fn(),
}));

vi.mock("../../../server/security/passwordHash", () => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock("../../../server/services/userSettingsService", () => ({
  getGlobalSettingValue: vi.fn(),
}));

import * as usersRepository from "../../../server/repositories/usersRepository";
import * as bootstrap from "../../../server/bootstrap/getBootstrapState";
import * as passwordHash from "../../../server/security/passwordHash";
import * as userSettingsService from "../../../server/services/userSettingsService";
import { login } from "../../../server/services/authService";

const usersRepoMock = vi.mocked(usersRepository);
const bootstrapMock = vi.mocked(bootstrap);
const passwordHashMock = vi.mocked(passwordHash);
const userSettingsServiceMock = vi.mocked(userSettingsService);

describe("FT31 unit: authService monitoring summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bootstrapMock.getBootstrapState.mockResolvedValue({ needsAdminSetup: false });
    passwordHashMock.verifyPassword.mockResolvedValue(true);
    userSettingsServiceMock.getGlobalSettingValue.mockResolvedValue(false);
  });

  it("returns a plain authenticated payload for dispatcher logins", async () => {
    usersRepoMock.getAuthUserByIdentifier.mockResolvedValue({
      userId: 7,
      username: "disp-ft31",
      passwordHash: "hash",
      isActive: true,
      roleCode: "DISPATCHER",
      twoFactorSecretEncrypted: null,
    });

    const result = await login({ username: "disp-ft31", password: "secret" });

    expect(result.payload).toEqual({
      status: "authenticated",
      userId: 7,
      username: "disp-ft31",
      roleCode: "DISPATCHER",
    });
    expect(result.payload).not.toHaveProperty("monitoringSummary");
  });

  it("returns a plain authenticated payload for readers", async () => {
    usersRepoMock.getAuthUserByIdentifier.mockResolvedValue({
      userId: 9,
      username: "reader-ft31",
      passwordHash: "hash",
      isActive: true,
      roleCode: "READER",
      twoFactorSecretEncrypted: null,
    });

    const result = await login({ username: "reader-ft31", password: "secret" });

    expect(result.payload).toEqual({
      status: "authenticated",
      userId: 9,
      username: "reader-ft31",
      roleCode: "READER",
    });
    expect(result.payload).not.toHaveProperty("monitoringSummary");
  });
});
