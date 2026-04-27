import type { DbRoleCode } from "../settings/registry";
import * as usersRepository from "../repositories/usersRepository";
import { hashPassword } from "../security/passwordHash";
import * as userSettingsService from "./userSettingsService";

export class UsersError extends Error {
  status: number;
  code:
    | "VERSION_CONFLICT"
    | "NOT_FOUND"
    | "BUSINESS_CONFLICT"
    | "LOCK_VIOLATION"
    | "VALIDATION_ERROR";

  constructor(
    message: string,
    status: number,
    code: "VERSION_CONFLICT" | "NOT_FOUND" | "BUSINESS_CONFLICT" | "LOCK_VIOLATION" | "VALIDATION_ERROR",
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type UserContext = {
  userId: number;
  roleKey: "LESER" | "DISPONENT" | "ADMIN";
};

function requireAdmin(userContext: UserContext): void {
  if (userContext.roleKey !== "ADMIN") {
    throw new UsersError("Keine Berechtigung", 403, "LOCK_VIOLATION");
  }
}

export async function listUsers(userContext: UserContext) {
  requireAdmin(userContext);
  return usersRepository.listUsersWithRoles();
}

export async function createUser(
  userContext: UserContext,
  input: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    roleCode: DbRoleCode;
    password: string;
  },
) {
  requireAdmin(userContext);

  if (input.password.length < 10) {
    throw new UsersError("Ungültiges Passwort", 422, "VALIDATION_ERROR");
  }

  const username = input.username.trim();
  const email = input.email.trim();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!username || !email || !firstName || !lastName) {
    throw new UsersError("Ungültige Eingaben", 422, "VALIDATION_ERROR");
  }

  const passwordHash = await hashPassword(input.password);

  try {
    await usersRepository.createUser({
      username,
      email,
      firstName,
      lastName,
      roleCode: input.roleCode,
      passwordHash,
    });
  } catch (error) {
    if (error instanceof usersRepository.UsersRepositoryError) {
      throw new UsersError(error.message, 409, "BUSINESS_CONFLICT");
    }
    throw error;
  }

  return usersRepository.listUsersWithRoles();
}

export async function changeUserRole(
  userContext: UserContext,
  targetUserId: number,
  roleCode: DbRoleCode,
  expectedVersion: number,
) {
  requireAdmin(userContext);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new UsersError("Ungültige Version", 422, "VALIDATION_ERROR");
  }

  const target = await usersRepository.getUserRoleRecordById(targetUserId);
  if (!target) {
    throw new UsersError("Benutzer nicht gefunden", 404, "NOT_FOUND");
  }

  if (!target.roleCode) {
    throw new UsersError("Benutzer hat keine gültige Rolle", 422, "VALIDATION_ERROR");
  }

  if (target.roleCode === roleCode) {
    return target;
  }

  if (target.roleCode === "ADMIN" && roleCode !== "ADMIN") {
    const otherActiveAdmins = await usersRepository.countActiveAdmins(targetUserId);

    if (otherActiveAdmins <= 0) {
      if (userContext.userId === targetUserId) {
        throw new UsersError("Self-Demotion des letzten ADMIN ist nicht erlaubt", 409, "BUSINESS_CONFLICT");
      }
      throw new UsersError("Mindestens ein ADMIN muss im System verbleiben", 409, "BUSINESS_CONFLICT");
    }
  }

  const roleId = await usersRepository.getRoleIdByCode(roleCode);
  if (!roleId) {
    throw new UsersError("Zielrolle nicht gefunden", 404, "NOT_FOUND");
  }

  const updated = await usersRepository.updateUserRoleByIdWithVersion(targetUserId, expectedVersion, roleId);
  if (updated.kind === "version_conflict") {
    const exists = await usersRepository.getUserRoleRecordById(targetUserId);
    if (!exists) {
      throw new UsersError("Benutzer nicht gefunden", 404, "NOT_FOUND");
    }
    throw new UsersError("VERSION_CONFLICT", 409, "VERSION_CONFLICT");
  }

  const reloaded = await usersRepository.getUserRoleRecordById(targetUserId);
  if (!reloaded) {
    throw new UsersError("Benutzer nach Update nicht gefunden", 404, "NOT_FOUND");
  }

  return reloaded;
}

function normalizeEditableUserInput(input: {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleCode: DbRoleCode;
  isActive: boolean;
  version: number;
}) {
  const username = input.username.trim();
  const email = input.email.trim();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!username || !email || !firstName || !lastName) {
    throw new UsersError("Ungültige Eingaben", 422, "VALIDATION_ERROR");
  }
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new UsersError("Ungültige Version", 422, "VALIDATION_ERROR");
  }

  return {
    username,
    email,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    roleCode: input.roleCode,
    isActive: input.isActive,
    version: input.version,
  };
}

