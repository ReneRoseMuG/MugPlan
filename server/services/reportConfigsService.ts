import { addDays, addWeeks, format, startOfISOWeek } from "date-fns";

import type {
  ReportConfigReportKey,
  ReportPreset,
  ReportPresetAction,
  ReportPresetConfig,
  ReportPresetRange,
  ReportPresetUpsertInput,
} from "@shared/routes";

import * as reportConfigsRepository from "../repositories/reportConfigsRepository";
import type { CanonicalRoleKey } from "../settings/registry";

export class ReportConfigsError extends Error {
  status: number;
  code: "FORBIDDEN" | "VALIDATION_ERROR";

  constructor(status: number, code: "FORBIDDEN" | "VALIDATION_ERROR") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export type ResolvedReportPresetDateRange = {
  fromDate: string;
  toDate: string;
};

function assertReportPresetReadRole(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "ADMIN" && roleKey !== "DISPONENT" && roleKey !== "LESER") {
    throw new ReportConfigsError(403, "FORBIDDEN");
  }
}

function assertReportPresetWriteRole(roleKey: CanonicalRoleKey): void {
  assertReportPresetReadRole(roleKey);
}

function assertUserId(userId: number | undefined): number {
  if (!Number.isInteger(userId) || !userId || userId <= 0) {
    throw new ReportConfigsError(422, "VALIDATION_ERROR");
  }
  return userId;
}

function normalizeActions(_actions: ReportPresetAction[]): ReportPresetAction[] {
  return [];
}

export function resolveReportPresetRange(
  range: ReportPresetRange,
  referenceDate: Date = new Date(),
): ResolvedReportPresetDateRange {
  if (range.mode === "date") {
    return {
      fromDate: range.fromDate,
      toDate: range.toDate ?? range.fromDate,
    };
  }

  const firstWeekStart = startOfISOWeek(referenceDate);
  const weekOffset = typeof range.start === "number"
    ? range.start
    : range.start === "next"
      ? 1
      : 0;
  const rangeStart = addWeeks(firstWeekStart, weekOffset);
  const rangeEnd = addDays(addWeeks(rangeStart, range.weeks), -1);

  return {
    fromDate: format(rangeStart, "yyyy-MM-dd"),
    toDate: format(rangeEnd, "yyyy-MM-dd"),
  };
}

export async function listReportPresets(params: {
  reportKey: ReportConfigReportKey;
  userId: number | undefined;
  roleKey: CanonicalRoleKey;
}): Promise<{ reportKey: ReportConfigReportKey; presets: ReportPreset[] }> {
  assertReportPresetReadRole(params.roleKey);
  const userId = assertUserId(params.userId);
  const presets = await reportConfigsRepository.listReportPresets({
    reportKey: params.reportKey,
    userId,
  });

  return {
    reportKey: params.reportKey,
    presets,
  };
}

export async function upsertReportPreset(params: {
  reportKey: ReportConfigReportKey;
  presetId: string;
  userId: number | undefined;
  roleKey: CanonicalRoleKey;
  input: ReportPresetUpsertInput;
}): Promise<ReportPreset> {
  assertReportPresetWriteRole(params.roleKey);
  const userId = assertUserId(params.userId);
  const existing = await reportConfigsRepository.findReportPreset({
    reportKey: params.reportKey,
    presetId: params.presetId,
    scope: "USER",
    userId,
  });
  const now = new Date().toISOString();
  const preset: ReportPreset = {
    id: params.presetId,
    reportKey: params.reportKey,
    scope: "USER",
    name: params.input.name,
    config: params.input.config as ReportPresetConfig,
    actions: normalizeActions(params.input.actions),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  return reportConfigsRepository.upsertReportPreset({
    reportKey: params.reportKey,
    scope: "USER",
    userId,
    preset,
  });
}

export async function deleteReportPreset(params: {
  reportKey: ReportConfigReportKey;
  presetId: string;
  userId: number | undefined;
  roleKey: CanonicalRoleKey;
  scope: "USER";
}): Promise<void> {
  assertReportPresetWriteRole(params.roleKey);
  const userId = assertUserId(params.userId);
  await reportConfigsRepository.deleteReportPreset({
    reportKey: params.reportKey,
    presetId: params.presetId,
    scope: "USER",
    userId,
  });
}
