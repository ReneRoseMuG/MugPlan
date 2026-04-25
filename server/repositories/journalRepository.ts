import { and, asc, desc, eq, gt, inArray, like, sql } from "drizzle-orm";
import { db } from "../db";
import {
  appointments,
  appointmentNotes,
  calendarWeekNotes,
  customerNotes,
  employeeNotes,
  journalEntries,
  journalEntryContexts,
  projectNotes,
  projects,
} from "@shared/schema";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type JournalContextRow = {
  contextTable: string;
  contextId: number | null;
  contextKey: string | null;
  relationRole: string | null;
};

export type JournalEntryRow = {
  id: number;
  tableName: string;
  recordId: number | null;
  recordKey: string | null;
  op: string;
  field: string | null;
  oldValue: unknown | null;
  newValue: unknown | null;
  snapshot: unknown | null;
  actorUserId: number | null;
  actorName: string | null;
  triggerKey: string | null;
  messageText: string;
  isRaw: boolean;
  createdAt: Date | string;
};

export type JournalEntryWithContexts = JournalEntryRow & {
  contexts: JournalContextRow[];
};

export type JournalListParams = {
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  actor?: string;
  q?: string;
  triggerKey?: string;
  contextTable?: string;
  contextId?: number;
  contextKey?: string;
};

