import type { NextFunction, Request, Response } from "express";
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
