import type { NextFunction, Request, Response } from "express";
import { getBootstrapState } from "../bootstrap/getBootstrapState";
import { logWarn } from "../lib/logger";

const setupAllowedPaths = new Set<string>([
  "/auth/setup-status",
  "/auth/session",
  "/auth/setup-admin",
  "/auth/login",
  "/auth/quick-login-targets",
  "/auth/quick-login",
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
    logWarn("setup_gate_blocked", {
      reason: "SETUP_REQUIRED",
      method: req.method,
      path: req.path,
    });
    res.status(503).json({ code: "SETUP_REQUIRED" });
    return;
  }

  next();
}
