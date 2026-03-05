import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  appointments,
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
import type { ProjectScope } from "../services/projectsService";

const berlinFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getBerlinTodayDate(): Date {
  const berlinToday = berlinFormatter.format(new Date());
  return new Date(`${berlinToday}T00:00:00`);
}

function buildScopeCondition(scope: ProjectScope) {
  if (scope === "all") {
    return undefined;
  }

  if (scope === "noAppointments") {
    return sql`not exists (
      select 1
      from ${appointments}
      where ${appointments.projectId} = ${projects.id}
    )`;
  }

  return sql`exists (
    select 1
    from ${appointments}
    where ${appointments.projectId} = ${projects.id}
      and ${gte(appointments.startDate, getBerlinTodayDate())}
  )`;
}

export async function getProjects(
  filter: "active" | "inactive" | "all" = "all",
  statusIds: number[] = [],
  scope: ProjectScope = "upcoming",
): Promise<ProjectListItem[]> {
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
  const scopeCondition = buildScopeCondition(scope);
  if (scopeCondition) {
    conditions.push(scopeCondition);
  }

  const query = conditions.length > 0
    ? db.select().from(projects).where(and(...conditions))
    : db.select().from(projects);

  const rows = await query.orderBy(desc(projects.updatedAt));
  const projectIds = rows.map((row) => row.id);
  if (projectIds.length === 0) return [];

  const noteCountRows = await db
    .select({
      projectId: projectNotes.projectId,
      count: sql<number>`count(*)`,
    })
    .from(projectNotes)
    .where(inArray(projectNotes.projectId, projectIds))
    .groupBy(projectNotes.projectId);

  const notesCountByProjectId = new Map(noteCountRows.map((row) => [row.projectId, Number(row.count)] as const));
  return rows.map((row) => ({ ...row, notesCount: notesCountByProjectId.get(row.id) ?? 0 }));
}

export type ProjectListItem = Project & { notesCount: number };

export async function getProjectsByCustomer(
  customerId: number,
  filter: "active" | "inactive" | "all" = "all",
  statusIds: number[] = [],
  scope: ProjectScope = "upcoming",
): Promise<ProjectListItem[]> {
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
  const scopeCondition = buildScopeCondition(scope);
  if (scopeCondition) {
    conditions.push(scopeCondition);
  }
  const rows = await db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.updatedAt));

  const projectIds = rows.map((row) => row.id);
  if (projectIds.length === 0) return [];

  const noteCountRows = await db
    .select({
      projectId: projectNotes.projectId,
      count: sql<number>`count(*)`,
    })
    .from(projectNotes)
    .where(inArray(projectNotes.projectId, projectIds))
    .groupBy(projectNotes.projectId);

  const notesCountByProjectId = new Map(noteCountRows.map((row) => [row.projectId, Number(row.count)] as const));
  return rows.map((row) => ({ ...row, notesCount: notesCountByProjectId.get(row.id) ?? 0 }));
}

export async function getProject(id: number): Promise<Project | null> {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return project || null;
}

export async function existsProjectByOrderNumber(orderNumber: string): Promise<boolean> {
  const normalizedOrderNumber = orderNumber.trim();
  if (normalizedOrderNumber.length === 0) {
    return false;
  }

  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      sql`${projects.orderNumber} is not null
          and char_length(trim(${projects.orderNumber})) > 0
          and trim(${projects.orderNumber}) = ${normalizedOrderNumber}
          and ${projects.isActive} = true`,
    )
    .limit(1);

  return rows.length > 0;
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

export async function updateProjectWithVersion(
  id: number,
  expectedVersion: number,
  data: UpdateProject,
): Promise<{ kind: "updated"; project: Project } | { kind: "version_conflict" }> {
  const hasOrderNumber = Object.prototype.hasOwnProperty.call(data, "orderNumber");
  const hasAmount = Object.prototype.hasOwnProperty.call(data, "amount");

  const result = await db.execute(sql`
    update project
    set
      name = coalesce(${data.name ?? null}, name),
      order_number = case
        when ${hasOrderNumber ? 1 : 0} = 1 then ${data.orderNumber ?? null}
        else order_number
      end,
      amount = case
        when ${hasAmount ? 1 : 0} = 1 then ${data.amount ?? null}
        else amount
      end,
      customer_id = coalesce(${data.customerId ?? null}, customer_id),
      description_md = ${data.descriptionMd ?? null},
      is_active = coalesce(${data.isActive ?? null}, is_active),
      updated_at = now(),
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);

  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) {
    return { kind: "version_conflict" };
  }

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return { kind: "updated", project };
}

export async function deleteProjectWithVersion(
  id: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "version_conflict" } | { kind: "business_conflict" }> {
  return db.transaction(async (tx) => {
    // Acquire a write lock by touching the versioned row first, so dependent deletes
    // and final delete run against the same validated version snapshot.
    const versionCheck = await tx.execute(sql`
      update project
      set version = version
      where id = ${id}
        and version = ${expectedVersion}
    `);
    const versionCheckAffectedRows = Number(
      (versionCheck as any)?.[0]?.affectedRows ?? (versionCheck as any)?.affectedRows ?? 0,
    );
    if (versionCheckAffectedRows === 0) {
      throw new Error("VERSION_CONFLICT");
    }

    const [existingAppointment] = await tx
      .select({ id: appointments.id })
      .from(appointments)
      .where(eq(appointments.projectId, id))
      .limit(1);
    if (existingAppointment) {
      return { kind: "business_conflict" as const };
    }

    const projectNoteRows = await tx
      .select({ noteId: projectNotes.noteId })
      .from(projectNotes)
      .where(eq(projectNotes.projectId, id));
    const candidateNoteIds = projectNoteRows.map((row) => Number(row.noteId));

    await tx.delete(projectNotes).where(eq(projectNotes.projectId, id));
    if (candidateNoteIds.length > 0) {
      await tx.execute(sql`
        delete from note
        where id in (${sql.join(candidateNoteIds.map((noteId) => sql`${noteId}`), sql`, `)})
          and not exists (
            select 1
            from project_note pn
            where pn.note_id = note.id
          )
          and not exists (
            select 1
            from customer_note cn
            where cn.note_id = note.id
          )
      `);
    }
    await tx.delete(projectAttachments).where(eq(projectAttachments.projectId, id));
    await tx.delete(projectProjectStatus).where(eq(projectProjectStatus.projectId, id));

    const result = await tx.execute(sql`
      delete from project
      where id = ${id}
        and version = ${expectedVersion}
    `);

    const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
    if (affectedRows === 0) {
      throw new Error("VERSION_CONFLICT");
    }
    return { kind: "deleted" as const };
  }).catch((error) => {
    if (error instanceof Error && error.message === "VERSION_CONFLICT") {
      return { kind: "version_conflict" as const };
    }
    throw error;
  });
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
