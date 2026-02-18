import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as toursService from "../services/toursService";

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
    const input = api.tours.create.input.parse(req.body);
    const tour = await toursService.createTour(input);
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
    const input = api.tours.update.input.parse(req.body);
    const tour = await toursService.updateTour(Number(req.params.id), input);
    if (!tour) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
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
    const input = api.tours.delete.input.parse(req.body);
    await toursService.deleteTour(Number(req.params.id), input.version);
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
