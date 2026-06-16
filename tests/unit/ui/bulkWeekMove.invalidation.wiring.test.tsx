/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Nach erfolgreichem Sammelverschieben (Execute) werden die vier kalendernahen Queries invalidiert:
 *   calendarAppointments, calendarWeekLaneEmployeePreviews, calendarBlockedTourWeeks, /api/appointments/list.
 * - Der Execute-Erfolgspfad (onSuccess) wartet das Neuladen ab: Er schließt erst ab, wenn die
 *   Invalidierung abgeschlossen ist (asynchroner Vorgang wird erwartet, nicht nur angestoßen).
 *
 * Fehlerfälle:
 * - onSuccess meldet "fertig", obwohl die Cache-Invalidierung noch läuft (unbeaufsichtigter Vorgang).
 *
 * Ziel:
 * Die Invalidierungs-Verdrahtung der KW-Sammelverschiebung absichern und festschreiben, dass der
 * Erfolgspfad das Neuladen abwartet (UC-258 / TKT-90).
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MutationOptions = {
  mutationFn?: (input: any) => Promise<unknown> | unknown;
  onSuccess?: (...args: any[]) => Promise<unknown> | unknown;
};

const queryInvalidateMock = vi.fn(async () => undefined);
const apiRequestMock = vi.fn(async () => ({ json: async () => ({}) }));
const useQueryMock = vi.fn(() => ({ data: [], isLoading: false }));
const setSettingMock = vi.fn(async () => undefined);
const mutationOptions: MutationOptions[] = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: unknown }) => useQueryMock(options),
  useMutation: (options: MutationOptions) => {
    mutationOptions.push(options);
    return { mutate: vi.fn(), mutateAsync: vi.fn(), reset: vi.fn(), data: null, isPending: false, error: null };
  },
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
  queryClient: { invalidateQueries: (...args: unknown[]) => queryInvalidateMock(...args) },
}));

vi.mock("@/providers/SettingsProvider", () => ({
  useSettingsContext: () => ({ settingsByKey: new Map(), setSetting: setSettingMock }),
}));

vi.mock("@/lib/tags", () => ({
  getTagCatalogQueryKey: (domain: string) => ["/api/tags", domain],
  fetchTagCatalog: vi.fn(async () => []),
}));

import { useBulkWeekMove } from "@/hooks/useBulkWeekMove";

function Harness() {
  useBulkWeekMove({ open: true, sourceWeekDate: "2026-07-20" });
  return null;
}

// Die Execute-Mutation ist die einzige mit onSuccess (Preview hat keinen Erfolgspfad).
function getExecuteMutation(): MutationOptions {
  const execute = mutationOptions.find((options) => typeof options.onSuccess === "function");
  if (!execute) {
    throw new Error("Execute-Mutation (mit onSuccess) nicht gefunden");
  }
  return execute;
}

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

describe("KW-Sammelverschiebung – Invalidierungsverdrahtung (useBulkWeekMove)", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    mutationOptions.length = 0;
    queryInvalidateMock.mockReset();
    queryInvalidateMock.mockImplementation(async () => undefined);
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation(async () => ({ json: async () => ({}) }));
    useQueryMock.mockReset();
    useQueryMock.mockImplementation(() => ({ data: [], isLoading: false }));
    setSettingMock.mockClear();
    renderToStaticMarkup(<Harness />);
  });

  it("invalidiert nach erfolgreichem Execute die vier kalendernahen Queries", async () => {
    await getExecuteMutation().onSuccess?.({ moved: [], failed: [] });

    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["calendarAppointments"] });
    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["calendarBlockedTourWeeks"] });
    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["/api/appointments/list"] });
  });

  it("wartet im Erfolgspfad das Neuladen ab (onSuccess schließt erst nach der Invalidierung ab)", async () => {
    let releaseInvalidation: () => void = () => undefined;
    const invalidationGate = new Promise<undefined>((resolve) => {
      releaseInvalidation = () => resolve(undefined);
    });
    queryInvalidateMock.mockImplementation(() => invalidationGate);

    const settled = vi.fn();
    void Promise.resolve(getExecuteMutation().onSuccess?.({ moved: [], failed: [] })).then(settled);

    // Ein Microtask: Wartet der Erfolgspfad das Neuladen ab, ist er jetzt noch NICHT abgeschlossen.
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();

    // Neuladen abschließen -> erst jetzt darf der Erfolgspfad auflösen.
    releaseInvalidation();
    await flushMicrotasks();
    expect(settled).toHaveBeenCalledTimes(1);
  });
});
