import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as teamEmployeesService from "../services/teamEmployeesService";

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
    const input = api.teamEmployees.remove.input.parse(req.body);
    const employeeId = Number(req.params.employeeId);
    const employee = await teamEmployeesService.removeEmployeeFromTeam(employeeId, input.version);
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
    if (err instanceof teamEmployeesService.TeamEmployeesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function assignTeamEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teamId = Number(req.params.teamId);
    const input = api.teamEmployees.assign.input.parse(req.body);
    const results = await teamEmployeesService.assignEmployeesToTeam(teamId, input.items);
    res.json(results);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof teamEmployeesService.TeamEmployeesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}
