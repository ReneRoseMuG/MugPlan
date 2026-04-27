/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Global aktivierte 2FA erzwingt Setup oder Code-Pruefung nach korrektem Passwort.
 * - Setup-Verifikation speichert erst nach gueltigem Code das verschluesselte Secret.
 *
 * Fehlerfaelle:
 * - Fehlende Pre-Auth-Challenge blockiert die Verifikation.
 * - Ungueltiger 2FA-Code speichert kein Secret.
 *
 * Ziel:
 * Den statusbasierten 2FA-Loginfluss serverseitig auf Service-Ebene absichern.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/usersRepository", () => ({
  getAuthUserByIdentifier: vi.fn(),
  storeUserTwoFactorSecret: vi.fn(),
  getUserTwoFactorRecordById: vi.fn(),
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

vi.mock("../../../server/services/twoFactorService", () => ({
  buildTwoFactorSetup: vi.fn(),
  encryptTwoFactorSecret: vi.fn(),
  decryptTwoFactorSecret: vi.fn(),
  verifyTwoFactorCode: vi.fn(),
  isTwoFactorChallengeExpired: vi.fn(),
}));

import * as usersRepository from "../../../server/repositories/usersRepository";
import * as bootstrap from "../../../server/bootstrap/getBootstrapState";
import * as passwordHash from "../../../server/security/passwordHash";
import * as userSettingsService from "../../../server/services/userSettingsService";
import * as twoFactorService from "../../../server/services/twoFactorService";
import { AuthError, login, verifyTwoFactorLogin, verifyTwoFactorSetup } from "../../../server/services/authService";

const usersRepoMock = vi.mocked(usersRepository);
const bootstrapMock = vi.mocked(bootstrap);
const passwordHashMock = vi.mocked(passwordHash);
const userSettingsServiceMock = vi.mocked(userSettingsService);
const twoFactorServiceMock = vi.mocked(twoFactorService);

describe("authService two-factor flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bootstrapMock.getBootstrapState.mockResolvedValue({ needsAdminSetup: false });
    passwordHashMock.verifyPassword.mockResolvedValue(true);
    userSettingsServiceMock.getGlobalSettingValue.mockResolvedValue(true);
    twoFactorServiceMock.isTwoFactorChallengeExpired.mockReturnValue(false);
  });

  it("returns setup status when global 2FA is on and user has no secret", async () => {
    usersRepoMock.getAuthUserByIdentifier.mockResolvedValue({
      userId: 7,
      username: "reader-a",
      passwordHash: "hash",
      isActive: true,
      roleCode: "READER",
      twoFactorSecretEncrypted: null,
    });
    twoFactorServiceMock.buildTwoFactorSetup.mockResolvedValue({
      secret: "SECRET123",
      manualEntryKey: "SECRET123",
      otpAuthUri: "otpauth://totp/test",
      qrCodeDataUrl: "data:image/png;base64,abc",
    });

    const result = await login({ username: "reader-a", password: "secret-password" });

    expect(result.payload).toEqual({
      status: "2fa_setup_required",
      username: "reader-a",
      manualEntryKey: "SECRET123",
      qrCodeDataUrl: "data:image/png;base64,abc",
    });
    expect(result.preAuth).toMatchObject({
      userId: 7,
      username: "reader-a",
      roleCode: "READER",
      mode: "setup",
      pendingSecret: "SECRET123",
    });
  });

  it("falls back to setup when the stored secret payload is unreadable", async () => {
    usersRepoMock.getAuthUserByIdentifier.mockResolvedValue({
      userId: 8,
      username: "reader-b",
      passwordHash: "hash",
      isActive: true,
      roleCode: "READER",
      twoFactorSecretEncrypted: "broken-payload",
    });
    twoFactorServiceMock.decryptTwoFactorSecret.mockImplementation(() => {
      throw new Error("Invalid two-factor secret payload");
    });
    twoFactorServiceMock.buildTwoFactorSetup.mockResolvedValue({
      secret: "SECRET456",
      manualEntryKey: "SECRET456",
      otpAuthUri: "otpauth://totp/test-b",
      qrCodeDataUrl: "data:image/png;base64,xyz",
    });

    const result = await login({ username: "reader-b", password: "secret-password" });

    expect(result.payload).toEqual({
      status: "2fa_setup_required",
      username: "reader-b",
      manualEntryKey: "SECRET456",
      qrCodeDataUrl: "data:image/png;base64,xyz",
    });
  });

  it("stores encrypted secret after successful setup verification", async () => {
    twoFactorServiceMock.verifyTwoFactorCode.mockResolvedValue(true);
    twoFactorServiceMock.encryptTwoFactorSecret.mockReturnValue("encrypted-secret");

    const result = await verifyTwoFactorSetup({
      code: "123456",
      preAuth: {
        userId: 7,
        username: "reader-a",
        roleCode: "READER",
        mode: "setup",
        createdAt: Date.now(),
        pendingSecret: "SECRET123",
      },
    });

    expect(usersRepoMock.storeUserTwoFactorSecret).toHaveBeenCalledWith(7, "encrypted-secret");
    expect(result).toMatchObject({
      status: "authenticated",
      userId: 7,
      username: "reader-a",
      roleCode: "READER",
    });
  });

  it("rejects verify when challenge is missing", async () => {
    await expect(
      verifyTwoFactorLogin({
        code: "123456",
        preAuth: undefined,
      }),
    ).rejects.toMatchObject<AuthError>({
      code: "TWO_FACTOR_CHALLENGE_MISSING",
      status: 409,
    });
  });
});
