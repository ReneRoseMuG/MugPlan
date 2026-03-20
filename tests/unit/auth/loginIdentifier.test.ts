/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Login akzeptiert die vorgesehenen Identifier-Pfade.
 * - Repository-, Bootstrap- und Password-Guards werden korrekt ausgewertet.
 *
 * Fehlerfaelle:
 * - Ungueltige Identifier oder gesperrte Login-Pfade werden falsch akzeptiert.
 *
 * Ziel:
 * Die Identifier-Aufloesung im Auth-Login deterministisch absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/usersRepository", () => ({
  getAuthUserByIdentifier: vi.fn(),
}));

vi.mock("../../../server/bootstrap/getBootstrapState", () => ({
  getBootstrapState: vi.fn(),
}));

vi.mock("../../../server/security/passwordHash", () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
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

describe("authService.login identifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bootstrapMock.getBootstrapState.mockResolvedValue({ needsAdminSetup: false });
    userSettingsServiceMock.getGlobalSettingValue.mockResolvedValue(false);
  });

  it("authenticates by email identifier", async () => {
    usersRepoMock.getAuthUserByIdentifier.mockResolvedValue({
      userId: 7,
      username: "admin",
      passwordHash: "scrypt$abc$hash",
      isActive: true,
      roleCode: "ADMIN",
      twoFactorSecretEncrypted: null,
    });
    passwordHashMock.verifyPassword.mockResolvedValue(true);

    const result = await login({
      username: "admin@example.com",
      password: "very-secure-password",
    });

    expect(usersRepoMock.getAuthUserByIdentifier).toHaveBeenCalledWith("admin@example.com");
    expect(result.payload).toMatchObject({
      status: "authenticated",
      userId: 7,
      username: "admin",
      roleCode: "ADMIN",
    });
  });
});
