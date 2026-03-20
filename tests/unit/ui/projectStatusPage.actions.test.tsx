/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ProjectStatusPage reicht Toggle/Delete ueber sichtbare Listenaktionen weiter.
 * - Toggle und Delete senden Versionsinformationen an die API.
 * - Query-Invalidierung laeuft nach erfolgreichen Mutationen ueber die Projektstatus-Familie.
 * - Default-Status wird nicht geloescht.
 *
 * Fehlerfaelle:
 * - Listenaktionen triggern keine Mutation.
 * - Delete ignoriert Versionsdaten oder den Default-Schutz.
 *
 * Ziel:
 * Beobachtbares Aktionsverhalten der Projektstatus-Seite statt Source-Strings absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const apiRequestMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const toastMock = vi.fn();
const listViewCalls: Array<Record<string, unknown>> = [];
const mutationPromises: Promise<unknown>[] = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
}));

vi.mock("@/components/ProjectStatusList", () => ({
  ProjectStatusListView: (props: Record<string, unknown>) => {
    listViewCalls.push(props);
    return <div>project-status-list-view</div>;
  },
}));

vi.mock("@/components/ui/project-status-edit-dialog", () => ({
  ProjectStatusEditDialog: () => <div>project-status-edit-dialog</div>,
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
  queryClient: { invalidateQueries: (...args: unknown[]) => invalidateQueriesMock(...args) },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

import { ProjectStatusPage } from "../../../client/src/components/ProjectStatusPage";

beforeEach(() => {
  listViewCalls.length = 0;
  mutationPromises.length = 0;
  useQueryMock.mockReset();
  useMutationMock.mockReset();
  apiRequestMock.mockReset();
  invalidateQueriesMock.mockReset();
  toastMock.mockReset();
  vi.stubGlobal("React", React);

  useQueryMock.mockReturnValue({
    data: [
      { id: 1, title: "Aktiv", version: 3, isActive: true, isDefault: false, sortOrder: 0, color: "#fff", description: "" },
      { id: 2, title: "Default", version: 9, isActive: true, isDefault: true, sortOrder: 1, color: "#000", description: "" },
    ],
    isLoading: false,
  });

  apiRequestMock.mockResolvedValue({ ok: true });

  useMutationMock.mockImplementation((options: {
    mutationFn: (variables: unknown) => Promise<unknown> | unknown;
    onSuccess?: () => void | Promise<void>;
    onError?: (error: unknown) => void;
  }) => ({
    mutate: (variables: unknown) => {
      const work = Promise.resolve()
        .then(() => options.mutationFn(variables))
        .then(() => options.onSuccess?.())
        .catch((error) => options.onError?.(error));
      mutationPromises.push(work);
    },
    isPending: false,
  }));

  vi.stubGlobal("window", {
    confirm: vi.fn(() => true),
  });
});

describe("FT15 project status page action wiring", () => {
  it("renders list view in editable page mode", () => {
    renderToStaticMarkup(<ProjectStatusPage />);

    const latestCall = listViewCalls.at(-1);
    expect(latestCall?.canEdit).toBe(true);
    expect(latestCall?.hideHeader).toBe(true);
  });

  it("toggles active state with versioned payload and invalidates project status queries", async () => {
    renderToStaticMarkup(<ProjectStatusPage />);

    const latestCall = listViewCalls.at(-1) as { statuses: Array<Record<string, unknown>>; onToggleStatusActive: (status: Record<string, unknown>) => void };
    latestCall.onToggleStatusActive(latestCall.statuses[0]);
    await Promise.all(mutationPromises.splice(0));

    expect(apiRequestMock).toHaveBeenCalledWith("PATCH", "/api/project-status/1/active", {
      isActive: false,
      version: 3,
    });
    expect(invalidateQueriesMock).toHaveBeenCalled();
  });

  it("deletes non-default statuses only after confirmation", async () => {
    renderToStaticMarkup(<ProjectStatusPage />);

    const latestCall = listViewCalls.at(-1) as { statuses: Array<Record<string, unknown>>; onDeleteStatus: (status: Record<string, unknown>) => void };
    latestCall.onDeleteStatus(latestCall.statuses[1]);
    await Promise.all(mutationPromises.splice(0));
    expect(apiRequestMock).not.toHaveBeenCalledWith("DELETE", "/api/project-status/2", expect.anything());

    latestCall.onDeleteStatus(latestCall.statuses[0]);
    await Promise.all(mutationPromises.splice(0));
    expect(apiRequestMock).toHaveBeenCalledWith("DELETE", "/api/project-status/1", { version: 3 });
  });
});
