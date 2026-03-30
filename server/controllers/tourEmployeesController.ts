import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as tourEmployeesService from "../services/tourEmployeesService";

function canMutateTourEmployees(req: Request): boolean {
  return req.userContext?.roleKey === "ADMIN" || req.userContext?.roleKey === "DISPONENT";
}

export async function listActiveTourEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tourId = Number(req.params.tourId);
    const employees = await tourEmployeesService.listActiveEmployeesByTour(tourId);
    res.json(employees);
  } catch (err) {
    next(err);
  }
}

export async function previewAddTourEmployeeCascade(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateTourEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }
    const tourId = Number(req.params.tourId);
    const input = api.tourEmployees.addPreview.input.parse(req.body);
    const preview = await tourEmployeesService.previewAddEmployeeCascade(tourId, input.employeeId);
    res.json(preview);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof tourEmployeesService.TourEmployeesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function executeAddTourEmployeeCascade(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateTourEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }
    const tourId = Number(req.params.tourId);
    const input = api.tourEmployees.addExecute.input.parse(req.body);
    const result = await tourEmployeesService.executeAddEmployeeCascade(tourId, input);
    res.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof tourEmployeesService.TourEmployeesError) {
      res.status(err.status).json({
        code: err.code,
        ...(err.conflictEmployees ? { conflictEmployees: err.conflictEmployees } : {}),
      });
      return;
    }
    next(err);
  }
}

export async function previewRemoveTourEmployeeCascade(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateTourEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }
    const tourId = Number(req.params.tourId);
    const input = api.tourEmployees.removePreview.input.parse(req.body);
    const preview = await tourEmployeesService.previewRemoveEmployeeCascade(tourId, input.employeeId);
    res.json(preview);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof tourEmployeesService.TourEmployeesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function executeRemoveTourEmployeeCascade(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateTourEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }
    const tourId = Number(req.params.tourId);
    const input = api.tourEmployees.removeExecute.input.parse(req.body);
    const result = await tourEmployeesService.executeRemoveEmployeeCascade(tourId, input);
    res.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof tourEmployeesService.TourEmployeesError) {
      res.status(err.status).json({
        code: err.code,
        ...(err.conflictEmployees ? { conflictEmployees: err.conflictEmployees } : {}),
      });
      return;
    }
    next(err);
  }
}
