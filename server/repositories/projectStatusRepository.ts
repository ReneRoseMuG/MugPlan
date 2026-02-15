import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  projectStatus,
  projectProjectStatus,
  type ProjectStatus,
  type InsertProjectStatus,
  type UpdateProjectStatus,
} from "@shared/schema";

export type ProjectStatusRelationRow = {
  status: ProjectStatus;
  relationVersion: number;
};

export async function getProjectStatuses(filter: "active" | "inactive" | "all" = "active"): Promise<ProjectStatus[]> {
  if (filter === "all") {
    return db
      .select()
      .from(projectStatus)
      .orderBy(asc(projectStatus.sortOrder), asc(projectStatus.title), asc(projectStatus.id));
  }
  const isActive = filter === "active";
  return db
    .select()
    .from(projectStatus)
    .where(eq(projectStatus.isActive, isActive))
    .orderBy(asc(projectStatus.sortOrder), asc(projectStatus.title), asc(projectStatus.id));
}

export async function getProjectStatus(id: number): Promise<ProjectStatus | null> {
  const [status] = await db.select().from(projectStatus).where(eq(projectStatus.id, id));
  return status || null;
}

export async function createProjectStatus(data: InsertProjectStatus): Promise<ProjectStatus> {
  const result = await db.insert(projectStatus).values({
    ...data,
    isActive: true,
    isDefault: false,
  });
  const insertId = (result as any)[0].insertId;
  const [status] = await db.select().from(projectStatus).where(eq(projectStatus.id, insertId));
  return status;
}

export async function updateProjectStatusWithVersion(
  id: number,
  expectedVersion: number,
  data: UpdateProjectStatus,
): Promise<{ kind: "updated"; status: ProjectStatus } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update project_status
    set
      title = coalesce(${data.title ?? null}, title),
      description = ${data.description ?? null},
      color = coalesce(${data.color ?? null}, color),
      sort_order = coalesce(${data.sortOrder ?? null}, sort_order),
      is_active = coalesce(${data.isActive ?? null}, is_active),
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) return { kind: "version_conflict" };
  const [status] = await db.select().from(projectStatus).where(eq(projectStatus.id, id));
  return { kind: "updated", status };
}

export async function toggleProjectStatusActiveWithVersion(
  id: number,
  expectedVersion: number,
  isActive: boolean,
): Promise<{ kind: "updated"; status: ProjectStatus } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update project_status
    set
      is_active = ${isActive},
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) return { kind: "version_conflict" };
  const [status] = await db.select().from(projectStatus).where(eq(projectStatus.id, id));
  return { kind: "updated", status };
}

export async function isProjectStatusInUse(id: number): Promise<boolean> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(projectProjectStatus)
    .where(eq(projectProjectStatus.projectStatusId, id));
  return (result?.count || 0) > 0;
}

export async function deleteProjectStatusWithVersion(
  id: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    delete from project_status
    where id = ${id}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  return affectedRows === 0 ? { kind: "version_conflict" } : { kind: "deleted" };
}

export async function getProjectStatusRelationsByProject(projectId: number): Promise<ProjectStatusRelationRow[]> {
  const result = await db
    .select({ status: projectStatus, relationVersion: projectProjectStatus.version })
    .from(projectProjectStatus)
    .innerJoin(projectStatus, eq(projectProjectStatus.projectStatusId, projectStatus.id))
    .where(eq(projectProjectStatus.projectId, projectId))
    .orderBy(asc(projectStatus.sortOrder), asc(projectStatus.title));
  return result;
}

export async function getProjectStatusesByProjectIds(projectIds: number[]) {
  if (projectIds.length === 0) return [];
  return db
    .select({
      projectId: projectProjectStatus.projectId,
      status: projectStatus,
    })
    .from(projectProjectStatus)
    .innerJoin(projectStatus, eq(projectProjectStatus.projectStatusId, projectStatus.id))
    .where(inArray(projectProjectStatus.projectId, projectIds))
    .orderBy(asc(projectProjectStatus.projectId), asc(projectStatus.sortOrder), asc(projectStatus.title));
}

export async function addProjectStatusWithExpectedVersion(
  projectId: number,
  statusId: number,
  expectedVersion: number,
): Promise<{ kind: "created"; relationVersion: number } | { kind: "version_conflict"; currentVersion: number | null }> {
  const [existing] = await db
    .select({ version: projectProjectStatus.version })
    .from(projectProjectStatus)
    .where(and(eq(projectProjectStatus.projectId, projectId), eq(projectProjectStatus.projectStatusId, statusId)))
    .limit(1);

  if (existing) {
    return { kind: "version_conflict", currentVersion: existing.version };
  }

  if (expectedVersion !== 0) {
    return { kind: "version_conflict", currentVersion: null };
  }

  await db.insert(projectProjectStatus).values({ projectId, projectStatusId: statusId, version: 1 });
  return { kind: "created", relationVersion: 1 };
}

export async function hasProjectStatusRelation(projectId: number, statusId: number): Promise<boolean> {
  const [row] = await db
    .select({ projectId: projectProjectStatus.projectId })
    .from(projectProjectStatus)
    .where(and(eq(projectProjectStatus.projectId, projectId), eq(projectProjectStatus.projectStatusId, statusId)))
    .limit(1);
  return Boolean(row);
}

export async function removeProjectStatusWithVersion(
  projectId: number,
  statusId: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "not_found" } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    delete from project_project_status
    where project_id = ${projectId}
      and project_status_id = ${statusId}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows > 0) return { kind: "deleted" };

  const [existing] = await db
    .select({ version: projectProjectStatus.version })
    .from(projectProjectStatus)
    .where(and(eq(projectProjectStatus.projectId, projectId), eq(projectProjectStatus.projectStatusId, statusId)))
    .limit(1);
  if (!existing) return { kind: "not_found" };
  return { kind: "version_conflict" };
}
