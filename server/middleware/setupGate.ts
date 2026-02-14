import type { NextFunction, Request, Response } from "express";
import { getBootstrapState } from "../bootstrap/getBootstrapState";

const setupAllowedPaths = new Set<string>([
  "/auth/setup-status",
  "/auth/setup-admin",
  "/auth/login",
  "/auth/logout",
  "/health",
]);

export async function setupGate(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (setupAllowedPaths.has(req.path)) {
    next();
    return;
  }

  const state = await getBootstrapState();
  if (state.needsAdminSetup) {
    res.status(503).json({ code: "SETUP_REQUIRED" });
    return;
  }

  next();
}
