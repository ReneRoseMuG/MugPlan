/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CustomerData rendert EntityFormShell mit sichtbarem Hauptbereich und rechter Sidebar in Create und Edit.
 * - Im Edit-Modus zeigt CustomerData die Haupttabs `Details` und `Journal`; im Create-Modus bleibt der Journal-Tab verborgen.
 * - Das Kundenformular zeigt das neue Feld `Land` im Hauptbereich in Create und Edit an.
 * - Die Sidebar behaelt in Create und Edit die Reihenfolge Projekte, Termine, Attachments, Tags, Notizen.
 * - Create-Verdrahtung behaelt Draft-faehige Tags, Notizen und Attachments.
 * - Footer-Aktionen bleiben im Shell-Layout mit Cancel links und Save rechts sichtbar.
 *
 * Fehlerfaelle:
 * - Das Kundenformular bleibt am alten Layout haengen oder rendert die Sidebar erneut im Main-Bereich.
 * - Der neue Journal-Haupttab erscheint im Create-Modus oder fehlt im Edit-Modus.
 * - Das neue Feld `Land` fehlt im Formular trotz erweitertem Kunden-Adressmodell.
 * - Die Sidebar-Panels tauschen ihre Reihenfolge.
 * - Die Create-Sidebar verliert ihre Draft-Verdrahtung fuer Tags, Notizen oder Attachments.
 *
 * Ziel:
 * Das neue Shell-Layout des Kundenformulars ueber sichtbare Struktur und Child-Props regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const linkedProjectsPanelCalls: Array<Record<string, unknown>> = [];
const customerAppointmentsPanelCalls: Array<Record<string, unknown>> = [];
const customerAttachmentsPanelCalls: Array<Record<string, unknown>> = [];
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

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <label {...props}>{children}</label>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: () => <input type="checkbox" />,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div>skeleton</div>,
}));

vi.mock("@/components/LinkedProjectsPanel", () => ({
  LinkedProjectsPanel: (props: Record<string, unknown>) => {
    linkedProjectsPanelCalls.push(props);
    return <section data-testid="linked-projects-panel-marker">projects</section>;
  },
}));

vi.mock("@/components/CustomerAppointmentsPanel", () => ({
  CustomerAppointmentsPanel: (props: Record<string, unknown>) => {
    customerAppointmentsPanelCalls.push(props);
    return <section data-testid="customer-appointments-panel-marker">appointments</section>;
  },
}));

vi.mock("@/components/CustomerAttachmentsPanel", () => ({
  CustomerAttachmentsPanel: (props: Record<string, unknown>) => {
    customerAttachmentsPanelCalls.push(props);
    return <section data-testid="customer-attachments-panel-marker">attachments</section>;
  },
}));

vi.mock("@/components/TagPickerPanel", () => ({
  TagPickerPanel: (props: Record<string, unknown>) => {
    tagPickerPanelCalls.push(props);
    return <section data-testid="customer-tag-picker-marker">tags</section>;
  },
}));

vi.mock("@/components/NotesSection", () => ({
  NotesSection: (props: Record<string, unknown>) => {
    notesSectionCalls.push(props);
    return <section data-testid="customer-notes-section-marker">notes</section>;
  },
}));

vi.mock("@/components/DocumentExtractionDropzone", () => ({
  DocumentExtractionDropzone: () => <section data-testid="customer-document-extraction-dropzone-marker">dropzone</section>,
}));

vi.mock("@/components/DocumentExtractionDialog", () => ({
  DocumentExtractionDialog: () => <div>dialog</div>,
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
  getTagCatalogQueryKey: vi.fn(() => ["/api/tags", "customer"]),
  fetchTagCatalog: vi.fn(async () => [{ id: 7, name: "Service", color: "#112233", isDefault: false, version: 1 }]),
}));

import { CustomerData } from "../../../client/src/components/CustomerData";

