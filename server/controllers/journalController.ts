import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { api } from "@shared/routes";
import * as journalService from "../services/journalService";

export async function listJournalMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    const input = api.journal.list.input.parse(req.query);
    const result = await journalService.listJournalMessages(input, roleKey);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (error instanceof journalService.JournalError) {
      res.status(error.status).json({ code: error.code });
      return;
    }
    next(error);
  }
}
