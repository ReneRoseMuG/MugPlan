import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as toursService from "../services/toursService";
import { handleZodError } from "./validation";

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
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function updateTour(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.tours.update.input.parse(req.body);
    const tour = await toursService.updateTour(Number(req.params.id), input);
    if (!tour) {
      res.status(404).json({ message: "Tour not found" });
      return;
    }
    res.json(tour);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function deleteTour(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await toursService.deleteTour(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