export type JournalListResult = {
  items: JournalEntryWithContexts[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type JournalInsertContextInput = {
  contextTable: string;
  contextId?: number | null;
  contextKey?: string | null;
  relationRole?: string | null;
};

export type JournalInsertInput = {
  tableName: string;
  recordId?: number | null;
  recordKey?: string | null;
  op: string;
  field?: string | null;
  oldValue?: unknown | null;
  newValue?: unknown | null;
  snapshot?: unknown | null;
  actorUserId?: number | null;
  actorName?: string | null;
  triggerKey?: string | null;
  messageText: string;
  isRaw: boolean;
  contexts: JournalInsertContextInput[];
};

export type ProjectHierarchyRow = {
  projectId: number;
  customerId: number | null;
};

export type AppointmentHierarchyRow = {
  appointmentId: number;
  projectId: number | null;
  customerId: number | null;
};

export type JournalChangeNotificationRow = {
  id: number;
  actorUserId: number | null;
  triggerKey: string | null;
  createdAt: string;
};

function normalizeTimestamp(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(value).toISOString();
}

function buildEntryWhere(params: JournalListParams) {
  const conditions = [];

  if (params.from) {
    conditions.push(sql`${journalEntries.createdAt} >= ${`${params.from} 00:00:00`}`);
  }
  if (params.to) {
    conditions.push(sql`${journalEntries.createdAt} <= ${`${params.to} 23:59:59`}`);
  }
  if (params.actor && params.actor.trim().length > 0) {
    conditions.push(like(journalEntries.actorName, `%${params.actor.trim()}%`));
  }
  if (params.q && params.q.trim().length > 0) {
    conditions.push(like(journalEntries.messageText, `%${params.q.trim()}%`));
  }
  if (params.triggerKey && params.triggerKey.trim().length > 0) {
    conditions.push(eq(journalEntries.triggerKey, params.triggerKey.trim()));
  }
  if (params.contextTable && (params.contextId != null || (params.contextKey?.trim().length ?? 0) > 0)) {
    const predicates = [sql`${journalEntryContexts.contextTable} = ${params.contextTable.trim()}`];
    if (params.contextId != null) {
      predicates.push(sql`${journalEntryContexts.contextId} = ${params.contextId}`);
    }
    if (params.contextKey && params.contextKey.trim().length > 0) {
      predicates.push(sql`${journalEntryContexts.contextKey} = ${params.contextKey.trim()}`);
    }
    conditions.push(sql`exists (
      select 1
      from ${journalEntryContexts}
      where ${journalEntryContexts.entryId} = ${journalEntries.id}
        and ${and(...predicates)}
    )`);
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

async function insertJournalEntryTx(tx: DbTx, input: JournalInsertInput): Promise<number> {
  const result = await tx.insert(journalEntries).values({
    tableName: input.tableName,
    recordId: input.recordId ?? null,
    recordKey: input.recordKey ?? null,
    op: input.op,
    field: input.field ?? null,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    snapshot: input.snapshot ?? null,
    actorUserId: input.actorUserId ?? null,
    actorName: input.actorName ?? null,
    triggerKey: input.triggerKey ?? null,
    messageText: input.messageText,
    isRaw: input.isRaw,
  });

  const entryId = Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0);

  if (input.contexts.length > 0) {
    await tx.insert(journalEntryContexts).values(
      input.contexts.map((context) => ({
        entryId,
        contextTable: context.contextTable,
        contextId: context.contextId ?? null,
        contextKey: context.contextKey ?? null,
        relationRole: context.relationRole ?? null,
      })),
    );
  }

  return entryId;
}

export async function insertJournalEntry(input: JournalInsertInput): Promise<number> {
  return db.transaction(async (tx) => insertJournalEntryTx(tx, input));
}

export async function listJournalEntries(params: JournalListParams): Promise<JournalListResult> {
  const where = buildEntryWhere(params);
  const offset = (params.page - 1) * params.pageSize;

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(journalEntries)
    .where(where);

  const total = Number(totalRow?.count ?? 0);
  if (total === 0) {
    return {
      items: [],
      page: params.page,
      pageSize: params.pageSize,
      total: 0,
      totalPages: 0,
    };
  }

  const rows = await db
    .select()
    .from(journalEntries)
    .where(where)
    .orderBy(desc(journalEntries.createdAt), desc(journalEntries.id))
    .limit(params.pageSize)
    .offset(offset);

  const entryIds = rows.map((row) => row.id);
  const contextRows = entryIds.length > 0
    ? await db
      .select({
        entryId: journalEntryContexts.entryId,
        contextTable: journalEntryContexts.contextTable,
        contextId: journalEntryContexts.contextId,
        contextKey: journalEntryContexts.contextKey,
        relationRole: journalEntryContexts.relationRole,
      })
      .from(journalEntryContexts)
      .where(inArray(journalEntryContexts.entryId, entryIds))
    : [];

  const contextsByEntryId = new Map<number, JournalContextRow[]>();
  for (const row of contextRows) {
    const existing = contextsByEntryId.get(row.entryId) ?? [];
    existing.push({
      contextTable: row.contextTable,
      contextId: row.contextId ?? null,
      contextKey: row.contextKey ?? null,
      relationRole: row.relationRole ?? null,
    });
    contextsByEntryId.set(row.entryId, existing);
  }

  return {
    items: rows.map((row) => ({
      id: row.id,
      tableName: row.tableName,
      recordId: row.recordId ?? null,
      recordKey: row.recordKey ?? null,
      op: row.op,
      field: row.field ?? null,
      oldValue: row.oldValue ?? null,
      newValue: row.newValue ?? null,
      snapshot: row.snapshot ?? null,
      actorUserId: row.actorUserId ?? null,
      actorName: row.actorName ?? null,
      triggerKey: row.triggerKey ?? null,
      messageText: row.messageText,
      isRaw: row.isRaw,
      createdAt: normalizeTimestamp(row.createdAt),
      contexts: contextsByEntryId.get(row.id) ?? [],
    })),
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.ceil(total / params.pageSize),
  };
}

export async function listJournalChangeNotificationsAfterId(afterId: number): Promise<JournalChangeNotificationRow[]> {
  if (!Number.isInteger(afterId) || afterId < 0) {
    return [];
  }

  const rows = await db
    .select({
      id: journalEntries.id,
      actorUserId: journalEntries.actorUserId,
      triggerKey: journalEntries.triggerKey,
      createdAt: journalEntries.createdAt,
    })
    .from(journalEntries)
    .where(gt(journalEntries.id, afterId))
    .orderBy(asc(journalEntries.id));

  return rows.map((row) => ({
    id: row.id,
    actorUserId: row.actorUserId ?? null,
    triggerKey: row.triggerKey ?? null,
    createdAt: normalizeTimestamp(row.createdAt),
  }));
}

export async function listNoteOwners(noteId: number): Promise<JournalContextRow[]> {
  const [customerOwnerRows, projectOwnerRows, appointmentOwnerRows, employeeOwnerRows, calendarWeekOwnerRows] = await Promise.all([
    db
      .select({
        contextId: customerNotes.customerId,
      })
      .from(customerNotes)
      .where(eq(customerNotes.noteId, noteId)),
    db
      .select({
        contextId: projectNotes.projectId,
      })
      .from(projectNotes)
      .where(eq(projectNotes.noteId, noteId)),
    db
      .select({
        contextId: appointmentNotes.appointmentId,
      })
      .from(appointmentNotes)
      .where(eq(appointmentNotes.noteId, noteId)),
    db
      .select({
        contextId: employeeNotes.employeeId,
      })
      .from(employeeNotes)
      .where(eq(employeeNotes.noteId, noteId)),
    db
      .select({
        yearNumber: calendarWeekNotes.yearNumber,
        weekNumber: calendarWeekNotes.weekNumber,
        tourId: calendarWeekNotes.tourId,
      })
      .from(calendarWeekNotes)
      .where(eq(calendarWeekNotes.noteId, noteId)),
  ]);

  return [
    ...customerOwnerRows.map((row) => ({
      contextTable: "customer",
      contextId: row.contextId,
      contextKey: null,
      relationRole: "owner",
    })),
    ...projectOwnerRows.map((row) => ({
      contextTable: "project",
      contextId: row.contextId,
      contextKey: null,
      relationRole: "owner",
    })),
    ...appointmentOwnerRows.map((row) => ({
      contextTable: "appointment",
      contextId: row.contextId,
      contextKey: null,
      relationRole: "owner",
    })),
    ...employeeOwnerRows.map((row) => ({
      contextTable: "employee",
      contextId: row.contextId,
      contextKey: null,
      relationRole: "owner",
    })),
    ...calendarWeekOwnerRows.map((row) => ({
      contextTable: "calendar_week",
      contextId: null,
      contextKey: `${row.yearNumber}-${String(row.weekNumber).padStart(2, "0")}-${row.tourId ?? 0}`,
      relationRole: "owner",
    })),
  ];
}

export async function getProjectHierarchy(projectId: number): Promise<ProjectHierarchyRow | null> {
  const [row] = await db
    .select({
      projectId: projects.id,
      customerId: projects.customerId,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    projectId: row.projectId,
    customerId: row.customerId ?? null,
  };
}

export async function getAppointmentHierarchy(appointmentId: number): Promise<AppointmentHierarchyRow | null> {
  const [row] = await db
    .select({
      appointmentId: appointments.id,
      projectId: appointments.projectId,
      customerId: appointments.customerId,
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    appointmentId: row.appointmentId,
    projectId: row.projectId ?? null,
    customerId: row.customerId ?? null,
  };
}
