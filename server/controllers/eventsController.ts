import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as eventsService from "../services/eventsService";
import { handleZodError } from "./validation";

export async function listEvents(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const events = await eventsService.listEvents();
    res.json(events);
  } catch (err) {
    next(err);
  }
}

export async function createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.events.create.input.parse(req.body);
    const event = await eventsService.createEvent(input);
    res.status(201).json(event);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await eventsService.deleteEvent(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
