import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as appointmentsService from "../services/appointmentsService";
import * as employeesService from "../services/employeesService";
import { logWarn } from "../lib/logger";
import { MAX_UPLOAD_BYTES } from "../lib/attachmentFiles";
import { parseMultipartFile } from "../lib/multipart";
import { getRequestActor } from "../lib/requestActor";
import {
  buildCreateMessage,
  buildDeleteMessage,
  buildTagMessage,
  buildUpdateMessage,
} from "../lib/journalMessages";
import * as journalService from "../services/journalService";

const logPrefix = "[employees-controller]";

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

export async function listEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { scope, appointmentDate } = api.employees.list.input.parse(req.query);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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

export async function listEmployeeWeekPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const result = await employeesService.listEmployeeWeekPlans(id, roleKey);
    if (!result) {
      res.status(404).json({ message: "Mitarbeiter nicht gefunden" });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listEmployeeRevenueOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const result = await employeesService.listEmployeeRevenueOverview(id, roleKey);
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    if (roleKey !== "ADMIN" && roleKey !== "DISPONENT") {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    if (req.body.teamId !== undefined || req.body.tourId !== undefined) {
      res.status(400).json({
        message:
          "team_id und tour_id können nicht über die Mitarbeiter-API gesetzt werden. Bitte nutzen Sie die Team- oder Tour-Verwaltung.",
      });
      return;
    }
    const input = api.employees.create.input.parse(req.body);
    const employee = await employeesService.createEmployee(input);
    await journalService.recordJournalEntry({
      tableName: "employee",
      recordId: employee.id,
      op: "create",
      snapshot: employee,
      newValue: employee,
      actor: getRequestActor(req),
      triggerKey: "employee.create",
      messageText: buildCreateMessage("employee", employee, employee.id),
    });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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
          "team_id und tour_id können nicht über die Mitarbeiter-API geändert werden. Bitte nutzen Sie die Team- oder Tour-Verwaltung.",
      });
      return;
    }
    const input = api.employees.update.input.parse(req.body);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const before = await employeesService.getEmployeeWithRelations(id, roleKey);
    const employee = await employeesService.updateEmployee(id, input, roleKey);
    if (!employee) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    await journalService.recordJournalEntry({
      tableName: "employee",
      recordId: employee.id,
      op: "update",
      oldValue: before?.employee ?? null,
      newValue: employee,
      snapshot: employee,
      actor: getRequestActor(req),
      triggerKey: "employee.update",
      messageText: buildUpdateMessage("employee", employee, employee.id),
    });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const employeeId = Number(req.params.employeeId);
    const input = api.employeeTags.add.input.parse(req.body);
    const relation = await employeesService.addEmployeeTag(employeeId, input.tagId, roleKey);
    if (!relation) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    const employee = await employeesService.getEmployeeWithRelations(employeeId, roleKey);
    await journalService.recordJournalEntry({
      tableName: "employee",
      recordId: employeeId,
      op: "tag_add",
      newValue: { tagId: relation.tag.id, tagName: relation.tag.name },
      snapshot: employee?.employee ?? null,
      actor: getRequestActor(req),
      triggerKey: "employee.tag.add",
      messageText: buildTagMessage("hinzugefügt", "employee", employee?.employee ?? null, relation.tag.name, employeeId),
    });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const employeeId = Number(req.params.employeeId);
    const tagId = Number(req.params.tagId);
    const input = api.employeeTags.remove.input.parse(req.body);
    const [employee, existingRelations] = await Promise.all([
      employeesService.getEmployeeWithRelations(employeeId, roleKey),
      employeesService.listEmployeeTagRelations(employeeId, roleKey),
    ]);
    const removedTag = existingRelations?.find((relation) => relation.tag.id === tagId)?.tag ?? null;
    const result = await employeesService.removeEmployeeTag(employeeId, tagId, input.version, roleKey);
    if (result === null) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    if (removedTag) {
      await journalService.recordJournalEntry({
        tableName: "employee",
        recordId: employeeId,
        op: "tag_remove",
        oldValue: { tagId: removedTag.id, tagName: removedTag.name },
        snapshot: employee?.employee ?? null,
        actor: getRequestActor(req),
        triggerKey: "employee.tag.remove",
        messageText: buildTagMessage("entfernt", "employee", employee?.employee ?? null, removedTag.name, employeeId),
      });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const before = await employeesService.getEmployeeWithRelations(id, roleKey);
    const employee = await employeesService.toggleEmployeeActive(id, input.isActive, input.version, roleKey);
    if (!employee) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    await journalService.recordJournalEntry({
      tableName: "employee",
      recordId: employee.id,
      op: "toggle_active",
      oldValue: before?.employee ?? null,
      newValue: employee,
      snapshot: employee,
      actor: getRequestActor(req),
      triggerKey: "employee.toggle_active",
      messageText: buildUpdateMessage("employee", employee, employee.id),
    });
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
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    if (roleKey !== "ADMIN") {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }
    const input = api.employees.delete.input.parse(req.body);
    const before = await employeesService.getEmployeeWithRelations(id, roleKey);
    await employeesService.deleteEmployee(id, input.version, roleKey);
    if (before) {
      await journalService.recordJournalEntry({
        tableName: "employee",
        recordId: id,
        op: "delete",
        oldValue: before.employee,
        snapshot: before.employee,
        actor: getRequestActor(req),
        triggerKey: "employee.delete",
        messageText: buildDeleteMessage("employee", before.employee, id),
      });
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

export async function listCurrentAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = Number(req.params.id);
    if (Number.isNaN(employeeId)) {
      res.status(400).json({ message: "Ungültige employeeId" });
      return;
    }
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      res.status(400).json({ message: "Ungültiges fromDate" });
      return;
    }

    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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
      res.status(400).json({ message: "Ungültige employeeId" });
      return;
    }

    const { scope, fromDate } = api.employees.appointments.list.input.parse(req.query);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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
        res.status(400).json({ message: "Ungültiges fromDate" });
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
