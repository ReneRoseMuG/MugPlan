import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as appointmentsService from "../services/appointmentsService";
import * as tourWeeksService from "../services/tourWeeksService";
import { handleZodError } from "./validation";
import { logDebug, logWarn } from "../lib/logger";
import { getRequestActor } from "../lib/requestActor";
import {
  buildAppointmentEmployeeMessage,
  buildCreateMessage,
  buildDeleteMessage,
  buildDisplayModeMessage,
  buildTagMessage,
  buildUpdateMessage,
} from "../lib/journalMessages";
import * as journalService from "../services/journalService";

const logPrefix = "[appointments-controller]";

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

function parseTagIds(value: unknown): number[] {
  if (!value) return [];
  const rawValues = Array.isArray(value) ? value : [value];
  const ids = rawValues
    .flatMap((entry) => String(entry).split(","))
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
  return Array.from(new Set(ids));
}

type AppointmentEmployeePreview = {
  id: number;
  fullName: string;
};

type AppointmentDetailSnapshot = Awaited<ReturnType<typeof appointmentsService.getAppointmentDetails>>;

async function recordAppointmentEmployeeDelta(params: {
  appointmentId: number;
  beforeEmployees: AppointmentEmployeePreview[];
  afterEmployees: AppointmentEmployeePreview[];
  appointmentSnapshot: AppointmentDetailSnapshot;
  actor: ReturnType<typeof getRequestActor>;
}) {
  const beforeIds = new Set(params.beforeEmployees.map((employee) => employee.id));
  const afterIds = new Set(params.afterEmployees.map((employee) => employee.id));
  const added = params.afterEmployees.filter((employee) => !beforeIds.has(employee.id));
  const removed = params.beforeEmployees.filter((employee) => !afterIds.has(employee.id));

  await journalService.recordJournalEntries([
    ...added.map((employee) => ({
      tableName: "appointment_employee",
      recordId: null,
      recordKey: `${params.appointmentId}:${employee.id}`,
      op: "employee_add",
      newValue: { employeeId: employee.id, employeeName: employee.fullName },
      snapshot: params.appointmentSnapshot,
      contexts: [
        { tableName: "appointment", recordId: params.appointmentId, relationRole: "owner" },
        { tableName: "employee", recordId: employee.id, relationRole: "employee" },
      ],
      actor: params.actor,
      triggerKey: "appointment.employee.add",
      messageText: buildAppointmentEmployeeMessage("hinzugefügt", employee.fullName, params.appointmentSnapshot, params.appointmentId),
    })),
    ...removed.map((employee) => ({
      tableName: "appointment_employee",
      recordId: null,
      recordKey: `${params.appointmentId}:${employee.id}`,
      op: "employee_remove",
      oldValue: { employeeId: employee.id, employeeName: employee.fullName },
      snapshot: params.appointmentSnapshot,
      contexts: [
        { tableName: "appointment", recordId: params.appointmentId, relationRole: "owner" },
        { tableName: "employee", recordId: employee.id, relationRole: "employee" },
      ],
      actor: params.actor,
      triggerKey: "appointment.employee.remove",
      messageText: buildAppointmentEmployeeMessage("entfernt", employee.fullName, params.appointmentSnapshot, params.appointmentId),
    })),
  ]);
}

export async function getAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointmentId = Number(req.params.id);
    const appointment = await appointmentsService.getAppointmentDetails(appointmentId);
    if (!appointment) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
    }
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

