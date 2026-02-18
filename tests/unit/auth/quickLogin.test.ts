/**
 * Test Scope:
 *
 * Feature: FT03 - Authentifizierung
 * Use Case: UC03 - Rollenbasierter Schnelllogin im Testbetrieb
 *
 * Abgedeckte Regeln:
 * - Schnelllogin ist nur bei gesetztem Flag und nicht in Produktion verfuegbar.
 * - Schnelllogin-Ziele zeigen je Rolle die Verfuegbarkeit des ersten aktiven Benutzers.
 * - Schnelllogin liefert fuer fehlende Rollenbenutzer einen kontrollierten Fachfehler.
 *
 * Fehlerfaelle:
 * - QUICK_LOGIN_DISABLED bei deaktiviertem Feature.
 * - USER_NOT_FOUND_FOR_ROLE bei fehlendem aktivem Benutzer.
 *
 * Ziel:
 * Serverseitige Schnelllogin-Regeln ohne Passwortfluss fachlich absichern.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/usersRepository", () => ({
  getFirstActiveUserByRoleCode: vi.fn(),
}));

vi.mock("../../../server/bootstrap/getBootstrapState", () => ({
  getBootstrapState: vi.fn(),
}));

import * as usersRepository from "../../../server/repositories/usersRepository";
import * as bootstrap from "../../../server/bootstrap/getBootstrapState";
import { AuthError, listQuickLoginTargets, quickLoginByRole } from "../../../server/services/authService";

const usersRepoMock = vi.mocked(usersRepository);
const bootstrapMock = vi.mocked(bootstrap);

describe("authService quick login", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFlag = process.env.AUTH_QUICK_LOGIN_ENABLED;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
    process.env.AUTH_QUICK_LOGIN_ENABLED = "true";
    bootstrapMock.getBootstrapState.mockResolvedValue({ needsAdminSetup: false });
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.AUTH_QUICK_LOGIN_ENABLED = originalFlag;
  });

  it("returns quick-login targets with role availability", async () => {
    usersRepoMock.getFirstActiveUserByRoleCode.mockImplementation(async (roleCode) => {
      if (roleCode === "ADMIN") return { userId: 1, username: "admin-a", roleCode: "ADMIN" };
      if (roleCode === "DISPATCHER") return { userId: 2, username: "disp-a", roleCode: "DISPATCHER" };
      return null;
    });

    const result = await listQuickLoginTargets();
    const byRole = new Map(result.roles.map((entry) => [entry.roleCode, entry]));

    expect(byRole.get("ADMIN")).toEqual({
      roleCode: "ADMIN",
      available: true,
      username: "admin-a",
    });
    expect(byRole.get("DISPATCHER")).toEqual({
      roleCode: "DISPATCHER",
      available: true,
      username: "disp-a",
    });
    expect(byRole.get("READER")).toEqual({
      roleCode: "READER",
      available: false,
    });
  });

  it("logs in with the first active user of the requested role", async () => {
    usersRepoMock.getFirstActiveUserByRoleCode.mockResolvedValue({
      userId: 7,
      username: "reader-a",
      roleCode: "READER",
    });

    const result = await quickLoginByRole({ roleCode: "READER" });

    expect(usersRepoMock.getFirstActiveUserByRoleCode).toHaveBeenCalledWith("READER");
    expect(result).toEqual({
      userId: 7,
      username: "reader-a",
      roleCode: "READER",
    });
  });

  it("throws QUICK_LOGIN_DISABLED when feature flag is off", async () => {
    process.env.AUTH_QUICK_LOGIN_ENABLED = "false";

    await expect(listQuickLoginTargets()).rejects.toMatchObject<AuthError>({
      code: "QUICK_LOGIN_DISABLED",
      status: 404,
    });
  });

  it("throws USER_NOT_FOUND_FOR_ROLE when role has no active user", async () => {
    usersRepoMock.getFirstActiveUserByRoleCode.mockResolvedValue(null);

    await expect(quickLoginByRole({ roleCode: "DISPATCHER" })).rejects.toMatchObject<AuthError>({
      code: "USER_NOT_FOUND_FOR_ROLE",
      status: 404,
    });
  });
});
