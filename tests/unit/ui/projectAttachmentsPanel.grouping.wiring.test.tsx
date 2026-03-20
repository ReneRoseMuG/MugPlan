/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ProjectAttachmentsPanel rendert getrennte Projekt- und Kundensektionen.
 * - Im Edit-Fall wird der Kundenkontext ueber das Projekt aufgeloest.
 * - Im Create-Fall werden pending Projektanhaenge und direkter Kundenkontext angezeigt.
 *
 * Fehlerfaelle:
 * - Die gruppierte Dokumentenansicht faellt in einen einzigen Bereich zurueck.
 * - Pending Projektanhaenge oder Kundendokumente verschwinden im Create-Fall.
 *
 * Ziel:
 * Beobachtbares Panel-Verhalten fuer Projekt-/Kundendokumente statt Source-Assertions absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const splitPanelCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
}));

vi.mock("@/components/SplitAttachmentsPanel", () => ({
  SplitAttachmentsPanel: (props: Record<string, unknown>) => {
    splitPanelCalls.push(props);
    return <div>split-attachments-panel</div>;
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

import { ProjectAttachmentsPanel } from "../../../client/src/components/ProjectAttachmentsPanel";

beforeEach(() => {
  splitPanelCalls.length = 0;
  useMutationMock.mockReset();
  useQueryMock.mockReset();
  vi.stubGlobal("React", React);
  useMutationMock.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  useQueryMock.mockImplementation((options: { queryKey?: unknown }) => {
    const key = options.queryKey;
    if (Array.isArray(key) && key[0] === "/api/projects" && key[2] === "attachments") {
      return {
        data: [{ id: 10, originalName: "projekt.pdf", mimeType: "application/pdf" }],
        isLoading: false,
      };
    }

    if (Array.isArray(key) && key[0] === "/api/projects" && key[1] === 7 && key.length === 2) {
      return {
        data: { project: { customerId: 55 } },
        isLoading: false,
      };
    }

    if (Array.isArray(key) && key[0] === "/api/customers" && key[1] === 55 && key[2] === "attachments") {
      return {
        data: [{ id: 20, originalName: "kunde.pdf", mimeType: "application/pdf" }],
        isLoading: false,
      };
    }

    return { data: [], isLoading: false };
  });

  vi.stubGlobal("URL", {
    createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FT24 UI: project attachments panel grouping wiring", () => {
  it("renders grouped project and customer sections in edit mode", () => {
    renderToStaticMarkup(<ProjectAttachmentsPanel projectId={7} isEditing customerId={null} />);

    const latestCall = splitPanelCalls.at(-1);
    const sections = Array.isArray(latestCall?.sections) ? latestCall.sections : [];
    expect(String(sections[0]?.title)).toBe("Projektdokumente");
    expect(Array.isArray(sections[0]?.items) ? sections[0].items.length : 0).toBe(1);
    expect(String(sections[1]?.title)).toBe("Kundendokumente");
    expect(Array.isArray(sections[1]?.items) ? sections[1].items.length : 0).toBe(1);
  });

  it("uses pending project attachments and direct customer context in create mode", () => {
    const pendingFile = new File(["draft"], "draft.pdf", { type: "application/pdf" });

    renderToStaticMarkup(
      <ProjectAttachmentsPanel
        isEditing={false}
        customerId={55}
        pendingProjectAttachments={[{ id: -1, originalName: "draft.pdf", mimeType: "application/pdf", file: pendingFile }]}
        onUploadPendingProjectAttachment={vi.fn()}
      />,
    );

    const latestCall = splitPanelCalls.at(-1);
    const sections = Array.isArray(latestCall?.sections) ? latestCall.sections : [];
    expect(Array.isArray(sections[0]?.items) ? sections[0].items.length : 0).toBe(1);
    expect(sections[0]?.canUpload).toBe(true);
    expect(Array.isArray(sections[1]?.items) ? sections[1].items.length : 0).toBe(1);
  });
});
