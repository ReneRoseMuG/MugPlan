import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import * as correctionWorkflowService from "../services/correctionWorkflowService";
import { handleZodError } from "./validation";

function assertAdmin(req: Request, res: Response): boolean {
  if (req.userContext?.roleKey !== "ADMIN") {
    res.status(403).json({ code: "FORBIDDEN" });
    return false;
  }
  return true;
}

export async function previewSaunaProjectTitleMigration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!assertAdmin(req, res)) return;
    const payload = await correctionWorkflowService.previewSaunaProjectTitleMigration();
    res.json(payload);
  } catch (error) {
    if (error instanceof correctionWorkflowService.CorrectionWorkflowError) {
      res.status(error.status).json({ code: error.code, message: error.message });
      return;
    }
    next(error);
  }
}

export async function applySaunaProjectTitleMigration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!assertAdmin(req, res)) return;
    const input = api.admin.saunaProjectTitleMigrationApply.input.parse(req.body);
    const payload = await correctionWorkflowService.applySaunaProjectTitleMigration(input);
    res.json(payload);
  } catch (error) {
    if (error instanceof correctionWorkflowService.CorrectionWorkflowError) {
      res.status(error.status).json({ code: error.code, message: error.message });
      return;
    }
    if (handleZodError(error, res)) return;
    next(error);
  }
}
