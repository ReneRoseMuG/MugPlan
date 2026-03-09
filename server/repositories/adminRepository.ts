import { sql } from "drizzle-orm";
import {
  appointments,
  backupLog,
  calendarSyncLog,
  componentCategories,
  components,
  customerAttachments,
  customerTags,
  customers,
  employeeTags,
  helpTexts,
  noteTemplates,
  notes,
  productCategories,
  productComponent,
  products,
  projectAttachments,
  projectOrderItems,
  projectStatus,
  projectTags,
  projects,
  seedRunEntities,
  seedRuns,
  tags,
  teams,
  tours,
  userSettingsValue,
} from "@shared/schema";
import { db } from "../db";

function affectedRows(result: unknown): number {
  return Number((result as any)?.[0]?.affectedRows ?? 0);
}

export type ResetDomainDataCounts = {
  appointments: number;
  noteTemplates: number;
  helpTexts: number;
  userSettingsValues: number;
  backupLogs: number;
  calendarSyncLogs: number;
  projects: number;
  projectOrderItems: number;
  products: number;
  productCategories: number;
  components: number;
  componentCategories: number;
  productComponentLinks: number;
  tags: number;
  projectTags: number;
  customerTags: number;
  employeeTags: number;
  customers: number;
  projectStatuses: number;
  teams: number;
  tours: number;
  notes: number;
  seedRuns: number;
  seedRunEntities: number;
};

export async function listAllAttachmentStoragePaths(): Promise<string[]> {
  const [projectRows, customerRows] = await Promise.all([
    db.select({ storagePath: projectAttachments.storagePath }).from(projectAttachments),
    db.select({ storagePath: customerAttachments.storagePath }).from(customerAttachments),
  ]);

  const allPaths = [
    ...projectRows.map((row) => row.storagePath),
    ...customerRows.map((row) => row.storagePath),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return Array.from(new Set(allPaths));
}

export async function resetDomainData(): Promise<ResetDomainDataCounts> {
  return db.transaction(async (tx) => {
    const [seedRunEntityCountRow] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(seedRunEntities);
    const seedRunEntitiesCount = Number(seedRunEntityCountRow?.count ?? 0);

    const deletedAppointments = affectedRows(await tx.delete(appointments));
    const deletedHelpTexts = affectedRows(await tx.delete(helpTexts));
    const deletedUserSettingsValues = affectedRows(await tx.delete(userSettingsValue));
    const deletedBackupLogs = affectedRows(await tx.delete(backupLog));
    const deletedCalendarSyncLogs = affectedRows(await tx.delete(calendarSyncLog));

    const deletedProjectOrderItems = affectedRows(await tx.delete(projectOrderItems));
    const deletedProjectTagLinks = affectedRows(await tx.delete(projectTags));
    const deletedCustomerTagLinks = affectedRows(await tx.delete(customerTags));
    const deletedEmployeeTagLinks = affectedRows(await tx.delete(employeeTags));
    const deletedProductComponentLinks = affectedRows(await tx.delete(productComponent));

    const deletedProjects = affectedRows(await tx.delete(projects));
    const deletedCustomers = affectedRows(await tx.delete(customers));

    const deletedProducts = affectedRows(await tx.delete(products));
    const deletedProductCategories = affectedRows(await tx.delete(productCategories));
    const deletedComponents = affectedRows(await tx.delete(components));
    const deletedComponentCategories = affectedRows(await tx.delete(componentCategories));
    const deletedTags = affectedRows(await tx.delete(tags));

    const deletedNotes = affectedRows(await tx.delete(notes));
    const deletedNoteTemplates = affectedRows(await tx.delete(noteTemplates));
    const deletedProjectStatuses = affectedRows(await tx.delete(projectStatus));
    const deletedTeams = affectedRows(await tx.delete(teams));
    const deletedTours = affectedRows(await tx.delete(tours));

    const deletedSeedRuns = affectedRows(await tx.delete(seedRuns));

    return {
      appointments: deletedAppointments,
      noteTemplates: deletedNoteTemplates,
      helpTexts: deletedHelpTexts,
      userSettingsValues: deletedUserSettingsValues,
      backupLogs: deletedBackupLogs,
      calendarSyncLogs: deletedCalendarSyncLogs,
      projects: deletedProjects,
      projectOrderItems: deletedProjectOrderItems,
      products: deletedProducts,
      productCategories: deletedProductCategories,
      components: deletedComponents,
      componentCategories: deletedComponentCategories,
      productComponentLinks: deletedProductComponentLinks,
      tags: deletedTags,
      projectTags: deletedProjectTagLinks,
      customerTags: deletedCustomerTagLinks,
      employeeTags: deletedEmployeeTagLinks,
      customers: deletedCustomers,
      projectStatuses: deletedProjectStatuses,
      teams: deletedTeams,
      tours: deletedTours,
      notes: deletedNotes,
      seedRuns: deletedSeedRuns,
      seedRunEntities: seedRunEntitiesCount,
    };
  });
}
