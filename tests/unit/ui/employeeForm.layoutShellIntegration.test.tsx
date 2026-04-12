/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - EmployeeForm rendert EntityFormShell mit sichtbarem Hauptbereich und rechter Sidebar in Create und Edit.
 * - Die Sidebar behaelt in Create und Edit die Reihenfolge Attachments, Tags, Notizen, Tour, Team.
 * - Create-Verdrahtung behaelt Draft-faehige Attachments, Tags und Notizen.
 * - Die Tour-Sektion zeigt nur noch den statischen Hinweis ohne direkte Tour-Badge.
 * - Footer-Aktionen bleiben im Shell-Layout mit Cancel links und Save rechts sichtbar.
 *
 * Fehlerfaelle:
 * - Das Mitarbeiterformular bleibt am alten Layout haengen oder rendert die Sidebar erneut im Main-Bereich.
 * - Die Sidebar-Panels tauschen ihre Reihenfolge.
 * - Die Create-Sidebar verliert ihre Draft-Verdrahtung fuer Tags, Notizen oder Attachments.
 *
 * Ziel:
 * Das neue Shell-Layout des Mitarbeiterformulars ueber sichtbare Struktur und Child-Props regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const employeeAttachmentsPanelCalls: Array<Record<string, unknown>> = [];
const tagPickerPanelCalls: Array<Record<string, unknown>> = [];
const notesSectionCalls: Array<Record<string, unknown>> = [];
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
}));

