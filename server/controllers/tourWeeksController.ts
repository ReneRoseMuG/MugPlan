import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as tourWeeksService from "../services/tourWeeksService";

function canMutateTourWeeks(req: Request): boolean {
  return req.userContext?.roleKey === "ADMIN" || req.userContext?.roleKey === "DISPONENT";
}

function handleServiceError(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(422).json({ code: "VALIDATION_ERROR" });
    return true;
  }

  if (err instanceof tourWeeksService.TourWeeksError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
    });
    return true;
  }

  return false;
}

export async function createTourWeek(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateTourWeeks(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const tourId = Number(req.params.tourId);
    const input = api.tourWeeks.create.input.parse(req.body);
    const result = await tourWeeksService.createTourWeek(tourId, input);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}

export async function blockTourWeek(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateTourWeeks(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const tourId = Number(req.params.tourId);
    const isoYear = Number(req.params.isoYear);
    const isoWeek = Number(req.params.isoWeek);
    const result = await tourWeeksService.blockTourWeek(tourId, { isoYear, isoWeek });
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}

export async function unblockTourWeek(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateTourWeeks(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const tourId = Number(req.params.tourId);
    const isoYear = Number(req.params.isoYear);
    const isoWeek = Number(req.params.isoWeek);
    const result = await tourWeeksService.unblockTourWeek(tourId, { isoYear, isoWeek });
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}
