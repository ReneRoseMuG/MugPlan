import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  customers,
  projectAttachments,
  projectNotes,
  projectProjectStatus,
  projects,
  type Project,
  type ProjectAttachment,
  type InsertProject,
  type UpdateProject,
  type InsertProjectAttachment,
} from "@shared/schema";

export async function getProjects(
  filter: "active" | "inactive" | "all" = "all",
  statusIds: number[] = [],
): Promise<Project[]> {
  const conditions = [];
  if (filter === "active") {
    conditions.push(eq(projects.isActive, true));
  }
  if (filter === "inactive") {
    conditions.push(eq(projects.isActive, false));
  }
  if (statusIds.length > 0) {
    const statusIdList = sql.join(statusIds.map((id) => sql`${id}`), sql`, `);
    conditions.push(sql`exists (
      select 1
      from ${projectProjectStatus}
      where ${projectProjectStatus.projectId} = ${projects.id}
        and ${projectProjectStatus.projectStatusId} in (${statusIdList})
    )`);
  }

  const query = conditions.length > 0
    ? db.select().from(projects).where(and(...conditions))
    : db.select().from(projects);

  return query.orderBy(desc(projects.updatedAt));
}

export async function getProjectsByCustomer(
  customerId: number,
  filter: "active" | "inactive" | "all" = "all",
  statusIds: number[] = [],
): Promise<Project[]> {
  const conditions = [eq(projects.customerId, customerId)];
  if (filter === "active") {
    conditions.push(eq(projects.isActive, true));
  }
  if (filter === "inactive") {
    conditions.push(eq(projects.isActive, false));
  }
  if (statusIds.length > 0) {
    const statusIdList = sql.join(statusIds.map((id) => sql`${id}`), sql`, `);
    conditions.push(sql`exists (
      select 1
      from ${projectProjectStatus}
      where ${projectProjectStatus.projectId} = ${projects.id}
        and ${projectProjectStatus.projectStatusId} in (${statusIdList})
    )`);
  }
  return db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.updatedAt));
}

export async function getProject(id: number): Promise<Project | null> {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return project || null;
}

export async function getProjectWithCustomer(
  id: number,
): Promise<{ project: Project; customer: typeof customers.$inferSelect } | null> {
  const [result] = await db
    .select({ project: projects, customer: customers })
    .from(projects)
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .where(eq(projects.id, id));
  return result || null;
}

export async function createProject(data: InsertProject): Promise<Project> {
  const result = await db.insert(projects).values(data);
  const insertId = (result as any)[0].insertId;
  const [project] = await db.select().from(projects).where(eq(projects.id, insertId));
  return project;
}

export async function updateProject(id: number, data: UpdateProject): Promise<Project | null> {
  await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, id));
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return project || null;
}

export async function deleteProject(id: number): Promise<void> {
  await db.delete(projectNotes).where(eq(projectNotes.projectId, id));
  await db.delete(projectAttachments).where(eq(projectAttachments.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));
}

export async function getProjectAttachments(projectId: number): Promise<ProjectAttachment[]> {
  return db
    .select()
    .from(projectAttachments)
    .where(eq(projectAttachments.projectId, projectId))
    .orderBy(desc(projectAttachments.createdAt));
}

export async function getProjectAttachmentById(id: number): Promise<ProjectAttachment | null> {
  const [attachment] = await db
    .select()
    .from(projectAttachments)
    .where(eq(projectAttachments.id, id));
  return attachment ?? null;
}

export async function createProjectAttachment(data: InsertProjectAttachment): Promise<ProjectAttachment> {
  const result = await db.insert(projectAttachments).values(data);
  const insertId = (result as any)[0].insertId;
  const [attachment] = await db
    .select()
    .from(projectAttachments)
    .where(eq(projectAttachments.id, insertId));
  return attachment;
}

export async function deleteProjectAttachment(id: number): Promise<void> {
  await db.delete(projectAttachments).where(eq(projectAttachments.id, id));
}
