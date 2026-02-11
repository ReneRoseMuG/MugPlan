import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as appointmentsService from "../services/appointmentsService";
import { handleZodError } from "./validation";

const logPrefix = "[appointments-controller]";

function isAdminRequest(req: Request) {
  const role = req.header("x-user-role");
  return role?.toUpperCase() === "ADMIN";
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
    if (!input.projectId) {
      console.log(`${logPrefix} create rejected: project missing`);
      res.status(400).json({ message: "Projekt ist erforderlich" });
      return;
    }
    const appointment = await appointmentsService.createAppointment(input);
    res.status(201).json(appointment);
  } catch (err) {
    if (handleZodError(err, res)) return;
    if (appointmentsService.isAppointmentError(err)) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function updateAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.appointments.update.input.parse(req.body);
    if (!input.projectId) {
      console.log(`${logPrefix} update rejected: project missing`);
      res.status(400).json({ message: "Projekt ist erforderlich" });
      return;
    }
    const appointmentId = Number(req.params.id);
    const isAdmin = isAdminRequest(req);
    const appointment = await appointmentsService.updateAppointment(appointmentId, input, isAdmin);
    if (!appointment) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
    }
    res.json(appointment);
  } catch (err) {
    if (handleZodError(err, res)) return;
    if (appointmentsService.isAppointmentError(err)) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function listProjectAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.projectId);
    if (Number.isNaN(projectId)) {
      res.status(400).json({ message: "UngÃ¼ltige projectId" });
      return;
    }
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      console.log(`${logPrefix} list project appointments rejected: invalid fromDate=${fromDate}`);
      res.status(400).json({ message: "UngÃ¼ltiges fromDate" });
      return;
    }
    const isAdmin = isAdminRequest(req);
    console.log(`${logPrefix} list project appointments request projectId=${projectId} fromDate=${fromDate ?? "n/a"}`);
    const appointments = await appointmentsService.listProjectAppointments(projectId, fromDate, isAdmin);
    res.json(appointments);
  } catch (err) {
    next(err);
  }
}

export async function deleteAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointmentId = Number(req.params.id);
    const isAdmin = isAdminRequest(req);
    console.log(`${logPrefix} delete request appointmentId=${appointmentId}`);
    const appointment = await appointmentsService.deleteAppointment(appointmentId, isAdmin);
    if (!appointment) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    if (appointmentsService.isAppointmentError(err)) {
      res.status(err.status).json({ message: err.message });
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
      console.log(`${logPrefix} list calendar appointments rejected: invalid range ${fromDate}-${toDate}`);
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
    const detail = detailParam === "full" ? "full" : "compact";

    const isAdmin = isAdminRequest(req);
    console.log(
      `${logPrefix} list calendar appointments request fromDate=${fromDate} toDate=${toDate} detail=${detail} employeeId=${employeeId ?? "n/a"}`,
    );
    const appointments = await appointmentsService.listCalendarAppointments({
      fromDate,
      toDate,
      employeeId,
      detail,
      isAdmin,
    });
    res.json(appointments);
  } catch (err) {
    next(err);
  }
}

