import type { NextFunction, Request, Response } from "express";
import { mapDbRoleCodeToCanonicalRole } from "../settings/registry";
import { getUserWithRole } from "../repositories/usersRepository";

export async function resolveUserRole(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!Number.isFinite(userId) || !userId || userId <= 0) {
      next(new Error("Request user context is missing userId"));
      return;
    }

    const userWithRole = await getUserWithRole(userId);
    if (!userWithRole) {
      next(new Error(`Cannot resolve role for session user ${userId}`));
      return;
    }

    if (!userWithRole.isActive) {
      next(new Error(`Session user ${userId} is inactive`));
      return;
    }

    if (!userWithRole.roleCode) {
      next(new Error(`Session user ${userId} has no valid roleCode`));
      return;
    }

    req.userContext = {
      userId: userWithRole.userId,
      roleCode: userWithRole.roleCode,
      roleKey: mapDbRoleCodeToCanonicalRole(userWithRole.roleCode),
    };

    next();
  } catch (error) {
    next(error);
  }
}
