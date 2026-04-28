import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as usersService from "../services/usersService";

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userContext = req.userContext;
    if (!userContext) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    const users = await usersService.listUsers({ userId: userContext.userId, roleKey: userContext.roleKey });
    res.json(users);
  } catch (error) {
    if (usersService.isUsersError(error)) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

export async function patchUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userContext = req.userContext;
    if (!userContext) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    const userId = Number(req.params.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }

    const input = api.users.patch.input.parse(req.body);
    const users = await usersService.updateUser(
      { userId: userContext.userId, roleKey: userContext.roleKey },
      userId,
      input,
    );
    res.json(users);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (usersService.isUsersError(error)) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

export async function resetUserTwoFactor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userContext = req.userContext;
    if (!userContext) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    const userId = Number(req.params.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }

    const input = api.users.resetTwoFactor.input.parse(req.body);
    const users = await usersService.resetUserTwoFactor(
      { userId: userContext.userId, roleKey: userContext.roleKey },
      userId,
      input.version,
    );
    res.json(users);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (usersService.isUsersError(error)) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userContext = req.userContext;
    if (!userContext) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    const input = api.users.create.input.parse(req.body);
    const users = await usersService.createUser(
      { userId: userContext.userId, roleKey: userContext.roleKey },
      input,
    );
    res.status(201).json(users);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (usersService.isUsersError(error)) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}
