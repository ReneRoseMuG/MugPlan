import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as projectsService from "../services/projectsService";
import * as projectStatusService from "../services/projectStatusService";
import * as projectNotesService from "../services/projectNotesService";
import * as projectAttachmentsService from "../services/projectAttachmentsService";
import * as appointmentsService from "../services/appointmentsService";

export async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const listInput = api.projects.list.input.parse(req.query);
    const filter = req.query.filter as "active" | "inactive" | "all" | undefined;
    const customerIdParam = req.query.customerId as string | undefined;
    const statusIds = parseStatusIds(req.query.statusIds);
    const scope = listInput.scope;

    if (customerIdParam) {
      const customerId = Number(customerIdParam);
      if (Number.isNaN(customerId)) {
        res.status(400).json({ message: "Ungultige customerId" });
        return;
      }
      const projects = await projectsService.listProjectsByCustomer(
        customerId,
        filter || "all",
        statusIds,
        scope,
      );
      res.json(projects);
      return;
    }

    const projects = await projectsService.listProjects(filter || "all", statusIds, scope);
    res.json(projects);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    next(err);
  }
}

export async function listProjectsPaged(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.projects.pagedList.input.parse(req.query);
    const statusIds = parseStatusIds(input.statusIds);
    const customerId = input.customerId == null ? undefined : Number(input.customerId);

    if (input.customerId != null && Number.isNaN(customerId)) {
      res.status(400).json({ message: "Ungultige customerId" });
      return;
    }

    const projects = await projectsService.listProjectsPaged({
      filter: input.filter || "all",
      statusIds,
      scope: input.scope,
      customerId,
      title: input.title,
      customerLastName: input.customerLastName,
      customerNumber: input.customerNumber,
      orderNumber: input.orderNumber,
      page: input.page,
      pageSize: input.pageSize,
    });

    res.json(projects);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    next(err);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.id);
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const result = await projectsService.getProjectWithCustomer(projectId);
    if (!result) {
      res.status(404).json({ message: "Projekt nicht gefunden" });
      return;
    }

    const [projectStatuses, projectNotes, projectAttachments, projectAppointments] = await Promise.all([
      projectStatusService.listProjectStatusesByProject(projectId),
      projectNotesService.listProjectNotes(projectId),
      projectAttachmentsService.listProjectAttachments(projectId),
      appointmentsService.listProjectAppointments(projectId, "1900-01-01", roleKey),
    ]);

    res.json({
      ...result,
      projectOrder: result.project.projectOrder ?? null,
      projectStatuses,
      projectNotes,
      projectAttachments,
      projectAppointments,
    });
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
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof projectsService.ProjectsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.projects.update.input.parse(req.body);
    const project = await projectsService.updateProject(Number(req.params.id), input);
    if (!project) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    res.json(project);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof projectsService.ProjectsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.projects.delete.input.parse(req.body);
    const projectId = Number(req.params.id);
    const project = await projectsService.getProject(projectId);
    if (!project) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    await projectsService.deleteProject(projectId, input.version);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof projectsService.ProjectsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function listProjectOrderItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.id);
    const rows = await projectsService.listProjectOrderItems(projectId);
    res.json(rows);
  } catch (err) {
    if (err instanceof projectsService.ProjectsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function createProjectOrderItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.id);
    const input = api.projects.orderItems.create.input.parse(req.body);
    const row = await projectsService.createProjectOrderItem(projectId, input);
    res.status(201).json(row);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof projectsService.ProjectsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function updateProjectOrderItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const input = api.projects.orderItems.update.input.parse(req.body);
    const row = await projectsService.updateProjectOrderItem(projectId, itemId, input);
    res.json(row);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof projectsService.ProjectsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function deleteProjectOrderItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const input = api.projects.orderItems.delete.input.parse(req.body);
    await projectsService.deleteProjectOrderItem(projectId, itemId, input.version);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof projectsService.ProjectsError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
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
