import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as projectsService from "../services/projectsService";
import * as projectNotesService from "../services/projectNotesService";
import * as projectAttachmentsService from "../services/projectAttachmentsService";
import * as appointmentsService from "../services/appointmentsService";
import { getRequestActor } from "../lib/requestActor";
import {
  buildCreateMessage,
  buildDeleteMessage,
  buildTagMessage,
  buildUpdateMessage,
} from "../lib/journalMessages";
import * as journalService from "../services/journalService";

function parseIdList(value: unknown): number[] {
  if (!value) return [];
  const rawValues = Array.isArray(value) ? value : [value];
  const ids = rawValues
    .flatMap((entry) => String(entry).split(","))
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
  return Array.from(new Set(ids));
}

export async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const listInput = api.projects.list.input.parse(req.query);
    const filter = req.query.filter as "active" | "inactive" | "all" | undefined;
    const customerIdParam = req.query.customerId as string | undefined;
    const tagIds = parseIdList(listInput.tagIds);
    const articleProductIds = parseIdList(listInput.articleProductIds);
    const articleComponentIds = parseIdList(listInput.articleComponentIds);
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
        tagIds,
        scope,
        { articleProductIds, articleComponentIds },
      );
      res.json(projects);
      return;
    }

    const projects = await projectsService.listProjects(filter || "all", tagIds, scope, { articleProductIds, articleComponentIds });
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
    const customerId = input.customerId == null ? undefined : Number(input.customerId);

    if (input.customerId != null && Number.isNaN(customerId)) {
      res.status(400).json({ message: "Ungultige customerId" });
      return;
    }

    const projects = await projectsService.listProjectsPaged({
      filter: input.filter || "all",
      tagIds: parseIdList(input.tagIds),
      articleProductIds: parseIdList(input.articleProductIds),
      articleComponentIds: parseIdList(input.articleComponentIds),
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    const result = await projectsService.getProjectWithCustomer(projectId);
    if (!result) {
      res.status(404).json({ message: "Projekt nicht gefunden" });
      return;
    }

    const [projectNotes, projectAttachments, projectAppointments] = await Promise.all([
      projectNotesService.listProjectNotes(projectId),
      projectAttachmentsService.listProjectAttachments(projectId),
      appointmentsService.listProjectAppointments(projectId, "1900-01-01", roleKey),
    ]);

    res.json({
      ...result,
      projectOrder: result.project.projectOrder ?? null,
      tags: result.project.tags ?? [],
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
    await journalService.recordJournalEntry({
      tableName: "project",
      recordId: project.id,
      op: "create",
      snapshot: project,
      newValue: project,
      actor: getRequestActor(req),
      triggerKey: "project.create",
      messageText: buildCreateMessage("project", project, project.id),
    });
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
    const projectId = Number(req.params.id);
    const before = await projectsService.getProject(projectId);
    const project = await projectsService.updateProject(projectId, input);
    if (!project) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    await journalService.recordJournalEntry({
      tableName: "project",
      recordId: project.id,
      op: "update",
      oldValue: before,
      newValue: project,
      snapshot: project,
      actor: getRequestActor(req),
      triggerKey: "project.update",
      messageText: buildUpdateMessage("project", project, project.id),
    });
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
    await journalService.recordJournalEntry({
      tableName: "project",
      recordId: projectId,
      op: "delete",
      oldValue: project,
      snapshot: project,
      actor: getRequestActor(req),
      triggerKey: "project.delete",
      messageText: buildDeleteMessage("project", project, projectId),
    });
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
    await journalService.recordJournalEntry({
      tableName: "project_order_item",
      recordId: row.id,
      recordKey: `${projectId}:${row.id}`,
      op: "create",
      newValue: row,
      snapshot: row,
      contexts: [{ tableName: "project", recordId: projectId, relationRole: "owner" }],
      actor: getRequestActor(req),
      triggerKey: "project.order_item.create",
      messageText: buildCreateMessage("project_order_item", row, row.id, row.orderNumber),
    });
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
    const before = (await projectsService.listProjectOrderItems(projectId)).find((row) => row.id === itemId) ?? null;
    const row = await projectsService.updateProjectOrderItem(projectId, itemId, input);
    await journalService.recordJournalEntry({
      tableName: "project_order_item",
      recordId: row.id,
      recordKey: `${projectId}:${row.id}`,
      op: "update",
      oldValue: before,
      newValue: row,
      snapshot: row,
      contexts: [{ tableName: "project", recordId: projectId, relationRole: "owner" }],
      actor: getRequestActor(req),
      triggerKey: "project.order_item.update",
      messageText: buildUpdateMessage("project_order_item", row, row.id, row.orderNumber),
    });
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
    const before = (await projectsService.listProjectOrderItems(projectId)).find((row) => row.id === itemId) ?? null;
    await projectsService.deleteProjectOrderItem(projectId, itemId, input.version);
    if (before) {
      await journalService.recordJournalEntry({
        tableName: "project_order_item",
        recordId: before.id,
        recordKey: `${projectId}:${before.id}`,
        op: "delete",
        oldValue: before,
        snapshot: before,
        contexts: [{ tableName: "project", recordId: projectId, relationRole: "owner" }],
        actor: getRequestActor(req),
        triggerKey: "project.order_item.delete",
        messageText: buildDeleteMessage("project_order_item", before, before.id, before.orderNumber),
      });
    }
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

export async function listProjectTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = Number(req.params.projectId);
    const relations = await projectsService.listProjectTagRelations(projectId);
    if (!relations) {
      res.status(404).json({ message: "Projekt nicht gefunden" });
      return;
    }
    res.json(relations);
  } catch (err) {
    next(err);
  }
}

export async function addProjectTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const projectId = Number(req.params.projectId);
    const input = api.projectTags.add.input.parse(req.body);
    const relation = await projectsService.addProjectTag(projectId, input.tagId, roleKey);
    if (!relation) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    const project = await projectsService.getProject(projectId);
    await journalService.recordJournalEntry({
      tableName: "project",
      recordId: projectId,
      op: "tag_add",
      newValue: { tagId: relation.tag.id, tagName: relation.tag.name },
      snapshot: project,
      actor: getRequestActor(req),
      triggerKey: "project.tag.add",
      messageText: buildTagMessage("hinzugefügt", "project", project, relation.tag.name, projectId),
    });
    res.status(201).json(relation);
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

export async function removeProjectTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const projectId = Number(req.params.projectId);
    const tagId = Number(req.params.tagId);
    const input = api.projectTags.remove.input.parse(req.body);
    const [project, existingRelations] = await Promise.all([
      projectsService.getProject(projectId),
      projectsService.listProjectTagRelations(projectId),
    ]);
    const removedTag = existingRelations?.find((relation) => relation.tag.id === tagId)?.tag ?? null;
    const result = await projectsService.removeProjectTag(projectId, tagId, input.version, roleKey);
    if (result === null) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    if (removedTag) {
      await journalService.recordJournalEntry({
        tableName: "project",
        recordId: projectId,
        op: "tag_remove",
        oldValue: { tagId: removedTag.id, tagName: removedTag.name },
        snapshot: project,
        actor: getRequestActor(req),
        triggerKey: "project.tag.remove",
        messageText: buildTagMessage("entfernt", "project", project, removedTag.name, projectId),
      });
    }
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

export async function setProjectReklamation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const projectId = Number(req.params.id);
    const input = api.projects.reklamation.set.input.parse(req.body);
    const before = await projectsService.getProject(projectId);
    const result = await projectsService.setProjectReklamation(projectId, input.version, roleKey);
    if (!result.found) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    if (result.kind === "updated") {
      const after = await projectsService.getProject(projectId);
      await journalService.recordJournalEntry({
        tableName: "project",
        recordId: projectId,
        op: "tag_add",
        newValue: { tagName: "Reklamation" },
        snapshot: after ?? before,
        actor: getRequestActor(req),
        triggerKey: "project.reklamation.set",
        messageText: buildTagMessage("hinzugefügt", "project", after ?? before, "Reklamation", projectId),
      });
    }
    res.status(200).json({ kind: result.kind, mutationEvents: result.mutationEvents });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof projectsService.ProjectsError) {
      res.status(err.status).json({ code: err.code, message: err.message });
      return;
    }
    next(err);
  }
}

