import { sql } from "drizzle-orm";
import {
  customerAttachments,
  customers,
  employeeAttachments,
  employees,
  helpTexts,
  noteTemplates,
  notes,
  projectAttachments,
  projectStatus,
  projects,
  seedRunEntities,
  seedRuns,
  teams,
  tours,
  userSettingsValue,
} from "@shared/schema";
import { db } from "../db";

function affectedRows(result: unknown): number {
  return Number((result as any)?.[0]?.affectedRows ?? 0);
}

export type ResetDomainDataCounts = {
  noteTemplates: number;
  helpTexts: number;
  userSettingsValues: number;
  projects: number;
  customers: number;
  employees: number;
  projectStatuses: number;
  teams: number;
  tours: number;
  notes: number;
  seedRuns: number;
  seedRunEntities: number;
};

export async function listAllAttachmentStoragePaths(): Promise<string[]> {
  const [projectRows, customerRows, employeeRows] = await Promise.all([
    db.select({ storagePath: projectAttachments.storagePath }).from(projectAttachments),
    db.select({ storagePath: customerAttachments.storagePath }).from(customerAttachments),
    db.select({ storagePath: employeeAttachments.storagePath }).from(employeeAttachments),
  ]);

  const allPaths = [
    ...projectRows.map((row) => row.storagePath),
    ...customerRows.map((row) => row.storagePath),
    ...employeeRows.map((row) => row.storagePath),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return Array.from(new Set(allPaths));
}

export async function resetDomainData(): Promise<ResetDomainDataCounts> {
  return db.transaction(async (tx) => {
    const [seedRunEntityCountRow] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(seedRunEntities);
    const seedRunEntitiesCount = Number(seedRunEntityCountRow?.count ?? 0);

    const deletedNoteTemplates = affectedRows(await tx.delete(noteTemplates));
    const deletedHelpTexts = affectedRows(await tx.delete(helpTexts));
    const deletedUserSettingsValues = affectedRows(await tx.delete(userSettingsValue));

    // Root delete strategy: deleting projects cascades appointments, project attachments,
    // project notes, and project-status join rows. Customers follow after project (FK restrict).
    const deletedProjects = affectedRows(await tx.delete(projects));
    const deletedCustomers = affectedRows(await tx.delete(customers));
    const deletedEmployees = affectedRows(await tx.delete(employees));

    const deletedProjectStatuses = affectedRows(await tx.delete(projectStatus));
    const deletedTeams = affectedRows(await tx.delete(teams));
    const deletedTours = affectedRows(await tx.delete(tours));
    const deletedNotes = affectedRows(await tx.delete(notes));

    const deletedSeedRuns = affectedRows(await tx.delete(seedRuns));

    return {
      noteTemplates: deletedNoteTemplates,
      helpTexts: deletedHelpTexts,
      userSettingsValues: deletedUserSettingsValues,
      projects: deletedProjects,
      customers: deletedCustomers,
      employees: deletedEmployees,
      projectStatuses: deletedProjectStatuses,
      teams: deletedTeams,
      tours: deletedTours,
      notes: deletedNotes,
      seedRuns: deletedSeedRuns,
      seedRunEntities: seedRunEntitiesCount,
    };
  });
}
