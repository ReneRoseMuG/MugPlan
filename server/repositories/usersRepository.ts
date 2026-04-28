import { and, eq, ne, or, sql } from "drizzle-orm";
import { db } from "../db";
import { roles, users } from "@shared/schema";
import { assertDbRoleCode, type DbRoleCode } from "../settings/registry";

type UserWithRoleResult = {
  userId: number;
  isActive: boolean;
  roleCode: DbRoleCode | null;
  username: string;
  fullName: string;
};

export type AuthUserRecord = {
  userId: number;
  username: string;
  passwordHash: string;
  isActive: boolean;
  roleCode: DbRoleCode | null;
  twoFactorSecretEncrypted: string | null;
};

export type UserRoleListRow = {
  id: number;
  version: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  isActive: boolean;
  hasTwoFactorSecret: boolean;
  roleCode: DbRoleCode | null;
  roleName: string | null;
};

export type UserRoleRecord = {
  userId: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  version: number;
  isActive: boolean;
  roleCode: DbRoleCode | null;
};

export type FirstActiveUserByRole = {
  userId: number;
  username: string;
  roleCode: DbRoleCode;
};

export type UserTwoFactorRecord = {
  userId: number;
  username: string;
  isActive: boolean;
  roleCode: DbRoleCode | null;
  twoFactorSecretEncrypted: string | null;
};

export class UsersRepositoryError extends Error {
  code: "DUPLICATE_USERNAME" | "DUPLICATE_EMAIL";

  constructor(code: "DUPLICATE_USERNAME" | "DUPLICATE_EMAIL", message: string) {
    super(message);
    this.code = code;
  }
}

