import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as tourEmployeesService from "../services/tourEmployeesService";

export async function listTourEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tourId = Number(req.params.tourId);
    const employees = await tourEmployeesService.listEmployeesByTour(tourId);
    res.json(employees);
  } catch (err) {
    next(err);
  }
}

export async function removeTourEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.tourEmployees.remove.input.parse(req.body);
    const employeeId = Number(req.params.employeeId);
    const employee = await tourEmployeesService.removeEmployeeFromTour(employeeId, input.version);
    if (!employee) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    res.json(employee);
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

export async function assignTourEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tourId = Number(req.params.tourId);
    const input = api.tourEmployees.assign.input.parse(req.body);
    const results = await tourEmployeesService.assignEmployeesToTour(tourId, input.items);
    res.json(results);
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
