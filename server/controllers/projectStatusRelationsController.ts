import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as projectStatusService from "../services/projectStatusService";

export async function listProjectStatusRelations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.projectId);
    const statuses = await projectStatusService.listProjectStatusesByProject(projectId);
    res.json(statuses);
  } catch (err) {
    next(err);
  }
}

export async function addProjectStatusRelation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.projectId);
    const input = api.projectStatusRelations.add.input.parse(req.body);
    await projectStatusService.addProjectStatus(projectId, input.statusId);
    res.status(201).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    next(err);
  }
}

export async function removeProjectStatusRelation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.projectId);
    const statusId = Number(req.params.statusId);
    const input = api.projectStatusRelations.remove.input.parse(req.body);
    await projectStatusService.removeProjectStatus(projectId, statusId, input.version);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof projectStatusService.ProjectStatusError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}
