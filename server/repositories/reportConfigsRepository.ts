import {
  reportPresetFileSchema,
  type ReportConfigReportKey,
  type ReportPreset,
  type ReportPresetScope,
} from "@shared/routes";

import { ServerScopedFileStore, type FileScope } from "../services/serverScopedFileStore";

const namespace = "report-configs";
const store = new ServerScopedFileStore();

type ScopeRequest = {
  reportKey: ReportConfigReportKey;
  scope: ReportPresetScope;
  userId?: number;
};

type StoredPresetFile = {
  reportKey: ReportConfigReportKey;
  presets: ReportPreset[];
};

function resolveUserId(userId: number | undefined): string | undefined {
  return typeof userId === "number" && Number.isInteger(userId) && userId > 0 ? String(userId) : undefined;
}

async function readPresetFile(request: ScopeRequest): Promise<StoredPresetFile> {
  const stored = await store.readJson<StoredPresetFile>({
    scope: request.scope as FileScope,
    userId: resolveUserId(request.userId),
    namespace,
    key: request.reportKey,
    schema: reportPresetFileSchema,
  });

  return stored ?? {
    reportKey: request.reportKey,
    presets: [],
  };
}

async function writePresetFile(request: ScopeRequest, presets: ReportPreset[]): Promise<void> {
  await store.writeJson({
    scope: request.scope as FileScope,
    userId: resolveUserId(request.userId),
    namespace,
    key: request.reportKey,
    data: {
      reportKey: request.reportKey,
      presets,
    },
    schema: reportPresetFileSchema,
  });
}

export async function listReportPresets(params: {
  reportKey: ReportConfigReportKey;
  userId: number;
}): Promise<ReportPreset[]> {
  const userFile = await readPresetFile({ reportKey: params.reportKey, scope: "USER", userId: params.userId });

  return userFile.presets
    .sort((left, right) =>
      left.name.localeCompare(right.name, "de")
      || left.id.localeCompare(right.id, "de"));
}

export async function upsertReportPreset(params: {
  reportKey: ReportConfigReportKey;
  preset: ReportPreset;
  scope: ReportPresetScope;
  userId?: number;
}): Promise<ReportPreset> {
  const presetFile = await readPresetFile(params);
  const existingIndex = presetFile.presets.findIndex((preset) => preset.id === params.preset.id);
  const nextPresets = [...presetFile.presets];

  if (existingIndex >= 0) {
    nextPresets[existingIndex] = params.preset;
  } else {
    nextPresets.push(params.preset);
  }

  await writePresetFile(params, nextPresets);
  return params.preset;
}

export async function findReportPreset(params: {
  reportKey: ReportConfigReportKey;
  presetId: string;
  scope: ReportPresetScope;
  userId?: number;
}): Promise<ReportPreset | null> {
  const presetFile = await readPresetFile(params);
  return presetFile.presets.find((preset) => preset.id === params.presetId) ?? null;
}

export async function deleteReportPreset(params: {
  reportKey: ReportConfigReportKey;
  presetId: string;
  scope: ReportPresetScope;
  userId?: number;
}): Promise<void> {
  const presetFile = await readPresetFile(params);
  const nextPresets = presetFile.presets.filter((preset) => preset.id !== params.presetId);

  if (nextPresets.length === presetFile.presets.length) {
    return;
  }

  await writePresetFile(params, nextPresets);
}
