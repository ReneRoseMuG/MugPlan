import * as usersRepository from "../repositories/usersRepository";
import * as userSettingsRepository from "../repositories/userSettingsRepository";
import {
  globalScopeMarker,
  mapDbRoleCodeToCanonicalRole,
  settingDefinitions,
  type CanonicalRoleKey,
  type DbRoleCode,
  type ResolvedScope,
  type SettingDefinition,
  type SettingScopeType,
} from "../settings/registry";

type SetSettingInput = {
  key: string;
  scopeType: SettingScopeType;
  version: number;
  value?: unknown;
};

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
  type: "enum" | "string" | "number" | "boolean" | "json";
  constraints: Record<string, unknown>;
  allowedScopes: SettingScopeType[];
  defaultValue: unknown;
  globalValue?: unknown;
  globalVersion?: number;
  roleValue?: unknown;
  roleVersion?: number;
  userValue?: unknown;
  userVersion?: number;
  resolvedValue: unknown;
  resolvedVersion?: number;
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

function getSettingDefinitionByKey(key: string): SettingDefinition | undefined {
  return settingDefinitions.find((entry) => entry.key === key);
}

function hasAllowedScope(definition: SettingDefinition, scopeType: SettingScopeType): boolean {
  return (definition.allowedScopes as readonly SettingScopeType[]).includes(scopeType);
}

function canReadDefinition(definition: SettingDefinition, roleKey: CanonicalRoleKey): boolean {
  if (definition.key.startsWith("monitoring.")) {
    return roleKey === "ADMIN";
  }
  return true;
}

function resolveScopeIdForWrite(scopeType: SettingScopeType, userId: number): string {
  if (scopeType === "USER") {
    return String(userId);
  }
  if (scopeType === "ROLE") {
    throw new UserSettingsError("ROLE scope nicht verfügbar, solange Rollenmodell nicht aktiv ist.", 400);
  }
  return globalScopeMarker;
}

function normalizeVorlauflisteResolvedValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const parseStringArray = (input: unknown): string[] | undefined => {
    if (!Array.isArray(input)) return undefined;
    const values = input
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    if (values.length !== input.length || values.length === 0) {
      return undefined;
    }
    return Array.from(new Set(values));
  };

  const columnWidths = candidate.columnWidths && typeof candidate.columnWidths === "object" && !Array.isArray(candidate.columnWidths)
    ? Object.fromEntries(
      Object.entries(candidate.columnWidths)
        .filter(([key, width]) =>
          key.trim().length > 0
          && typeof width === "number"
          && Number.isInteger(width)
          && width >= 80
          && width <= 960)
        .map(([key, width]) => [key, width]),
    )
    : undefined;

  return {
    columnOrder: parseStringArray(candidate.columnOrder),
    hiddenColumns: parseStringArray(candidate.hiddenColumns),
    useShortCodes: typeof candidate.useShortCodes === "boolean" ? candidate.useShortCodes : undefined,
    columnWidths,
  };
}

