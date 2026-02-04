import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  projectStatus,
  projectProjectStatus,
  type ProjectStatus,
  type InsertProjectStatus,
  type UpdateProjectStatus,
} from "@shared/schema";

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

export async function updateProjectStatus(id: number, data: UpdateProjectStatus): Promise<ProjectStatus | null> {
  await db
    .update(projectStatus)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projectStatus.id, id));
  const [status] = await db.select().from(projectStatus).where(eq(projectStatus.id, id));
  return status || null;
}

export async function toggleProjectStatusActive(id: number, isActive: boolean): Promise<ProjectStatus | null> {
  await db
    .update(projectStatus)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(projectStatus.id, id));
  const [status] = await db.select().from(projectStatus).where(eq(projectStatus.id, id));
  return status || null;
}

export async function isProjectStatusInUse(id: number): Promise<boolean> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(projectProjectStatus)
    .where(eq(projectProjectStatus.projectStatusId, id));
  return (result?.count || 0) > 0;
}

export async function deleteProjectStatus(id: number): Promise<void> {
  await db.delete(projectStatus).where(eq(projectStatus.id, id));
}

export async function getProjectStatusesByProject(projectId: number): Promise<ProjectStatus[]> {
  const result = await db
    .select({ status: projectStatus })
    .from(projectProjectStatus)
    .innerJoin(projectStatus, eq(projectProjectStatus.projectStatusId, projectStatus.id))
    .where(eq(projectProjectStatus.projectId, projectId))
    .orderBy(asc(projectStatus.sortOrder), asc(projectStatus.title));
  return result.map((row) => row.status);
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

export async function addProjectStatus(projectId: number, statusId: number): Promise<void> {
  const existing = await db
    .select()
    .from(projectProjectStatus)
    .where(and(eq(projectProjectStatus.projectId, projectId), eq(projectProjectStatus.projectStatusId, statusId)));
  if (existing.length === 0) {
    await db.insert(projectProjectStatus).values({ projectId, projectStatusId: statusId });
  }
}

export async function removeProjectStatus(projectId: number, statusId: number): Promise<void> {
  await db
    .delete(projectProjectStatus)
    .where(and(eq(projectProjectStatus.projectId, projectId), eq(projectProjectStatus.projectStatusId, statusId)));
}

export async function removeProjectStatusRelationsForProject(projectId: number): Promise<void> {
  await db.delete(projectProjectStatus).where(eq(projectProjectStatus.projectId, projectId));
}
