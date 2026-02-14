import type { Customer, InsertProject, Project, UpdateProject } from "@shared/schema";
import * as projectsRepository from "../repositories/projectsRepository";

export class ProjectsError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR";

  constructor(status: number, code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export type ProjectScope = "upcoming" | "noAppointments" | "all";

export async function listProjects(
  filter: "active" | "inactive" | "all" = "all",
  statusIds: number[] = [],
  scope: ProjectScope = "upcoming",
): Promise<Project[]> {
  return projectsRepository.getProjects(filter, statusIds, scope);
}

export async function listProjectsByCustomer(
  customerId: number,
  filter: "active" | "inactive" | "all" = "all",
  statusIds: number[] = [],
  scope: ProjectScope = "upcoming",
): Promise<Project[]> {
  return projectsRepository.getProjectsByCustomer(customerId, filter, statusIds, scope);
}

export async function getProject(id: number): Promise<Project | null> {
  return projectsRepository.getProject(id);
}

export async function getProjectWithCustomer(
  id: number,
): Promise<{ project: Project; customer: Customer } | null> {
  return projectsRepository.getProjectWithCustomer(id);
}

export async function createProject(data: InsertProject): Promise<Project> {
  return projectsRepository.createProject(data);
}

export async function updateProject(
  id: number,
  data: UpdateProject & { version: number },
): Promise<Project | null> {
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new ProjectsError(422, "VALIDATION_ERROR");
  }
  const result = await projectsRepository.updateProjectWithVersion(id, data.version, data);
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
}
