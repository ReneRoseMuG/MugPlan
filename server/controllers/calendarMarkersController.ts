import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { api } from "@shared/routes";
import * as calendarMarkersService from "../services/calendarMarkersService";

function getRoleKey(req: Request) {
  return req.userContext?.roleKey;
}

function getRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function handleCalendarMarkersError(error: unknown, res: Response): boolean {
  if (error instanceof ZodError) {
    res.status(422).json({ code: "VALIDATION_ERROR" });
    return true;
  }
  if (error instanceof calendarMarkersService.CalendarMarkersError) {
    res.status(error.status).json({ code: error.code });
    return true;
  }
  return false;
}

export async function listCalendarMarkers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.calendarMarkers.list.input.parse(req.query);
    const payload = await calendarMarkersService.listEffectiveCalendarMarkers(roleKey, input);
    res.json(payload);
  } catch (error) {
    if (handleCalendarMarkersError(error, res)) return;
    next(error);
  }
}

export async function listAdminCalendarMarkers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const payload = await calendarMarkersService.listAdminCalendarMarkers(roleKey);
    res.json(payload);
  } catch (error) {
    if (handleCalendarMarkersError(error, res)) return;
    next(error);
  }
}

export async function createCalendarMarker(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.calendarMarkers.create.input.parse(req.body);
    const payload = await calendarMarkersService.createCalendarMarker(roleKey, input);
    res.status(201).json(payload);
  } catch (error) {
    if (handleCalendarMarkersError(error, res)) return;
    next(error);
  }
}

export async function updateCalendarMarker(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.calendarMarkers.update.input.parse(req.body);
    const payload = await calendarMarkersService.updateCalendarMarker(roleKey, getRouteParam(req.params.id), input);
    res.json(payload);
  } catch (error) {
    if (handleCalendarMarkersError(error, res)) return;
    next(error);
  }
}

export async function deleteCalendarMarker(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKey(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.calendarMarkers.delete.input.parse(req.body);
    await calendarMarkersService.deleteCalendarMarker(roleKey, getRouteParam(req.params.id), input.version);
    res.status(204).send();
  } catch (error) {
    if (handleCalendarMarkersError(error, res)) return;
    next(error);
  }
}
