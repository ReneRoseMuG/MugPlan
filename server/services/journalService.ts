import type { CanonicalRoleKey } from "../settings/registry";
import { logError } from "../lib/logger";
import * as changeNotificationsService from "./changeNotificationsService";
import * as journalRepository from "../repositories/journalRepository";

export class JournalError extends Error {
  status: number;
  code: "FORBIDDEN" | "VALIDATION_ERROR";

  constructor(status: number, code: "FORBIDDEN" | "VALIDATION_ERROR", message = code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type JournalActor = {
  userId?: number | null;
  name?: string | null;
};

export type JournalContextInput = {
  tableName: string;
  recordId?: number | null;
  recordKey?: string | null;
  relationRole?: string | null;
};

export type RecordJournalEntryInput = {
  tableName: string;
  recordId?: number | null;
  recordKey?: string | null;
  op: string;
  field?: string | null;
  oldValue?: unknown | null;
  newValue?: unknown | null;
  snapshot?: unknown | null;
  actor?: JournalActor | null;
  triggerKey?: string | null;
  messageText?: string | null;
  contexts?: JournalContextInput[];
};

type JournalHierarchyCache = {
  projectById: Map<number, Promise<journalRepository.ProjectHierarchyRow | null>>;
  appointmentById: Map<number, Promise<journalRepository.AppointmentHierarchyRow | null>>;
};

function isReadableRole(roleKey: CanonicalRoleKey): boolean {
  return roleKey === "ADMIN" || roleKey === "DISPONENT";
}

function toRepositoryContext(context: JournalContextInput): journalRepository.JournalInsertContextInput {
  return {
    contextTable: context.tableName,
    contextId: context.recordId ?? null,
    contextKey: context.recordKey ?? null,
    relationRole: context.relationRole ?? null,
  };
}

function dedupeContexts(contexts: JournalContextInput[]): JournalContextInput[] {
  const seen = new Set<string>();
  const deduped: JournalContextInput[] = [];

  for (const context of contexts) {
    const key = [
      context.tableName,
      context.recordId ?? "",
      context.recordKey ?? "",
      context.relationRole ?? "",
    ].join("::");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(context);
  }

  return deduped;
}

function createHierarchyCache(): JournalHierarchyCache {
  return {
    projectById: new Map<number, Promise<journalRepository.ProjectHierarchyRow | null>>(),
    appointmentById: new Map<number, Promise<journalRepository.AppointmentHierarchyRow | null>>(),
  };
}

function getComparableSnapshot(
  input: Pick<RecordJournalEntryInput, "snapshot" | "newValue" | "oldValue">,
): unknown | null {
  return input.snapshot ?? input.newValue ?? input.oldValue ?? null;
}

function readNumberField(source: unknown, keys: string[]): number | null {
  if (!source || typeof source !== "object") {
    return null;
  }

  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function readProjectHierarchyFromInput(
  input: Pick<RecordJournalEntryInput, "tableName" | "recordId" | "snapshot" | "newValue" | "oldValue">,
  projectId: number,
): journalRepository.ProjectHierarchyRow | null {
  if (input.tableName !== "project" || input.recordId !== projectId) {
    return null;
  }

  const customerId = readNumberField(getComparableSnapshot(input), ["customerId"]);
  return {
    projectId,
    customerId,
  };
}

function readAppointmentHierarchyFromInput(
  input: Pick<RecordJournalEntryInput, "tableName" | "recordId" | "snapshot" | "newValue" | "oldValue">,
  appointmentId: number,
): journalRepository.AppointmentHierarchyRow | null {
  if (input.tableName !== "appointment" || input.recordId !== appointmentId) {
    return null;
  }

  const source = getComparableSnapshot(input);
  return {
    appointmentId,
    projectId: readNumberField(source, ["projectId"]),
    customerId: readNumberField(source, ["customerId"]),
  };
}

function buildSelfContext(input: RecordJournalEntryInput): JournalContextInput[] {
  const contexts: JournalContextInput[] = [];
  if (input.recordId != null || input.recordKey != null) {
    contexts.push({
      tableName: input.tableName,
      recordId: input.recordId ?? null,
      recordKey: input.recordKey ?? null,
      relationRole: "self",
    });
  }
  return contexts;
}

function buildEntryDerivedContexts(input: RecordJournalEntryInput): JournalContextInput[] {
  const source = getComparableSnapshot(input);
  const contexts: JournalContextInput[] = [];

  const pushContext = (tableName: string, recordId: number | null, relationRole: string) => {
    if (recordId == null) {
      return;
    }

    contexts.push({
      tableName,
      recordId,
      relationRole,
    });
  };

  switch (input.tableName) {
    case "customer_attachment":
      pushContext("customer", readNumberField(source, ["customerId"]), "owner");
      break;
    case "project_attachment":
    case "project_order_item":
      pushContext("project", readNumberField(source, ["projectId"]), "owner");
      break;
    case "appointment_attachment":
      pushContext("appointment", readNumberField(source, ["appointmentId"]), "owner");
      break;
    case "employee_attachment":
      pushContext("employee", readNumberField(source, ["employeeId"]), "owner");
      break;
    default:
      break;
  }

  return contexts;
}

function getProjectHierarchy(
  cache: JournalHierarchyCache,
  projectId: number,
  input: Pick<RecordJournalEntryInput, "tableName" | "recordId" | "snapshot" | "newValue" | "oldValue">,
): Promise<journalRepository.ProjectHierarchyRow | null> {
  const fromInput = readProjectHierarchyFromInput(input, projectId);
  if (fromInput) {
    return Promise.resolve(fromInput);
  }

  const existing = cache.projectById.get(projectId);
  if (existing) {
    return existing;
  }

  const pending = journalRepository.getProjectHierarchy(projectId);
  cache.projectById.set(projectId, pending);
  return pending;
}

function getAppointmentHierarchy(
  cache: JournalHierarchyCache,
  appointmentId: number,
  input: Pick<RecordJournalEntryInput, "tableName" | "recordId" | "snapshot" | "newValue" | "oldValue">,
): Promise<journalRepository.AppointmentHierarchyRow | null> {
  const fromInput = readAppointmentHierarchyFromInput(input, appointmentId);
  if (fromInput) {
    return Promise.resolve(fromInput);
  }

  const existing = cache.appointmentById.get(appointmentId);
  if (existing) {
    return existing;
  }

  const pending = journalRepository.getAppointmentHierarchy(appointmentId);
  cache.appointmentById.set(appointmentId, pending);
  return pending;
}

async function expandParentContexts(
  seedContexts: JournalContextInput[],
  input: Pick<RecordJournalEntryInput, "tableName" | "recordId" | "snapshot" | "newValue" | "oldValue">,
): Promise<JournalContextInput[]> {
  const cache = createHierarchyCache();
  const expanded = [...seedContexts];

  for (const context of seedContexts) {
    if (context.recordId == null) {
      continue;
    }

    if (context.tableName === "project") {
      const hierarchy = await getProjectHierarchy(cache, context.recordId, input);
      if (hierarchy?.customerId != null) {
        expanded.push({
          tableName: "customer",
          recordId: hierarchy.customerId,
          relationRole: "customer",
        });
      }
      continue;
    }

    if (context.tableName === "appointment") {
      const hierarchy = await getAppointmentHierarchy(cache, context.recordId, input);
      if (hierarchy?.projectId != null) {
        expanded.push({
          tableName: "project",
          recordId: hierarchy.projectId,
          relationRole: "project",
        });
      }
      if (hierarchy?.customerId != null) {
        expanded.push({
          tableName: "customer",
          recordId: hierarchy.customerId,
          relationRole: "customer",
        });
      }
    }
  }

  return dedupeContexts(expanded);
}

async function resolveJournalContexts(input: RecordJournalEntryInput): Promise<JournalContextInput[]> {
  const seedContexts = dedupeContexts([
    ...buildSelfContext(input),
    ...buildEntryDerivedContexts(input),
    ...(input.contexts ?? []),
  ]);

  return expandParentContexts(seedContexts, input);
}

function buildRawFallback(input: RecordJournalEntryInput): string {
  return JSON.stringify({
    tableName: input.tableName,
    recordId: input.recordId ?? null,
    recordKey: input.recordKey ?? null,
    op: input.op,
    field: input.field ?? null,
    triggerKey: input.triggerKey ?? null,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    snapshot: input.snapshot ?? null,
  });
}

export async function recordJournalEntry(input: RecordJournalEntryInput): Promise<void> {
  try {
    const contexts = await resolveJournalContexts(input);
    const messageText = input.messageText?.trim() || buildRawFallback(input);

    const entryId = await journalRepository.insertJournalEntry({
      tableName: input.tableName,
      recordId: input.recordId ?? null,
      recordKey: input.recordKey ?? null,
      op: input.op,
      field: input.field ?? null,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      snapshot: input.snapshot ?? null,
      actorUserId: input.actor?.userId ?? null,
      actorName: input.actor?.name ?? null,
      triggerKey: input.triggerKey ?? null,
      messageText,
      isRaw: !input.messageText,
      contexts: contexts.map(toRepositoryContext),
    });

    changeNotificationsService.publishChangeNotification({
      id: entryId,
      actorUserId: input.actor?.userId ?? null,
      triggerKey: input.triggerKey ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    logError("[journal] write failed", {
      error,
      tableName: input.tableName,
      recordId: input.recordId ?? null,
      recordKey: input.recordKey ?? null,
      op: input.op,
      triggerKey: input.triggerKey ?? null,
    });
  }
}

export async function recordJournalEntries(entries: RecordJournalEntryInput[]): Promise<void> {
  for (const entry of entries) {
    await recordJournalEntry(entry);
  }
}

export async function listJournalMessages(
  params: journalRepository.JournalListParams,
  roleKey: CanonicalRoleKey,
) {
  if (!isReadableRole(roleKey)) {
    throw new JournalError(403, "FORBIDDEN");
  }
  if (!Number.isInteger(params.page) || params.page < 1 || !Number.isInteger(params.pageSize) || params.pageSize < 1) {
    throw new JournalError(422, "VALIDATION_ERROR");
  }
  return journalRepository.listJournalEntries(params);
}

export async function listNoteContexts(noteId: number): Promise<JournalContextInput[]> {
  const owners = await journalRepository.listNoteOwners(noteId);
  return expandParentContexts(owners.map((owner) => ({
    tableName: owner.contextTable,
    recordId: owner.contextId,
    recordKey: owner.contextKey,
    relationRole: owner.relationRole,
  })), {
    tableName: "note",
    recordId: noteId,
    snapshot: null,
    newValue: null,
    oldValue: null,
  });
}

export function buildCalendarWeekContext(params: {
  yearNumber: number;
  weekNumber: number;
  tourId: number | null;
}): JournalContextInput {
  return {
    tableName: "calendar_week",
    recordId: null,
    recordKey: `${params.yearNumber}-${String(params.weekNumber).padStart(2, "0")}-${params.tourId ?? 0}`,
    relationRole: "self",
  };
}

export function buildTourContext(tourId: number): JournalContextInput {
  return {
    tableName: "tour",
    recordId: tourId,
    relationRole: "self",
  };
}
