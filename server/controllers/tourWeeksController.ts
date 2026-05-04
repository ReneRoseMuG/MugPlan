import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import { buildCalendarWeekMessage } from "../lib/journalMessages";
import { getRequestActor } from "../lib/requestActor";
import * as journalService from "../services/journalService";
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
    const result = await tourWeeksService.createTourWeek(tourId, input, req.userContext?.roleKey);
    const weekContext = journalService.buildCalendarWeekContext({
      yearNumber: result.isoYear,
      weekNumber: result.isoWeek,
      tourId,
    });
    await journalService.recordJournalEntry({
      tableName: "calendar_week",
      recordKey: weekContext.recordKey ?? null,
      op: "create",
      newValue: result,
      snapshot: result,
      actor: getRequestActor(req),
      triggerKey: "calendar_week.create",
      messageText: buildCalendarWeekMessage("erstellt", result.isoYear, result.isoWeek, result.tourName ?? null),
      contexts: [
        weekContext,
        journalService.buildTourContext(tourId),
      ],
    });
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
    const result = await tourWeeksService.blockTourWeek(tourId, { isoYear, isoWeek }, req.userContext?.roleKey);
    const snapshot = {
      tourId,
      isoYear,
      isoWeek,
      isBlocked: true,
      tourName: result.tourName ?? null,
      affectedAppointmentCount: result.affectedAppointmentCount,
    };
    await journalService.recordJournalEntry({
      tableName: "calendar_week",
      recordKey: `${isoYear}-${String(isoWeek).padStart(2, "0")}-${tourId}`,
      op: "update",
      field: "isBlocked",
      newValue: snapshot,
      snapshot,
      actor: getRequestActor(req),
      triggerKey: "calendar_week.block",
      messageText: buildCalendarWeekMessage("blockiert", isoYear, isoWeek, result.tourName ?? null),
      contexts: [
        journalService.buildCalendarWeekContext({ yearNumber: isoYear, weekNumber: isoWeek, tourId }),
        journalService.buildTourContext(tourId),
      ],
    });
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
    const result = await tourWeeksService.unblockTourWeek(tourId, { isoYear, isoWeek }, req.userContext?.roleKey);
    const snapshot = {
      tourId,
      isoYear,
      isoWeek,
      isBlocked: false,
      tourName: result.tourName ?? null,
      affectedAppointmentCount: result.affectedAppointmentCount,
    };
    await journalService.recordJournalEntry({
      tableName: "calendar_week",
      recordKey: `${isoYear}-${String(isoWeek).padStart(2, "0")}-${tourId}`,
      op: "update",
      field: "isBlocked",
      newValue: snapshot,
      snapshot,
      actor: getRequestActor(req),
      triggerKey: "calendar_week.unblock",
      messageText: buildCalendarWeekMessage("freigegeben", isoYear, isoWeek, result.tourName ?? null),
      contexts: [
        journalService.buildCalendarWeekContext({ yearNumber: isoYear, weekNumber: isoWeek, tourId }),
        journalService.buildTourContext(tourId),
      ],
    });
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}