function normalizeResolvedSettingValue(definition: SettingDefinition, value: unknown): unknown {
  if (definition.key === "reports.vorlaufliste.categorySelection") {
    return normalizeVorlauflisteResolvedValue(value);
  }

  if (definition.key === "reports.produktionsplanung.selection") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return definition.defaultValue;
    }

    return {
      ...(definition.defaultValue as Record<string, unknown>),
      useShortCodes: typeof (value as Record<string, unknown>).useShortCodes === "boolean"
        ? (value as Record<string, unknown>).useShortCodes
        : (definition.defaultValue as Record<string, unknown>).useShortCodes,
    };
  }

  if (definition.key === "reports.auftragsliste.selection") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return definition.defaultValue;
    }

    const candidate = value as Record<string, unknown>;
    const productCategoryIds = Array.isArray(candidate.productCategoryIds)
      ? candidate.productCategoryIds.filter((entry): entry is number => typeof entry === "number" && Number.isInteger(entry) && entry > 0)
      : (definition.defaultValue as Record<string, unknown>).productCategoryIds;
    const componentCategoryIds = Array.isArray(candidate.componentCategoryIds)
      ? candidate.componentCategoryIds.filter((entry): entry is number => typeof entry === "number" && Number.isInteger(entry) && entry > 0)
      : (definition.defaultValue as Record<string, unknown>).componentCategoryIds;
    const tagIds = Array.isArray(candidate.tagIds)
      ? candidate.tagIds.filter((entry): entry is number => typeof entry === "number" && Number.isInteger(entry) && entry > 0)
      : (definition.defaultValue as Record<string, unknown>).tagIds;
    const saunaModels = Array.isArray(candidate.saunaModels)
      ? candidate.saunaModels
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
      : (definition.defaultValue as Record<string, unknown>).saunaModels;

    return {
      ...(definition.defaultValue as Record<string, unknown>),
      productCategoryIds: Array.from(new Set(productCategoryIds as number[])),
      componentCategoryIds: Array.from(new Set(componentCategoryIds as number[])),
      tagIds: Array.from(new Set(tagIds as number[])),
      saunaModels: Array.from(new Set(saunaModels as string[])),
      useShortCodes: typeof candidate.useShortCodes === "boolean"
        ? candidate.useShortCodes
        : (definition.defaultValue as Record<string, unknown>).useShortCodes,
    };
  }

  if (definition.key !== "reports.productVorlauf.selection") {
    return value;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return definition.defaultValue;
  }

  return {
    ...(definition.defaultValue as Record<string, unknown>),
    ...(value as Record<string, unknown>),
  };
}

async function assertCanWriteSetting(userId: number, input: SetSettingInput): Promise<void> {
  if (!(input.scopeType === "GLOBAL" && (
    input.key === "auth_two_factor_enabled"
    || input.key === "calendar.markerVisualizationStyle"
    || input.key.startsWith("monitoring.")
    || input.key === "reports.categoryLayout"
  ))) {
    return;
  }
  const userWithRole = await usersRepository.getUserWithRole(userId);
  const roleCode = userWithRole?.isActive ? userWithRole.roleCode : null;
  const roleKey = roleCode ? mapDbRoleCodeToCanonicalRole(roleCode) : null;
  if (roleKey !== "ADMIN") {
    throw new UserSettingsError("FORBIDDEN", 403);
  }
}

