/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projektattachment-Uploads invalidieren die lokale Projektliste sowie Kalender- und Appointment-Context-Projektionen.
 * - Kundenattachment-Uploads invalidieren die lokale Kundenliste sowie Kalender- und Appointment-Context-Projektionen.
 *
 * Fehlerfaelle:
 * - Upload aktualisiert nur die lokale Liste und laesst Hover oder Terminformular stale.
 * - Upload invalidiert den Appointment-Context nicht.
 *
 * Ziel:
 * Die Upload-Verdrahtung fuer aggregierte Attachment-Projektionen im Frontend absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MutationOptions = {
  onSuccess?: () => void | Promise<void>;
};

const { invalidateQueriesMock } = vi.hoisted(() => ({
  invalidateQueriesMock: vi.fn(async () => undefined),
}));

const useQueryMock = vi.fn();
const mutationOptions: MutationOptions[] = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: unknown }) => useQueryMock(options),
  useMutation: (options: MutationOptions) => {
    mutationOptions.push(options);
    return {
      mutate: vi.fn(),
      isPending: false,
    };
  },
}));

vi.mock("@/components/SplitAttachmentsPanel", () => ({
  SplitAttachmentsPanel: () => <div>split-attachments-panel</div>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: (...args: unknown[]) => invalidateQueriesMock(...args) },
}));

import { CustomerAttachmentsPanel } from "../../../client/src/components/CustomerAttachmentsPanel";
import { ProjectAttachmentsPanel } from "../../../client/src/components/ProjectAttachmentsPanel";

function buildQueryResult(queryKey: unknown) {
  if (Array.isArray(queryKey) && queryKey[0] === "/api/projects" && queryKey[2] === "attachments") {
    return { data: [], isLoading: false };
  }
  if (Array.isArray(queryKey) && queryKey[0] === "/api/projects" && queryKey[1] === 7 && queryKey.length === 2) {
    return { data: { project: { customerId: 55 } }, isLoading: false };
  }
  if (Array.isArray(queryKey) && queryKey[0] === "/api/customers" && queryKey[2] === "attachments") {
    return { data: [], isLoading: false };
  }
  if (Array.isArray(queryKey) && queryKey[0] === "/api/customers" && queryKey[2] === "project-attachments") {
    return {
      data: { items: [], totalProjects: 0, totalAttachments: 0, page: 1, pageSize: 20, hasMore: false },
      isLoading: false,
    };
  }
  return { data: [], isLoading: false };
}

async function invokeLatestMutationSuccess() {
  const latest = mutationOptions.at(-1);
  expect(latest?.onSuccess).toBeDefined();
  await latest?.onSuccess?.();
}

describe("FT24 UI: attachment projection invalidation wiring", () => {
  beforeEach(() => {
    mutationOptions.length = 0;
    invalidateQueriesMock.mockClear();
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => buildQueryResult(options.queryKey));
    vi.stubGlobal("React", React);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("invalidiert nach Projektattachment-Upload lokale Liste, Kalender und Appointment-Context", async () => {
    renderToStaticMarkup(<ProjectAttachmentsPanel projectId={7} customerId={55} isEditing />);

    await invokeLatestMutationSuccess();

    expect(invalidateQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["/api/projects", 7, "attachments"] }),
    );
    expect(invalidateQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["calendarAppointments"] }),
    );
    expect(invalidateQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ predicate: expect.any(Function) }),
    );
  });

  it("invalidiert nach Kundenattachment-Upload lokale Liste, Kalender und Appointment-Context", async () => {
    renderToStaticMarkup(<CustomerAttachmentsPanel customerId={55} />);

    await invokeLatestMutationSuccess();

    expect(invalidateQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["/api/customers", 55, "attachments"] }),
    );
    expect(invalidateQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["calendarAppointments"] }),
    );
    expect(invalidateQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ predicate: expect.any(Function) }),
    );
  });
});
