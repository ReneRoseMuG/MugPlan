import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as appointmentsService from "../services/appointmentsService";
import * as employeesService from "../services/employeesService";
import { logWarn } from "../lib/logger";
import { MAX_UPLOAD_BYTES } from "../lib/attachmentFiles";
import { parseMultipartFile } from "../lib/multipart";

const logPrefix = "[employees-controller]";

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

export async function listEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { scope, appointmentDate } = api.employees.list.input.parse(req.query);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    if (appointmentDate && !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }

    const employees = appointmentDate
      ? await employeesService.listEmployeesForAppointmentDate(roleKey, appointmentDate, scope)
      : await employeesService.listEmployees(roleKey, scope);
    res.json(employees);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof employeesService.EmployeesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function getEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const result = await employeesService.getEmployeeWithRelations(id, roleKey);
    if (!result) {
      res.status(404).json({ message: "Mitarbeiter nicht gefunden" });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listEmployeeTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const employeeId = Number(req.params.employeeId);
    const relations = await employeesService.listEmployeeTagRelations(employeeId, roleKey);
    if (!relations) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    res.json(relations);
  } catch (err) {
    next(err);
  }
}

export async function createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    if (roleKey !== "ADMIN" && roleKey !== "DISPONENT") {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

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
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof employeesService.EmployeesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function importEmployeesCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    if (roleKey !== "ADMIN") {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const parsed = await parseMultipartFile(req, {
      fieldName: "file",
      maxSizeBytes: MAX_UPLOAD_BYTES,
    });
    const result = await employeesService.importEmployeesFromCsv(parsed.buffer);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "Payload too large") {
      res.status(413).json({ code: "PAYLOAD_TOO_LARGE" });
      return;
    }
    if (
      err instanceof Error &&
      (err.message === "Missing multipart boundary" || err.message === "No file found in multipart payload")
    ) {
      res.status(422).json({ code: "INVALID_CSV_FORMAT" });
      return;
    }
    if (err instanceof employeesService.EmployeeImportError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
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
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const employee = await employeesService.updateEmployee(id, input, roleKey);
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
    if (err instanceof employeesService.EmployeesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function addEmployeeTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const employeeId = Number(req.params.employeeId);
    const input = api.employeeTags.add.input.parse(req.body);
    const relation = await employeesService.addEmployeeTag(employeeId, input.tagId, roleKey);
    if (!relation) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    res.status(201).json(relation);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof employeesService.EmployeesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function removeEmployeeTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const employeeId = Number(req.params.employeeId);
    const tagId = Number(req.params.tagId);
    const input = api.employeeTags.remove.input.parse(req.body);
    const result = await employeesService.removeEmployeeTag(employeeId, tagId, input.version, roleKey);
    if (result === null) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof employeesService.EmployeesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function toggleEmployeeActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const input = api.employees.toggleActive.input.parse(req.body);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const employee = await employeesService.toggleEmployeeActive(id, input.isActive, input.version, roleKey);
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
    if (err instanceof employeesService.EmployeesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function deleteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    if (roleKey !== "ADMIN") {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }
    res.status(405).json({ code: "METHOD_NOT_ALLOWED" });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof employeesService.EmployeesError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
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

export async function listAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = Number(req.params.id);
    if (Number.isNaN(employeeId)) {
      res.status(400).json({ message: "Ungueltige employeeId" });
      return;
    }

    const { scope, fromDate } = api.employees.appointments.list.input.parse(req.query);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const allowFromDateOverride = req.get("x-internal-debug") === "1" || process.env.NODE_ENV === "test";
    let effectiveFromDate: string | undefined;
    if (typeof fromDate === "string" && fromDate.length > 0) {
      if (scope !== "upcoming") {
        logWarn(`${logPrefix} list appointments ignored fromDate for scope=all employeeId=${employeeId}`);
      } else if (!allowFromDateOverride) {
        logWarn(`${logPrefix} list appointments ignored fromDate without debug flag employeeId=${employeeId}`);
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
        res.status(400).json({ message: "Ungueltiges fromDate" });
        return;
      } else {
        effectiveFromDate = fromDate;
      }
    }

    const appointments = await appointmentsService.listEmployeeAppointmentsByScope(
      employeeId,
      scope,
      roleKey,
      { fromDateOverride: effectiveFromDate },
    );
    res.json(appointments);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    next(err);
  }
}