async function assertLastAdminProtection(params: {
  actorUserId: number;
  targetUserId: number;
  currentRoleCode: DbRoleCode | null;
  nextRoleCode: DbRoleCode;
  nextIsActive: boolean;
}): Promise<void> {
  const demotesAdmin = params.currentRoleCode === "ADMIN" && params.nextRoleCode !== "ADMIN";
  const deactivatesAdmin = params.currentRoleCode === "ADMIN" && !params.nextIsActive;
  if (!demotesAdmin && !deactivatesAdmin) {
    return;
  }

  const otherActiveAdmins = await usersRepository.countActiveAdmins(params.targetUserId);
  if (otherActiveAdmins > 0) {
    return;
  }

  if (params.actorUserId === params.targetUserId) {
    if (demotesAdmin) {
      throw new UsersError("Self-Demotion des letzten ADMIN ist nicht erlaubt", 409, "BUSINESS_CONFLICT");
    }
    throw new UsersError("Deaktivierung des letzten ADMIN ist nicht erlaubt", 409, "BUSINESS_CONFLICT");
  }

  if (demotesAdmin) {
    throw new UsersError("Mindestens ein ADMIN muss im System verbleiben", 409, "BUSINESS_CONFLICT");
  }
  throw new UsersError("Der letzte aktive ADMIN darf nicht deaktiviert werden", 409, "BUSINESS_CONFLICT");
}

export async function updateUser(
  userContext: UserContext,
  targetUserId: number,
  input: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    roleCode: DbRoleCode;
    isActive: boolean;
    version: number;
  },
) {
  requireAdmin(userContext);
  const normalized = normalizeEditableUserInput(input);

  const target = await usersRepository.getUserRoleRecordById(targetUserId);
  if (!target) {
    throw new UsersError("Benutzer nicht gefunden", 404, "NOT_FOUND");
  }

  await assertLastAdminProtection({
    actorUserId: userContext.userId,
    targetUserId,
    currentRoleCode: target.roleCode,
    nextRoleCode: normalized.roleCode,
    nextIsActive: normalized.isActive,
  });

  const roleId = await usersRepository.getRoleIdByCode(normalized.roleCode);
  if (!roleId) {
    throw new UsersError("Zielrolle nicht gefunden", 404, "NOT_FOUND");
  }

  try {
    const updated = await usersRepository.updateUserByIdWithVersion(targetUserId, normalized.version, {
      username: normalized.username,
      email: normalized.email,
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      fullName: normalized.fullName,
      roleId,
      isActive: normalized.isActive,
    });
    if (updated.kind === "version_conflict") {
      const exists = await usersRepository.getUserRoleRecordById(targetUserId);
      if (!exists) {
        throw new UsersError("Benutzer nicht gefunden", 404, "NOT_FOUND");
      }
      throw new UsersError("VERSION_CONFLICT", 409, "VERSION_CONFLICT");
    }
  } catch (error) {
    if (error instanceof usersRepository.UsersRepositoryError) {
      throw new UsersError(error.message, 409, "BUSINESS_CONFLICT");
    }
    throw error;
  }

  return usersRepository.listUsersWithRoles();
}

export async function resetUserTwoFactor(
  userContext: UserContext,
  targetUserId: number,
  expectedVersion: number,
) {
  requireAdmin(userContext);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new UsersError("Ungültige Version", 422, "VALIDATION_ERROR");
  }

  const target = await usersRepository.getUserRoleRecordById(targetUserId);
  if (!target) {
    throw new UsersError("Benutzer nicht gefunden", 404, "NOT_FOUND");
  }

  const globalTwoFactorEnabled = await userSettingsService.getGlobalSettingValue("auth_two_factor_enabled") === true;
  if (
    globalTwoFactorEnabled
    && userContext.userId === targetUserId
    && target.isActive
    && target.roleCode === "ADMIN"
  ) {
    const otherActiveAdmins = await usersRepository.countActiveAdmins(targetUserId);
    if (otherActiveAdmins <= 0) {
      throw new UsersError("2FA-Reset des letzten aktiven ADMIN ist bei global aktiver 2FA nicht erlaubt", 409, "BUSINESS_CONFLICT");
    }
  }

  const updated = await usersRepository.resetUserTwoFactorByIdWithVersion(targetUserId, expectedVersion);
  if (updated.kind === "version_conflict") {
    const exists = await usersRepository.getUserRoleRecordById(targetUserId);
    if (!exists) {
      throw new UsersError("Benutzer nicht gefunden", 404, "NOT_FOUND");
    }
    throw new UsersError("VERSION_CONFLICT", 409, "VERSION_CONFLICT");
  }

  return usersRepository.listUsersWithRoles();
}

export function isUsersError(error: unknown): error is UsersError {
  return error instanceof UsersError;
}
