/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekt-, Kunden- und Mitarbeiter-Dokumentenpanels geben ihre panel-spezifischen HelpKeys weiter.
 *
 * Fehlerfaelle:
 * - Dokumentenpanels verlieren ihren kontextbezogenen HelpKey.
 *
 * Ziel:
 * HelpKey-Verhalten der Attachments-Panels im Laufzeit-Render absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === "/api/projects" && queryKey.length === 2) {
      return { data: { project: { customerId: 21 } }, isLoading: false };
    }
    if (queryKey[0] === "/api/customers" && queryKey[2] === "project-attachments") {
      return { data: { items: [], hasMore: false }, isLoading: false };
    }
    return { data: [], isLoading: false };
  },
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/components/SplitAttachmentsPanel", () => ({
  SplitAttachmentsPanel: ({ helpKey }: { helpKey?: string }) => <div>{helpKey}</div>,
}));

vi.mock("@/components/AttachmentsPanel", () => ({
  AttachmentsPanel: ({ helpKey }: { helpKey?: string }) => <div>{helpKey}</div>,
}));

import { CustomerAttachmentsPanel } from "../../../client/src/components/CustomerAttachmentsPanel";
import { EmployeeAttachmentsPanel } from "../../../client/src/components/EmployeeAttachmentsPanel";
import { ProjectAttachmentsPanel } from "../../../client/src/components/ProjectAttachmentsPanel";

describe("FT16 attachments panels help key wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("keeps panel-specific help keys for project, customer and employee attachments", () => {
    const projectMarkup = renderToStaticMarkup(
      <ProjectAttachmentsPanel projectId={11} customerId={21} isEditing />,
    );
    const customerMarkup = renderToStaticMarkup(<CustomerAttachmentsPanel customerId={31} />);
    const employeeMarkup = renderToStaticMarkup(<EmployeeAttachmentsPanel employeeId={41} />);

    expect(projectMarkup).toContain("projects.sidebar.attachments");
    expect(customerMarkup).toContain("customers.sidebar.attachments");
    expect(employeeMarkup).toContain("employees.sidebar.attachments");
  });
});
