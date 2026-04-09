import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as tourWeekEmployeesService from "../services/tourWeekEmployeesService";

function canMutateWeekEmployees(req: Request): boolean {
  return req.userContext?.roleKey === "ADMIN" || req.userContext?.roleKey === "DISPONENT";
}

function handleServiceError(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(422).json({ code: "VALIDATION_ERROR" });
    return true;
  }

  if (err instanceof tourWeekEmployeesService.TourWeekEmployeesError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
    });
    return true;
  }

  return false;
}

export async function listTourWeekEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tourId = Number(req.params.tourId);
    const result = await tourWeekEmployeesService.listWeekEmployeesByTour(tourId);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}

export async function previewAddTourWeekEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateWeekEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const tourId = Number(req.params.tourId);
    const input = api.tourWeekEmployees.addPreview.input.parse(req.body);
    const result = await tourWeekEmployeesService.previewAddWeekEmployee(tourId, input);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}

export async function executeAddTourWeekEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateWeekEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const tourId = Number(req.params.tourId);
    const input = api.tourWeekEmployees.addExecute.input.parse(req.body);
    const result = await tourWeekEmployeesService.executeAddWeekEmployee(tourId, input);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}

export async function previewRemoveTourWeekEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateWeekEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const tourId = Number(req.params.tourId);
    const input = api.tourWeekEmployees.removePreview.input.parse(req.body);
    const result = await tourWeekEmployeesService.previewRemoveWeekEmployee(tourId, input);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}

export async function executeRemoveTourWeekEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateWeekEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const tourId = Number(req.params.tourId);
    const assignmentId = Number(req.params.assignmentId);
    const input = api.tourWeekEmployees.removeExecute.input.parse(req.body);
    const result = await tourWeekEmployeesService.executeRemoveWeekEmployee(tourId, assignmentId, input);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}

export async function previewTourAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateWeekEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const tourId = Number(req.params.tourId);
    const input = api.tourWeekEmployees.tourAssignmentPreview.input.parse(req.body);
    const result = await tourWeekEmployeesService.previewTourAssignment(tourId, input);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}
