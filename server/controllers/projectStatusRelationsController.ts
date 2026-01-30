import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as projectStatusService from "../services/projectStatusService";
import { handleZodError } from "./validation";

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
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function removeProjectStatusRelation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.projectId);
    const statusId = Number(req.params.statusId);
    await projectStatusService.removeProjectStatus(projectId, statusId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
