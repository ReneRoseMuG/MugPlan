import type { NextFunction, Request, Response } from "express";
import { getRuntimeConfig, getRuntimeMode } from "../config/runtimeEnv";
import {
  assertSafeAdminDestructiveOperationTarget,
  assertSafeDatabaseTargetForMode,
  parseDatabaseLogInfo,
} from "../security/dbSafetyGuards";
import { logWarn } from "../lib/logger";

type AdminEndpointCategory = "destructive" | "write_non_destructive" | "sensitive_read" | "none";

function classifyAdminEndpoint(method: string, path: string): AdminEndpointCategory {
  if (method === "POST" && path === "/admin/reset-database") {
    return "destructive";
  }
  if (method === "POST" && path === "/admin/dumps/import/apply") {
    return "destructive";
  }
  if (method === "POST" && path === "/admin/dumps/import/preview") {
    return "sensitive_read";
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
    const runtimeConfig = getRuntimeConfig();
    const isDumpImportApply = req.method.toUpperCase() === "POST" && req.path === "/admin/dumps/import/apply";
    if (mode === "production" && !isDumpImportApply) {
      logWarn("admin_action_blocked", {
        reason: "OPERATION_BLOCKED_IN_PRODUCTION",
        method: req.method,
        path: req.path,
        category,
      });
      res.status(403).json({ code: "OPERATION_BLOCKED_IN_PRODUCTION" });
      return;
    }

    try {
      if (mode === "production" && isDumpImportApply) {
        assertSafeDatabaseTargetForMode(
          runtimeConfig.mysqlDatabaseUrl,
          mode,
          runtimeConfig.allowedDatabases,
          runtimeConfig.allowedHosts,
        );
      } else {
        assertSafeAdminDestructiveOperationTarget({
          mode,
          databaseUrl: runtimeConfig.mysqlDatabaseUrl,
          allowedDatabases: runtimeConfig.allowedDatabases,
          allowedHosts: runtimeConfig.allowedHosts,
        });
      }
    } catch (error) {
      const dbInfo = parseDatabaseLogInfo(runtimeConfig.mysqlDatabaseUrl);
      logWarn("admin_action_blocked", {
        reason: "UNSAFE_DATABASE_TARGET",
        method: req.method,
        path: req.path,
        category,
        mode,
        dbName: dbInfo.dbName,
        dbHost: dbInfo.host,
        dbPort: dbInfo.port,
        message: error instanceof Error ? error.message : String(error),
      });
      res.status(403).json({ code: "UNSAFE_DATABASE_TARGET" });
      return;
    }
  }

  next();
}
