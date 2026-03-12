import type { Customer, InsertProject, Project, UpdateProject } from "@shared/schema";
import type { InsertProjectOrderItem, ProjectOrderItem, UpdateProjectOrderItem } from "@shared/schema";
import * as projectsRepository from "../repositories/projectsRepository";
import * as customersRepository from "../repositories/customersRepository";
import type { CanonicalRoleKey } from "../settings/registry";
import * as tagRelationsService from "./tagRelationsService";

export class ProjectsError extends Error {
  status: number;
  code:
    | "VERSION_CONFLICT"
    | "BUSINESS_CONFLICT"
    | "NOT_FOUND"
    | "FORBIDDEN"
    | "VALIDATION_ERROR"
    | "INACTIVE_ENTITY_ASSIGNMENT";

  constructor(
    status: number,
    code:
      | "VERSION_CONFLICT"
      | "BUSINESS_CONFLICT"
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "VALIDATION_ERROR"
      | "INACTIVE_ENTITY_ASSIGNMENT",
  ) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export type ProjectScope = "upcoming" | "noAppointments" | "all";
export type ProjectListItem = projectsRepository.ProjectListItem;
export type ProjectBoardListResult = projectsRepository.ProjectBoardListResult;

function requireDispatcherOrAdmin(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "DISPONENT" && roleKey !== "ADMIN") {
    throw new ProjectsError(403, "FORBIDDEN");
  }
}

export async function listProjects(
  filter: "active" | "inactive" | "all" = "all",
  tagIds: number[] = [],
  scope: ProjectScope = "upcoming",
): Promise<ProjectListItem[]> {
  return projectsRepository.getProjects(filter, tagIds, scope);
}

export async function listProjectsPaged(params: {
  filter: "active" | "inactive" | "all";
  tagIds: number[];
  scope: ProjectScope;
  customerId?: number;
  title?: string;
  customerLastName?: string;
  customerNumber?: string;
  orderNumber?: string;
  page: number;
  pageSize: number;
}): Promise<ProjectBoardListResult> {
  return projectsRepository.getProjectsPaged(params);
}

export async function listProjectsByCustomer(
  customerId: number,
  filter: "active" | "inactive" | "all" = "all",
  tagIds: number[] = [],
  scope: ProjectScope = "upcoming",
): Promise<ProjectListItem[]> {
  return projectsRepository.getProjectsByCustomer(customerId, filter, tagIds, scope);
}

export async function getProject(id: number): Promise<projectsRepository.ProjectWithTags | null> {
  return projectsRepository.getProject(id);
}

export async function isOrderNumberAlreadyImported(orderNumber: string): Promise<boolean> {
  return projectsRepository.existsProjectByOrderNumber(orderNumber);
}

export async function getProjectWithCustomer(
  id: number,
): Promise<{ project: projectsRepository.ProjectWithTags; customer: Customer } | null> {
  return projectsRepository.getProjectWithCustomer(id);
}

export async function createProject(data: InsertProject): Promise<Project> {
  const customer = await customersRepository.getCustomer(data.customerId);
  if (!customer) {
    throw new ProjectsError(422, "VALIDATION_ERROR");
  }
  if (!customer.isActive) {
    throw new ProjectsError(409, "INACTIVE_ENTITY_ASSIGNMENT");
  }

  const normalizedProjectName = data.name.trim();
  const normalizedOrderNumber = data.projectOrder?.orderNumber?.trim() ?? data.orderNumber?.trim() ?? "";
  if (normalizedOrderNumber.length === 0) {
    throw new ProjectsError(422, "VALIDATION_ERROR");
  }
  return projectsRepository.createProject({
    ...data,
    name: normalizedProjectName,
    type: data.type ?? 1,
    orderNumber: normalizedOrderNumber,
    projectOrder: {
      ...data.projectOrder,
      orderNumber: normalizedOrderNumber,
      amount: data.projectOrder?.amount ?? data.amount ?? null,
    },
  });
}

export async function updateProject(
  id: number,
  data: UpdateProject & { version: number },
): Promise<Project | null> {
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new ProjectsError(422, "VALIDATION_ERROR");
  }
  let normalizedData = { ...data };
  const shouldValidateCustomer = data.customerId !== undefined;
  const shouldNormalizeName = data.name !== undefined;
  let existingProject: projectsRepository.ProjectWithTags | null = null;

  if (shouldValidateCustomer) {
    existingProject = await projectsRepository.getProject(id);
    if (!existingProject) return null;

    const targetCustomerId = data.customerId ?? existingProject.customerId;
    const targetCustomer = await customersRepository.getCustomer(targetCustomerId);
    if (!targetCustomer) {
      throw new ProjectsError(422, "VALIDATION_ERROR");
    }
    if (!targetCustomer.isActive) {
      throw new ProjectsError(409, "INACTIVE_ENTITY_ASSIGNMENT");
    }
    const changesCustomerAssignment = targetCustomerId !== existingProject.customerId;
    if (changesCustomerAssignment && await projectsRepository.hasAppointmentsForProject(id)) {
      throw new ProjectsError(409, "BUSINESS_CONFLICT");
    }
  }

  if (shouldNormalizeName) {
    normalizedData = {
      ...normalizedData,
      name: data.name?.trim(),
    };
  }

  if (data.orderNumber !== undefined || data.projectOrder?.orderNumber !== undefined) {
    const normalizedOrderNumber = data.projectOrder?.orderNumber?.trim() ?? data.orderNumber?.trim() ?? "";
    if (normalizedOrderNumber.length === 0) {
      throw new ProjectsError(422, "VALIDATION_ERROR");
    }
    normalizedData = {
      ...normalizedData,
      orderNumber: normalizedOrderNumber,
      projectOrder: {
        ...data.projectOrder,
        orderNumber: normalizedOrderNumber,
        amount: data.projectOrder?.amount ?? data.amount ?? undefined,
      },
    };
  }

  const result = await projectsRepository.updateProjectWithVersion(id, data.version, normalizedData);
  if (result.kind === "version_conflict") {
    const exists = await projectsRepository.getProject(id);
    if (!exists) return null;
    throw new ProjectsError(409, "VERSION_CONFLICT");
  }
  return result.project;
}

