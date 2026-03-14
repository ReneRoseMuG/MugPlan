import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as appointmentsService from "../services/appointmentsService";
import { handleZodError } from "./validation";
import { logDebug, logWarn } from "../lib/logger";

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
    const appointment = await appointmentsService.createAppointment(input);
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
      if (err.availabilityConflicts) {
        payload.availabilityConflicts = err.availabilityConflicts;
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
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const appointmentId = Number(req.params.id);
    const appointment = await appointmentsService.updateAppointment(appointmentId, input, roleKey);
    if (!appointment) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
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
      if (err.availabilityConflicts) {
        payload.availabilityConflicts = err.availabilityConflicts;
      }
      res.status(err.status).json(payload);
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
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const appointmentId = Number(req.params.id);
    const appointment = await appointmentsService.setAppointmentDisplayMode(appointmentId, input, roleKey);
    if (!appointment) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
    }
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
      res.status(400).json({ message: "Ungueltige projectId" });
      return;
    }

    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      logWarn(`${logPrefix} list project appointments rejected: invalid fromDate=${fromDate}`);
      res.status(400).json({ message: "Ungueltiges fromDate" });
      return;
    }

    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
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
      res.status(400).json({ message: "Ungueltige tourId" });
      return;
    }

    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      logWarn(`${logPrefix} list tour appointments rejected: invalid fromDate=${fromDate}`);
      res.status(400).json({ message: "Ungueltiges fromDate" });
      return;
    }

    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
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
      res.status(400).json({ message: "Ungueltige tourId" });
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
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
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
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const appointmentId = Number(req.params.appointmentId);
    const input = api.appointmentTags.add.input.parse(req.body);
    const relation = await appointmentsService.addAppointmentTag(appointmentId, input.tagId, roleKey);
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
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const appointmentId = Number(req.params.appointmentId);
    const tagId = Number(req.params.tagId);
    const input = api.appointmentTags.remove.input.parse(req.body);
    const result = await appointmentsService.removeAppointmentTag(appointmentId, tagId, input.version, roleKey);
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
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const appointmentId = Number(req.params.id);
    logDebug(`${logPrefix} delete request appointmentId=${appointmentId}`);
    const appointment = await appointmentsService.deleteAppointment(appointmentId, input.version, roleKey);
    if (!appointment) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
    }
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

    if (!fromDate || !toDate) {
      res.status(400).json({ message: "fromDate und toDate sind erforderlich" });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      logWarn(`${logPrefix} list calendar appointments rejected: invalid range ${fromDate}-${toDate}`);
      res.status(400).json({ message: "Ungueltiger Datumsbereich" });
      return;
    }
    if (toDate < fromDate) {
      res.status(400).json({ message: "toDate darf nicht vor fromDate liegen" });
      return;
    }

    const employeeId = employeeIdParam ? Number(employeeIdParam) : undefined;
    if (employeeIdParam && Number.isNaN(employeeId)) {
      res.status(400).json({ message: "Ungueltige employeeId" });
      return;
    }
    if (detailParam && detailParam !== "compact" && detailParam !== "full") {
      res.status(400).json({ message: "Ungueltiger detail-Parameter" });
      return;
    }
    const detail = detailParam === "full" ? "full" : "compact";

    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
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
      roleKey,
    });
    res.json(appointments);
  } catch (err) {
    next(err);
  }
}
