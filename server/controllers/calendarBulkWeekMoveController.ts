import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { api } from "@shared/routes";
import * as calendarBulkWeekMoveService from "../services/calendarBulkWeekMoveService";
import * as appointmentsService from "../services/appointmentsService";
import * as journalService from "../services/journalService";
import { getRequestActor } from "../lib/requestActor";
import { buildUpdateMessage } from "../lib/journalMessages";
import { logWarn } from "../lib/logger";

const logPrefix = "[calendar-bulk-week-move-controller]";

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

export async function previewBulkWeekMove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.calendarBulkWeekMove.preview.input.parse(req.body);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    if (roleKey !== "ADMIN" && roleKey !== "DISPONENT") {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const result = await calendarBulkWeekMoveService.previewBulkWeekMove({
      sourceTourIds: input.sourceTourIds,
      sourceWeekDate: input.sourceWeekDate,
      shiftWeeks: input.shiftWeeks,
      blockingTagIds: input.blockingTagIds,
      roleKey,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    next(err);
  }
}

export async function executeBulkWeekMove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.calendarBulkWeekMove.execute.input.parse(req.body);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    if (roleKey !== "ADMIN" && roleKey !== "DISPONENT") {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const actor = getRequestActor(req);
    const beforeSnapshots = new Map<number, Awaited<ReturnType<typeof appointmentsService.getAppointmentDetails>>>();
    for (const item of input.items) {
      beforeSnapshots.set(item.appointmentId, await appointmentsService.getAppointmentDetails(item.appointmentId));
    }

    const result = await calendarBulkWeekMoveService.executeBulkWeekMove({
      shiftWeeks: input.shiftWeeks,
      items: input.items,
      roleKey,
    });

    for (const movedItem of result.moved) {
      try {
        const before = beforeSnapshots.get(movedItem.appointmentId) ?? null;
        const after = await appointmentsService.getAppointmentDetails(movedItem.appointmentId);
        if (!after) continue;
        await journalService.recordJournalEntry({
          tableName: "appointment",
          recordId: movedItem.appointmentId,
          op: "update",
          oldValue: before,
          newValue: after,
          snapshot: after,
          actor,
          triggerKey: "appointment.update",
          messageText: buildUpdateMessage("appointment", after, movedItem.appointmentId),
        });
      } catch (journalErr) {
        logWarn(`${logPrefix} Journaleintrag für Termin ${movedItem.appointmentId} fehlgeschlagen: ${String(journalErr)}`);
      }
    }

    res.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    next(err);
  }
}
