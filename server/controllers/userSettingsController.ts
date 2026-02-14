import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as userSettingsService from "../services/userSettingsService";

export async function getResolvedSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.userId) {
      res.status(400).json({ message: "Ungueltiger User-Kontext" });
      return;
    }

    const payload = await userSettingsService.getResolvedSettingsForUser(req.userId);
    res.json(payload);
  } catch (error) {
    if (userSettingsService.isUserSettingsError(error)) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    next(error);
  }
}

export async function setSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.userId) {
      res.status(400).json({ message: "Ungueltiger User-Kontext" });
      return;
    }

    const input = api.userSettings.set.input.parse(req.body);
    const payload = await userSettingsService.setSettingForUser(req.userId, input);
    res.json(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (userSettingsService.isUserSettingsError(error)) {
      if (error.message === "VERSION_CONFLICT") {
        res.status(409).json({ code: "VERSION_CONFLICT" });
        return;
      }
      res.status(error.status).json({ message: error.message });
      return;
    }
    next(error);
  }
}
