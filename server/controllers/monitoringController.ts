import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { api } from "@shared/routes";
import * as monitoringService from "../services/monitoringService";

export async function listMonitoring(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const payload = await monitoringService.listMonitoringItems(roleKey);
    res.json(payload);
  } catch (error) {
    if (error instanceof monitoringService.MonitoringError) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

export async function getMonitoringConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.userId) {
      res.status(400).json({ message: "Ungueltiger User-Kontext" });
      return;
    }

    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const payload = await monitoringService.getMonitoringConfigForAdmin(req.userId, roleKey);
    res.json(payload);
  } catch (error) {
    if (error instanceof monitoringService.MonitoringError) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

export async function setMonitoringConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.userId) {
      res.status(400).json({ message: "Ungueltiger User-Kontext" });
      return;
    }

    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const input = api.monitoring.adminConfigSet.input.parse(req.body);
    const payload = await monitoringService.setMonitoringConfigForAdmin(req.userId, roleKey, input);
    res.json(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (error instanceof monitoringService.MonitoringError) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}

