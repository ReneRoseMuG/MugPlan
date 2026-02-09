import { constants as fsConstants } from "fs";
import { access, mkdir } from "fs/promises";
import path from "path";
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

const attachmentStoragePathSettingKey = "attachmentStoragePath";

type SetSettingInput = {
  key: string;
  scopeType: SettingScopeType;
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
  type: "enum" | "string" | "number";
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

let globalAttachmentStoragePathCache: { rawPath: string; absolutePath: string } | null = null;

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

function resolveScopeIdForWrite(scopeType: SettingScopeType, userId: number): string {
  if (scopeType === "USER") {
    return String(userId);
  }
  if (scopeType === "ROLE") {
    throw new UserSettingsError("ROLE scope nicht verfuegbar, solange Rollenmodell nicht aktiv ist.", 400);
  }
  return globalScopeMarker;
}

function resolveAbsolutePathFromInput(inputPath: string): string {
  return path.resolve(process.cwd(), inputPath);
}

async function ensureWritableDirectory(absolutePath: string): Promise<void> {
  await mkdir(absolutePath, { recursive: true });
  await access(absolutePath, fsConstants.W_OK);
}

async function normalizeAndValidateAttachmentStoragePath(value: unknown): Promise<{ rawPath: string; absolutePath: string }> {
  if (typeof value !== "string") {
    throw new UserSettingsError("attachmentStoragePath muss ein String sein", 400);
  }

  const rawPath = value.trim();
  if (rawPath.length === 0) {
    throw new UserSettingsError("attachmentStoragePath darf nicht leer sein", 400);
  }

  const absolutePath = resolveAbsolutePathFromInput(rawPath);

  try {
    await ensureWritableDirectory(absolutePath);
  } catch {
    throw new UserSettingsError(
      "Attachment-Speicherpfad konnte nicht angelegt oder beschrieben werden",
      400,
    );
  }

  return { rawPath, absolutePath };
}

function invalidateGlobalAttachmentStoragePathCache(): void {
  globalAttachmentStoragePathCache = null;
}

export async function getResolvedSettingsForUser(userId: number): Promise<ResolvedSettingRow[]> {
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new UserSettingsError("Ungueltiger User-Kontext", 400);
  }

  const userWithRole = await usersRepository.getUserWithRole(userId);
  const roleCode = userWithRole?.isActive ? userWithRole.roleCode : null;
  const roleAvailable = roleCode !== null;
  const responseRoleCode: DbRoleCode = roleCode ?? "READER";
  const responseRoleKey = mapDbRoleCodeToCanonicalRole(responseRoleCode);
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
        : definition.type === "string"
          ? { placeholderWhitelist: [...definition.placeholderWhitelist] }
          : { min: definition.min, max: definition.max, integer: definition.integer },
      allowedScopes: [...definition.allowedScopes],
      defaultValue: definition.defaultValue,
      globalValue,
      roleValue,
      userValue,
      resolvedValue,
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
    throw new UserSettingsError("Ungueltiger User-Kontext", 400);
  }

  if (input.scopeType === "ROLE") {
    throw new UserSettingsError("ROLE scope nicht verfuegbar, solange Rollenmodell nicht aktiv ist.", 400);
  }

  const definition = getSettingDefinitionByKey(input.key);
  if (!definition) {
    throw new UserSettingsError("Unbekannter Setting-Key", 400);
  }

  if (!hasAllowedScope(definition, input.scopeType)) {
    throw new UserSettingsError("Scope fuer dieses Setting nicht erlaubt", 400);
  }

  const scopeId = resolveScopeIdForWrite(input.scopeType, userId);
  let valueToPersist = input.value;

  if (definition.key === attachmentStoragePathSettingKey) {
    const normalized = await normalizeAndValidateAttachmentStoragePath(input.value);
    if (!definition.validate(normalized.rawPath)) {
      throw new UserSettingsError("Ungueltiger Wert fuer attachmentStoragePath", 400);
    }
    valueToPersist = normalized.rawPath;
  } else if (!definition.validate(input.value)) {
    throw new UserSettingsError("Ungueltiger Wert fuer Setting", 400);
  }

  await userSettingsRepository.upsertSettingValue({
    settingKey: definition.key,
    scopeType: input.scopeType,
    scopeId,
    valueJson: valueToPersist,
    updatedBy: userId,
  });

  if (definition.key === attachmentStoragePathSettingKey && input.scopeType === "GLOBAL") {
    invalidateGlobalAttachmentStoragePathCache();
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

export async function getGlobalAttachmentStoragePath(): Promise<string> {
  if (globalAttachmentStoragePathCache) {
    return globalAttachmentStoragePathCache.absolutePath;
  }

  const storedValue = await getGlobalSettingValue(attachmentStoragePathSettingKey);
  const rawPath = typeof storedValue === "string" ? storedValue.trim() : "";

  if (rawPath.length === 0) {
    throw new UserSettingsError("attachmentStoragePath ist leer", 500);
  }

  const absolutePath = resolveAbsolutePathFromInput(rawPath);
  try {
    await ensureWritableDirectory(absolutePath);
  } catch {
    throw new UserSettingsError("Attachment-Speicherpfad ist nicht beschreibbar", 500);
  }

  globalAttachmentStoragePathCache = { rawPath, absolutePath };
  return absolutePath;
}

export function isUserSettingsError(error: unknown): error is UserSettingsError {
  return error instanceof UserSettingsError;
}