export async function getUserWithRole(userId: number): Promise<UserWithRoleResult | null> {
  try {
    const [row] = await db
      .select({
        userId: users.id,
        userIsActive: users.isActive,
        roleCode: roles.code,
        username: users.username,
        fullName: users.fullName,
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
      username: row.username,
      fullName: row.fullName,
    };
  } catch {
    // Rollen-/User-Modell ist in dieser Phase optional; fehlende Tabellen dürfen Settings nicht blockieren.
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

export async function getFirstActiveUserByRoleCode(roleCode: DbRoleCode): Promise<FirstActiveUserByRole | null> {
  const [row] = await db
    .select({
      userId: users.id,
      username: users.username,
      roleCode: roles.code,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.isActive, true), eq(roles.code, roleCode)))
    .orderBy(users.id)
    .limit(1);

  if (!row?.roleCode) return null;
  const normalizedRoleCode = assertDbRoleCode(row.roleCode.toUpperCase());
  if (!normalizedRoleCode) return null;

  return {
    userId: row.userId,
    username: row.username,
    roleCode: normalizedRoleCode,
  };
}

export async function listUsersWithRoles(): Promise<UserRoleListRow[]> {
  const rows = await db
    .select({
      id: users.id,
      version: users.version,
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      fullName: users.fullName,
      isActive: users.isActive,
      hasTwoFactorSecret: users.twoFactorSecretEncrypted,
      roleCode: roles.code,
      roleName: roles.name,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .orderBy(users.id);

  return rows.map((row) => ({
    id: row.id,
    version: row.version,
    username: row.username,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: row.fullName,
    isActive: row.isActive,
    hasTwoFactorSecret: Boolean(row.hasTwoFactorSecret),
    roleCode: row.roleCode ? assertDbRoleCode(row.roleCode.toUpperCase()) : null,
    roleName: row.roleName ?? null,
  }));
}

export async function getUserRoleRecordById(userId: number): Promise<UserRoleRecord | null> {
  const [row] = await db
    .select({
      userId: users.id,
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      version: users.version,
      isActive: users.isActive,
      roleCode: roles.code,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId));

  if (!row) return null;

  return {
    userId: row.userId,
    username: row.username,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    version: row.version,
    isActive: row.isActive,
    roleCode: row.roleCode ? assertDbRoleCode(row.roleCode.toUpperCase()) : null,
  };
}

export async function getRoleIdByCode(roleCode: DbRoleCode): Promise<number | null> {
  const [row] = await db.select({ id: roles.id }).from(roles).where(eq(roles.code, roleCode));
  return row?.id ?? null;
}

export async function updateUserRoleByIdWithVersion(
  userId: number,
  expectedVersion: number,
  roleId: number,
): Promise<{ kind: "updated" } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update users
    set
      role_id = ${roleId},
      updated_at = now(),
      version = version + 1
    where id = ${userId}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  return affectedRows === 0 ? { kind: "version_conflict" } : { kind: "updated" };
}

export async function updateUserByIdWithVersion(
  userId: number,
  expectedVersion: number,
  input: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    roleId: number;
    isActive: boolean;
    passwordHash?: string;
  },
): Promise<{ kind: "updated" } | { kind: "version_conflict" }> {
  try {
    const passwordHashSql = input.passwordHash
      ? sql`password_hash = ${input.passwordHash},`
      : sql``;
    const result = await db.execute(sql`
      update users
      set
        username = ${input.username},
        email = ${input.email},
        first_name = ${input.firstName},
        last_name = ${input.lastName},
        full_name = ${input.fullName},
        role_id = ${input.roleId},
        is_active = ${input.isActive},
        ${passwordHashSql}
        updated_at = now(),
        version = version + 1
      where id = ${userId}
        and version = ${expectedVersion}
    `);
    const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
    return affectedRows === 0 ? { kind: "version_conflict" } : { kind: "updated" };
  } catch (error) {
    const duplicateError = toDuplicateError(error);
    if (duplicateError) {
      throw duplicateError;
    }
    throw error;
  }
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

export async function getAuthUserByUsername(username: string): Promise<AuthUserRecord | null> {
  const normalized = username.trim();
  if (!normalized) return null;

  const [row] = await db
    .select({
      userId: users.id,
      username: users.username,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
      roleCode: roles.code,
      twoFactorSecretEncrypted: users.twoFactorSecretEncrypted,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.username, normalized));

  if (!row) return null;

  return {
    userId: row.userId,
    username: row.username,
    passwordHash: row.passwordHash,
    isActive: row.isActive,
    roleCode: row.roleCode ? assertDbRoleCode(row.roleCode.toUpperCase()) : null,
    twoFactorSecretEncrypted: row.twoFactorSecretEncrypted ?? null,
  };
}

export async function getAuthUserByIdentifier(identifier: string): Promise<AuthUserRecord | null> {
  const normalized = identifier.trim();
  if (!normalized) return null;

  const [row] = await db
    .select({
      userId: users.id,
      username: users.username,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
      roleCode: roles.code,
      twoFactorSecretEncrypted: users.twoFactorSecretEncrypted,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(or(eq(users.username, normalized), eq(users.email, normalized)));

  if (!row) return null;

  return {
    userId: row.userId,
    username: row.username,
    passwordHash: row.passwordHash,
    isActive: row.isActive,
    roleCode: row.roleCode ? assertDbRoleCode(row.roleCode.toUpperCase()) : null,
    twoFactorSecretEncrypted: row.twoFactorSecretEncrypted ?? null,
  };
}

export async function getUserTwoFactorRecordById(userId: number): Promise<UserTwoFactorRecord | null> {
  const [row] = await db
    .select({
      userId: users.id,
      username: users.username,
      isActive: users.isActive,
      roleCode: roles.code,
      twoFactorSecretEncrypted: users.twoFactorSecretEncrypted,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId));

  if (!row) {
    return null;
  }

  return {
    userId: row.userId,
    username: row.username,
    isActive: row.isActive,
    roleCode: row.roleCode ? assertDbRoleCode(row.roleCode.toUpperCase()) : null,
    twoFactorSecretEncrypted: row.twoFactorSecretEncrypted ?? null,
  };
}

export async function storeUserTwoFactorSecret(userId: number, encryptedSecret: string): Promise<void> {
  await db.execute(sql`
    update users
    set
      two_factor_secret_encrypted = ${encryptedSecret},
      updated_at = now(),
      version = version + 1
    where id = ${userId}
  `);
}

export async function resetUserTwoFactorByIdWithVersion(
  userId: number,
  expectedVersion: number,
): Promise<{ kind: "updated" } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update users
    set
      two_factor_secret_encrypted = null,
      two_factor_backup_codes_reserved = null,
      updated_at = now(),
      version = version + 1
    where id = ${userId}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  return affectedRows === 0 ? { kind: "version_conflict" } : { kind: "updated" };
}

export async function createAdminUser(params: {
  username: string;
  passwordHash: string;
}): Promise<{ id: number; username: string; roleCode: "ADMIN" }> {
  const adminRoleId = await getRoleIdByCode("ADMIN");
  if (!adminRoleId) {
    throw new Error("ADMIN role is missing");
  }

  const username = params.username.trim();
  const email = `${username}@local.admin`;
  const firstName = username;
  const lastName = "Admin";
  const fullName = `${username} Admin`;

  const insertResult = await db.insert(users).values({
    username,
    email,
    passwordHash: params.passwordHash,
    firstName,
    lastName,
    fullName,
    roleId: adminRoleId,
    isActive: true,
  });

  const insertedId = Number((insertResult as any)?.[0]?.insertId ?? (insertResult as any)?.insertId ?? 0);
  if (!Number.isFinite(insertedId) || insertedId <= 0) {
    throw new Error("Could not determine inserted admin user id");
  }

  return {
    id: insertedId,
    username,
    roleCode: "ADMIN",
  };
}

function toDuplicateError(error: unknown): UsersRepositoryError | null {
  const mysqlError = error as { code?: string; errno?: number; sqlMessage?: string } | null;
  if (!(mysqlError?.code === "ER_DUP_ENTRY" || mysqlError?.errno === 1062)) {
    return null;
  }

  const message = mysqlError.sqlMessage ?? "";
  if (message.includes("users.username")) {
    return new UsersRepositoryError("DUPLICATE_USERNAME", "Username already exists");
  }
  if (message.includes("users.email")) {
    return new UsersRepositoryError("DUPLICATE_EMAIL", "Email already exists");
  }
  return new UsersRepositoryError("DUPLICATE_USERNAME", "Duplicate entry");
}

export type UserSeedExportRow = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleCode: DbRoleCode | null;
};

export async function listUsersForSeedExport(): Promise<UserSeedExportRow[]> {
  const rows = await db
    .select({
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      roleCode: roles.code,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .orderBy(users.username);

  return rows.map((row) => ({
    username: row.username,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    roleCode: row.roleCode ? assertDbRoleCode(row.roleCode.toUpperCase()) : null,
  }));
}

export async function createUser(params: {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  roleCode: DbRoleCode;
}): Promise<{ id: number }> {
  const roleId = await getRoleIdByCode(params.roleCode);
  if (!roleId) {
    throw new Error(`Role ${params.roleCode} not found`);
  }

  const username = params.username.trim();
  const email = params.email.trim();
  const firstName = params.firstName.trim();
  const lastName = params.lastName.trim();
  const fullName = `${firstName} ${lastName}`.trim();

  try {
    const insertResult = await db.insert(users).values({
      username,
      email,
      passwordHash: params.passwordHash,
      firstName,
      lastName,
      fullName,
      roleId,
      isActive: true,
    });

    const insertedId = Number((insertResult as any)?.[0]?.insertId ?? (insertResult as any)?.insertId ?? 0);
    if (!Number.isFinite(insertedId) || insertedId <= 0) {
      throw new Error("Could not determine inserted user id");
    }

    return { id: insertedId };
  } catch (error) {
    const duplicateError = toDuplicateError(error);
    if (duplicateError) {
      throw duplicateError;
    }
    throw error;
  }
}
