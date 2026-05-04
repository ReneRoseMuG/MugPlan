import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as appointmentsService from "../services/appointmentsService";
import * as employeeAppointmentAbsencesService from "../services/employeeAppointmentAbsencesService";

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

function parsePositiveId(value: string | string[] | undefined): number | null {
  if (Array.isArray(value)) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function sendServiceError(res: Response, err: unknown): boolean {
  if (err instanceof ZodError) {
    res.status(422).json({ code: "VALIDATION_ERROR" });
    return true;
  }
  if (err instanceof employeeAppointmentAbsencesService.EmployeeAppointmentAbsencesError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      ...(err.parkingConflicts ? { parkingConflicts: err.parkingConflicts } : {}),
    });
    return true;
  }
  if (appointmentsService.isAppointmentError(err)) {
    const payload: Record<string, unknown> = { code: err.code, message: err.message };
    if (err.conflictEmployees) {
      payload.conflictEmployees = err.conflictEmployees;
    }
    res.status(err.status).json(payload);
    return true;
  }
  return false;
}

export async function listEmployeeAppointmentAbsences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = parsePositiveId(req.params.id);
    const roleKey = getRoleKeyFromRequest(req);
    if (!employeeId) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const items = await employeeAppointmentAbsencesService.listEmployeeAppointmentAbsences(employeeId, roleKey);
    res.json(items);
  } catch (err) {
    if (sendServiceError(res, err)) return;
    next(err);
  }
}

export async function createEmployeeAppointmentAbsence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = parsePositiveId(req.params.id);
    const input = api.employees.absenceAppointments.create.input.parse(req.body);
    const roleKey = getRoleKeyFromRequest(req);
    if (!employeeId) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const item = await employeeAppointmentAbsencesService.createEmployeeAppointmentAbsence(employeeId, input, roleKey);
    res.status(201).json(item);
  } catch (err) {
    if (sendServiceError(res, err)) return;
    next(err);
  }
}

export async function updateEmployeeAppointmentAbsence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = parsePositiveId(req.params.id);
    const appointmentId = parsePositiveId(req.params.appointmentId);
    const input = api.employees.absenceAppointments.update.input.parse(req.body);
    const roleKey = getRoleKeyFromRequest(req);
    if (!employeeId || !appointmentId) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const item = await employeeAppointmentAbsencesService.updateEmployeeAppointmentAbsence(
      employeeId,
      appointmentId,
      input,
      roleKey,
    );
    res.json(item);
  } catch (err) {
    if (sendServiceError(res, err)) return;
    next(err);
  }
}

export async function deleteEmployeeAppointmentAbsence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = parsePositiveId(req.params.id);
    const appointmentId = parsePositiveId(req.params.appointmentId);
    const input = api.employees.absenceAppointments.delete.input.parse(req.body);
    const roleKey = getRoleKeyFromRequest(req);
    if (!employeeId || !appointmentId) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    await employeeAppointmentAbsencesService.deleteEmployeeAppointmentAbsence(
      employeeId,
      appointmentId,
      input.version,
      roleKey,
    );
    res.status(204).send();
  } catch (err) {
    if (sendServiceError(res, err)) return;
    next(err);
  }
}
