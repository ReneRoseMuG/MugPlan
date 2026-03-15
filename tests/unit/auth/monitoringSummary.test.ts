/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Finale Authentifizierungen fuer DISPONENT/ADMIN koennen ein `monitoringSummary` tragen.
 * - Monitoring-Fehler blockieren die Authentifizierung nicht.
 * - LESER erhaelt kein Monitoring-Summary.
 *
 * Fehlerfaelle:
 * - Login scheitert wegen eines Monitoring-Fehlers.
 * - Monitoring-Summary wird fuer LESER oder ohne Treffer ausgeliefert.
 *
 * Ziel:
 * Den additiven FT31-Auth-Vertrag im Service isoliert absichern.
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

vi.mock("../../../server/services/monitoringService", () => ({
  getMonitoringSummaryForRole: vi.fn(),
}));

import * as usersRepository from "../../../server/repositories/usersRepository";
import * as bootstrap from "../../../server/bootstrap/getBootstrapState";
import * as passwordHash from "../../../server/security/passwordHash";
import * as userSettingsService from "../../../server/services/userSettingsService";
import * as monitoringService from "../../../server/services/monitoringService";
import { login } from "../../../server/services/authService";

const usersRepoMock = vi.mocked(usersRepository);
const bootstrapMock = vi.mocked(bootstrap);
const passwordHashMock = vi.mocked(passwordHash);
const userSettingsServiceMock = vi.mocked(userSettingsService);
const monitoringServiceMock = vi.mocked(monitoringService);

describe("FT31 unit: authService monitoring summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bootstrapMock.getBootstrapState.mockResolvedValue({ needsAdminSetup: false });
    passwordHashMock.verifyPassword.mockResolvedValue(true);
    userSettingsServiceMock.getGlobalSettingValue.mockResolvedValue(false);
  });

  it("adds monitoringSummary for dispatcher logins with findings", async () => {
    usersRepoMock.getAuthUserByIdentifier.mockResolvedValue({
      userId: 7,
      username: "disp-ft31",
      passwordHash: "hash",
      isActive: true,
      roleCode: "DISPATCHER",
      twoFactorSecretEncrypted: null,
    });
    monitoringServiceMock.getMonitoringSummaryForRole.mockResolvedValue({
      count: 3,
      triggerNames: ["TR-01 Ressourcenunterschreitung"],
    });

    const result = await login({ username: "disp-ft31", password: "secret" });

    expect(result.payload).toEqual({
      status: "authenticated",
      userId: 7,
      username: "disp-ft31",
      roleCode: "DISPATCHER",
      monitoringSummary: {
        count: 3,
        triggerNames: ["TR-01 Ressourcenunterschreitung"],
      },
    });
  });

  it("omits monitoringSummary for readers", async () => {
    usersRepoMock.getAuthUserByIdentifier.mockResolvedValue({
      userId: 9,
      username: "reader-ft31",
      passwordHash: "hash",
      isActive: true,
      roleCode: "READER",
      twoFactorSecretEncrypted: null,
    });
    monitoringServiceMock.getMonitoringSummaryForRole.mockResolvedValue(undefined);

    const result = await login({ username: "reader-ft31", password: "secret" });

    expect(result.payload).toEqual({
      status: "authenticated",
      userId: 9,
      username: "reader-ft31",
      roleCode: "READER",
    });
  });

  it("keeps login successful when monitoring summary lookup fails", async () => {
    usersRepoMock.getAuthUserByIdentifier.mockResolvedValue({
      userId: 5,
      username: "admin-ft31",
      passwordHash: "hash",
      isActive: true,
      roleCode: "ADMIN",
      twoFactorSecretEncrypted: null,
    });
    monitoringServiceMock.getMonitoringSummaryForRole.mockRejectedValue(new Error("boom"));

    const result = await login({ username: "admin-ft31", password: "secret" });

    expect(result.payload).toEqual({
      status: "authenticated",
      userId: 5,
      username: "admin-ft31",
      roleCode: "ADMIN",
    });
  });
});

