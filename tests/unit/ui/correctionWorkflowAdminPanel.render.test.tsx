/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Admin-Migrationspanel rendert die Sauna-Projekttitel-Migration.
 * - Preview- und Apply-Buttons sind als stabile UI-Aktionen vorhanden.
 *
 * Fehlerfälle:
 * - Der Migrationsview fehlt im Admin-Bereich oder verliert seine Aktionsbuttons.
 *
 * Ziel:
 * Die statische Verdrahtung des neuen Admin-Migrationsviews absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
    <button type="button" data-testid={String(props["data-testid"] ?? "")} disabled={Boolean(props.disabled)}>
      {children}
    </button>
  ),
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: {
    invalidateQueries: vi.fn(async () => undefined),
  },
}));

import { CorrectionWorkflowAdminPanel } from "../../../client/src/components/CorrectionWorkflowAdminPanel";

describe("CorrectionWorkflowAdminPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the sauna project title migration actions", () => {
    const html = renderToStaticMarkup(<CorrectionWorkflowAdminPanel />);

    expect(html).toContain("correction-workflow-admin-panel");
    expect(html).toContain("Projekt-Titel aus Sauna-Modell");
    expect(html).toContain("button-preview-sauna-project-title-migration");
    expect(html).toContain("button-apply-sauna-project-title-migration");
    expect(html).toContain("Noch keine Vorschau vorhanden.");
  });
});