function buildQueryResult(queryKey: unknown): { data: unknown; isLoading: boolean; error?: unknown } {
  if (Array.isArray(queryKey) && queryKey[0] === "/api/customers" && queryKey[1] === 11 && queryKey.length === 2) {
    return {
      data: {
        id: 11,
        customerNumber: "C-11",
        firstName: "Klara",
        lastName: "Kunde",
        fullName: "Kunde, Klara",
        version: 3,
        isActive: true,
        country: "Deutschland",
        tags: [],
      },
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/customers" && queryKey[2] === "tags") {
    return {
      data: [
        {
          tag: { id: 7, name: "Service", color: "#112233", isDefault: false, version: 1 },
          relationVersion: 2,
        },
      ],
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/customers" && queryKey[2] === "notes") {
    return {
      data: [
        {
          id: 41,
          title: "Bestehende Notiz",
          body: "<p>Hinweis</p>",
          cardColor: null,
          print: false,
          cardColorLocked: false,
          isPinned: false,
          version: 2,
          createdAt: new Date("2026-03-22T08:00:00.000Z"),
          updatedAt: new Date("2026-03-22T08:00:00.000Z"),
        },
      ],
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/tags") {
    return {
      data: [{ id: 7, name: "Service", color: "#112233", isDefault: false, version: 1 }],
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

describe("FT28 customer data shell layout integration", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    linkedProjectsPanelCalls.length = 0;
    customerAppointmentsPanelCalls.length = 0;
    customerAttachmentsPanelCalls.length = 0;
    tagPickerPanelCalls.length = 0;
    notesSectionCalls.length = 0;
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(async () => ({ id: 11 })),
      isPending: false,
    });
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => buildQueryResult(options.queryKey));
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: vi.fn(() => "DISPATCHER"),
        },
        confirm: vi.fn(() => true),
      },
      configurable: true,
    });
  });

  it("renders shell layout with ordered sidebar panels in edit mode", () => {
    const markup = renderToStaticMarkup(<CustomerData customerId={11} onCancel={vi.fn()} onOpenProject={vi.fn()} />);

    expect(markup).toContain("entity-form-shell");
    expect(markup).toContain("customer-form-main-column");
    expect(markup).toContain("customer-form-sidebar");
    expect(markup).toContain("button-cancel-customer");
    expect(markup).toContain("button-save-customer");
    expect(markup).toContain("tabs-customer-main");
    expect(markup).toContain("tab-customer-details");
    expect(markup).toContain("tab-customer-journal");
    expect(markup).toContain("label-country");
    expect(markup).toContain("input-country");

    expect(getIndex(markup, "linked-projects-panel-marker")).toBeLessThan(getIndex(markup, "customer-appointments-panel-marker"));
    expect(getIndex(markup, "customer-appointments-panel-marker")).toBeLessThan(getIndex(markup, "customer-attachments-panel-marker"));
    expect(getIndex(markup, "customer-attachments-panel-marker")).toBeLessThan(getIndex(markup, "customer-tag-picker-marker"));
    expect(getIndex(markup, "customer-tag-picker-marker")).toBeLessThan(getIndex(markup, "customer-notes-section-marker"));

    expect(customerAttachmentsPanelCalls[0]).toMatchObject({
      customerId: 11,
      isEditing: true,
    });
    expect(tagPickerPanelCalls[0]).toMatchObject({
      assignedTags: [{ tag: { id: 7, name: "Service" } }],
      canEdit: true,
    });
    expect(notesSectionCalls[0]).toMatchObject({
      notes: [{ id: 41, title: "Bestehende Notiz" }],
    });
  });

  it("renders draft-capable sidebar panels in create mode with the same order", () => {
    const markup = renderToStaticMarkup(<CustomerData onCancel={vi.fn()} />);

    expect(markup).toContain("entity-form-shell");
    expect(markup).toContain("customer-form-main-column");
    expect(markup).toContain("customer-form-sidebar");
    expect(markup).toContain("button-cancel-customer");
    expect(markup).toContain("button-save-customer");
    expect(markup).not.toContain("tabs-customer-main");
    expect(markup).not.toContain("tab-customer-journal");
    expect(markup).toContain("customer-document-extraction-dropzone-marker");
    expect(markup).toContain("label-country");
    expect(markup).toContain("input-country");

    expect(getIndex(markup, "linked-projects-panel-marker")).toBeLessThan(getIndex(markup, "customer-appointments-panel-marker"));
    expect(getIndex(markup, "customer-appointments-panel-marker")).toBeLessThan(getIndex(markup, "customer-attachments-panel-marker"));
    expect(getIndex(markup, "customer-attachments-panel-marker")).toBeLessThan(getIndex(markup, "customer-tag-picker-marker"));
    expect(getIndex(markup, "customer-tag-picker-marker")).toBeLessThan(getIndex(markup, "customer-notes-section-marker"));

    expect(customerAttachmentsPanelCalls[0]).toMatchObject({
      customerId: undefined,
      isEditing: false,
      pendingCustomerAttachments: [],
    });
    expect(typeof customerAttachmentsPanelCalls[0]?.onUploadPendingCustomerAttachment).toBe("function");
    expect(tagPickerPanelCalls[0]).toMatchObject({
      assignedTags: [],
      availableTags: [{ id: 7, name: "Service" }],
      canEdit: true,
    });
    expect(notesSectionCalls[0]).toMatchObject({
      notes: [],
    });
  });

  it("renders edit mode as readonly for reader roles", () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: vi.fn(() => "READER"),
        },
        confirm: vi.fn(() => true),
      },
      configurable: true,
    });

    const markup = renderToStaticMarkup(<CustomerData customerId={11} onCancel={vi.fn()} onOpenProject={vi.fn()} />);

    expect(markup).not.toContain("customer-readonly-alert");
    expect(markup).not.toContain("button-save-customer");
    expect(customerAttachmentsPanelCalls.at(-1)).toMatchObject({ readOnly: true, canDelete: false });
    expect(tagPickerPanelCalls.at(-1)?.canEdit).toBe(false);
    expect(notesSectionCalls.at(-1)?.readOnly).toBe(true);
  });
});
