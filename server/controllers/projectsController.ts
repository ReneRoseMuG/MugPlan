import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as projectsService from "../services/projectsService";
import { handleZodError } from "./validation";

export async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filter = req.query.filter as "active" | "inactive" | "all" | undefined;
    const customerIdParam = req.query.customerId as string | undefined;
    const statusIds = parseStatusIds(req.query.statusIds);
    if (customerIdParam) {
      const customerId = Number(customerIdParam);
      if (Number.isNaN(customerId)) {
        res.status(400).json({ message: "Ungültige customerId" });
        return;
      }
      const projects = await projectsService.listProjectsByCustomer(customerId, filter || "all", statusIds);
      res.json(projects);
      return;
    }
    const projects = await projectsService.listProjects(filter || "all", statusIds);
    res.json(projects);
  } catch (err) {
    next(err);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await projectsService.getProjectWithCustomer(Number(req.params.id));
    if (!result) {
      res.status(404).json({ message: "Projekt nicht gefunden" });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.projects.create.input.parse(req.body);
    const project = await projectsService.createProject(input);
    res.status(201).json(project);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.projects.update.input.parse(req.body);
    const project = await projectsService.updateProject(Number(req.params.id), input);
    if (!project) {
      res.status(404).json({ message: "Projekt nicht gefunden" });
      return;
    }
    res.json(project);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.id);
    const project = await projectsService.getProject(projectId);
    if (!project) {
      res.status(404).json({ message: "Projekt nicht gefunden" });
      return;
    }
    await projectsService.deleteProject(projectId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function parseStatusIds(value: unknown): number[] {
  if (!value) return [];
  const rawValues = Array.isArray(value) ? value : [value];
  const ids = rawValues
    .flatMap((entry) => String(entry).split(","))
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
  return Array.from(new Set(ids));
}
