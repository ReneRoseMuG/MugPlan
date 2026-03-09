import { asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  appointmentEmployees,
  appointmentNotes,
  appointments,
  customerAttachments,
  customerNotes,
  customers,
  employeeAttachments,
  employees,
  notes,
  noteTemplates,
  projectAttachments,
  projectNotes,
  projectProjectStatus,
  projects,
  seedRunEntities,
  seedRuns,
  teams,
  tours,
} from "@shared/schema";

export type SeedEntityType =
  | "employee"
  | "customer"
  | "project"
  | "note"
  | "note_template"
  | "appointment"
  | "appointment_mount"
  | "appointment_rekl"
  | "team"
  | "tour"
  | "project_attachment"
  | "customer_attachment"
  | "employee_attachment";

export async function createSeedRun(seedRunId: string, configJson: unknown) {
  await db.insert(seedRuns).values({
    id: seedRunId,
    configJson,
    summaryJson: null,
  });
}

export async function updateSeedRunSummary(seedRunId: string, summaryJson: unknown) {
  await db
    .update(seedRuns)
    .set({ summaryJson })
    .where(eq(seedRuns.id, seedRunId));
}

export async function listSeedRuns() {
  return db
    .select()
    .from(seedRuns)
    .orderBy(asc(seedRuns.createdAt));
}

export async function getSeedRun(seedRunId: string) {
  const [run] = await db.select().from(seedRuns).where(eq(seedRuns.id, seedRunId));
  return run ?? null;
}

export async function addSeedRunEntity(seedRunId: string, entityType: SeedEntityType, entityId: number) {
  await db.insert(seedRunEntities).values({
    seedRunId,
    entityType,
    entityId,
  });
}

export async function addSeedRunEntities(
  seedRunId: string,
  items: Array<{ entityType: SeedEntityType; entityId: number }>,
) {
  if (items.length === 0) return;
  await db.insert(seedRunEntities).values(
    items.map((item) => ({
      seedRunId,
      entityType: item.entityType,
      entityId: item.entityId,
    })),
  );
}

export async function getSeedRunEntities(seedRunId: string) {
  return db
    .select()
    .from(seedRunEntities)
    .where(eq(seedRunEntities.seedRunId, seedRunId));
}

export async function getProjectAttachmentsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(projectAttachments)
    .where(inArray(projectAttachments.id, ids));
}

export async function getCustomerAttachmentsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(customerAttachments)
    .where(inArray(customerAttachments.id, ids));
}

export async function getEmployeeAttachmentsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(employeeAttachments)
    .where(inArray(employeeAttachments.id, ids));
}

export async function purgeSeedRun(seedRunId: string, idsByType: Record<string, number[]>) {
  return db.transaction(async (tx) => {
    const deleteByIds = async (table: any, idColumn: any, ids: number[]) => {
      if (ids.length === 0) return 0;
      const result = await tx.delete(table).where(inArray(idColumn, ids));
      return Number((result as any)[0]?.affectedRows ?? 0);
    };

    const appointmentIds = Array.from(
      new Set([
        ...(idsByType.appointment ?? []),
        ...(idsByType.appointment_mount ?? []),
        ...(idsByType.appointment_rekl ?? []),
      ]),
    );
    const projectIds = idsByType.project ?? [];
    const customerIds = idsByType.customer ?? [];
    const employeeIds = idsByType.employee ?? [];
    const noteIds = idsByType.note ?? [];
    const noteTemplateIds = idsByType.note_template ?? [];
    const teamIds = idsByType.team ?? [];
    const tourIds = idsByType.tour ?? [];
    const projectAttachmentIds = idsByType.project_attachment ?? [];
    const customerAttachmentIds = idsByType.customer_attachment ?? [];
    const employeeAttachmentIds = idsByType.employee_attachment ?? [];

    const attachmentsDeleted =
      (await deleteByIds(projectAttachments, projectAttachments.id, projectAttachmentIds)) +
      (await deleteByIds(customerAttachments, customerAttachments.id, customerAttachmentIds)) +
      (await deleteByIds(employeeAttachments, employeeAttachments.id, employeeAttachmentIds));

    let appointmentEmployeesDeleted = 0;
    if (appointmentIds.length > 0) {
      const result = await tx
        .delete(appointmentEmployees)
        .where(inArray(appointmentEmployees.appointmentId, appointmentIds));
      appointmentEmployeesDeleted = Number((result as any)[0]?.affectedRows ?? 0);
    }

    let projectStatusRelationsDeleted = 0;
    if (projectIds.length > 0) {
      const result = await tx
        .delete(projectProjectStatus)
        .where(inArray(projectProjectStatus.projectId, projectIds));
      projectStatusRelationsDeleted = Number((result as any)[0]?.affectedRows ?? 0);
    }

    let customerNotesDeleted = 0;
    let projectNotesDeleted = 0;
    let appointmentNotesDeleted = 0;
    if (noteIds.length > 0) {
      const [customerNoteResult, projectNoteResult, appointmentNoteResult] = await Promise.all([
        tx.delete(customerNotes).where(inArray(customerNotes.noteId, noteIds)),
        tx.delete(projectNotes).where(inArray(projectNotes.noteId, noteIds)),
        tx.delete(appointmentNotes).where(inArray(appointmentNotes.noteId, noteIds)),
      ]);
      customerNotesDeleted = Number((customerNoteResult as any)[0]?.affectedRows ?? 0);
      projectNotesDeleted = Number((projectNoteResult as any)[0]?.affectedRows ?? 0);
      appointmentNotesDeleted = Number((appointmentNoteResult as any)[0]?.affectedRows ?? 0);
    }

    const appointmentsDeleted = await deleteByIds(appointments, appointments.id, appointmentIds);
    const projectsDeleted = await deleteByIds(projects, projects.id, projectIds);
    const customersDeleted = await deleteByIds(customers, customers.id, customerIds);
    const employeesDeleted = await deleteByIds(employees, employees.id, employeeIds);
    const notesDeleted = await deleteByIds(notes, notes.id, noteIds);
    const noteTemplatesDeleted = await deleteByIds(noteTemplates, noteTemplates.id, noteTemplateIds);
    const teamsDeleted = await deleteByIds(teams, teams.id, teamIds);
    const toursDeleted = await deleteByIds(tours, tours.id, tourIds);

    const mappingDeleteResult = await tx
      .delete(seedRunEntities)
      .where(eq(seedRunEntities.seedRunId, seedRunId));
    const mappingRows = Number((mappingDeleteResult as any)[0]?.affectedRows ?? 0);

    const seedRunDeleteResult = await tx
      .delete(seedRuns)
      .where(eq(seedRuns.id, seedRunId));
    const seedRunsDeleted = Number((seedRunDeleteResult as any)[0]?.affectedRows ?? 0);

    return {
      appointmentsDeleted,
      projectsDeleted,
      customersDeleted,
      employeesDeleted,
      notesDeleted,
      noteTemplatesDeleted,
      teamsDeleted,
      toursDeleted,
      projectStatusRelationsDeleted,
      appointmentEmployeesDeleted,
      customerNotesDeleted,
      projectNotesDeleted,
      appointmentNotesDeleted,
      attachmentsDeleted,
      mappingRows,
      seedRunsDeleted,
    };
  });
}
