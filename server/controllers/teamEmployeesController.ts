import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as teamEmployeesService from "../services/teamEmployeesService";
import { handleZodError } from "./validation";

export async function listTeamEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teamId = Number(req.params.teamId);
    const employees = await teamEmployeesService.listEmployeesByTeam(teamId);
    res.json(employees);
  } catch (err) {
    next(err);
  }
}

export async function removeTeamEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = Number(req.params.employeeId);
    const employee = await teamEmployeesService.removeEmployeeFromTeam(employeeId);
    if (!employee) {
      res.status(404).json({ message: "Mitarbeiter nicht gefunden" });
      return;
    }
    res.json(employee);
  } catch (err) {
    next(err);
  }
}

export async function assignTeamEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teamId = Number(req.params.teamId);
    const input = api.teamEmployees.assign.input.parse(req.body);
    const results = await teamEmployeesService.assignEmployeesToTeam(teamId, input.employeeIds);
    res.json(results);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}
