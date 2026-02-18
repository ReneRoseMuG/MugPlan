import type { InsertProjectStatus, ProjectStatus, UpdateProjectStatus } from "@shared/schema";
import type { CanonicalRoleKey } from "../settings/registry";
import * as projectStatusRepository from "../repositories/projectStatusRepository";
import type { ProjectStatusRelationRow } from "../repositories/projectStatusRepository";

export class ProjectStatusError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "FORBIDDEN" | "BUSINESS_CONFLICT";

  constructor(
    status: number,
    code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "FORBIDDEN" | "BUSINESS_CONFLICT",
  ) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export type ProjectStatusRelationItem = {
  status: ProjectStatus;
  relationVersion: number;
};

function requireAdmin(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "ADMIN") {
    throw new ProjectStatusError(403, "FORBIDDEN");
  }
}

function requireDispatcherOrAdmin(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "DISPONENT" && roleKey !== "ADMIN") {
    throw new ProjectStatusError(403, "FORBIDDEN");
  }
}

export async function listProjectStatuses(
  filter: "active" | "inactive" | "all" = "active",
  roleKey: CanonicalRoleKey,
): Promise<ProjectStatus[]> {
  requireDispatcherOrAdmin(roleKey);
  if (filter !== "active") {
    requireAdmin(roleKey);
  }
  return projectStatusRepository.getProjectStatuses(filter);
}

export async function getProjectStatus(id: number): Promise<ProjectStatus | null> {
  return projectStatusRepository.getProjectStatus(id);
}

export async function createProjectStatus(data: InsertProjectStatus, roleKey: CanonicalRoleKey): Promise<ProjectStatus> {
  requireAdmin(roleKey);
  return projectStatusRepository.createProjectStatus(data);
}

export async function updateProjectStatus(
  id: number,
  data: UpdateProjectStatus & { version: number },
  roleKey: CanonicalRoleKey,
): Promise<{ status: ProjectStatus | null; error?: string }> {
  requireAdmin(roleKey);
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
  roleKey: CanonicalRoleKey,
): Promise<ProjectStatus | null> {
  requireAdmin(roleKey);
  if (!Number.isInteger(version) || version < 1) {
    throw new ProjectStatusError(422, "VALIDATION_ERROR");
  }

  const existing = await projectStatusRepository.getProjectStatus(id);
  if (!existing) return null;
  if (existing.isDefault && !isActive) {
    throw new ProjectStatusError(409, "BUSINESS_CONFLICT");
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
  roleKey: CanonicalRoleKey,
): Promise<{ success: boolean; error?: string }> {
  requireAdmin(roleKey);
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

export async function listProjectStatusesByProject(projectId: number): Promise<ProjectStatusRelationItem[]> {
  const rows = await projectStatusRepository.getProjectStatusRelationsByProject(projectId);
  return rows.map((row: ProjectStatusRelationRow) => ({
    status: row.status,
    relationVersion: row.relationVersion,
  }));
}

export async function addProjectStatus(
  projectId: number,
  statusId: number,
  expectedVersion: number,
  roleKey: CanonicalRoleKey,
): Promise<ProjectStatusRelationItem> {
  requireDispatcherOrAdmin(roleKey);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    throw new ProjectStatusError(422, "VALIDATION_ERROR");
  }
  const status = await projectStatusRepository.getProjectStatus(statusId);
  if (!status) {
    throw new ProjectStatusError(404, "NOT_FOUND");
  }
  if (!status.isActive) {
    throw new ProjectStatusError(409, "BUSINESS_CONFLICT");
  }
  const result = await projectStatusRepository.addProjectStatusWithExpectedVersion(projectId, statusId, expectedVersion);
  if (result.kind === "version_conflict") {
    throw new ProjectStatusError(409, "VERSION_CONFLICT");
  }
  return { status, relationVersion: result.relationVersion };
}

export async function removeProjectStatus(
  projectId: number,
  statusId: number,
  version: number,
  roleKey: CanonicalRoleKey,
): Promise<void> {
  requireDispatcherOrAdmin(roleKey);
  if (!Number.isInteger(version) || version < 1) {
    throw new ProjectStatusError(422, "VALIDATION_ERROR");
  }
  const result = await projectStatusRepository.removeProjectStatusWithVersion(projectId, statusId, version);
  if (result.kind === "not_found") {
    throw new ProjectStatusError(404, "NOT_FOUND");
  }
  if (result.kind === "version_conflict") {
    throw new ProjectStatusError(409, "VERSION_CONFLICT");
  }
}

export async function isProjectStatusInUse(id: number): Promise<boolean> {
  return projectStatusRepository.isProjectStatusInUse(id);
}
