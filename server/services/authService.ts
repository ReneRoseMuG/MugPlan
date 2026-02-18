import * as usersRepository from "../repositories/usersRepository";
import { getBootstrapState } from "../bootstrap/getBootstrapState";
import { hashPassword, verifyPassword } from "../security/passwordHash";

type RoleCode = "READER" | "DISPATCHER" | "ADMIN";

export class AuthError extends Error {
  status: number;
  code:
    | "SETUP_ALREADY_COMPLETED"
    | "INVALID_CREDENTIALS"
    | "USER_INACTIVE"
    | "VALIDATION_ERROR"
    | "SETUP_REQUIRED";

  constructor(
    message: string,
    status: number,
    code: "SETUP_ALREADY_COMPLETED" | "INVALID_CREDENTIALS" | "USER_INACTIVE" | "VALIDATION_ERROR" | "SETUP_REQUIRED",
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type AuthResponse = {
  userId: number;
  username: string;
  roleCode: RoleCode;
};

function normalizeUsername(input: string): string {
  return input.trim();
}

function validatePassword(password: string): void {
  if (password.length < 10) {
    throw new AuthError("Password too short", 422, "VALIDATION_ERROR");
  }
}

function isDuplicateEntry(error: unknown): boolean {
  const mysqlError = error as { code?: string; errno?: number } | null;
  return mysqlError?.code === "ER_DUP_ENTRY" || mysqlError?.errno === 1062;
}

export async function getSetupStatus() {
  return getBootstrapState();
}

export async function setupAdmin(input: { username: string; password: string }): Promise<AuthResponse> {
  const bootstrap = await getBootstrapState();
  if (!bootstrap.needsAdminSetup) {
    throw new AuthError("Setup already completed", 409, "SETUP_ALREADY_COMPLETED");
  }

  const username = normalizeUsername(input.username);
  if (!username) {
    throw new AuthError("Username required", 422, "VALIDATION_ERROR");
  }
  validatePassword(input.password);

  const passwordHash = await hashPassword(input.password);
  let created: { id: number; username: string; roleCode: "ADMIN" };
  try {
    created = await usersRepository.createAdminUser({
      username,
      passwordHash,
    });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      throw new AuthError("Setup already completed", 409, "SETUP_ALREADY_COMPLETED");
    }
    throw error;
  }

  return {
    userId: created.id,
    username: created.username,
    roleCode: created.roleCode,
  };
}

export async function login(input: { username: string; password: string }): Promise<AuthResponse> {
  const bootstrap = await getBootstrapState();
  if (bootstrap.needsAdminSetup) {
    throw new AuthError("Setup required", 409, "SETUP_REQUIRED");
  }

  const identifier = normalizeUsername(input.username);
  if (!identifier) {
    throw new AuthError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  const user = await usersRepository.getAuthUserByIdentifier(identifier);
  if (!user) {
    throw new AuthError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) {
    throw new AuthError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new AuthError("User inactive", 403, "USER_INACTIVE");
  }
  if (!user.roleCode) {
    throw new AuthError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  return {
    userId: user.userId,
    username: user.username,
    roleCode: user.roleCode,
  };
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}
