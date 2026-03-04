import type { Customer, InsertProject, Project, UpdateProject } from "@shared/schema";
import * as projectsRepository from "../repositories/projectsRepository";
import * as customersRepository from "../repositories/customersRepository";
import { formatProjectStoredName, parseProjectStoredName } from "../lib/project-name-format";

export class ProjectsError extends Error {
  status: number;
  code:
    | "VERSION_CONFLICT"
    | "BUSINESS_CONFLICT"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "INACTIVE_ENTITY_ASSIGNMENT";

  constructor(
    status: number,
    code:
      | "VERSION_CONFLICT"
      | "BUSINESS_CONFLICT"
      | "NOT_FOUND"
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

export async function listProjects(
  filter: "active" | "inactive" | "all" = "all",
  statusIds: number[] = [],
  scope: ProjectScope = "upcoming",
): Promise<ProjectListItem[]> {
  return projectsRepository.getProjects(filter, statusIds, scope);
}

export async function listProjectsByCustomer(
  customerId: number,
  filter: "active" | "inactive" | "all" = "all",
  statusIds: number[] = [],
  scope: ProjectScope = "upcoming",
): Promise<ProjectListItem[]> {
  return projectsRepository.getProjectsByCustomer(customerId, filter, statusIds, scope);
}

export async function getProject(id: number): Promise<Project | null> {
  return projectsRepository.getProject(id);
}

export async function isOrderNumberAlreadyImported(orderNumber: string): Promise<boolean> {
  return projectsRepository.existsProjectByOrderNumber(orderNumber);
}

export async function getProjectWithCustomer(
  id: number,
): Promise<{ project: Project; customer: Customer } | null> {
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

  const isolatedProjectName = parseProjectStoredName(data.name).isolatedProjectName;
  return projectsRepository.createProject({
    ...data,
    name: formatProjectStoredName(customer.customerNumber, isolatedProjectName),
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
  const shouldNormalizeName = data.name !== undefined || data.customerId !== undefined;

  if (shouldNormalizeName) {
    const existing = await projectsRepository.getProject(id);
    if (!existing) return null;

    const targetCustomerId = data.customerId ?? existing.customerId;
    const targetCustomer = await customersRepository.getCustomer(targetCustomerId);
    if (!targetCustomer) {
      throw new ProjectsError(422, "VALIDATION_ERROR");
    }
    if (!targetCustomer.isActive) {
      throw new ProjectsError(409, "INACTIVE_ENTITY_ASSIGNMENT");
    }

    const sourceProjectName = data.name ?? existing.name;
    const isolatedProjectName = parseProjectStoredName(sourceProjectName).isolatedProjectName;
    normalizedData = {
      ...normalizedData,
      name: formatProjectStoredName(targetCustomer.customerNumber, isolatedProjectName),
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
