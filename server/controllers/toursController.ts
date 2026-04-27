import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import { buildCreateMessage, buildDeleteMessage, buildUpdateMessage } from "../lib/journalMessages";
import { getRequestActor } from "../lib/requestActor";
import * as journalService from "../services/journalService";
import * as toursService from "../services/toursService";

function canMutateTours(req: Request): boolean {
  return req.userContext?.roleKey === "ADMIN" || req.userContext?.roleKey === "DISPONENT";
}

function canDeleteTours(req: Request): boolean {
  return req.userContext?.roleKey === "ADMIN";
}

export async function listTours(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tours = await toursService.listTours();
    res.json(tours);
  } catch (err) {
    next(err);
  }
}

export async function createTour(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateTours(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }
    const input = api.tours.create.input.parse(req.body);
    const tour = await toursService.createTour(input);
    await journalService.recordJournalEntry({
      tableName: "tour",
      recordId: tour.id,
      op: "create",
      newValue: tour,
      snapshot: tour,
      actor: getRequestActor(req),
      triggerKey: "tour.create",
      messageText: buildCreateMessage("tour", tour, tour.id),
      contexts: [journalService.buildTourContext(tour.id)],
    });
    res.status(201).json(tour);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    next(err);
  }
}

export async function updateTour(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateTours(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }
    const input = api.tours.update.input.parse(req.body);
    const currentTour = await toursService.getTour(Number(req.params.id));
    if (!currentTour) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    const tour = await toursService.updateTour(Number(req.params.id), input);
    if (!tour) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    const oldName = currentTour.name.trim();
    const newName = tour.name.trim();
    if (oldName !== newName) {
      await journalService.recordJournalEntry({
        tableName: "tour",
        recordId: tour.id,
        op: "update",
        field: "name",
        oldValue: oldName,
        newValue: newName,
        snapshot: tour,
        actor: getRequestActor(req),
        triggerKey: "tour.update.name",
        messageText: buildUpdateMessage("tour", tour, tour.id),
        contexts: [journalService.buildTourContext(tour.id)],
      });
    }
    res.json(tour);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof toursService.ToursError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function deleteTour(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canDeleteTours(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }
    const input = api.tours.delete.input.parse(req.body);
    const tour = await toursService.getTour(Number(req.params.id));
    if (!tour) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    await toursService.deleteTour(Number(req.params.id), input.version);
    await journalService.recordJournalEntry({
      tableName: "tour",
      recordId: tour.id,
      op: "delete",
      oldValue: tour,
      snapshot: tour,
      actor: getRequestActor(req),
      triggerKey: "tour.delete",
      messageText: buildDeleteMessage("tour", tour, tour.id),
      contexts: [journalService.buildTourContext(tour.id)],
    });
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof toursService.ToursError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}
