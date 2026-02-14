import { and, eq, inArray, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { userSettingsValue } from "@shared/schema";
import { globalScopeMarker, type DbRoleCode, type SettingScopeType } from "../settings/registry";

export type CandidateSettingValue = {
  settingKey: string;
  scopeType: string;
  scopeId: string;
  valueJson: unknown;
  updatedAt: Date | string | null;
  updatedBy: number | null;
};

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeCode = (error as { code?: unknown }).code;
  const maybeErrno = (error as { errno?: unknown }).errno;
  return maybeCode === "ER_NO_SUCH_TABLE" || maybeErrno === 1146;
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeCode = (error as { code?: unknown }).code;
  const maybeErrno = (error as { errno?: unknown }).errno;
  return maybeCode === "ER_DUP_ENTRY" || maybeErrno === 1062;
}

let ensureUserSettingsTablePromise: Promise<void> | null = null;

async function ensureUserSettingsTable(): Promise<void> {
  if (!ensureUserSettingsTablePromise) {
    ensureUserSettingsTablePromise = db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_settings_value (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(128) NOT NULL,
        scope_type VARCHAR(16) NOT NULL,
        scope_id VARCHAR(128) NOT NULL,
        value_json JSON NOT NULL,
        version INT NOT NULL DEFAULT 1,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by BIGINT NULL,
        CONSTRAINT user_settings_value_key_scope_unique UNIQUE (setting_key, scope_type, scope_id)
      )
    `).then(() => undefined);
  }

  await ensureUserSettingsTablePromise;
}

export async function listSettingCandidates(params: {
  settingKeys: string[];
  userId: number;
  roleCode?: DbRoleCode | null;
}): Promise<CandidateSettingValue[]> {
  if (params.settingKeys.length === 0) {
    return [];
  }

  try {
    await ensureUserSettingsTable();
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }

  const scopeCandidates = [
    and(eq(userSettingsValue.scopeType, "GLOBAL"), eq(userSettingsValue.scopeId, globalScopeMarker)),
    and(eq(userSettingsValue.scopeType, "USER"), eq(userSettingsValue.scopeId, String(params.userId))),
  ];

  if (params.roleCode) {
    scopeCandidates.push(and(eq(userSettingsValue.scopeType, "ROLE"), eq(userSettingsValue.scopeId, params.roleCode)));
  }

  try {
    const rows = await db
      .select({
        settingKey: userSettingsValue.settingKey,
        scopeType: userSettingsValue.scopeType,
        scopeId: userSettingsValue.scopeId,
        valueJson: userSettingsValue.valueJson,
        updatedAt: userSettingsValue.updatedAt,
        updatedBy: userSettingsValue.updatedBy,
      })
      .from(userSettingsValue)
      .where(
        and(
          inArray(userSettingsValue.settingKey, params.settingKeys),
          or(...scopeCandidates),
        ),
      );

    return rows;
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getSettingValueByScope(params: {
  settingKey: string;
  scopeType: SettingScopeType;
  scopeId: string;
}): Promise<{ id: number } | null> {
  const [row] = await db
    .select({ id: userSettingsValue.id })
    .from(userSettingsValue)
    .where(
      and(
        eq(userSettingsValue.settingKey, params.settingKey),
        eq(userSettingsValue.scopeType, params.scopeType),
        eq(userSettingsValue.scopeId, params.scopeId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function upsertSettingValueWithVersion(params: {
  settingKey: string;
  scopeType: SettingScopeType;
  scopeId: string;
  valueJson: unknown;
  updatedBy: number;
  expectedVersion: number;
}): Promise<{ kind: "updated" | "inserted" } | { kind: "version_conflict" }> {
  await ensureUserSettingsTable();

  try {
    return await db.transaction(async (tx) => {
      const updateResult = await tx.execute(sql`
        update user_settings_value
        set
          value_json = ${params.valueJson},
          updated_by = ${params.updatedBy},
          updated_at = now(),
          version = version + 1
        where setting_key = ${params.settingKey}
          and scope_type = ${params.scopeType}
          and scope_id = ${params.scopeId}
          and version = ${params.expectedVersion}
      `);

      const updateAffectedRows = Number(
        (updateResult as any)?.[0]?.affectedRows ?? (updateResult as any)?.affectedRows ?? 0,
      );
      if (updateAffectedRows > 0) {
        return { kind: "updated" as const };
      }

      if (params.expectedVersion !== 1) {
        return { kind: "version_conflict" as const };
      }

      try {
        await tx.insert(userSettingsValue).values({
          settingKey: params.settingKey,
          scopeType: params.scopeType,
          scopeId: params.scopeId,
          valueJson: params.valueJson,
          updatedBy: params.updatedBy,
        });
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return { kind: "version_conflict" as const };
        }
        throw error;
      }

      return { kind: "inserted" as const };
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { kind: "version_conflict" };
    }
    throw error;
  }
}

export async function getGlobalSettingValue(settingKey: string): Promise<unknown | undefined> {
  try {
    await ensureUserSettingsTable();
  } catch (error) {
    if (isMissingTableError(error)) {
      return undefined;
    }
    throw error;
  }

  try {
    const [row] = await db
      .select({
        valueJson: userSettingsValue.valueJson,
      })
      .from(userSettingsValue)
      .where(
        and(
          eq(userSettingsValue.settingKey, settingKey),
          eq(userSettingsValue.scopeType, "GLOBAL"),
          eq(userSettingsValue.scopeId, globalScopeMarker),
        ),
      )
      .limit(1);

    return row?.valueJson;
  } catch (error) {
    if (isMissingTableError(error)) {
      return undefined;
    }
    throw error;
  }
}
