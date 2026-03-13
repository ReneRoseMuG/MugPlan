import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { api } from "@shared/routes";
import * as employeeAbsencesService from "../services/employeeAbsencesService";

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

function parseIdParam(value: string | string[]): number {
  return Number(Array.isArray(value) ? value[0] : value);
}

export async function listEmployeeAbsences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = parseIdParam(req.params.employeeId);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const absences = await employeeAbsencesService.listEmployeeAbsences(employeeId, roleKey);
    res.json(absences);
  } catch (err) {
    if (err instanceof employeeAbsencesService.EmployeeAbsencesError) {
      res.status(err.status).json(err.code === "NOT_FOUND" ? { message: "Abwesenheit nicht gefunden" } : { code: err.code });
      return;
    }
    next(err);
  }
}

export async function getEmployeeAbsence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = parseIdParam(req.params.employeeId);
    const absenceId = parseIdParam(req.params.absenceId);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const absence = await employeeAbsencesService.getEmployeeAbsence(employeeId, absenceId, roleKey);
    if (!absence) {
      res.status(404).json({ message: "Abwesenheit nicht gefunden" });
      return;
    }
    res.json(absence);
  } catch (err) {
    if (err instanceof employeeAbsencesService.EmployeeAbsencesError) {
      res.status(err.status).json(err.code === "NOT_FOUND" ? { message: "Abwesenheit nicht gefunden" } : { code: err.code });
      return;
    }
    next(err);
  }
}

export async function createEmployeeAbsence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = parseIdParam(req.params.employeeId);
    const input = api.employees.absences.create.input.parse(req.body);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const absence = await employeeAbsencesService.createEmployeeAbsence(employeeId, input, roleKey);
    res.status(201).json(absence);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof employeeAbsencesService.EmployeeAbsencesError) {
      res.status(err.status).json(err.code === "NOT_FOUND" ? { message: "Abwesenheit nicht gefunden" } : { code: err.code });
      return;
    }
    next(err);
  }
}

export async function updateEmployeeAbsence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = parseIdParam(req.params.employeeId);
    const absenceId = parseIdParam(req.params.absenceId);
    const input = api.employees.absences.update.input.parse(req.body);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const absence = await employeeAbsencesService.updateEmployeeAbsence(employeeId, absenceId, input, roleKey);
    if (!absence) {
      res.status(404).json({ message: "Abwesenheit nicht gefunden" });
      return;
    }
    res.json(absence);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof employeeAbsencesService.EmployeeAbsencesError) {
      res.status(err.status).json(err.code === "NOT_FOUND" ? { message: "Abwesenheit nicht gefunden" } : { code: err.code });
      return;
    }
    next(err);
  }
}

export async function deleteEmployeeAbsence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = parseIdParam(req.params.employeeId);
    const absenceId = parseIdParam(req.params.absenceId);
    const { version } = api.employees.absences.delete.input.parse(req.body);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const deleted = await employeeAbsencesService.deleteEmployeeAbsence(employeeId, absenceId, version, roleKey);
    if (!deleted) {
      res.status(404).json({ message: "Abwesenheit nicht gefunden" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof employeeAbsencesService.EmployeeAbsencesError) {
      res.status(err.status).json(err.code === "NOT_FOUND" ? { message: "Abwesenheit nicht gefunden" } : { code: err.code });
      return;
    }
    next(err);
  }
}
