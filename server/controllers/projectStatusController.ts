import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as projectStatusService from "../services/projectStatusService";
import { handleZodError } from "./validation";

export async function listProjectStatuses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activeParam = req.query.active as string | undefined;
    let filter: "active" | "inactive" | "all" = "active";
    if (activeParam === "false") filter = "inactive";
    if (activeParam === "all") filter = "all";
    const statuses = await projectStatusService.listProjectStatuses(filter);
    res.json(statuses);
  } catch (err) {
    next(err);
  }
}

export async function createProjectStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.projectStatus.create.input.parse(req.body);
    const status = await projectStatusService.createProjectStatus(input);
    res.status(201).json(status);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function updateProjectStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const input = api.projectStatus.update.input.parse(req.body);
    const result = await projectStatusService.updateProjectStatus(id, input);
    if (result.error) {
      if (result.error === "Status nicht gefunden") {
        res.status(404).json({ message: result.error });
        return;
      }
      res.status(400).json({ message: result.error });
      return;
    }
    res.json(result.status);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function toggleProjectStatusActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const input = api.projectStatus.toggleActive.input.parse(req.body);

    const existing = await projectStatusService.getProjectStatus(id);
    if (!existing) {
      res.status(404).json({ message: "Projektstatus nicht gefunden" });
      return;
    }
    if (existing.isDefault && !input.isActive) {
      res.status(400).json({ message: "Default-Status kann nicht deaktiviert werden" });
      return;
    }

    const status = await projectStatusService.toggleProjectStatusActive(id, input.isActive);
    if (!status) {
      res.status(404).json({ message: "Projektstatus nicht gefunden" });
      return;
    }
    res.json(status);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function deleteProjectStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const result = await projectStatusService.deleteProjectStatus(id);
    if (!result.success) {
      res.status(400).json({ message: result.error });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
