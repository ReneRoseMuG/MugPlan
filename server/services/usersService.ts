import type { DbRoleCode } from "../settings/registry";
import * as usersRepository from "../repositories/usersRepository";

export class UsersError extends Error {
  status: number;
  field?: string;

  constructor(message: string, status: number, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

type UserContext = {
  userId: number;
  roleKey: "LESER" | "DISPONENT" | "ADMIN";
};

function requireAdmin(userContext: UserContext): void {
  if (userContext.roleKey !== "ADMIN") {
    throw new UsersError("Keine Berechtigung", 403, "FORBIDDEN");
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
) {
  requireAdmin(userContext);

  const target = await usersRepository.getUserRoleRecordById(targetUserId);
  if (!target) {
    throw new UsersError("Benutzer nicht gefunden", 404, "USER_NOT_FOUND");
  }

  if (!target.roleCode) {
    throw new UsersError("Benutzer hat keine gueltige Rolle", 400, "INVALID_ROLE");
  }

  if (target.roleCode === roleCode) {
    return target;
  }

  if (target.roleCode === "ADMIN" && roleCode !== "ADMIN") {
    const otherActiveAdmins = await usersRepository.countActiveAdmins(targetUserId);

    if (otherActiveAdmins <= 0) {
      if (userContext.userId === targetUserId) {
        throw new UsersError("Self-Demotion des letzten ADMIN ist nicht erlaubt", 400, "LAST_ADMIN_SELF_DEMOTION");
      }
      throw new UsersError("Mindestens ein ADMIN muss im System verbleiben", 400, "LAST_ADMIN_REQUIRED");
    }
  }

  const roleId = await usersRepository.getRoleIdByCode(roleCode);
  if (!roleId) {
    throw new UsersError("Zielrolle nicht gefunden", 400, "ROLE_NOT_FOUND");
  }

  const updated = await usersRepository.updateUserRoleById(targetUserId, roleId);
  if (!updated) {
    throw new UsersError("Rollenwechsel fehlgeschlagen", 500, "ROLE_UPDATE_FAILED");
  }

  const reloaded = await usersRepository.getUserRoleRecordById(targetUserId);
  if (!reloaded) {
    throw new UsersError("Benutzer nach Update nicht gefunden", 500, "USER_RELOAD_FAILED");
  }

  return reloaded;
}

export function isUsersError(error: unknown): error is UsersError {
  return error instanceof UsersError;
}