export async function createAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.appointments.create.input.parse(req.body);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const appointment = await appointmentsService.createAppointment(input, roleKey);
    if (appointment?.id) {
      const detail = await appointmentsService.getAppointmentDetails(appointment.id);
      await journalService.recordJournalEntry({
        tableName: "appointment",
        recordId: appointment.id,
        op: "create",
        snapshot: detail ?? appointment,
        newValue: detail ?? appointment,
        actor: getRequestActor(req),
        triggerKey: "appointment.create",
        messageText: buildCreateMessage("appointment", detail ?? appointment, appointment.id),
      });
      if (detail) {
        await recordAppointmentEmployeeDelta({
          appointmentId: appointment.id,
          beforeEmployees: [],
          afterEmployees: detail.employees,
          appointmentSnapshot: detail,
          actor: getRequestActor(req),
        });
      }
    }
    res.status(201).json(appointment);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (appointmentsService.isAppointmentError(err)) {
      const payload: Record<string, unknown> = { code: err.code, message: err.message };
      if (err.conflictEmployees) {
        payload.conflictEmployees = err.conflictEmployees;
      }
      res.status(err.status).json(payload);
      return;
    }
    next(err);
  }
}

export async function updateAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.appointments.update.input.parse(req.body);

    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    const appointmentId = Number(req.params.id);
    const before = await appointmentsService.getAppointmentDetails(appointmentId);
    const appointment = await appointmentsService.updateAppointment(appointmentId, input, roleKey);
    if (!appointment) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
    }
    const after = await appointmentsService.getAppointmentDetails(appointmentId);
    await journalService.recordJournalEntry({
      tableName: "appointment",
      recordId: appointmentId,
      op: "update",
      oldValue: before,
      newValue: after ?? appointment,
      snapshot: after ?? appointment,
      actor: getRequestActor(req),
      triggerKey: "appointment.update",
      messageText: buildUpdateMessage("appointment", after ?? appointment, appointmentId),
    });
    if (after) {
      await recordAppointmentEmployeeDelta({
        appointmentId,
        beforeEmployees: before?.employees ?? [],
        afterEmployees: after.employees,
        appointmentSnapshot: after,
        actor: getRequestActor(req),
      });
    }
    res.json(appointment);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (appointmentsService.isAppointmentError(err)) {
      const payload: Record<string, unknown> = { code: err.code, message: err.message };
      if (err.conflictEmployees) {
        payload.conflictEmployees = err.conflictEmployees;
      }
      res.status(err.status).json(payload);
      return;
    }
    next(err);
  }
}

export async function previewAppointmentTourChange(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (roleKey !== "ADMIN" && roleKey !== "DISPONENT") {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const appointmentId = Number(req.params.id);
    const input = api.appointments.tourChangePreview.input.parse(req.body);
    const preview = await appointmentsService.previewAppointmentTourChange(appointmentId, input, roleKey);
    res.json(preview);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (appointmentsService.isAppointmentError(err)) {
      res.status(err.status).json({ code: err.code, message: err.message });
      return;
    }
    if (err instanceof Error && "status" in err && "code" in err) {
      const typedErr = err as Error & { status: number; code: string };
      res.status(typedErr.status).json({ code: typedErr.code, message: typedErr.message });
      return;
    }
    next(err);
  }
}

export async function setAppointmentDisplayMode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.appointments.setDisplayMode.input.parse(req.body);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    const appointmentId = Number(req.params.id);
    const before = await appointmentsService.getAppointmentDetails(appointmentId);
    const appointment = await appointmentsService.setAppointmentDisplayMode(appointmentId, input, roleKey);
    if (!appointment) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
    }
    const after = await appointmentsService.getAppointmentDetails(appointmentId);
    await journalService.recordJournalEntry({
      tableName: "appointment",
      recordId: appointmentId,
      op: "display_mode",
      oldValue: before ? { displayMode: before.displayMode } : null,
      newValue: { displayMode: appointment.displayMode },
      snapshot: after ?? before,
      actor: getRequestActor(req),
      triggerKey: "appointment.display_mode",
      messageText: buildDisplayModeMessage(before?.displayMode ?? "unknown", appointment.displayMode, after ?? before, appointmentId),
    });
    res.json(appointment);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (appointmentsService.isAppointmentError(err)) {
      res.status(err.status).json({ code: err.code, message: err.message });
      return;
    }
    next(err);
  }
}