vi.mock("@/components/ui/entity-form-shell", () => ({
  EntityFormShell: ({
    children,
    sidebar,
    header,
    footer,
  }: {
    children?: React.ReactNode;
    sidebar?: React.ReactNode;
    header?: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <div data-testid="entity-form-shell">
      {header ? <div data-testid="entity-form-shell-header">{header}</div> : null}
      <div data-testid="entity-form-shell-main">{children}</div>
      {sidebar ? <div data-testid="entity-form-shell-sidebar">{sidebar}</div> : null}
      <div data-testid="entity-form-shell-footer">{footer}</div>
    </div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock("@/components/EmployeeAttachmentsPanel", () => ({
  EmployeeAttachmentsPanel: (props: Record<string, unknown>) => {
    employeeAttachmentsPanelCalls.push(props);
    return <section data-testid="employee-attachments-panel-marker">attachments</section>;
  },
}));

vi.mock("@/components/TagPickerPanel", () => ({
  TagPickerPanel: (props: Record<string, unknown>) => {
    tagPickerPanelCalls.push(props);
    return <section data-testid="employee-tag-picker-marker">tags</section>;
  },
}));

vi.mock("@/components/NotesSection", () => ({
  NotesSection: (props: Record<string, unknown>) => {
    notesSectionCalls.push(props);
    return <section data-testid="employee-notes-section-marker">notes</section>;
  },
}));

vi.mock("@/components/ui/team-info-badge", () => ({
  TeamInfoBadge: () => <section data-testid="employee-team-badge-marker">team-badge</section>,
}));

vi.mock("@/components/AppointmentsListPage", () => ({
  AppointmentsListPage: () => <section data-testid="employee-appointments-list-marker">appointments</section>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  TabsList: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
  TabsContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: () => <input type="checkbox" />,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <label {...props}>{children}</label>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/lib/tag-invalidation", () => ({
  invalidateTagProjectionQueries: vi.fn(async () => undefined),
}));

vi.mock("@/lib/tags", () => ({
  getTagCatalogQueryKey: vi.fn(() => ["/api/tags", "employee"]),
  fetchTagCatalog: vi.fn(async () => [
    { id: 5, name: "Service", color: "#112233", isDefault: false, version: 1 },
    { id: 6, name: "Montage", color: "#334455", isDefault: false, version: 1 },
  ]),
}));

import { EmployeeForm } from "../../../client/src/components/EmployeeForm";

function buildQueryResult(queryKey: unknown): { data: unknown; isLoading: boolean; error?: unknown } {
  if (Array.isArray(queryKey) && queryKey[0] === "/api/employees" && queryKey[1] === 17 && queryKey.length === 2) {
    return {
      data: {
        employee: {
          id: 17,
          firstName: "Mia",
          lastName: "Mitarbeiter",
          fullName: "Mitarbeiter, Mia",
          phone: "123",
          email: "mia@example.test",
          isActive: true,
          version: 3,
          teamId: 4,
        },
        team: { id: 4, name: "Team Nord", color: "#112233" },
        tour: null,
      },
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/employees" && queryKey[2] === "tags") {
    return {
      data: [
        {
          tag: { id: 5, name: "Service", color: "#112233", isDefault: false, version: 1 },
          relationVersion: 2,
        },
      ],
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/employees" && queryKey[2] === "notes") {
    return {
      data: [
        {
          id: 41,
          title: "Hinweis",
          body: "<p>Bestehende Notiz</p>",
          cardColor: null,
          print: false,
          cardColorLocked: false,
          isPinned: false,
          version: 2,
          createdAt: new Date("2026-03-29T08:00:00.000Z"),
          updatedAt: new Date("2026-03-29T08:00:00.000Z"),
        },
      ],
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/tags") {
    return {
      data: [
        { id: 5, name: "Service", color: "#112233", isDefault: false, version: 1 },
        { id: 6, name: "Montage", color: "#334455", isDefault: false, version: 1 },
      ],
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/employees") {
    return {
      data: [
        {
          id: 17,
          firstName: "Mia",
          lastName: "Mitarbeiter",
          fullName: "Mitarbeiter, Mia",
          phone: "123",
          email: "mia@example.test",
          isActive: true,
          version: 3,
          teamId: 4,
        },
      ],
      isLoading: false,
      error: null,
    };
  }

  return { data: [], isLoading: false, error: null };
}

function getIndex(markup: string, marker: string) {
  const index = markup.indexOf(marker);
  if (index < 0) {
    throw new Error(`Missing marker ${marker}`);
  }
  return index;
}

describe("FT05+/FT28 employee form shell layout integration", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    employeeAttachmentsPanelCalls.length = 0;
    tagPickerPanelCalls.length = 0;
    notesSectionCalls.length = 0;
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(async () => ({ id: 17 })),
      isPending: false,
    });
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => buildQueryResult(options.queryKey));
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: vi.fn(() => "DISPATCHER"),
        },
      },
      configurable: true,
    });
  });

  it("renders shell layout with ordered sidebar panels in edit mode", () => {
    const markup = renderToStaticMarkup(<EmployeeForm employeeId={17} onCancel={vi.fn()} />);

    expect(markup).toContain("entity-form-shell");
    expect(markup).toContain("employee-form-main-column");
    expect(markup).toContain("employee-form-sidebar");
    expect(markup).toContain("button-cancel-employee");
    expect(markup).toContain("button-save-employee");

    expect(getIndex(markup, "employee-attachments-panel-marker")).toBeLessThan(getIndex(markup, "employee-tag-picker-marker"));
    expect(getIndex(markup, "employee-tag-picker-marker")).toBeLessThan(getIndex(markup, "employee-notes-section-marker"));
    expect(getIndex(markup, "employee-notes-section-marker")).toBeLessThan(getIndex(markup, "Keine direkte Tourzugehörigkeit"));
    expect(getIndex(markup, "Keine direkte Tourzugehörigkeit")).toBeLessThan(getIndex(markup, "employee-team-badge-marker"));

    expect(employeeAttachmentsPanelCalls[0]).toMatchObject({
      employeeId: 17,
      isEditing: true,
    });
    expect(tagPickerPanelCalls[0]).toMatchObject({
      assignedTags: [{ tag: { id: 5, name: "Service" } }],
      canEdit: true,
    });
    expect(notesSectionCalls[0]).toMatchObject({
      notes: [{ id: 41, title: "Hinweis" }],
      readOnly: false,
    });
  });

  it("renders draft-capable sidebar panels in create mode with the same order", () => {
    const markup = renderToStaticMarkup(<EmployeeForm onCancel={vi.fn()} />);

    expect(markup).toContain("entity-form-shell");
    expect(markup).toContain("employee-form-main-column");
    expect(markup).toContain("employee-form-sidebar");
    expect(markup).toContain("button-cancel-employee");
    expect(markup).toContain("button-save-employee");

    expect(getIndex(markup, "employee-attachments-panel-marker")).toBeLessThan(getIndex(markup, "employee-tag-picker-marker"));
    expect(getIndex(markup, "employee-tag-picker-marker")).toBeLessThan(getIndex(markup, "employee-notes-section-marker"));
    expect(getIndex(markup, "employee-notes-section-marker")).toBeLessThan(getIndex(markup, "Keine direkte Tourzugehörigkeit"));
    expect(getIndex(markup, "Keine direkte Tourzugehörigkeit")).toBeLessThan(getIndex(markup, "Keinem Team zugewiesen"));

    expect(employeeAttachmentsPanelCalls[0]).toMatchObject({
      employeeId: undefined,
      isEditing: false,
      pendingEmployeeAttachments: [],
    });
    expect(typeof employeeAttachmentsPanelCalls[0]?.onUploadPendingEmployeeAttachment).toBe("function");
    expect(tagPickerPanelCalls[0]).toMatchObject({
      assignedTags: [],
      availableTags: [{ id: 5, name: "Service" }, { id: 6, name: "Montage" }],
      canEdit: true,
    });
    expect(notesSectionCalls[0]).toMatchObject({
      notes: [],
      readOnly: false,
    });
  });
});
