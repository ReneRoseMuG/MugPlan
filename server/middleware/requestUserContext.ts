import type { NextFunction, Request, Response } from "express";
import type { CanonicalRoleKey, DbRoleCode } from "../settings/registry";

export type RequestUserContext = {
  userId: number;
  roleCode: DbRoleCode;
  roleKey: CanonicalRoleKey;
};

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userContext?: RequestUserContext;
    }
  }
}

export function attachRequestUserContext(req: Request, _res: Response, next: NextFunction): void {
  const rawUserId = process.env.SETTINGS_USER_ID;
  const configuredUserId = rawUserId ? Number(rawUserId) : Number.NaN;

  if (!Number.isFinite(configuredUserId) || configuredUserId <= 0) {
    next(new Error("SETTINGS_USER_ID must be set to a positive integer"));
    return;
  }

  req.userId = configuredUserId;
  next();
}
