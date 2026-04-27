/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Nicht-Admin-Kontexte werden fuer geschuetzte Benutzeraktionen abgewiesen.
 * - Rollenwechsel und Benutzerlisten folgen den Service-Guards.
 *
 * Fehlerfaelle:
 * - Rollenbasierte Guards lassen unerlaubte Benutzeraktionen zu.
 *
 * Ziel:
 * Die serverseitigen Rollengrenzen im Users-Service absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/usersRepository", () => ({
  listUsersWithRoles: vi.fn(),
  getUserRoleRecordById: vi.fn(),
  countActiveAdmins: vi.fn(),
  getRoleIdByCode: vi.fn(),
  updateUserRoleByIdWithVersion: vi.fn(),
  updateUserByIdWithVersion: vi.fn(),
  resetUserTwoFactorByIdWithVersion: vi.fn(),
  getUserWithRole: vi.fn(),
}));

vi.mock("../../../server/services/userSettingsService", () => ({
  getGlobalSettingValue: vi.fn(),
}));

import * as usersRepository from "../../../server/repositories/usersRepository";
import * as userSettingsService from "../../../server/services/userSettingsService";
import { resolveUserRole } from "../../../server/middleware/resolveUserRole";
import { changeUserRole, listUsers, resetUserTwoFactor, updateUser } from "../../../server/services/usersService";

const usersRepoMock = vi.mocked(usersRepository);
const userSettingsServiceMock = vi.mocked(userSettingsService);

describe("PKG-03 Authorization & Roles: usersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userSettingsServiceMock.getGlobalSettingValue.mockResolvedValue(false);
  });

  it("rejects listUsers for non-admin context with 403", async () => {
    await expect(
      listUsers({ userId: 10, roleKey: "DISPONENT" }),
    ).rejects.toMatchObject({ status: 403, code: "LOCK_VIOLATION" });
  });

  it("rejects changeUserRole for non-admin context with 403", async () => {
    await expect(
      changeUserRole({ userId: 10, roleKey: "LESER" }, 11, "ADMIN", 1),
    ).rejects.toMatchObject({ status: 403, code: "LOCK_VIOLATION" });
  });

  it("prevents self-demotion of last admin with BUSINESS_CONFLICT", async () => {
    usersRepoMock.getUserRoleRecordById.mockResolvedValue({
      userId: 11,
      roleCode: "ADMIN",
      version: 3,
      isActive: true,
    } as any);
    usersRepoMock.countActiveAdmins.mockResolvedValue(0);

    await expect(
      changeUserRole({ userId: 11, roleKey: "ADMIN" }, 11, "DISPATCHER", 3),
    ).rejects.toMatchObject({ status: 409, code: "BUSINESS_CONFLICT" });

    expect(usersRepoMock.getRoleIdByCode).not.toHaveBeenCalled();
    expect(usersRepoMock.updateUserRoleByIdWithVersion).not.toHaveBeenCalled();
  });

  it("prevents demotion when no other active admin remains", async () => {
    usersRepoMock.getUserRoleRecordById.mockResolvedValue({
      userId: 11,
      username: "admin-11",
      email: "admin-11@example.test",
      firstName: "Admin",
      lastName: "Elf",
      roleCode: "ADMIN",
      version: 3,
      isActive: true,
    } as any);
    usersRepoMock.countActiveAdmins.mockResolvedValue(0);

    await expect(
      changeUserRole({ userId: 99, roleKey: "ADMIN" }, 11, "DISPATCHER", 3),
    ).rejects.toMatchObject({ status: 409, code: "BUSINESS_CONFLICT" });

    expect(usersRepoMock.getRoleIdByCode).not.toHaveBeenCalled();
    expect(usersRepoMock.updateUserRoleByIdWithVersion).not.toHaveBeenCalled();
  });

  it("rejects updateUser for non-admin context with 403", async () => {
    await expect(
      updateUser(
        { userId: 10, roleKey: "LESER" },
        11,
        {
          username: "reader-11",
          email: "reader-11@example.test",
          firstName: "Reader",
          lastName: "Elf",
          roleCode: "READER",
          isActive: true,
          version: 2,
        },
      ),
    ).rejects.toMatchObject({ status: 403, code: "LOCK_VIOLATION" });
  });

  it("prevents deactivation of the last active admin", async () => {
    usersRepoMock.getUserRoleRecordById.mockResolvedValue({
      userId: 11,
      username: "admin-11",
      email: "admin-11@example.test",
      firstName: "Admin",
      lastName: "Elf",
      roleCode: "ADMIN",
      version: 3,
      isActive: true,
    } as any);
    usersRepoMock.countActiveAdmins.mockResolvedValue(0);

    await expect(
      updateUser(
        { userId: 99, roleKey: "ADMIN" },
        11,
        {
          username: "admin-11",
          email: "admin-11@example.test",
          firstName: "Admin",
          lastName: "Elf",
          roleCode: "ADMIN",
          isActive: false,
          version: 3,
        },
      ),
    ).rejects.toMatchObject({ status: 409, code: "BUSINESS_CONFLICT" });

    expect(usersRepoMock.updateUserByIdWithVersion).not.toHaveBeenCalled();
  });

  it("prevents self reset of 2FA for the last active admin when global 2FA is enabled", async () => {
    userSettingsServiceMock.getGlobalSettingValue.mockResolvedValue(true);
    usersRepoMock.getUserRoleRecordById.mockResolvedValue({
      userId: 11,
      username: "admin-11",
      email: "admin-11@example.test",
      firstName: "Admin",
      lastName: "Elf",
      roleCode: "ADMIN",
      version: 4,
      isActive: true,
    } as any);
    usersRepoMock.countActiveAdmins.mockResolvedValue(0);

    await expect(
      resetUserTwoFactor({ userId: 11, roleKey: "ADMIN" }, 11, 4),
    ).rejects.toMatchObject({ status: 409, code: "BUSINESS_CONFLICT" });

    expect(usersRepoMock.resetUserTwoFactorByIdWithVersion).not.toHaveBeenCalled();
  });
});

describe("PKG-03 Authorization & Roles: resolveUserRole middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps roleCode to canonical roleKey and sets req.userContext", async () => {
    usersRepoMock.getUserWithRole.mockResolvedValue({
      userId: 7,
      roleCode: "DISPATCHER",
      isActive: true,
      fullName: "Max Mustermann",
      username: "mmustermann",
    } as any);

    const req = { userId: 7 } as any;
    const next = vi.fn();

    await resolveUserRole(req, {} as any, next);

    expect(req.userContext).toMatchObject({
      userId: 7,
      roleCode: "DISPATCHER",
      roleKey: "DISPONENT",
      displayName: "Max Mustermann",
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("fails deterministically when request userId is missing", async () => {
    const req = { userId: undefined } as any;
    const next = vi.fn();

    await resolveUserRole(req, {} as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("missing userId");
  });
});
