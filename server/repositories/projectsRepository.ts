import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  appointments,
  componentCategories,
  components,
  customers,
  projectOrder,
  projectOrderItems,
  projectAttachments,
  projectNotes,
  projectProjectStatus,
  projects,
  products,
  type Project,
  type ProjectOrder,
  type ProjectAttachment,
  type InsertProject,
  type InsertProjectOrderItem,
  type ProjectOrderItem,
  type UpdateProject,
  type UpdateProjectOrderItem,
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

function mergeProjectWithOrder(project: typeof projects.$inferSelect, order: ProjectOrder | null): Project {
  return {
    ...project,
    orderNumber: order?.orderNumber ?? null,
    amount: order?.amount == null ? null : String(order.amount),
    projectOrder: order,
  };
}

async function getProjectOrdersByProjectIds(projectIds: number[]): Promise<Map<number, ProjectOrder>> {
  const uniqueProjectIds = Array.from(new Set(projectIds));
  if (uniqueProjectIds.length === 0) return new Map();

  const rows = await db
    .select()
    .from(projectOrder)
    .where(inArray(projectOrder.projectId, uniqueProjectIds));

  return new Map(rows.map((row) => [row.projectId, row] as const));
}

function resolveProjectOrderInput(
  projectId: number,
  data: InsertProject | (UpdateProject & { version?: number }),
): {
  projectId: number;
  orderNumber: string | null;
  amount: string | null;
  plannedDateText: string | null;
  plannedWeek: string | null;
} {
  const nested = data.projectOrder ?? {};
  return {
    projectId,
    orderNumber: nested.orderNumber?.trim() ?? data.orderNumber?.trim() ?? null,
    amount: nested.amount ?? data.amount ?? null,
    plannedDateText: nested.plannedDateText?.trim() ?? null,
    plannedWeek: nested.plannedWeek?.trim() ?? null,
  };
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
  const orderByProjectId = await getProjectOrdersByProjectIds(projectIds);

  const noteCountRows = await db
    .select({
      projectId: projectNotes.projectId,
      count: sql<number>`count(*)`,
    })
    .from(projectNotes)
    .where(inArray(projectNotes.projectId, projectIds))
    .groupBy(projectNotes.projectId);

  const notesCountByProjectId = new Map(noteCountRows.map((row) => [row.projectId, Number(row.count)] as const));
  return rows.map((row) => ({
    ...mergeProjectWithOrder(row, orderByProjectId.get(row.id) ?? null),
    notesCount: notesCountByProjectId.get(row.id) ?? 0,
  }));
}

export type ProjectListItem = Project & { notesCount: number };
type VersionedMutationResult<T> =
  | { kind: "updated"; row: T }
  | { kind: "not_found" }
  | { kind: "version_conflict" };

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
  const orderByProjectId = await getProjectOrdersByProjectIds(projectIds);

  const noteCountRows = await db
    .select({
      projectId: projectNotes.projectId,
      count: sql<number>`count(*)`,
    })
    .from(projectNotes)
    .where(inArray(projectNotes.projectId, projectIds))
    .groupBy(projectNotes.projectId);

  const notesCountByProjectId = new Map(noteCountRows.map((row) => [row.projectId, Number(row.count)] as const));
  return rows.map((row) => ({
    ...mergeProjectWithOrder(row, orderByProjectId.get(row.id) ?? null),
    notesCount: notesCountByProjectId.get(row.id) ?? 0,
  }));
}

export async function getProject(id: number): Promise<Project | null> {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) return null;
  const [order] = await db.select().from(projectOrder).where(eq(projectOrder.projectId, id));
  return mergeProjectWithOrder(project, order ?? null);
}

export async function existsProjectByOrderNumber(orderNumber: string): Promise<boolean> {
  const normalizedOrderNumber = orderNumber.trim();
  if (normalizedOrderNumber.length === 0) {
    return false;
  }

  const rows = await db
    .select({ id: projectOrder.id })
    .from(projectOrder)
    .innerJoin(projects, eq(projectOrder.projectId, projects.id))
    .where(
      sql`${projectOrder.orderNumber} is not null
          and char_length(trim(${projectOrder.orderNumber})) > 0
          and trim(${projectOrder.orderNumber}) = ${normalizedOrderNumber}
          and ${projects.isActive} = true`,
    )
    .limit(1);

  return rows.length > 0;
}

export async function listProjectOrderNumbers(): Promise<string[]> {
  const rows = await db
    .select({ orderNumber: projectOrder.orderNumber })
    .from(projectOrder);

  return rows
    .map((row) => row.orderNumber?.trim() ?? "")
    .filter((orderNumber) => orderNumber.length > 0);
}

export async function getProjectWithCustomer(
  id: number,
): Promise<{ project: Project; customer: typeof customers.$inferSelect } | null> {
  const [result] = await db
    .select({ project: projects, customer: customers, order: projectOrder })
    .from(projects)
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .where(eq(projects.id, id));
  if (!result) return null;
  return {
    project: mergeProjectWithOrder(result.project, result.order ?? null),
    customer: result.customer,
  };
}