export async function listProjectAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.projectId);
    if (Number.isNaN(projectId)) {
      res.status(400).json({ message: "Ungültige projectId" });
      return;
    }

    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      logWarn(`${logPrefix} list project appointments rejected: invalid fromDate=${fromDate}`);
      res.status(400).json({ message: "Ungültiges fromDate" });
      return;
    }

    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    logDebug(`${logPrefix} list project appointments request projectId=${projectId} fromDate=${fromDate ?? "n/a"}`);
    const appointments = await appointmentsService.listProjectAppointments(projectId, fromDate, roleKey);
    res.json(appointments);
  } catch (err) {
    next(err);
  }
}

export async function listTourAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tourId = Number(req.params.tourId);
    if (Number.isNaN(tourId)) {
      res.status(400).json({ message: "Ungültige tourId" });
      return;
    }

    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      logWarn(`${logPrefix} list tour appointments rejected: invalid fromDate=${fromDate}`);
      res.status(400).json({ message: "Ungültiges fromDate" });
      return;
    }

    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    logDebug(`${logPrefix} list tour appointments request tourId=${tourId} fromDate=${fromDate ?? "n/a"}`);
    const appointments = await appointmentsService.listTourAppointments(tourId, fromDate, roleKey);
    res.json(appointments);
  } catch (err) {
    next(err);
  }
}

export async function getTourPrintPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tourId = Number(req.params.tourId);
    if (Number.isNaN(tourId)) {
      res.status(400).json({ message: "Ungültige tourId" });
      return;
    }

    const input = api.tourPrintPreview.get.input.parse(req.query);
    const preview = await appointmentsService.getTourPrintPreview({
      tourId,
      fromDate: input.fromDate,
      weekCount: input.weekCount,
    });

    if (!preview) {
      res.status(404).json({ message: "Tour nicht gefunden" });
      return;
    }

    res.json(preview);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function listAppointmentsList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.appointments.list.input.parse(req.query);

    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    const result = await appointmentsService.listAppointmentsList({
      ...input,
      tagIds: parseTagIds(input.tagIds),
      roleKey,
    });
    res.json(result);
  } catch (err) {
    if (handleZodError(err, res)) return;
    if (appointmentsService.isAppointmentError(err)) {
      res.status(err.status).json({ message: err.message, field: err.code });
      return;
    }
    next(err);
  }
}

export async function listAppointmentTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointmentId = Number(req.params.appointmentId);
    const relations = await appointmentsService.listAppointmentTagRelations(appointmentId);
    if (!relations) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
    }
    res.json(relations);
  } catch (err) {
    next(err);
  }
}

export async function addAppointmentTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const appointmentId = Number(req.params.appointmentId);
    const input = api.appointmentTags.add.input.parse(req.body);
    const relation = await appointmentsService.addAppointmentTag(appointmentId, input.tagId, roleKey);
    if (!relation) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    const appointment = await appointmentsService.getAppointmentDetails(appointmentId);
    await journalService.recordJournalEntry({
      tableName: "appointment",
      recordId: appointmentId,
      op: "tag_add",
      newValue: { tagId: relation.tag.id, tagName: relation.tag.name },
      snapshot: appointment,
      actor: getRequestActor(req),
      triggerKey: "appointment.tag.add",
      messageText: buildTagMessage("hinzugefügt", "appointment", appointment, relation.tag.name, appointmentId),
    });
    res.status(201).json(relation);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (appointmentsService.isAppointmentError(err)) {
      res.status(err.status).json({ code: err.code, message: err.message });
      return;
    }
    next(err);
  }
}

