import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/usersRepository", () => ({
  UsersRepositoryError: class UsersRepositoryError extends Error {
    code: "DUPLICATE_USERNAME" | "DUPLICATE_EMAIL";
    constructor(code: "DUPLICATE_USERNAME" | "DUPLICATE_EMAIL", message: string) {
      super(message);
      this.code = code;
    }
  },
  createUser: vi.fn(),
  listUsersWithRoles: vi.fn(),
}));

vi.mock("../../../server/security/passwordHash", () => ({
  hashPassword: vi.fn(),
}));

import * as usersRepository from "../../../server/repositories/usersRepository";
import * as passwordHash from "../../../server/security/passwordHash";
import { createUser, UsersError } from "../../../server/services/usersService";

const usersRepoMock = vi.mocked(usersRepository);
const passwordHashMock = vi.mocked(passwordHash);

describe("usersService.createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin context", async () => {
    await expect(
      createUser(
        { userId: 1, roleKey: "LESER" },
        {
          username: "new.user",
          email: "new.user@example.com",
          firstName: "New",
          lastName: "User",
          roleCode: "READER",
          password: "very-secure-password",
        },
      ),
    ).rejects.toMatchObject({ status: 403, code: "LOCK_VIOLATION" });
  });

  it("validates password length", async () => {
    await expect(
      createUser(
        { userId: 1, roleKey: "ADMIN" },
        {
          username: "new.user",
          email: "new.user@example.com",
          firstName: "New",
          lastName: "User",
          roleCode: "READER",
          password: "short",
        },
      ),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
  });

  it("creates user and returns refreshed list", async () => {
    passwordHashMock.hashPassword.mockResolvedValue("scrypt$abc$hash");
    usersRepoMock.createUser.mockResolvedValue({ id: 5 });
    usersRepoMock.listUsersWithRoles.mockResolvedValue([
      {
        id: 5,
        version: 1,
        username: "new.user",
        email: "new.user@example.com",
        fullName: "New User",
        isActive: true,
        roleCode: "READER",
        roleName: "Leser",
      } as any,
    ]);

    const result = await createUser(
      { userId: 1, roleKey: "ADMIN" },
      {
        username: "new.user",
        email: "new.user@example.com",
        firstName: "New",
        lastName: "User",
        roleCode: "READER",
        password: "very-secure-password",
      },
    );

    expect(passwordHashMock.hashPassword).toHaveBeenCalledWith("very-secure-password");
    expect(usersRepoMock.createUser).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("maps duplicate repository error to BUSINESS_CONFLICT", async () => {
    passwordHashMock.hashPassword.mockResolvedValue("scrypt$abc$hash");
    usersRepoMock.createUser.mockRejectedValue(
      new (usersRepository as any).UsersRepositoryError("DUPLICATE_EMAIL", "Email already exists"),
    );

    await expect(
      createUser(
        { userId: 1, roleKey: "ADMIN" },
        {
          username: "new.user",
          email: "new.user@example.com",
          firstName: "New",
          lastName: "User",
          roleCode: "READER",
          password: "very-secure-password",
        },
      ),
    ).rejects.toMatchObject({ status: 409, code: "BUSINESS_CONFLICT" });
  });
});
