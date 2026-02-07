import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../db";
import { userSettingsValue } from "@shared/schema";
import { globalScopeMarker, type DbRoleCode } from "../settings/registry";

export type CandidateSettingValue = {
  settingKey: string;
  scopeType: string;
  scopeId: string;
  valueJson: unknown;
  updatedAt: Date | string | null;
  updatedBy: number | null;
};

export async function listSettingCandidates(params: {
  settingKeys: string[];
  userId: number;
  roleCode: DbRoleCode;
}): Promise<CandidateSettingValue[]> {
  if (params.settingKeys.length === 0) {
    return [];
  }

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
        or(
          and(eq(userSettingsValue.scopeType, "GLOBAL"), eq(userSettingsValue.scopeId, globalScopeMarker)),
          and(eq(userSettingsValue.scopeType, "ROLE"), eq(userSettingsValue.scopeId, params.roleCode)),
          and(eq(userSettingsValue.scopeType, "USER"), eq(userSettingsValue.scopeId, String(params.userId))),
        ),
      ),
    );

  return rows;
}