export async function removeProjectReklamation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = req.userContext?.roleKey;
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const projectId = Number(req.params.id);
    const input = api.projects.reklamation.remove.input.parse(req.body);
    const before = await projectsService.getProject(projectId);
    const result = await projectsService.removeProjectReklamation(projectId, input.version, roleKey);
    if (!result.found) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    if (result.kind === "updated") {
      const after = await projectsService.getProject(projectId);
      await journalService.recordJournalEntry({
        tableName: "project",
        recordId: projectId,
        op: "tag_remove",
        oldValue: { tagName: "Reklamation" },
        snapshot: after ?? before,
        actor: getRequestActor(req),
        triggerKey: "project.reklamation.remove",
        messageText: buildTagMessage("entfernt", "project", after ?? before, "Reklamation", projectId),
      });
    }
    res.status(200).json({ kind: result.kind, mutationEvents: result.mutationEvents });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof projectsService.ProjectsError) {
      res.status(err.status).json({ code: err.code, message: err.message });
      return;
    }
    next(err);
  }
}

export async function replaceProjectOrderItems(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }

    const input = api.projects.orderItems.replace.input.parse(req.body);
    const items = input.items.map((item) => ({ ...item, projectId }));
    const before = await projectsService.listProjectOrderItems(projectId);
    const result = await projectsService.replaceProjectOrderItems(projectId, items);
    const project = await projectsService.getProject(projectId);
    await journalService.recordJournalEntry({
      tableName: "project_order_item",
      recordId: null,
      recordKey: `${projectId}:replace`,
      op: "replace",
      oldValue: before,
      newValue: result,
      snapshot: { projectId, count: result.length },
      contexts: [{ tableName: "project", recordId: projectId, relationRole: "owner" }],
      actor: getRequestActor(req),
      triggerKey: "project.order_item.replace",
      messageText: `Auftragspositionen bei Projekt ${project?.name ?? `#${projectId}`} ersetzt`,
    });
    res.status(200).json(result);
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
