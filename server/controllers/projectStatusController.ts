import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as projectStatusService from "../services/projectStatusService";

export async function listProjectStatuses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userContext = req.userContext;
    if (!userContext) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const activeParam = req.query.active as string | undefined;
    let filter: "active" | "inactive" | "all" = "active";
    if (activeParam === "false") filter = "inactive";
    if (activeParam === "all") filter = "all";
    const statuses = await projectStatusService.listProjectStatuses(filter, userContext.roleKey);
    res.json(statuses);
  } catch (err) {
    if (err instanceof projectStatusService.ProjectStatusError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function createProjectStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userContext = req.userContext;
    if (!userContext) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.projectStatus.create.input.parse(req.body);
    const status = await projectStatusService.createProjectStatus(input, userContext.roleKey);
    res.status(201).json(status);
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

export async function updateProjectStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const userContext = req.userContext;
    if (!userContext) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.projectStatus.update.input.parse(req.body);
    const result = await projectStatusService.updateProjectStatus(id, input, userContext.roleKey);
    if (result.error) {
      if (result.error === "Status nicht gefunden") {
        res.status(404).json({ code: "NOT_FOUND" });
        return;
      }
      res.status(409).json({ code: "BUSINESS_CONFLICT" });
      return;
    }
    res.json(result.status);
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

export async function toggleProjectStatusActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const userContext = req.userContext;
    if (!userContext) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.projectStatus.toggleActive.input.parse(req.body);

    const status = await projectStatusService.toggleProjectStatusActive(id, input.isActive, input.version, userContext.roleKey);
    if (!status) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    res.json(status);
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

export async function deleteProjectStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userContext = req.userContext;
    if (!userContext) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const input = api.projectStatus.delete.input.parse(req.body);
    const id = Number(req.params.id);
    const result = await projectStatusService.deleteProjectStatus(id, input.version, userContext.roleKey);
    if (!result.success) {
      if (result.error === "Status nicht gefunden") {
        res.status(404).json({ code: "NOT_FOUND" });
        return;
      }
      res.status(409).json({ code: "BUSINESS_CONFLICT" });
      return;
    }
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