export async function removeAppointmentTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const appointmentId = Number(req.params.appointmentId);
    const tagId = Number(req.params.tagId);
    const input = api.appointmentTags.remove.input.parse(req.body);
    const [appointment, existingRelations] = await Promise.all([
      appointmentsService.getAppointmentDetails(appointmentId),
      appointmentsService.listAppointmentTagRelations(appointmentId),
    ]);
    const removedTag = existingRelations?.find((relation) => relation.tag.id === tagId)?.tag ?? null;
    const result = await appointmentsService.removeAppointmentTag(appointmentId, tagId, input.version, roleKey);
    if (result === null) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    if (removedTag) {
      await journalService.recordJournalEntry({
        tableName: "appointment",
        recordId: appointmentId,
        op: "tag_remove",
        oldValue: { tagId: removedTag.id, tagName: removedTag.name },
        snapshot: appointment,
        actor: getRequestActor(req),
        triggerKey: "appointment.tag.remove",
        messageText: buildTagMessage("entfernt", "appointment", appointment, removedTag.name, appointmentId),
      });
    }
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (appointmentsService.isAppointmentError(err)) {
      res.status(err.status).json({ code: err.code, message: err.message });
      return;
    }
    next(err);
  }
}

export async function cancelAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.appointments.cancel.input.parse(req.body);
    const appointmentId = Number(req.params.id);
    const before = await appointmentsService.getAppointmentDetails(appointmentId);
    const result = await appointmentsService.cancelAppointment(appointmentId, input.version, roleKey);
    if (!result.found) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    const after = await appointmentsService.getAppointmentDetails(appointmentId);
    await journalService.recordJournalEntry({
      tableName: "appointment",
      recordId: appointmentId,
      op: "cancel",
      oldValue: before,
      newValue: after,
      snapshot: after ?? before,
      actor: getRequestActor(req),
      triggerKey: "appointment.cancel",
      messageText: `Termin ${before?.title ?? `#${appointmentId}`} storniert`,
    });
    if (after) {
      await recordAppointmentEmployeeDelta({
        appointmentId,
        beforeEmployees: before?.employees ?? [],
        afterEmployees: after.employees,
        appointmentSnapshot: after,
        actor: getRequestActor(req),
      });
    }
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (appointmentsService.isAppointmentError(err)) {
      res.status(err.status).json({ code: err.code, message: err.message });
      return;
    }
    next(err);
  }
}

export async function parkAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.appointments.park.input.parse(req.body);
    const appointmentId = Number(req.params.id);
    const before = await appointmentsService.getAppointmentDetails(appointmentId);
    const result = await appointmentsService.parkAppointment(appointmentId, input.version, roleKey);
    if (!result.found) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    const after = await appointmentsService.getAppointmentDetails(appointmentId);
    await journalService.recordJournalEntry({
      tableName: "appointment",
      recordId: appointmentId,
      op: "park",
      oldValue: before,
      newValue: after,
      snapshot: after ?? before,
      actor: getRequestActor(req),
      triggerKey: "appointment.park",
      messageText: `Termin ${before?.title ?? `#${appointmentId}`} geparkt`,
    });
    if (after) {
      await recordAppointmentEmployeeDelta({
        appointmentId,
        beforeEmployees: before?.employees ?? [],
        afterEmployees: after.employees,
        appointmentSnapshot: after,
        actor: getRequestActor(req),
      });
    }
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (appointmentsService.isAppointmentError(err)) {
      res.status(err.status).json({ code: err.code, message: err.message });
      return;
    }
    next(err);
  }
}

export async function setAppointmentReklamation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.appointments.reklamation.set.input.parse(req.body);
    const appointmentId = Number(req.params.id);
    const before = await appointmentsService.getAppointmentDetails(appointmentId);
    const result = await appointmentsService.setAppointmentReklamation(appointmentId, input.version, roleKey);
    if (!result.found) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    if (result.kind === "updated") {
      const after = await appointmentsService.getAppointmentDetails(appointmentId);
      await journalService.recordJournalEntry({
        tableName: "appointment",
        recordId: appointmentId,
        op: "tag_add",
        newValue: { tagName: "Reklamation" },
        snapshot: after ?? before,
        actor: getRequestActor(req),
        triggerKey: "appointment.reklamation.set",
        messageText: buildTagMessage("hinzugefügt", "appointment", after ?? before, "Reklamation", appointmentId),
      });
    }
    res.status(200).json({ kind: result.kind, mutationEvents: result.mutationEvents });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (appointmentsService.isAppointmentError(err)) {
      res.status(err.status).json({ code: err.code, message: err.message });
      return;
    }
    next(err);
  }
}

