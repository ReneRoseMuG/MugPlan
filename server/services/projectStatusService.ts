import type { InsertProjectStatus, ProjectStatus, UpdateProjectStatus } from "@shared/schema";
import * as projectStatusRepository from "../repositories/projectStatusRepository";

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
  data: UpdateProjectStatus,
): Promise<{ status: ProjectStatus | null; error?: string }> {
  const existing = await projectStatusRepository.getProjectStatus(id);
  if (!existing) {
    return { status: null, error: "Status nicht gefunden" };
  }
  if (existing.isDefault && data.isActive === false) {
    return { status: null, error: "Default-Status kann nicht deaktiviert werden" };
  }
  const status = await projectStatusRepository.updateProjectStatus(id, data);
  return { status };
}

export async function toggleProjectStatusActive(id: number, isActive: boolean): Promise<ProjectStatus | null> {
  const existing = await projectStatusRepository.getProjectStatus(id);
  if (!existing) return null;
  if (existing.isDefault && !isActive) {
    return null;
  }
  return projectStatusRepository.toggleProjectStatusActive(id, isActive);
}

export async function deleteProjectStatus(id: number): Promise<{ success: boolean; error?: string }> {
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
  await projectStatusRepository.deleteProjectStatus(id);
  return { success: true };
}

export async function listProjectStatusesByProject(projectId: number): Promise<ProjectStatus[]> {
  return projectStatusRepository.getProjectStatusesByProject(projectId);
}

export async function addProjectStatus(projectId: number, statusId: number): Promise<void> {
  await projectStatusRepository.addProjectStatus(projectId, statusId);
}

export async function removeProjectStatus(projectId: number, statusId: number): Promise<void> {
  await projectStatusRepository.removeProjectStatus(projectId, statusId);
}

export async function removeProjectStatusesForProject(projectId: number): Promise<void> {
  await projectStatusRepository.removeProjectStatusRelationsForProject(projectId);
}

export async function isProjectStatusInUse(id: number): Promise<boolean> {
  return projectStatusRepository.isProjectStatusInUse(id);
}
