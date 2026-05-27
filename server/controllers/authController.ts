import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { api } from "@shared/routes";
import * as authService from "../services/authService";
import * as calendarMarkersService from "../services/calendarMarkersService";
import { logAuth, logWarn } from "../lib/logger";

function triggerAdminHolidaySeed(payload: { status: string; roleCode?: string; userId?: number }): void {
  if (payload.status !== "authenticated" || payload.roleCode !== "ADMIN") {
    return;
  }
  void calendarMarkersService.seedCalendarHolidaysAfterFirstAdminLoginOfDay().catch((error) => {
    logWarn("[calendar-markers] Admin-Login-Seed fehlgeschlagen", {
      userId: payload.userId,
      error,
    });
  });
}

export async function getSetupStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = await authService.getSetupStatus();
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

export async function getSessionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = await authService.getSessionStatus(req.session.userId);
    if (!payload) {
      res.status(401).json({ code: "UNAUTHORIZED" });
      return;
    }
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

export async function setupAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.auth.setupAdmin.input.parse(req.body);
    const payload = await authService.setupAdmin(input);
    delete req.session.preAuth;
    req.session.userId = payload.userId;
    triggerAdminHolidaySeed(payload);
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
  let input!: { username: string; password: string };
  try {
    input = api.auth.login.input.parse(req.body);
    const result = await authService.login(input);
    delete req.session.userId;
    if (result.preAuth) {
      req.session.preAuth = result.preAuth;
    } else {
      delete req.session.preAuth;
    }
    if (result.payload.status === "authenticated") {
      req.session.userId = result.payload.userId;
      logAuth("login_success", {
        userId: result.payload.userId,
        userName: result.payload.username ?? null,
      });
      triggerAdminHolidaySeed(result.payload);
    }
    res.json(result.payload);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (authService.isAuthError(error)) {
      logAuth("login_failed", {
        code: error.code,
        attemptedUsername: input.username,
      });
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

export async function verifyTwoFactorSetup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.auth.twoFactorSetupVerify.input.parse(req.body);
    const payload = await authService.verifyTwoFactorSetup({
      code: input.code,
      preAuth: req.session.preAuth,
    });
    delete req.session.preAuth;
    req.session.userId = payload.userId;
    triggerAdminHolidaySeed(payload);
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

export async function verifyTwoFactor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.auth.twoFactorVerify.input.parse(req.body);
    const payload = await authService.verifyTwoFactorLogin({
      code: input.code,
      preAuth: req.session.preAuth,
    });
    delete req.session.preAuth;
    req.session.userId = payload.userId;
    logAuth("2fa_success", { userId: payload.userId });
    triggerAdminHolidaySeed(payload);
    res.json(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (authService.isAuthError(error)) {
      logAuth("2fa_failed", { code: error.code });
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

export async function getQuickLoginTargets(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = await authService.listQuickLoginTargets();
    res.json(payload);
  } catch (error) {
    if (authService.isAuthError(error)) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

export async function quickLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.auth.quickLogin.input.parse(req.body);
    const payload = await authService.quickLoginByRole(input);
    delete req.session.preAuth;
    req.session.userId = payload.userId;
    logAuth("quick_login", {
      userId: payload.userId,
      userName: payload.username ?? null,
    });
    triggerAdminHolidaySeed(payload);
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
    const userId = req.session.userId;
    delete req.session.preAuth;
    req.session.destroy((error) => {
      if (error) {
        next(error);
        return;
      }
      logAuth("logout", { userId });
      res.json({ ok: true });
    });
  } catch (error) {
    next(error);
  }
}

export async function health(_req: Request, res: Response): Promise<void> {
  res.json({ ok: true });
}
