import type { NextFunction, Request, Response } from "express";
import { logError } from "../lib/logger";

export function errorHandler(err: any, _req: Request, res: Response, next: NextFunction): void {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  logError("internal_server_error", {
    status,
    message,
    error: err,
  });

  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(status).json({ message });
}
