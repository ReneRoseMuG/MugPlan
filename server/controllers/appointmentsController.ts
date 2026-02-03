import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as appointmentsService from "../services/appointmentsService";
import { handleZodError } from "./validation";

const getIsAdmin = (req: Request) => req.header("x-user-role") === "ADMIN";

export async function getAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const result = await appointmentsService.getAppointmentDetail(id);
    if (!result) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
    }
    res.json(result);
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
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function updateAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.appointments.update.input.parse(req.body);
    const appointment = await appointmentsService.updateAppointment(
      Number(req.params.id),
      input,
      getIsAdmin(req),
    );
    if (!appointment) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
    }
    res.json(appointment);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function deleteAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await appointmentsService.deleteAppointment(Number(req.params.id), getIsAdmin(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
