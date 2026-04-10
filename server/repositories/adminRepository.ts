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
  products,
  projectAttachments,
  projectOrderItems,
  projectTags,
  projects,
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
  tags: number;
  projectTags: number;
  customerTags: number;
  employeeTags: number;
  customers: number;
  teams: number;
  tours: number;
  notes: number;
};

export type AttachmentFileRef = {
  filename: string;
  storagePath: string;
};

export async function listAllAttachmentFileRefs(): Promise<AttachmentFileRef[]> {
  const [projectRows, customerRows] = await Promise.all([
    db.select({
      filename: projectAttachments.filename,
      storagePath: projectAttachments.storagePath,
    }).from(projectAttachments),
    db.select({
      filename: customerAttachments.filename,
      storagePath: customerAttachments.storagePath,
    }).from(customerAttachments),
  ]);

  const allRefs = [
    ...projectRows,
    ...customerRows,
  ].filter((row): row is AttachmentFileRef =>
    typeof row.filename === "string" &&
    row.filename.length > 0 &&
    typeof row.storagePath === "string" &&
    row.storagePath.length > 0,
  );

  return Array.from(new Map(allRefs.map((row) => [`${row.filename}::${row.storagePath}`, row])).values());
}

export async function resetDomainData(): Promise<ResetDomainDataCounts> {
  return db.transaction(async (tx) => {
    const deletedAppointments = affectedRows(await tx.delete(appointments));
    const deletedHelpTexts = affectedRows(await tx.delete(helpTexts));
    const deletedUserSettingsValues = affectedRows(await tx.delete(userSettingsValue));
    const deletedBackupLogs = affectedRows(await tx.delete(backupLog));
    const deletedCalendarSyncLogs = affectedRows(await tx.delete(calendarSyncLog));

    const deletedProjectOrderItems = affectedRows(await tx.delete(projectOrderItems));
    const deletedProjectTagLinks = affectedRows(await tx.delete(projectTags));
    const deletedCustomerTagLinks = affectedRows(await tx.delete(customerTags));
    const deletedEmployeeTagLinks = affectedRows(await tx.delete(employeeTags));
    const deletedProjects = affectedRows(await tx.delete(projects));
    const deletedCustomers = affectedRows(await tx.delete(customers));

    const deletedProducts = affectedRows(await tx.delete(products));
    const deletedProductCategories = affectedRows(await tx.delete(productCategories));
    const deletedComponents = affectedRows(await tx.delete(components));
    const deletedComponentCategories = affectedRows(await tx.delete(componentCategories));
    const deletedTags = affectedRows(await tx.delete(tags));

    const deletedNotes = affectedRows(await tx.delete(notes));
    const deletedNoteTemplates = affectedRows(await tx.delete(noteTemplates));
    const deletedTeams = affectedRows(await tx.delete(teams));
    const deletedTours = affectedRows(await tx.delete(tours));

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
      tags: deletedTags,
      projectTags: deletedProjectTagLinks,
      customerTags: deletedCustomerTagLinks,
      employeeTags: deletedEmployeeTagLinks,
      customers: deletedCustomers,
      teams: deletedTeams,
      tours: deletedTours,
      notes: deletedNotes,
    };
  });
}
