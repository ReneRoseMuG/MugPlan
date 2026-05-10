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

function resolveValidationMessage(error: ZodError): string {
  const paths = error.issues.map((issue) => issue.path.join("."));
  const containsPath = (token: string) => paths.some((path) => path.includes(token));

  if (containsPath("scope")) {
    return "Globale Presets sind deaktiviert. Presets werden nur noch persönlich pro Benutzer gespeichert.";
  }
  if (containsPath("name")) {
    return "Der Presetname darf nicht leer sein und maximal 120 Zeichen haben.";
  }
  if (containsPath("config.range.start")) {
    return "Start KW muss eine Zahl zwischen 1 und 52 sein. 1 bedeutet kommende Woche Montag.";
  }
  if (containsPath("config.range.weeks")) {
    return "Anzahl KW muss eine Zahl zwischen 1 und 52 sein.";
  }
  if (containsPath("config.selectedTourIds")) {
    return "Mindestens eine Tour im Preset ist ungültig. Wählen Sie die Touren neu aus und speichern Sie erneut.";
  }
  if (
    containsPath("config.tagIds")
    || containsPath("config.productCategoryIds")
    || containsPath("config.componentCategoryIds")
    || containsPath("config.saunaModels")
  ) {
    return "Mindestens ein gespeicherter Filterwert ist ungültig. Prüfen Sie die Filterauswahl und speichern Sie erneut.";
  }
  if (paths.some((path) => path.length === 0)) {
    return "Report-Key oder Preset-ID ist ungültig. Verwenden Sie einen gültigen Report und einen Namen ohne Sonderzeichen.";
  }

  return "Presetdaten sind ungültig. Prüfen Sie Presetname, Start KW, Anzahl KW und die Auswahlfelder dieses Reports.";
}

function handleKnownError(error: unknown, res: Response): boolean {
  if (error instanceof ZodError) {
    res.status(422).json({ code: "VALIDATION_ERROR", message: resolveValidationMessage(error) });
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
