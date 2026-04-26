import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import * as systemSeedService from "../services/systemSeedService";

function isAdmin(req: Request): boolean {
  return req.userContext?.roleKey === "ADMIN";
}

export async function getSystemSeedPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const result = await systemSeedService.getSystemSeedPreview();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function applySystemSeed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const input = api.admin.systemSeedApply.input.parse(req.body);
    const result = await systemSeedService.applySystemSeed(input.selectedKeys);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
