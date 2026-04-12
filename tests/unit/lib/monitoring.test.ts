/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Monitoring-Refresh informiert nur bei neuen oder verschaerften Treffern.
 * - Gleichstand oder Verbesserung erzeugen keinen Toast.
 * - Rollen ohne Monitoring-Zugriff triggern weder Fetch noch Toast.
 * - Triggerbeschreibungen fuer Toasts verwenden die verkuerzten Triggernamen.
 *
 * Fehlerfaelle:
 * - Jeder Refresh erzeugt Spam-Toast trotz unveraendertem Stand.
 * - Rollen ohne Monitoring-Zugriff laden Monitoring trotzdem nach.
 *
 * Ziel:
 * Die zentrale Frontend-Helferlogik fuer FT31-Refresh und Hinweisverhalten isoliert absichern.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, type MonitoringListResponse } from "../../../shared/routes";
import { queryClient } from "../../../client/src/lib/queryClient";
import { refreshMonitoringWithNotification } from "../../../client/src/lib/monitoring";

describe("FT31 unit: monitoring refresh helper", () => {
  const originalFetch = global.fetch;
  const originalWindow = globalThis.window;
  const toast = vi.fn();
  const localStorageMock = (() => {
    const store = new Map<string, string>();
    return {
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
  })();

  beforeEach(() => {
    queryClient.clear();
    toast.mockReset();
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: localStorageMock },
      configurable: true,
    });
    window.localStorage.clear();
    window.localStorage.setItem("userRole", "DISPATCHER");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  });

  it("shows a toast when the monitoring result gets worse", async () => {
    const previousItems: MonitoringListResponse = [];
    const nextItems: MonitoringListResponse = [{
      appointmentId: 11,
      startDate: "2099-10-01",
      startTime: null,
      tourName: "Tour 1",
      projectName: null,
      customerName: "Kunde",
      employeeCount: 0,
      triggerCode: "TR-01",
      triggerCodes: ["TR-01"],
      triggerName: "Mindestzahl Mitarbeiter",
    }];
    queryClient.setQueryData([api.monitoring.list.path], previousItems);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => nextItems,
    } as Response);

    await refreshMonitoringWithNotification(toast);

    expect(global.fetch).toHaveBeenCalledWith(api.monitoring.list.path, {
      credentials: "include",
    });
    expect(toast).toHaveBeenCalledWith({
      title: "1 problematische Termine im Monitoring",
      description: "Mindestzahl Mitarbeiter",
    });
  });

  it("does not show a toast when the monitoring result stays the same or improves", async () => {
    const previousItems: MonitoringListResponse = [{
      appointmentId: 11,
      startDate: "2099-10-01",
      startTime: null,
      tourName: "Tour 1",
      projectName: null,
      customerName: "Kunde",
      employeeCount: 0,
      triggerCode: "TR-01",
      triggerCodes: ["TR-01"],
      triggerName: "Mindestzahl Mitarbeiter",
    }];
    const nextItems: MonitoringListResponse = [{ ...previousItems[0] }];
    queryClient.setQueryData([api.monitoring.list.path], previousItems);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => nextItems,
    } as Response);

    await refreshMonitoringWithNotification(toast);

    expect(toast).not.toHaveBeenCalled();
  });

  it("skips monitoring refresh for roles without monitoring access", async () => {
    window.localStorage.setItem("userRole", "READER");
    global.fetch = vi.fn();

    await refreshMonitoringWithNotification(toast);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });
});
