import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/usersRepository", () => ({
  listUsersWithRoles: vi.fn(),
  getUserRoleRecordById: vi.fn(),
  countActiveAdmins: vi.fn(),
  getRoleIdByCode: vi.fn(),
  updateUserRoleByIdWithVersion: vi.fn(),
  getUserWithRole: vi.fn(),
}));

import * as usersRepository from "../../../server/repositories/usersRepository";
import { resolveUserRole } from "../../../server/middleware/resolveUserRole";
import { changeUserRole, listUsers } from "../../../server/services/usersService";

const usersRepoMock = vi.mocked(usersRepository);

describe("PKG-03 Authorization & Roles: usersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    } as any);

    const req = { userId: 7 } as any;
    const next = vi.fn();

    await resolveUserRole(req, {} as any, next);

    expect(req.userContext).toEqual({
      userId: 7,
      roleCode: "DISPATCHER",
      roleKey: "DISPONENT",
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