export async function createProject(data: InsertProject): Promise<Project> {
  return db.transaction(async (tx) => {
    const projectValues = {
      name: data.name,
      type: data.type ?? 1,
      customerId: data.customerId,
      descriptionMd: data.descriptionMd ?? null,
    };
    const result = await tx.insert(projects).values(projectValues);
    const insertId = (result as any)[0].insertId;
    const orderInput = resolveProjectOrderInput(insertId, data);
    if (!orderInput.orderNumber) {
      throw new Error("VALIDATION_ERROR");
    }
    await tx.insert(projectOrder).values({
      projectId: insertId,
      orderNumber: orderInput.orderNumber,
      amount: orderInput.amount,
      plannedDateText: orderInput.plannedDateText,
      plannedWeek: orderInput.plannedWeek,
    });
    const [project] = await tx.select().from(projects).where(eq(projects.id, insertId));
    const [order] = await tx.select().from(projectOrder).where(eq(projectOrder.projectId, insertId));
    return mergeProjectWithOrder(project, order ?? null);
  });
}

export async function updateProjectWithVersion(
  id: number,
  expectedVersion: number,
  data: UpdateProject,
): Promise<{ kind: "updated"; project: Project } | { kind: "version_conflict" }> {
  return db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      update project
      set
        name = coalesce(${data.name ?? null}, name),
        type = coalesce(${data.type ?? null}, type),
        customer_id = coalesce(${data.customerId ?? null}, customer_id),
        description_md = if(${data.descriptionMd === undefined}, description_md, ${data.descriptionMd ?? null}),
        is_active = coalesce(${data.isActive ?? null}, is_active),
        updated_at = now(),
        version = version + 1
      where id = ${id}
        and version = ${expectedVersion}
    `);

    const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
    if (affectedRows === 0) {
      return { kind: "version_conflict" as const };
    }

    const orderInput = resolveProjectOrderInput(id, data);
    const [existingOrder] = await tx.select().from(projectOrder).where(eq(projectOrder.projectId, id));
    const touchesOrder =
      data.orderNumber !== undefined ||
      data.amount !== undefined ||
      data.projectOrder !== undefined;

    if (touchesOrder) {
      if (!existingOrder && !orderInput.orderNumber) {
        return { kind: "version_conflict" as const };
      }
      if (existingOrder) {
        const hasAmountWrite = data.amount !== undefined || data.projectOrder?.amount !== undefined ? 1 : 0;
        const hasPlannedDateTextWrite = data.projectOrder?.plannedDateText === undefined ? 1 : 0;
        const hasPlannedWeekWrite = data.projectOrder?.plannedWeek === undefined ? 1 : 0;
        await tx.execute(sql`
          update project_order
          set
            order_number = if(${orderInput.orderNumber === null}, order_number, ${orderInput.orderNumber}),
            amount = if(${orderInput.amount === null && hasAmountWrite === 0}, amount, ${orderInput.amount}),
            planned_date_text = if(${hasPlannedDateTextWrite}, planned_date_text, ${orderInput.plannedDateText}),
            planned_week = if(${hasPlannedWeekWrite}, planned_week, ${orderInput.plannedWeek}),
            updated_at = now(),
            version = version + 1
          where project_id = ${id}
        `);
      } else {
        await tx.insert(projectOrder).values({
          projectId: id,
          orderNumber: orderInput.orderNumber!,
          amount: orderInput.amount,
          plannedDateText: orderInput.plannedDateText,
          plannedWeek: orderInput.plannedWeek,
        });
      }
    }

    if (data.customerId !== undefined && data.customerId !== null) {
      await tx.execute(sql`
        update appointments
        set customer_id = ${data.customerId}
        where project_id = ${id}
      `);
    }

    const [project] = await tx.select().from(projects).where(eq(projects.id, id));
    const [order] = await tx.select().from(projectOrder).where(eq(projectOrder.projectId, id));
    return { kind: "updated" as const, project: mergeProjectWithOrder(project, order ?? null) };
  });
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
    await tx.delete(projectOrderItems).where(eq(projectOrderItems.projectId, id));
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

export async function listProjectOrderItems(projectId: number): Promise<ProjectOrderItem[]> {
  return db
    .select()
    .from(projectOrderItems)
    .where(eq(projectOrderItems.projectId, projectId))
    .orderBy(desc(projectOrderItems.updatedAt), desc(projectOrderItems.id));
}

export async function getProductById(productId: number) {
  const [row] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  return row ?? null;
}

export async function getComponentById(componentId: number) {
  const [row] = await db.select().from(components).where(eq(components.id, componentId)).limit(1);
  return row ?? null;
}

async function deleteConflictingCategoryItemsTx(
  tx: any,
  projectId: number,
  componentId: number,
  excludeItemId?: number,
): Promise<void> {
  const [targetComponent] = await tx
    .select({
      componentId: components.id,
      categoryId: components.categoryId,
    })
    .from(components)
    .where(eq(components.id, componentId))
    .limit(1);

  if (!targetComponent) {
    return;
  }

  const conditions = [
    eq(projectOrderItems.projectId, projectId),
    eq(componentCategories.id, targetComponent.categoryId),
  ];
  if (excludeItemId != null) {
    conditions.push(sql`${projectOrderItems.id} <> ${excludeItemId}`);
  }

  const conflictingRows = await tx
    .select({ id: projectOrderItems.id })
    .from(projectOrderItems)
    .innerJoin(components, eq(projectOrderItems.componentId, components.id))
    .innerJoin(componentCategories, eq(components.categoryId, componentCategories.id))
    .where(and(...conditions));

  const conflictingIds = conflictingRows.map((row: { id: number }) => row.id);
  if (conflictingIds.length === 0) {
    return;
  }

  await tx.delete(projectOrderItems).where(inArray(projectOrderItems.id, conflictingIds));
}

async function deleteConflictingProductItemsTx(
  tx: any,
  projectId: number,
  excludeItemId?: number,
): Promise<void> {
  const conditions = [
    eq(projectOrderItems.projectId, projectId),
    sql`${projectOrderItems.productId} is not null`,
  ];
  if (excludeItemId != null) {
    conditions.push(sql`${projectOrderItems.id} <> ${excludeItemId}`);
  }

  const conflictingRows = await tx
    .select({ id: projectOrderItems.id })
    .from(projectOrderItems)
    .where(and(...conditions));

  const conflictingIds = conflictingRows.map((row: { id: number }) => row.id);
  if (conflictingIds.length === 0) {
    return;
  }

  await tx.delete(projectOrderItems).where(inArray(projectOrderItems.id, conflictingIds));
}

export async function createProjectOrderItem(input: InsertProjectOrderItem): Promise<ProjectOrderItem> {
  return db.transaction(async (tx) => {
    if (input.productId != null) {
      await deleteConflictingProductItemsTx(tx, input.projectId);
    }
    if (input.componentId != null) {
      await deleteConflictingCategoryItemsTx(tx, input.projectId, input.componentId);
    }

    const result = await tx.insert(projectOrderItems).values(input);
    const insertId = (result as any)[0].insertId;
    const [row] = await tx.select().from(projectOrderItems).where(eq(projectOrderItems.id, insertId));
    return row;
  });
}

export async function updateProjectOrderItemWithVersion(
  projectId: number,
  itemId: number,
  expectedVersion: number,
  input: UpdateProjectOrderItem,
): Promise<VersionedMutationResult<ProjectOrderItem>> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(projectOrderItems)
      .where(and(eq(projectOrderItems.id, itemId), eq(projectOrderItems.projectId, projectId)))
      .limit(1);

    if (!existing) {
      return { kind: "not_found" as const };
    }
    if (existing.version !== expectedVersion) {
      return { kind: "version_conflict" as const };
    }

    const nextProductId = input.productId === undefined ? existing.productId : input.productId;
    if (nextProductId != null) {
      await deleteConflictingProductItemsTx(tx, projectId, itemId);
    }

    const nextComponentId = input.componentId === undefined ? existing.componentId : input.componentId;
    if (nextComponentId != null) {
      await deleteConflictingCategoryItemsTx(tx, projectId, nextComponentId, itemId);
    }

    await tx.execute(sql`
      update project_order_items
      set
        order_number = if(${input.orderNumber === undefined}, order_number, ${input.orderNumber ?? null}),
        project_id = if(${input.projectId === undefined}, project_id, ${input.projectId ?? null}),
        product_id = if(${input.productId === undefined}, product_id, ${input.productId ?? null}),
        component_id = if(${input.componentId === undefined}, component_id, ${input.componentId ?? null}),
        specification_id = if(${input.specificationId === undefined}, specification_id, ${input.specificationId ?? null}),
        description = if(${input.description === undefined}, description, ${input.description ?? null}),
        quantity = if(${input.quantity === undefined}, quantity, ${input.quantity ?? null}),
        updated_at = now(),
        version = version + 1
      where id = ${itemId}
        and project_id = ${projectId}
        and version = ${expectedVersion}
    `);

    const [row] = await tx
      .select()
      .from(projectOrderItems)
      .where(and(eq(projectOrderItems.id, itemId), eq(projectOrderItems.projectId, projectId)))
      .limit(1);
    return { kind: "updated" as const, row };
  });
}

export async function deleteProjectOrderItemWithVersion(
  projectId: number,
  itemId: number,
  expectedVersion: number,
): Promise<VersionedMutationResult<null>> {
  const [existing] = await db
    .select()
    .from(projectOrderItems)
    .where(and(eq(projectOrderItems.id, itemId), eq(projectOrderItems.projectId, projectId)))
    .limit(1);

  if (!existing) {
    return { kind: "not_found" as const };
  }
  if (existing.version !== expectedVersion) {
    return { kind: "version_conflict" as const };
  }

  await db
    .delete(projectOrderItems)
    .where(and(eq(projectOrderItems.id, itemId), eq(projectOrderItems.projectId, projectId)));
  return { kind: "updated" as const, row: null };
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
