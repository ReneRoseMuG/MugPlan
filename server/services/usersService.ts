import type { DbRoleCode } from "../settings/registry";
import * as usersRepository from "../repositories/usersRepository";

export class UsersError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "BUSINESS_CONFLICT" | "LOCK_VIOLATION" | "VALIDATION_ERROR";

  constructor(message: string, status: number, code: "VERSION_CONFLICT" | "NOT_FOUND" | "BUSINESS_CONFLICT" | "LOCK_VIOLATION" | "VALIDATION_ERROR") {
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

export async function changeUserRole(
  userContext: UserContext,
  targetUserId: number,
  roleCode: DbRoleCode,
  expectedVersion: number,
) {
  requireAdmin(userContext);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new UsersError("Ungueltige Version", 422, "VALIDATION_ERROR");
  }

  const target = await usersRepository.getUserRoleRecordById(targetUserId);
  if (!target) {
    throw new UsersError("Benutzer nicht gefunden", 404, "NOT_FOUND");
  }

  if (!target.roleCode) {
    throw new UsersError("Benutzer hat keine gueltige Rolle", 422, "VALIDATION_ERROR");
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

export function isUsersError(error: unknown): error is UsersError {
  return error instanceof UsersError;
}
