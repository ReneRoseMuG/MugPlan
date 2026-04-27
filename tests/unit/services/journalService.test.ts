/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - recordJournalEntry fuegt den Self-Kontext hinzu, dedupliziert Kontextduplikate, leitet Parent-Kontexte ab und speichert ohne messageText einen Raw-Fallback.
 * - recordJournalEntry behandelt Repository-Fehler best effort und loggt sie statt den Aufrufer zu blockieren.
 * - listJournalMessages erlaubt nur ADMIN und DISPONENT und validiert page/pageSize serverseitig.
 * - listNoteContexts erweitert Owner-Zuordnungen transitiv um Projekt-/Kundenkontexte.
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
  getProjectHierarchyMock,
  getAppointmentHierarchyMock,
  logErrorMock,
} = vi.hoisted(() => ({
  insertJournalEntryMock: vi.fn(),
  listJournalEntriesMock: vi.fn(),
  listNoteOwnersMock: vi.fn(),
  getProjectHierarchyMock: vi.fn(),
  getAppointmentHierarchyMock: vi.fn(),
  logErrorMock: vi.fn(),
}));

vi.mock("../../../server/repositories/journalRepository", () => ({
  insertJournalEntry: insertJournalEntryMock,
  listJournalEntries: listJournalEntriesMock,
  listNoteOwners: listNoteOwnersMock,
  getProjectHierarchy: getProjectHierarchyMock,
  getAppointmentHierarchy: getAppointmentHierarchyMock,
}));

vi.mock("../../../server/lib/logger", () => ({
  logError: logErrorMock,
}));

import {
  JournalError,
  buildCalendarWeekContext,
  buildTourContext,
  listJournalMessages,
  listNoteContexts,
  recordJournalEntry,
} from "../../../server/services/journalService";

describe("FT-Journal unit: journalService", () => {
  beforeEach(() => {
    insertJournalEntryMock.mockReset();
    listJournalEntriesMock.mockReset();
    listNoteOwnersMock.mockReset();
    getProjectHierarchyMock.mockReset();
    getAppointmentHierarchyMock.mockReset();
    logErrorMock.mockReset();
  });

  it("adds self context, deduplicates contexts, expands parent hierarchy and stores a raw fallback when no message is provided", async () => {
    insertJournalEntryMock.mockResolvedValueOnce(1);
    getProjectHierarchyMock.mockResolvedValueOnce({
      projectId: 44,
      customerId: 12,
    });

    await recordJournalEntry({
      tableName: "project_attachment",
      recordId: 88,
      op: "create",
      snapshot: { id: 88, projectId: 44, originalName: "angebot.pdf" },
      contexts: [
        { tableName: "project", recordId: 44, relationRole: "owner" },
        { tableName: "project", recordId: 44, relationRole: "owner" },
      ],
    });

    expect(insertJournalEntryMock).toHaveBeenCalledWith(expect.objectContaining({
      tableName: "project_attachment",
      recordId: 88,
      op: "create",
      isRaw: true,
      contexts: [
        {
          contextTable: "project_attachment",
          contextId: 88,
          contextKey: null,
          relationRole: "self",
        },
        {
          contextTable: "project",
          contextId: 44,
          contextKey: null,
          relationRole: "owner",
        },
        {
          contextTable: "customer",
          contextId: 12,
          contextKey: null,
          relationRole: "customer",
        },
      ],
    }));

    const [{ messageText }] = insertJournalEntryMock.mock.calls[0] as [{ messageText: string }];
    expect(messageText).toContain("\"tableName\":\"project_attachment\"");
    expect(messageText).toContain("\"projectId\":44");
  });

  it("resolves appointment parent contexts from the current snapshot without an extra repository lookup", async () => {
    insertJournalEntryMock.mockResolvedValueOnce(1);

    await recordJournalEntry({
      tableName: "appointment",
      recordId: 21,
      op: "delete",
      snapshot: {
        id: 21,
        projectId: 8,
        customerId: 5,
        title: "Termin 21",
      },
      messageText: "Termin 21 geloescht",
    });

    expect(getAppointmentHierarchyMock).not.toHaveBeenCalled();
    expect(insertJournalEntryMock).toHaveBeenCalledWith(expect.objectContaining({
      contexts: [
        {
          contextTable: "appointment",
          contextId: 21,
          contextKey: null,
          relationRole: "self",
        },
        {
          contextTable: "project",
          contextId: 8,
          contextKey: null,
          relationRole: "project",
        },
        {
          contextTable: "customer",
          contextId: 5,
          contextKey: null,
          relationRole: "customer",
        },
      ],
    }));
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

  it("maps note owners to journal contexts including transitive parent contexts", async () => {
    listNoteOwnersMock.mockResolvedValueOnce([
      { contextTable: "project", contextId: 7, contextKey: null, relationRole: "owner" },
      { contextTable: "calendar_week", contextId: null, contextKey: "2026-18-3", relationRole: "owner" },
    ]);
    getProjectHierarchyMock.mockResolvedValueOnce({
      projectId: 7,
      customerId: 3,
    });

    const result = await listNoteContexts(99);

    expect(result).toEqual([
      { tableName: "project", recordId: 7, recordKey: null, relationRole: "owner" },
      { tableName: "calendar_week", recordId: null, recordKey: "2026-18-3", relationRole: "owner" },
      { tableName: "customer", recordId: 3, relationRole: "customer" },
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

  it("builds a stable tour self context", () => {
    expect(buildTourContext(17)).toEqual({
      tableName: "tour",
      recordId: 17,
      relationRole: "self",
    });
  });
});
