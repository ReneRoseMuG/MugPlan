import * as usersRepository from "../repositories/usersRepository";
import * as userSettingsRepository from "../repositories/userSettingsRepository";
import {
  mapDbRoleCodeToCanonicalRole,
  settingDefinitions,
  type CanonicalRoleKey,
  type DbRoleCode,
  type ResolvedScope,
  type SettingScopeType,
} from "../settings/registry";

export class UserSettingsError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type ResolvedSettingRow = {
  key: string;
  label: string;
  description: string;
  type: "enum" | "string";
  constraints: Record<string, unknown>;
  allowedScopes: SettingScopeType[];
  defaultValue: unknown;
  globalValue?: unknown;
  roleValue?: unknown;
  userValue?: unknown;
  resolvedValue: unknown;
  resolvedScope: ResolvedScope;
  roleCode: DbRoleCode;
  roleKey: CanonicalRoleKey;
  updatedAt?: string | null;
  updatedBy?: number | null;
};

function toIsoString(input: Date | string | null | undefined): string | null {
  if (!input) return null;
  if (typeof input === "string") return input;
  return input.toISOString();
}

function findCandidate(
  candidates: userSettingsRepository.CandidateSettingValue[],
  scopeType: "USER" | "ROLE" | "GLOBAL",
): userSettingsRepository.CandidateSettingValue | undefined {
  return candidates.find((item) => item.scopeType === scopeType);
}

export async function getResolvedSettingsForUser(userId: number): Promise<ResolvedSettingRow[]> {
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new UserSettingsError("Ungueltiger User-Kontext", 400);
  }

  const roleCode = await usersRepository.getActiveUserRoleCodeByUserId(userId);
  if (!roleCode) {
    throw new UserSettingsError("Nutzerrolle nicht gefunden oder ungueltig", 400);
  }

  const roleKey = mapDbRoleCodeToCanonicalRole(roleCode);
  const definitions = settingDefinitions;
  const rows = await userSettingsRepository.listSettingCandidates({
    settingKeys: definitions.map((entry) => entry.key),
    userId,
    roleCode,
  });

  const candidatesByKey = new Map<string, userSettingsRepository.CandidateSettingValue[]>();
  for (const row of rows) {
    const list = candidatesByKey.get(row.settingKey) ?? [];
    list.push(row);
    candidatesByKey.set(row.settingKey, list);
  }

  return definitions.map((definition) => {
    const keyCandidates = candidatesByKey.get(definition.key) ?? [];

    const userCandidate = definition.allowedScopes.includes("USER")
      ? findCandidate(keyCandidates, "USER")
      : undefined;
    const roleCandidate = definition.allowedScopes.includes("ROLE")
      ? findCandidate(keyCandidates, "ROLE")
      : undefined;
    const globalCandidate = definition.allowedScopes.includes("GLOBAL")
      ? findCandidate(keyCandidates, "GLOBAL")
      : undefined;

    const userValue = userCandidate && definition.validate(userCandidate.valueJson)
      ? userCandidate.valueJson
      : undefined;
    const roleValue = roleCandidate && definition.validate(roleCandidate.valueJson)
      ? roleCandidate.valueJson
      : undefined;
    const globalValue = globalCandidate && definition.validate(globalCandidate.valueJson)
      ? globalCandidate.valueJson
      : undefined;

    let resolvedValue: unknown = definition.defaultValue;
    let resolvedScope: ResolvedScope = "DEFAULT";
    let resolvedMeta: userSettingsRepository.CandidateSettingValue | undefined;

    if (userValue !== undefined) {
      resolvedValue = userValue;
      resolvedScope = "USER";
      resolvedMeta = userCandidate;
    } else if (roleValue !== undefined) {
      resolvedValue = roleValue;
      resolvedScope = "ROLE";
      resolvedMeta = roleCandidate;
    } else if (globalValue !== undefined) {
      resolvedValue = globalValue;
      resolvedScope = "GLOBAL";
      resolvedMeta = globalCandidate;
    }

    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      type: definition.type,
      constraints: definition.type === "enum"
        ? { options: [...definition.options] }
        : { placeholderWhitelist: [...definition.placeholderWhitelist] },
      allowedScopes: [...definition.allowedScopes],
      defaultValue: definition.defaultValue,
      globalValue,
      roleValue,
      userValue,
      resolvedValue,
      resolvedScope,
      roleCode,
      roleKey,
      updatedAt: toIsoString(resolvedMeta?.updatedAt),
      updatedBy: resolvedMeta?.updatedBy ?? null,
    };
  });
}

export function isUserSettingsError(error: unknown): error is UserSettingsError {
  return error instanceof UserSettingsError;
}
