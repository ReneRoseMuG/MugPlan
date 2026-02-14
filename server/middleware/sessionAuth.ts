import session from "express-session";
import type { NextFunction, Request, Response } from "express";
import type { CanonicalRoleKey, DbRoleCode } from "../settings/registry";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

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

function resolveSessionSecret() {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  return "dev-session-secret-change-me";
}

export const sessionAuth = session({
  secret: resolveSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
});

const publicPaths = new Set<string>([
  "/auth/setup-status",
  "/auth/setup-admin",
  "/auth/login",
  "/auth/logout",
  "/health",
]);

export function requireSessionUser(req: Request, res: Response, next: NextFunction): void {
  if (publicPaths.has(req.path)) {
    next();
    return;
  }

  const userId = req.session?.userId;
  if (!Number.isFinite(userId) || !userId || userId <= 0) {
    res.status(401).json({ code: "UNAUTHORIZED" });
    return;
  }

  req.userId = userId;
  next();
}
