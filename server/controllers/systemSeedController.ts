import type { NextFunction, Request, Response } from "express";
import * as systemSeedService from "../services/systemSeedService";

export async function applySystemSeed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.userContext?.roleKey !== "ADMIN") {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const result = await systemSeedService.applySystemSeed();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