export async function getResolvedSettingsForUser(userId: number): Promise<ResolvedSettingRow[]> {
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new UserSettingsError("Ungültiger User-Kontext", 400);
  }

  const userWithRole = await usersRepository.getUserWithRole(userId);
  const roleCode = userWithRole?.isActive ? userWithRole.roleCode : null;
  const roleAvailable = roleCode !== null;
  const responseRoleCode: DbRoleCode = roleCode ?? "READER";
  const responseRoleKey = mapDbRoleCodeToCanonicalRole(responseRoleCode);
  const definitions = settingDefinitions.filter((definition) => canReadDefinition(definition, responseRoleKey));
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

    const userCandidate = hasAllowedScope(definition, "USER")
      ? findCandidate(keyCandidates, "USER")
      : undefined;
    const roleCandidate = roleAvailable && hasAllowedScope(definition, "ROLE")
      ? findCandidate(keyCandidates, "ROLE")
      : undefined;
    const globalCandidate = hasAllowedScope(definition, "GLOBAL")
      ? findCandidate(keyCandidates, "GLOBAL")
      : undefined;

    const userValue = userCandidate && definition.validate(userCandidate.valueJson)
      ? userCandidate.valueJson
      : undefined;
    const userVersion = userValue !== undefined ? userCandidate?.version : undefined;
    const roleValue = roleCandidate && definition.validate(roleCandidate.valueJson)
      ? roleCandidate.valueJson
      : undefined;
    const roleVersion = roleValue !== undefined ? roleCandidate?.version : undefined;
    const globalValue = globalCandidate && definition.validate(globalCandidate.valueJson)
      ? globalCandidate.valueJson
      : undefined;
    const globalVersion = globalValue !== undefined ? globalCandidate?.version : undefined;

    let resolvedValue: unknown = definition.defaultValue;
    let resolvedScope: ResolvedScope = "DEFAULT";
    let resolvedVersion: number | undefined;
    let resolvedMeta: userSettingsRepository.CandidateSettingValue | undefined;

    if (userValue !== undefined) {
      resolvedValue = normalizeResolvedSettingValue(definition, userValue);
      resolvedScope = "USER";
      resolvedVersion = userVersion;
      resolvedMeta = userCandidate;
    } else if (roleValue !== undefined) {
      resolvedValue = normalizeResolvedSettingValue(definition, roleValue);
      resolvedScope = "ROLE";
      resolvedVersion = roleVersion;
      resolvedMeta = roleCandidate;
    } else if (globalValue !== undefined) {
      resolvedValue = normalizeResolvedSettingValue(definition, globalValue);
      resolvedScope = "GLOBAL";
      resolvedVersion = globalVersion;
      resolvedMeta = globalCandidate;
    }

    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      type: definition.type,
      constraints: definition.type === "enum"
        ? { options: [...definition.options] }
        : definition.type === "string"
          ? { placeholderWhitelist: [...definition.placeholderWhitelist] }
          : definition.type === "number"
            ? { min: definition.min, max: definition.max, integer: definition.integer }
            : {},
      allowedScopes: [...definition.allowedScopes],
      defaultValue: definition.defaultValue,
      globalValue,
      globalVersion,
      roleValue,
      roleVersion,
      userValue,
      userVersion,
      resolvedValue,
      resolvedVersion,
      resolvedScope,
      roleCode: responseRoleCode,
      roleKey: responseRoleKey,
      updatedAt: toIsoString(resolvedMeta?.updatedAt),
      updatedBy: resolvedMeta?.updatedBy ?? null,
    };
  });
}

export async function setSettingForUser(userId: number, input: SetSettingInput): Promise<ResolvedSettingRow[]> {
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new UserSettingsError("Ungültiger User-Kontext", 400);
  }

  if (input.scopeType === "ROLE") {
    throw new UserSettingsError("ROLE scope nicht verfügbar, solange Rollenmodell nicht aktiv ist.", 400);
  }
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new UserSettingsError("VALIDATION_ERROR", 422);
  }

  const definition = getSettingDefinitionByKey(input.key);
  if (!definition) {
    throw new UserSettingsError("Unbekannter Setting-Key", 400);
  }

  await assertCanWriteSetting(userId, input);

  if (!hasAllowedScope(definition, input.scopeType)) {
    throw new UserSettingsError("Scope für dieses Setting nicht erlaubt", 400);
  }

  const scopeId = resolveScopeIdForWrite(input.scopeType, userId);
  if (!definition.validate(input.value)) {
    throw new UserSettingsError("Ungültiger Wert für Setting", 400);
  }

  const upsertResult = await userSettingsRepository.upsertSettingValueWithVersion({
    settingKey: definition.key,
    scopeType: input.scopeType,
    scopeId,
    valueJson: input.value,
    updatedBy: userId,
    expectedVersion: input.version,
  });
  if (upsertResult.kind === "version_conflict") {
    throw new UserSettingsError("VERSION_CONFLICT", 409);
  }

  return getResolvedSettingsForUser(userId);
}

export async function getGlobalSettingValue(key: string): Promise<unknown> {
  const definition = getSettingDefinitionByKey(key);
  if (!definition) {
    throw new UserSettingsError("Unbekannter Setting-Key", 400);
  }

  const storedValue = await userSettingsRepository.getGlobalSettingValue(definition.key);
  if (storedValue !== undefined && definition.validate(storedValue)) {
    return storedValue;
  }

  return definition.defaultValue;
}

export function isUserSettingsError(error: unknown): error is UserSettingsError {
  return error instanceof UserSettingsError;
}
