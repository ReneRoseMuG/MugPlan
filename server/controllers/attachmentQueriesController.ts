import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import * as attachmentQueriesService from "../services/attachmentQueriesService";
import { handleZodError } from "./validation";

export async function listCustomerProjectAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customerId = Number(req.params.customerId);
    if (!Number.isFinite(customerId)) {
      res.status(400).json({ message: "Ungültige customerId" });
      return;
    }
    const input = api.customerAttachmentAggregates.projectAttachmentsByCustomer.input.parse(req.query);
    const result = await attachmentQueriesService.listCustomerProjectAttachmentGroups({
      customerId,
      page: input.page,
      pageSize: input.pageSize,
    });
    res.json({
      ...result,
      page: input.page,
      pageSize: input.pageSize,
    });
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function checkAttachmentDuplicateByOriginalName(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = api.attachmentDuplicates.checkOriginalName.input.parse(req.body);
    const result = await attachmentQueriesService.checkAttachmentDuplicatesByOriginalName(input.originalName);
    res.json(result);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function getAppointmentAttachmentContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointmentId = Number(req.params.appointmentId);
    if (!Number.isFinite(appointmentId)) {
      res.status(400).json({ message: "Ungültige appointmentId" });
      return;
    }
    const result = await attachmentQueriesService.getAppointmentAttachmentContext(appointmentId);
    if (!result) {
      res.status(404).json({ message: "Termin nicht gefunden" });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}
