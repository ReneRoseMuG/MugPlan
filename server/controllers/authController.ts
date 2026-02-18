import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { api } from "@shared/routes";
import * as authService from "../services/authService";

export async function getSetupStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = await authService.getSetupStatus();
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

export async function setupAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.auth.setupAdmin.input.parse(req.body);
    const payload = await authService.setupAdmin(input);
    req.session.userId = payload.userId;
    res.status(201).json(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (authService.isAuthError(error)) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.auth.login.input.parse(req.body);
    const payload = await authService.login(input);
    req.session.userId = payload.userId;
    res.json(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (authService.isAuthError(error)) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    req.session.destroy((error) => {
      if (error) {
        next(error);
        return;
      }
      res.json({ ok: true });
    });
  } catch (error) {
    next(error);
  }
}

export async function health(_req: Request, res: Response): Promise<void> {
  res.json({ ok: true });
}
