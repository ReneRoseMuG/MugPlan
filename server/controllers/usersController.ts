import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import * as usersService from "../services/usersService";
import { handleZodError } from "./validation";

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userContext = req.userContext;
    if (!userContext) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const users = await usersService.listUsers({ userId: userContext.userId, roleKey: userContext.roleKey });
    res.json(users);
  } catch (error) {
    if (usersService.isUsersError(error)) {
      res.status(error.status).json({ message: error.message, field: error.field });
      return;
    }
    next(error);
  }
}

export async function patchUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userContext = req.userContext;
    if (!userContext) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const userId = Number(req.params.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      res.status(400).json({ message: "Ungueltige userId", field: "id" });
      return;
    }

    const input = api.users.patch.input.parse(req.body);
    await usersService.changeUserRole(
      { userId: userContext.userId, roleKey: userContext.roleKey },
      userId,
      input.roleCode,
    );

    const users = await usersService.listUsers({ userId: userContext.userId, roleKey: userContext.roleKey });
    res.json(users);
  } catch (error) {
    if (handleZodError(error, res)) return;
    if (usersService.isUsersError(error)) {
      res.status(error.status).json({ message: error.message, field: error.field });
      return;
    }
    next(error);
  }
}
