import type { CanonicalRoleKey } from "../settings/registry";
import { logError } from "../lib/logger";
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

function ensureSelfContext(input: RecordJournalEntryInput): JournalContextInput[] {
  const contexts = [...(input.contexts ?? [])];
  if (input.recordId != null || input.recordKey != null) {
    contexts.unshift({
      tableName: input.tableName,
      recordId: input.recordId ?? null,
      recordKey: input.recordKey ?? null,
      relationRole: "self",
    });
  }
  return dedupeContexts(contexts);
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
    const contexts = ensureSelfContext(input);
    const messageText = input.messageText?.trim() || buildRawFallback(input);

    await journalRepository.insertJournalEntry({
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
  return owners.map((owner) => ({
    tableName: owner.contextTable,
    recordId: owner.contextId,
    recordKey: owner.contextKey,
    relationRole: owner.relationRole,
  }));
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
