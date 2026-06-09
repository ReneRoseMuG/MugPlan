/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - dispatchCalDavUpsert fuehrt keinen CalDAV-Upsert aus und schreibt kein Sync-Log, wenn CalDAV nicht konfiguriert ist.
 * - dispatchCalDavDelete fuehrt keinen CalDAV-Delete aus und schreibt kein Sync-Log, wenn CalDAV nicht konfiguriert ist.
 * - dispatchCalDavUpsert fuehrt den Upsert aus, setzt die externalEventId und schreibt ein success-Log, wenn CalDAV konfiguriert ist.
 * - dispatchCalDavDelete fuehrt den Delete aus und schreibt ein success-Log, wenn CalDAV konfiguriert ist.
 *
 * Fehlerfaelle:
 * - Nicht konfigurierter CalDAV-Zustand darf keine Logzeilen erzeugen (kein skipped-Rauschen).
 *
 * Ziel:
 * Das Konfig-Gate des CalDAV-Dispatchers isoliert absichern: ohne Konfiguration entsteht kein Sync-Versuch und kein Log,
 * mit Konfiguration bleibt der bestehende Sync- und Logpfad erhalten.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/services/caldavService", () => ({
  isCaldavConfigured: vi.fn(),
  upsertAppointmentInCaldav: vi.fn(),
  deleteAppointmentInCaldav: vi.fn(),
}));

vi.mock("../../../server/repositories/appointmentsRepository", () => ({
  setAppointmentExternalEventId: vi.fn(),
}));

vi.mock("../../../server/repositories/calendarSyncRepository", () => ({
  createCalendarSyncLog: vi.fn(),
}));

vi.mock("../../../server/lib/logger", () => ({
  logWarn: vi.fn(),
}));

import * as caldavService from "../../../server/services/caldavService";
import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import * as calendarSyncRepository from "../../../server/repositories/calendarSyncRepository";
import { dispatchCalDavDelete, dispatchCalDavUpsert } from "../../../server/services/caldavSyncDispatcher";

const caldavMock = vi.mocked(caldavService);
const apptRepoMock = vi.mocked(appointmentsRepository);
const syncRepoMock = vi.mocked(calendarSyncRepository);

async function waitUntil(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("waitUntil timeout");
}

async function flushQueue(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 25));
}

describe("FT07 unit: caldavSyncDispatcher Konfig-Gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("schreibt kein Log und versucht keinen Upsert, wenn CalDAV nicht konfiguriert ist", async () => {
    caldavMock.isCaldavConfigured.mockReturnValue(false);

    dispatchCalDavUpsert(123);
    await flushQueue();

    expect(caldavMock.isCaldavConfigured).toHaveBeenCalled();
    expect(caldavMock.upsertAppointmentInCaldav).not.toHaveBeenCalled();
    expect(syncRepoMock.createCalendarSyncLog).not.toHaveBeenCalled();
  });

  it("schreibt kein Log und versucht keinen Delete, wenn CalDAV nicht konfiguriert ist", async () => {
    caldavMock.isCaldavConfigured.mockReturnValue(false);

    dispatchCalDavDelete(123, "ext-1");
    await flushQueue();

    expect(caldavMock.isCaldavConfigured).toHaveBeenCalled();
    expect(caldavMock.deleteAppointmentInCaldav).not.toHaveBeenCalled();
    expect(syncRepoMock.createCalendarSyncLog).not.toHaveBeenCalled();
  });

  it("fuehrt den Upsert aus und schreibt ein success-Log, wenn CalDAV konfiguriert ist", async () => {
    caldavMock.isCaldavConfigured.mockReturnValue(true);
    caldavMock.upsertAppointmentInCaldav.mockResolvedValue({ externalEventId: "ext-42" });
    apptRepoMock.setAppointmentExternalEventId.mockResolvedValue(undefined);
    syncRepoMock.createCalendarSyncLog.mockResolvedValue(undefined);

    dispatchCalDavUpsert(42);

    await waitUntil(() => syncRepoMock.createCalendarSyncLog.mock.calls.length > 0);

    expect(caldavMock.upsertAppointmentInCaldav).toHaveBeenCalledWith(42);
    expect(apptRepoMock.setAppointmentExternalEventId).toHaveBeenCalledWith(42, "ext-42");
    expect(syncRepoMock.createCalendarSyncLog).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentId: 42, action: "upsert", status: "success" }),
    );
  });

  it("fuehrt den Delete aus und schreibt ein success-Log, wenn CalDAV konfiguriert ist", async () => {
    caldavMock.isCaldavConfigured.mockReturnValue(true);
    caldavMock.deleteAppointmentInCaldav.mockResolvedValue({ externalEventId: "ext-7" });
    syncRepoMock.createCalendarSyncLog.mockResolvedValue(undefined);

    dispatchCalDavDelete(7, "ext-7");

    await waitUntil(() => syncRepoMock.createCalendarSyncLog.mock.calls.length > 0);

    expect(caldavMock.deleteAppointmentInCaldav).toHaveBeenCalledWith(7, "ext-7");
    expect(syncRepoMock.createCalendarSyncLog).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentId: 7, action: "delete", status: "success" }),
    );
  });
});
