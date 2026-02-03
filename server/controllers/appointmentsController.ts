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
