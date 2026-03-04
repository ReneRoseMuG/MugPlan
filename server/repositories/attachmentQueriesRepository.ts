import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  customerAttachments,
  customers,
  employeeAttachments,
  employees,
  projectAttachments,
  projects,
  type ProjectAttachment,
} from "@shared/schema";
import { db } from "../db";

export type AttachmentDuplicateHitRow = {
  domain: "customer" | "project" | "employee";
  attachmentId: number;
  ownerId: number;
  ownerLabel: string;
  originalName: string;
  createdAt: Date;
};

export async function findDuplicateAttachmentsByOriginalName(
  originalName: string,
): Promise<AttachmentDuplicateHitRow[]> {
  const normalized = originalName.trim();
  if (normalized.length === 0) return [];

  const [customerRows, projectRows, employeeRows] = await Promise.all([
    db
      .select({
        attachmentId: customerAttachments.id,
        ownerId: customers.id,
        ownerLabel: sql<string>`coalesce(${customers.fullName}, ${customers.customerNumber})`,
        originalName: customerAttachments.originalName,
        createdAt: customerAttachments.createdAt,
      })
      .from(customerAttachments)
      .innerJoin(customers, eq(customerAttachments.customerId, customers.id))
      .where(eq(customerAttachments.originalName, normalized))
      .orderBy(desc(customerAttachments.createdAt)),
    db
      .select({
        attachmentId: projectAttachments.id,
        ownerId: projects.id,
        ownerLabel: projects.name,
        originalName: projectAttachments.originalName,
        createdAt: projectAttachments.createdAt,
      })
      .from(projectAttachments)
      .innerJoin(projects, eq(projectAttachments.projectId, projects.id))
      .where(eq(projectAttachments.originalName, normalized))
      .orderBy(desc(projectAttachments.createdAt)),
    db
      .select({
        attachmentId: employeeAttachments.id,
        ownerId: employees.id,
        ownerLabel: employees.fullName,
        originalName: employeeAttachments.originalName,
        createdAt: employeeAttachments.createdAt,
      })
      .from(employeeAttachments)
      .innerJoin(employees, eq(employeeAttachments.employeeId, employees.id))
      .where(eq(employeeAttachments.originalName, normalized))
      .orderBy(desc(employeeAttachments.createdAt)),
  ]);

  return [
    ...customerRows.map((row) => ({ ...row, domain: "customer" as const })),
    ...projectRows.map((row) => ({ ...row, domain: "project" as const })),
    ...employeeRows.map((row) => ({ ...row, domain: "employee" as const })),
  ];
}

export async function getCustomerProjectAttachmentGroups(params: {
  customerId: number;
  page: number;
  pageSize: number;
}): Promise<{
  items: Array<{ projectId: number; projectName: string; attachments: ProjectAttachment[] }>;
  totalProjects: number;
  totalAttachments: number;
  hasMore: boolean;
}> {
  const { customerId, page, pageSize } = params;
  const offset = (page - 1) * pageSize;

  const [totalProjectsRow] = await db
    .select({
      count: sql<number>`count(distinct ${projects.id})`,
    })
    .from(projects)
    .innerJoin(projectAttachments, eq(projectAttachments.projectId, projects.id))
    .where(eq(projects.customerId, customerId));

  const [totalAttachmentsRow] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(projectAttachments)
    .innerJoin(projects, eq(projectAttachments.projectId, projects.id))
    .where(eq(projects.customerId, customerId));

  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
    })
    .from(projects)
    .innerJoin(projectAttachments, eq(projectAttachments.projectId, projects.id))
    .where(eq(projects.customerId, customerId))
    .groupBy(projects.id, projects.name)
    .orderBy(desc(projects.id))
    .limit(pageSize + 1)
    .offset(offset);

  const hasMore = projectRows.length > pageSize;
  const pageProjects = hasMore ? projectRows.slice(0, pageSize) : projectRows;
  const projectIds = pageProjects.map((row) => row.id);
  if (projectIds.length === 0) {
    return {
      items: [],
      totalProjects: Number(totalProjectsRow?.count ?? 0),
      totalAttachments: Number(totalAttachmentsRow?.count ?? 0),
      hasMore,
    };
  }

  const attachments = await db
    .select()
    .from(projectAttachments)
    .where(and(inArray(projectAttachments.projectId, projectIds)))
    .orderBy(desc(projectAttachments.createdAt));

  const byProjectId = new Map<number, ProjectAttachment[]>();
  for (const attachment of attachments) {
    const list = byProjectId.get(attachment.projectId) ?? [];
    list.push(attachment);
    byProjectId.set(attachment.projectId, list);
  }

  return {
    items: pageProjects.map((project) => ({
      projectId: project.id,
      projectName: project.name,
      attachments: byProjectId.get(project.id) ?? [],
    })),
    totalProjects: Number(totalProjectsRow?.count ?? 0),
    totalAttachments: Number(totalAttachmentsRow?.count ?? 0),
    hasMore,
  };
}
