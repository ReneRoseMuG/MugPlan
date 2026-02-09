import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { roles, users } from "@shared/schema";
import { assertDbRoleCode, type DbRoleCode } from "../settings/registry";

type UserWithRoleResult = {
  userId: number;
  isActive: boolean;
  roleCode: DbRoleCode | null;
};

export async function getUserWithRole(userId: number): Promise<UserWithRoleResult | null> {
  try {
    const [row] = await db
      .select({
        userId: users.id,
        userIsActive: users.isActive,
        roleCode: roles.code,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, userId));

    if (!row) {
      return null;
    }

    const normalizedRoleCode = row.roleCode ? assertDbRoleCode(row.roleCode.toUpperCase()) : null;

    return {
      userId: row.userId,
      isActive: row.userIsActive,
      roleCode: normalizedRoleCode,
    };
  } catch {
    // Rollen-/User-Modell ist in dieser Phase optional; fehlende Tabellen duerfen Settings nicht blockieren.
    return null;
  }
}

export async function getActiveUserRoleCodeByUserId(userId: number): Promise<DbRoleCode | null> {
  const userWithRole = await getUserWithRole(userId);
  if (!userWithRole || !userWithRole.isActive) {
    return null;
  }
  return userWithRole.roleCode;
}

export async function listActiveUserIds(limit = 10): Promise<number[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(users.id)
    .limit(limit);

  return rows.map((row) => row.id);
}
