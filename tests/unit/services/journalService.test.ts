/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - recordJournalEntry fuegt den Self-Kontext hinzu, dedupliziert Kontextduplikate und speichert ohne messageText einen Raw-Fallback.
 * - recordJournalEntry behandelt Repository-Fehler best effort und loggt sie statt den Aufrufer zu blockieren.
 * - listJournalMessages erlaubt nur ADMIN und DISPONENT und validiert page/pageSize serverseitig.
 * - listNoteContexts mappt Owner-Zuordnungen aus dem Repository unveraendert in den Servicevertrag.
 *
 * Fehlerfaelle:
 * - Repository-Fehler beim Schreiben duerfen nicht weitergeworfen werden.
 * - LESER duerfen das Journal nicht lesen.
 * - Ungueltige Pagination liefert VALIDATION_ERROR.
 *
 * Ziel:
 * Den zentralen Journal-Servicevertrag fuer Write-Fallbacks, Rollenlogik und Kontextaufloesung isoliert absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  insertJournalEntryMock,
  listJournalEntriesMock,
  listNoteOwnersMock,
  logErrorMock,
} = vi.hoisted(() => ({
  insertJournalEntryMock: vi.fn(),
  listJournalEntriesMock: vi.fn(),
  listNoteOwnersMock: vi.fn(),
  logErrorMock: vi.fn(),
}));

vi.mock("../../../server/repositories/journalRepository", () => ({
  insertJournalEntry: insertJournalEntryMock,
  listJournalEntries: listJournalEntriesMock,
  listNoteOwners: listNoteOwnersMock,
}));

vi.mock("../../../server/lib/logger", () => ({
  logError: logErrorMock,
}));

import {
  JournalError,
  buildCalendarWeekContext,
  listJournalMessages,
  listNoteContexts,
  recordJournalEntry,
} from "../../../server/services/journalService";

describe("FT-Journal unit: journalService", () => {
  beforeEach(() => {
    insertJournalEntryMock.mockReset();
    listJournalEntriesMock.mockReset();
    listNoteOwnersMock.mockReset();
    logErrorMock.mockReset();
  });

  it("adds self context, deduplicates contexts and stores a raw fallback when no message is provided", async () => {
    insertJournalEntryMock.mockResolvedValueOnce(1);

    await recordJournalEntry({
      tableName: "customer",
      recordId: 12,
      op: "update",
      field: "phone",
      oldValue: "111",
      newValue: "222",
      contexts: [
        { tableName: "customer", recordId: 12, relationRole: "self" },
        { tableName: "project", recordId: 44, relationRole: "parent" },
        { tableName: "project", recordId: 44, relationRole: "parent" },
      ],
    });

    expect(insertJournalEntryMock).toHaveBeenCalledWith(expect.objectContaining({
      tableName: "customer",
      recordId: 12,
      op: "update",
      field: "phone",
      isRaw: true,
      contexts: [
        {
          contextTable: "customer",
          contextId: 12,
          contextKey: null,
          relationRole: "self",
        },
        {
          contextTable: "project",
          contextId: 44,
          contextKey: null,
          relationRole: "parent",
        },
      ],
    }));

    const [{ messageText }] = insertJournalEntryMock.mock.calls[0] as [{ messageText: string }];
    expect(messageText).toContain("\"tableName\":\"customer\"");
    expect(messageText).toContain("\"field\":\"phone\"");
  });

  it("logs repository failures and does not rethrow them", async () => {
    insertJournalEntryMock.mockRejectedValueOnce(new Error("insert failed"));

    await expect(recordJournalEntry({
      tableName: "project",
      recordId: 9,
      op: "create",
      messageText: "Projekt angelegt",
    })).resolves.toBeUndefined();

    expect(logErrorMock).toHaveBeenCalledWith(
      "[journal] write failed",
      expect.objectContaining({
        tableName: "project",
        recordId: 9,
        op: "create",
      }),
    );
  });

  it("allows ADMIN to list journal messages and forwards the repository result", async () => {
    listJournalEntriesMock.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 0,
    });

    const result = await listJournalMessages({ page: 1, pageSize: 25 }, "ADMIN");

    expect(listJournalEntriesMock).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
    expect(result.total).toBe(0);
  });

  it("rejects LESER when listing journal messages", async () => {
    await expect(
      listJournalMessages({ page: 1, pageSize: 25 }, "LESER"),
    ).rejects.toMatchObject<JournalError>({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("rejects invalid pagination when listing journal messages", async () => {
    await expect(
      listJournalMessages({ page: 0, pageSize: 25 }, "DISPONENT"),
    ).rejects.toMatchObject<JournalError>({
      status: 422,
      code: "VALIDATION_ERROR",
    });
  });

  it("maps note owners to journal contexts", async () => {
    listNoteOwnersMock.mockResolvedValueOnce([
      { contextTable: "customer", contextId: 7, contextKey: null, relationRole: "owner" },
      { contextTable: "calendar_week", contextId: null, contextKey: "2026-18-3", relationRole: "owner" },
    ]);

    const result = await listNoteContexts(99);

    expect(result).toEqual([
      { tableName: "customer", recordId: 7, recordKey: null, relationRole: "owner" },
      { tableName: "calendar_week", recordId: null, recordKey: "2026-18-3", relationRole: "owner" },
    ]);
  });

  it("builds a stable calendar week context key", () => {
    expect(buildCalendarWeekContext({
      yearNumber: 2026,
      weekNumber: 5,
      tourId: 3,
    })).toEqual({
      tableName: "calendar_week",
      recordId: null,
      recordKey: "2026-05-3",
      relationRole: "self",
    });
  });
});
