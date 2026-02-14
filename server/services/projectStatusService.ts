import type { InsertProjectStatus, ProjectStatus, UpdateProjectStatus } from "@shared/schema";
import * as projectStatusRepository from "../repositories/projectStatusRepository";

export class ProjectStatusError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR";

  constructor(status: number, code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export async function listProjectStatuses(filter: "active" | "inactive" | "all" = "active"): Promise<ProjectStatus[]> {
  return projectStatusRepository.getProjectStatuses(filter);
}

export async function getProjectStatus(id: number): Promise<ProjectStatus | null> {
  return projectStatusRepository.getProjectStatus(id);
}

export async function createProjectStatus(data: InsertProjectStatus): Promise<ProjectStatus> {
  return projectStatusRepository.createProjectStatus(data);
}

export async function updateProjectStatus(
  id: number,
  data: UpdateProjectStatus & { version: number },
): Promise<{ status: ProjectStatus | null; error?: string }> {
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new ProjectStatusError(422, "VALIDATION_ERROR");
  }

  const existing = await projectStatusRepository.getProjectStatus(id);
  if (!existing) {
    return { status: null, error: "Status nicht gefunden" };
  }
  if (existing.isDefault && data.isActive === false) {
    return { status: null, error: "Default-Status kann nicht deaktiviert werden" };
  }
  const result = await projectStatusRepository.updateProjectStatusWithVersion(id, data.version, data);
  if (result.kind === "version_conflict") {
    const exists = await projectStatusRepository.getProjectStatus(id);
    if (!exists) {
      return { status: null, error: "Status nicht gefunden" };
    }
    throw new ProjectStatusError(409, "VERSION_CONFLICT");
  }
  const status = result.status;
  return { status };
}

export async function toggleProjectStatusActive(
  id: number,
  isActive: boolean,
  version: number,
): Promise<ProjectStatus | null> {
  if (!Number.isInteger(version) || version < 1) {
    throw new ProjectStatusError(422, "VALIDATION_ERROR");
  }

  const existing = await projectStatusRepository.getProjectStatus(id);
  if (!existing) return null;
  if (existing.isDefault && !isActive) {
    return null;
  }
  const result = await projectStatusRepository.toggleProjectStatusActiveWithVersion(id, version, isActive);
  if (result.kind === "version_conflict") {
    const exists = await projectStatusRepository.getProjectStatus(id);
    if (!exists) return null;
    throw new ProjectStatusError(409, "VERSION_CONFLICT");
  }
  return result.status;
}

export async function deleteProjectStatus(
  id: number,
  version: number,
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isInteger(version) || version < 1) {
    throw new ProjectStatusError(422, "VALIDATION_ERROR");
  }

  const existing = await projectStatusRepository.getProjectStatus(id);
  if (!existing) {
    return { success: false, error: "Status nicht gefunden" };
  }
  if (existing.isDefault) {
    return { success: false, error: "Default-Status kann nicht gelöscht werden" };
  }
  const inUse = await projectStatusRepository.isProjectStatusInUse(id);
  if (inUse) {
    return { success: false, error: "Status wird von Projekten verwendet" };
  }
  const result = await projectStatusRepository.deleteProjectStatusWithVersion(id, version);
  if (result.kind === "version_conflict") {
    const exists = await projectStatusRepository.getProjectStatus(id);
    if (!exists) {
      return { success: false, error: "Status nicht gefunden" };
    }
    throw new ProjectStatusError(409, "VERSION_CONFLICT");
  }
  return { success: true };
}

export async function listProjectStatusesByProject(projectId: number): Promise<ProjectStatus[]> {
  return projectStatusRepository.getProjectStatusesByProject(projectId);
}

export async function addProjectStatus(projectId: number, statusId: number): Promise<void> {
  await projectStatusRepository.addProjectStatus(projectId, statusId);
}

export async function removeProjectStatus(projectId: number, statusId: number, version: number): Promise<void> {
  if (!Number.isInteger(version) || version < 1) {
    throw new ProjectStatusError(422, "VALIDATION_ERROR");
  }
  const result = await projectStatusRepository.removeProjectStatusWithVersion(projectId, statusId, version);
  if (result.kind === "version_conflict") {
    const relationExists = await projectStatusRepository.hasProjectStatusRelation(projectId, statusId);
    if (!relationExists) {
      throw new ProjectStatusError(404, "NOT_FOUND");
    }
    throw new ProjectStatusError(409, "VERSION_CONFLICT");
  }
}

export async function isProjectStatusInUse(id: number): Promise<boolean> {
  return projectStatusRepository.isProjectStatusInUse(id);
}
