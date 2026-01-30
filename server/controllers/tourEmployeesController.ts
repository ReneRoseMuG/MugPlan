import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as tourEmployeesService from "../services/tourEmployeesService";
import { handleZodError } from "./validation";

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
    const employeeId = Number(req.params.employeeId);
    const employee = await tourEmployeesService.removeEmployeeFromTour(employeeId);
    if (!employee) {
      res.status(404).json({ message: "Mitarbeiter nicht gefunden" });
      return;
    }
    res.json(employee);
  } catch (err) {
    next(err);
  }
}

export async function assignTourEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tourId = Number(req.params.tourId);
    const input = api.tourEmployees.assign.input.parse(req.body);
    const results = await tourEmployeesService.assignEmployeesToTour(tourId, input.employeeIds);
    res.json(results);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}
