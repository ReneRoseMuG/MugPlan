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

import * as usersRepository from "../../../server/repositories/usersRepository";
import * as bootstrap from "../../../server/bootstrap/getBootstrapState";
import * as passwordHash from "../../../server/security/passwordHash";
import { login } from "../../../server/services/authService";

const usersRepoMock = vi.mocked(usersRepository);
const bootstrapMock = vi.mocked(bootstrap);
const passwordHashMock = vi.mocked(passwordHash);

describe("authService.login identifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bootstrapMock.getBootstrapState.mockResolvedValue({ needsAdminSetup: false });
  });

  it("authenticates by email identifier", async () => {
    usersRepoMock.getAuthUserByIdentifier.mockResolvedValue({
      userId: 7,
      username: "admin",
      passwordHash: "scrypt$abc$hash",
      isActive: true,
      roleCode: "ADMIN",
    });
    passwordHashMock.verifyPassword.mockResolvedValue(true);

    const result = await login({
      username: "admin@example.com",
      password: "very-secure-password",
    });

    expect(usersRepoMock.getAuthUserByIdentifier).toHaveBeenCalledWith("admin@example.com");
    expect(result).toMatchObject({ userId: 7, username: "admin", roleCode: "ADMIN" });
  });
});
