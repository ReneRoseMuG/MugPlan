import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { roles, users } from "@shared/schema";
import { assertDbRoleCode, type DbRoleCode } from "../settings/registry";

type UserWithRoleResult = {
  userId: number;
  isActive: boolean;
  roleCode: DbRoleCode | null;
};

export type UserRoleListRow = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roleCode: DbRoleCode | null;
  roleName: string | null;
};

export type UserRoleRecord = {
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

export async function listUsersWithRoles(): Promise<UserRoleListRow[]> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      fullName: users.fullName,
      isActive: users.isActive,
      roleCode: roles.code,
      roleName: roles.name,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .orderBy(users.id);

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.fullName,
    isActive: row.isActive,
    roleCode: row.roleCode ? assertDbRoleCode(row.roleCode.toUpperCase()) : null,
    roleName: row.roleName ?? null,
  }));
}

export async function getUserRoleRecordById(userId: number): Promise<UserRoleRecord | null> {
  const [row] = await db
    .select({
      userId: users.id,
      isActive: users.isActive,
      roleCode: roles.code,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId));

  if (!row) return null;

  return {
    userId: row.userId,
    isActive: row.isActive,
    roleCode: row.roleCode ? assertDbRoleCode(row.roleCode.toUpperCase()) : null,
  };
}

export async function getRoleIdByCode(roleCode: DbRoleCode): Promise<number | null> {
  const [row] = await db.select({ id: roles.id }).from(roles).where(eq(roles.code, roleCode));
  return row?.id ?? null;
}

export async function updateUserRoleById(userId: number, roleId: number): Promise<boolean> {
  const result = await db.update(users).set({ roleId }).where(eq(users.id, userId));
  return Number(result[0].affectedRows ?? 0) > 0;
}

export async function countActiveAdmins(excludeUserId?: number): Promise<number> {
  const baseCondition = and(eq(users.isActive, true), eq(roles.code, "ADMIN"));
  const whereCondition =
    typeof excludeUserId === "number" ? and(baseCondition, ne(users.id, excludeUserId)) : baseCondition;

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(whereCondition);

  return Number(row?.count ?? 0);
}