export async function removeAppointmentReklamation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.appointments.reklamation.remove.input.parse(req.body);
    const appointmentId = Number(req.params.id);
    const before = await appointmentsService.getAppointmentDetails(appointmentId);
    const result = await appointmentsService.removeAppointmentReklamation(appointmentId, input.version, roleKey);
    if (!result.found) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    if (result.kind === "updated") {
      const after = await appointmentsService.getAppointmentDetails(appointmentId);
      await journalService.recordJournalEntry({
        tableName: "appointment",
        recordId: appointmentId,
        op: "tag_remove",
        oldValue: { tagName: "Reklamation" },
        snapshot: after ?? before,
        actor: getRequestActor(req),
        triggerKey: "appointment.reklamation.remove",
        messageText: buildTagMessage("entfernt", "appointment", after ?? before, "Reklamation", appointmentId),
      });
    }
    res.status(200).json({ kind: result.kind, mutationEvents: result.mutationEvents });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (appointmentsService.isAppointmentError(err)) {
      res.status(err.status).json({ code: err.code, message: err.message });
      return;
    }
    next(err);
  }
}

export async function removeEmployeeFromAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.appointmentEmployees.remove.input.parse(req.body);
    const appointmentId = Number(req.params.id);
    const employeeId = Number(req.params.employeeId);
    const before = await appointmentsService.getAppointmentDetails(appointmentId);
    const result = await appointmentsService.removeEmployeeFromAppointment(appointmentId, employeeId, input.version, roleKey);
    if (!result.found) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    const after = await appointmentsService.getAppointmentDetails(appointmentId);
    if (after) {
      await recordAppointmentEmployeeDelta({
        appointmentId,
        beforeEmployees: before?.employees ?? [],
        afterEmployees: after.employees,
        appointmentSnapshot: after,
        actor: getRequestActor(req),
      });
    }
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (appointmentsService.isAppointmentError(err)) {
      res.status(err.status).json({ code: err.code, message: err.message });
      return;
    }
    next(err);
  }
}

export async function deleteAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.appointments.delete.input.parse(req.body);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    const appointmentId = Number(req.params.id);
    logDebug(`${logPrefix} delete request appointmentId=${appointmentId}`);
    const before = await appointmentsService.getAppointmentDetails(appointmentId);
    const appointment = await appointmentsService.deleteAppointment(appointmentId, input.version, roleKey);
    if (!appointment) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
    }
    await journalService.recordJournalEntry({
      tableName: "appointment",
      recordId: appointmentId,
      op: "delete",
      oldValue: before ?? appointment,
      snapshot: before ?? appointment,
      actor: getRequestActor(req),
      triggerKey: "appointment.delete",
      messageText: buildDeleteMessage("appointment", before ?? appointment, appointmentId),
    });
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (appointmentsService.isAppointmentError(err)) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function listCalendarAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;
    const employeeIdParam = typeof req.query.employeeId === "string" ? req.query.employeeId : undefined;
    const detailParam = typeof req.query.detail === "string" ? req.query.detail : undefined;
    const includeAppointmentNotesParam = typeof req.query.includeAppointmentNotes === "string"
      ? req.query.includeAppointmentNotes
      : undefined;
    const includeProjectNotesParam = typeof req.query.includeProjectNotes === "string"
      ? req.query.includeProjectNotes
      : undefined;

    if (!fromDate || !toDate) {
      res.status(400).json({ message: "fromDate und toDate sind erforderlich" });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      logWarn(`${logPrefix} list calendar appointments rejected: invalid range ${fromDate}-${toDate}`);
      res.status(400).json({ message: "Ungültiger Datumsbereich" });
      return;
    }
    if (toDate < fromDate) {
      res.status(400).json({ message: "toDate darf nicht vor fromDate liegen" });
      return;
    }

    const employeeId = employeeIdParam ? Number(employeeIdParam) : undefined;
    if (employeeIdParam && Number.isNaN(employeeId)) {
      res.status(400).json({ message: "Ungültige employeeId" });
      return;
    }
    if (detailParam && detailParam !== "compact" && detailParam !== "full") {
      res.status(400).json({ message: "Ungültiger detail-Parameter" });
      return;
    }
    if (includeAppointmentNotesParam && includeAppointmentNotesParam !== "true" && includeAppointmentNotesParam !== "false") {
      res.status(400).json({ message: "Ungültiger includeAppointmentNotes-Parameter" });
      return;
    }
    if (includeProjectNotesParam && includeProjectNotesParam !== "true" && includeProjectNotesParam !== "false") {
      res.status(400).json({ message: "Ungültiger includeProjectNotes-Parameter" });
      return;
    }
    const detail = detailParam === "full" ? "full" : "compact";
    const includeAppointmentNotes = includeAppointmentNotesParam === "true";
    const includeProjectNotes = includeProjectNotesParam === "true";

    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    logDebug(
      `${logPrefix} list calendar appointments request fromDate=${fromDate} toDate=${toDate} detail=${detail} employeeId=${employeeId ?? "n/a"}`,
    );
    const appointments = await appointmentsService.listCalendarAppointments({
      fromDate,
      toDate,
      employeeId,
      detail,
      includeAppointmentNotes,
      includeProjectNotes,
      roleKey,
    });
    res.json(appointments);
  } catch (err) {
    next(err);
  }
}

export async function listCalendarWeekLaneEmployeePreviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;

    if (!fromDate || !toDate) {
      res.status(400).json({ message: "fromDate und toDate sind erforderlich" });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      logWarn(`${logPrefix} list calendar week lane previews rejected: invalid range ${fromDate}-${toDate}`);
      res.status(400).json({ message: "Ungültiger Datumsbereich" });
      return;
    }
    if (toDate < fromDate) {
      res.status(400).json({ message: "toDate darf nicht vor fromDate liegen" });
      return;
    }

    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    const previews = await appointmentsService.listCalendarWeekLaneEmployeePreviews({
      fromDate,
      toDate,
      roleKey,
    });
    res.json(previews);
  } catch (err) {
    next(err);
  }
}

export async function listCalendarBlockedTourWeeks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;

    if (!fromDate || !toDate) {
      res.status(400).json({ message: "fromDate und toDate sind erforderlich" });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      logWarn(`${logPrefix} list calendar blocked tour weeks rejected: invalid range ${fromDate}-${toDate}`);
      res.status(400).json({ message: "Ungültiger Datumsbereich" });
      return;
    }

    if (toDate < fromDate) {
      res.status(400).json({ message: "toDate darf nicht vor fromDate liegen" });
      return;
    }

    const blockedWeeks = await appointmentsService.listCalendarBlockedTourWeeks({ fromDate, toDate });
    res.json(blockedWeeks);
  } catch (err) {
    if (err instanceof tourWeeksService.TourWeeksError) {
      res.status(err.status).json({ code: err.code, message: err.message });
      return;
    }
    next(err);
  }
}

export async function listCalendarTourPostalPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const postalCode = typeof req.query.postalCode === "string" ? req.query.postalCode : undefined;
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;
    const hasFreeAppointments = typeof req.query.hasFreeAppointments === "string"
      ? req.query.hasFreeAppointments === "true"
      : false;

    if (!postalCode || !fromDate || !toDate) {
      res.status(400).json({ message: "postalCode, fromDate und toDate sind erforderlich" });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      logWarn(`${logPrefix} list calendar tour postal plan rejected: invalid range ${fromDate}-${toDate}`);
      res.status(400).json({ message: "Ungültiger Datumsbereich" });
      return;
    }
    if (toDate < fromDate) {
      res.status(400).json({ message: "toDate darf nicht vor fromDate liegen" });
      return;
    }

    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    const plan = await appointmentsService.listCalendarTourPostalPlan({
      postalCode,
      fromDate,
      toDate,
      hasFreeAppointments,
      roleKey,
    });
    res.json(plan);
  } catch (err) {
    next(err);
  }
}
