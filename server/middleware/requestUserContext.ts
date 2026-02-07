import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function attachRequestUserContext(req: Request, _res: Response, next: NextFunction): void {
  const configuredUserId = Number(process.env.SETTINGS_USER_ID ?? "1");

  if (!Number.isFinite(configuredUserId) || configuredUserId <= 0) {
    next(new Error("SETTINGS_USER_ID must be a positive integer"));
    return;
  }

  req.userId = configuredUserId;
  next();
}
