import type { NextFunction, Request, Response } from "express";
import { logError } from "../lib/logger";
import { getRequestActor } from "../lib/requestActor";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const actor = getRequestActor(req);
  const meta: Record<string, unknown> = {
    status,
    message,
    error: err,
  };
  if (actor.userId !== null) meta.userId = actor.userId;
  if (actor.name !== null) meta.userName = actor.name;

  logError("internal_server_error", meta);

  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(status).json({ message });
}
