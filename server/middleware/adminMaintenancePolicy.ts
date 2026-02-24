import type { NextFunction, Request, Response } from "express";
import { getRuntimeConfig, getRuntimeMode } from "../config/runtimeEnv";
import { assertSafeDatabaseUrlForMode } from "../security/dbSafetyGuards";
import { logWarn } from "../lib/logger";

type AdminEndpointCategory = "destructive" | "write_non_destructive" | "sensitive_read" | "none";

function classifyAdminEndpoint(method: string, path: string): AdminEndpointCategory {
  if (method === "POST" && path === "/admin/reset-database") {
    return "destructive";
  }
  if (method === "POST" && path === "/admin/demo-seed-runs") {
    return "destructive";
  }
  if (method === "DELETE" && /^\/admin\/demo-seed-runs\/[^/]+$/.test(path)) {
    return "destructive";
  }
  if (method === "GET" && path === "/admin/demo-seed-runs") {
    return "sensitive_read";
  }
  if (method === "GET" && path === "/admin/backups/logs") {
    return "sensitive_read";
  }
  if (method === "GET" && /^\/admin\/backups\/[^/]+\/download\/[^/]+$/.test(path)) {
    return "sensitive_read";
  }
  if (path.startsWith("/admin/") && (method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE")) {
    return "write_non_destructive";
  }
  return "none";
}

export function enforceAdminMaintenancePolicy(req: Request, res: Response, next: NextFunction): void {
  const category = classifyAdminEndpoint(req.method.toUpperCase(), req.path);
  if (category === "none") {
    next();
    return;
  }

  const roleKey = req.userContext?.roleKey;
  if (roleKey !== "ADMIN") {
    logWarn("admin_action_blocked", {
      reason: "FORBIDDEN",
      method: req.method,
      path: req.path,
      category,
    });
    res.status(403).json({ code: "FORBIDDEN" });
    return;
  }

  if (category === "destructive") {
    const mode = getRuntimeMode();
    if (mode === "production") {
      logWarn("admin_action_blocked", {
        reason: "OPERATION_BLOCKED_IN_PRODUCTION",
        method: req.method,
        path: req.path,
        category,
      });
      res.status(403).json({ code: "OPERATION_BLOCKED_IN_PRODUCTION" });
      return;
    }

    const runtimeConfig = getRuntimeConfig();
    try {
      assertSafeDatabaseUrlForMode(runtimeConfig.mysqlDatabaseUrl, mode);
    } catch {
      logWarn("admin_action_blocked", {
        reason: "UNSAFE_DATABASE_TARGET",
        method: req.method,
        path: req.path,
        category,
        mode,
      });
      res.status(403).json({ code: "UNSAFE_DATABASE_TARGET" });
      return;
    }
  }

  next();
}
