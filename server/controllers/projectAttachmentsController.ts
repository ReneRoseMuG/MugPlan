import type { Request, Response, NextFunction } from "express";
import * as projectAttachmentsService from "../services/projectAttachmentsService";

export async function listProjectAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.projectId);
    const attachments = await projectAttachmentsService.listProjectAttachments(projectId);
    res.json(attachments);
  } catch (err) {
    next(err);
  }
}

export async function deleteProjectAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await projectAttachmentsService.deleteProjectAttachment(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