export async function deleteProject(id: number, expectedVersion: number): Promise<void> {
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new ProjectsError(422, "VALIDATION_ERROR");
  }
  const result = await projectsRepository.deleteProjectWithVersion(id, expectedVersion);
  if (result.kind === "version_conflict") {
    const exists = await projectsRepository.getProject(id);
    if (!exists) {
      throw new ProjectsError(404, "NOT_FOUND");
    }
    throw new ProjectsError(409, "VERSION_CONFLICT");
  }
  if (result.kind === "business_conflict") {
    throw new ProjectsError(409, "BUSINESS_CONFLICT");
  }
}

export async function listProjectTagRelations(projectId: number) {
  const project = await projectsRepository.getProject(projectId);
  if (!project) return null;
  return tagRelationsService.listTagRelations("project", projectId);
}

export async function addProjectTag(
  projectId: number,
  tagId: number,
  roleKey: CanonicalRoleKey,
) {
  requireDispatcherOrAdmin(roleKey);
  const project = await projectsRepository.getProject(projectId);
  if (!project) return null;
  const tag = await tagRelationsService.getTagById(tagId);
  if (!tag) {
    throw new ProjectsError(404, "NOT_FOUND");
  }
  return tagRelationsService.addTagRelation("project", projectId, tagId);
}

export async function removeProjectTag(
  projectId: number,
  tagId: number,
  expectedVersion: number,
  roleKey: CanonicalRoleKey,
) {
  requireDispatcherOrAdmin(roleKey);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new ProjectsError(422, "VALIDATION_ERROR");
  }
  const project = await projectsRepository.getProject(projectId);
  if (!project) return null;
  const result = await tagRelationsService.removeTagRelation("project", projectId, tagId, expectedVersion);
  if (result.kind === "version_conflict") {
    throw new ProjectsError(409, "VERSION_CONFLICT");
  }
  if (result.kind === "not_found") {
    throw new ProjectsError(404, "NOT_FOUND");
  }
  return;
}

export async function listProjectOrderItems(projectId: number): Promise<ProjectOrderItem[]> {
  const project = await projectsRepository.getProject(projectId);
  if (!project) {
    throw new ProjectsError(404, "NOT_FOUND");
  }
  return projectsRepository.listProjectOrderItems(projectId);
}

async function ensureActiveOrderItemReferences(input: {
  productId?: number | null;
  componentId?: number | null;
}) {
  if (input.productId != null) {
    const product = await projectsRepository.getProductById(input.productId);
    if (!product || !product.isActive) {
      throw new ProjectsError(409, "INACTIVE_ENTITY_ASSIGNMENT");
    }
  }

  if (input.componentId != null) {
    const component = await projectsRepository.getComponentById(input.componentId);
    if (!component || !component.isActive) {
      throw new ProjectsError(409, "INACTIVE_ENTITY_ASSIGNMENT");
    }
  }
}

export async function createProjectOrderItem(
  projectId: number,
  input: InsertProjectOrderItem,
): Promise<ProjectOrderItem> {
  if (input.projectId !== projectId || input.orderNumber.trim().length === 0) {
    throw new ProjectsError(422, "VALIDATION_ERROR");
  }
  const project = await projectsRepository.getProject(projectId);
  if (!project?.projectOrder?.orderNumber || project.projectOrder.orderNumber !== input.orderNumber.trim()) {
    throw new ProjectsError(409, "BUSINESS_CONFLICT");
  }
  await ensureActiveOrderItemReferences(input);
  return projectsRepository.createProjectOrderItem({
    ...input,
    orderNumber: input.orderNumber.trim(),
    quantity: input.quantity,
  });
}

export async function updateProjectOrderItem(
  projectId: number,
  itemId: number,
  input: UpdateProjectOrderItem & { version: number },
): Promise<ProjectOrderItem> {
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new ProjectsError(422, "VALIDATION_ERROR");
  }
  await ensureActiveOrderItemReferences(input);
  const result = await projectsRepository.updateProjectOrderItemWithVersion(projectId, itemId, input.version, input);
  if (result.kind === "not_found") {
    throw new ProjectsError(404, "NOT_FOUND");
  }
  if (result.kind === "version_conflict") {
    throw new ProjectsError(409, "VERSION_CONFLICT");
  }
  return result.row;
}

export async function deleteProjectOrderItem(projectId: number, itemId: number, expectedVersion: number): Promise<void> {
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new ProjectsError(422, "VALIDATION_ERROR");
  }
  const result = await projectsRepository.deleteProjectOrderItemWithVersion(projectId, itemId, expectedVersion);
  if (result.kind === "not_found") {
    throw new ProjectsError(404, "NOT_FOUND");
  }
  if (result.kind === "version_conflict") {
    throw new ProjectsError(409, "VERSION_CONFLICT");
  }
}
