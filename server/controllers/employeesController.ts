import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as appointmentsService from "../services/appointmentsService";
import * as employeesService from "../services/employeesService";
import { handleZodError } from "./validation";

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

export async function listEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { scope } = api.employees.list.input.parse(req.query);
    const employees = await employeesService.listEmployees(scope);
    res.json(employees);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function getEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const result = await employeesService.getEmployeeWithRelations(id);
    if (!result) {
      res.status(404).json({ message: "Mitarbeiter nicht gefunden" });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.body.teamId !== undefined || req.body.tourId !== undefined) {
      res.status(400).json({
        message:
          "team_id und tour_id koennen nicht ueber die Mitarbeiter-API gesetzt werden. Bitte nutzen Sie die Team- oder Tour-Verwaltung.",
      });
      return;
    }
    const input = api.employees.create.input.parse(req.body);
    const employee = await employeesService.createEmployee(input);
    res.status(201).json(employee);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (req.body.teamId !== undefined || req.body.tourId !== undefined) {
      res.status(400).json({
        message:
          "team_id und tour_id koennen nicht ueber die Mitarbeiter-API geaendert werden. Bitte nutzen Sie die Team- oder Tour-Verwaltung.",
      });
      return;
    }
    const input = api.employees.update.input.parse(req.body);
    const employee = await employeesService.updateEmployee(id, input);
    if (!employee) {
      res.status(404).json({ message: "Mitarbeiter nicht gefunden" });
      return;
    }
    res.json(employee);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function toggleEmployeeActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const input = api.employees.toggleActive.input.parse(req.body);
    const employee = await employeesService.toggleEmployeeActive(id, input.isActive);
    if (!employee) {
      res.status(404).json({ message: "Mitarbeiter nicht gefunden" });
      return;
    }
    res.json(employee);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function listCurrentAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = Number(req.params.id);
    if (Number.isNaN(employeeId)) {
      res.status(400).json({ message: "Ungueltige employeeId" });
      return;
    }
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      res.status(400).json({ message: "Ungueltiges fromDate" });
      return;
    }

    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const appointments = await appointmentsService.listEmployeeAppointments(employeeId, fromDate, roleKey);
    res.json(appointments);
  } catch (err) {
    next(err);
  }
}
