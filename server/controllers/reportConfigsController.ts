import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import {
  api,
  reportConfigReportKeySchema,
  reportPresetIdSchema,
} from "@shared/routes";

import * as reportConfigsService from "../services/reportConfigsService";

function setNoStoreHeaders(res: Response): void {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
}

function resolveRoleKey(req: Request, res: Response) {
  const roleKey = req.userContext?.roleKey;
  if (!roleKey) {
    res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
    return null;
  }
  return roleKey;
}

function handleKnownError(error: unknown, res: Response): boolean {
  if (error instanceof ZodError) {
    res.status(422).json({ code: "VALIDATION_ERROR" });
    return true;
  }
  if (error instanceof reportConfigsService.ReportConfigsError) {
    res.status(error.status).json({ code: error.code });
    return true;
  }
  return false;
}

export async function listReportPresets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = resolveRoleKey(req, res);
    if (!roleKey) return;

    const reportKey = reportConfigReportKeySchema.parse(req.params.reportKey);
    const payload = await reportConfigsService.listReportPresets({
      reportKey,
      userId: req.userId,
      roleKey,
    });

    setNoStoreHeaders(res);
    res.json(payload);
  } catch (error) {
    if (handleKnownError(error, res)) return;
    next(error);
  }
}

export async function upsertReportPreset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = resolveRoleKey(req, res);
    if (!roleKey) return;

    const reportKey = reportConfigReportKeySchema.parse(req.params.reportKey);
    const presetId = reportPresetIdSchema.parse(req.params.presetId);
    const input = api.reportConfigs.set.input.parse(req.body);
    const preset = await reportConfigsService.upsertReportPreset({
      reportKey,
      presetId,
      userId: req.userId,
      roleKey,
      input,
    });

    setNoStoreHeaders(res);
    res.json(preset);
  } catch (error) {
    if (handleKnownError(error, res)) return;
    next(error);
  }
}

export async function deleteReportPreset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = resolveRoleKey(req, res);
    if (!roleKey) return;

    const reportKey = reportConfigReportKeySchema.parse(req.params.reportKey);
    const presetId = reportPresetIdSchema.parse(req.params.presetId);
    const input = api.reportConfigs.delete.input.parse(req.query);
    await reportConfigsService.deleteReportPreset({
      reportKey,
      presetId,
      userId: req.userId,
      roleKey,
      scope: input.scope,
    });

    setNoStoreHeaders(res);
    res.json({ ok: true });
  } catch (error) {
    if (handleKnownError(error, res)) return;
    next(error);
  }
}
