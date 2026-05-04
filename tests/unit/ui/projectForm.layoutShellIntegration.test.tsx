/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ProjectForm rendert EntityFormShell mit sichtbarem Hauptbereich und rechter Sidebar in Create und Edit.
 * - Im Edit-Modus zeigt ProjectForm die Haupttabs `Details` und `Journal`; im Create-Modus bleibt der Journal-Tab verborgen.
 * - Die Sidebar behaelt in Create und Edit die Reihenfolge Termine, Attachments, Tags, Notizen.
 * - Footer-Aktionen bleiben im Shell-Layout gesplittet; Delete erscheint nur im Edit-Modus.
 * - Der Reklamationsworkflow ist in Create und Edit als explizite Formularfunktion sichtbar.
 * - Create-Verdrahtung der Sidebar behaelt Draft-faehige Attachments bei.
 *
 * Fehlerfaelle:
 * - Das Projektformular bleibt am alten Layout haengen oder rendert die Sidebar erneut im Main-Bereich.
 * - Der neue Journal-Haupttab erscheint im Create-Modus oder fehlt im Edit-Modus.
 * - Die Sidebar-Panels tauschen ihre Reihenfolge.
 * - Reklamation fehlt im Create-Modus, Delete erscheint im Create-Modus oder die Create-Sidebar verliert ihre Draft-Verdrahtung.
 *
 * Ziel:
 * Das neue Shell-Layout des Projektformulars ueber sichtbare Struktur und Child-Props regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const projectAppointmentsPanelCalls: Array<Record<string, unknown>> = [];
const projectAttachmentsPanelCalls: Array<Record<string, unknown>> = [];
const tagPickerPanelCalls: Array<Record<string, unknown>> = [];
const notesSectionCalls: Array<Record<string, unknown>> = [];
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
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
  fetchTagCatalog: vi.fn(async () => []),
  getTagCatalogQueryKey: vi.fn(() => ["/api/tags", "project"]),
}));

vi.mock("@/lib/project-edit-form", () => ({
  DEFAULT_PROJECT_TYPE: 1,
  resolveProjectEditForm: vi.fn(() => ({ normalizedType: 1 })),
}));

vi.mock("@/lib/project-product-form", () => ({
  buildDynamicProjectCategorySlots: vi.fn(() => []),
  buildPersistedProjectDescription: vi.fn(() => ""),
  buildProjectArticleLines: vi.fn(() => []),
  cloneProjectProductSelections: vi.fn((input: unknown) => input ?? {}),
  createEmptyDynamicProjectProductSelections: vi.fn(() => ({})),
  createEmptyProjectProductSelections: () => ({}),
  createEmptySelection: vi.fn(() => ({})),
  extractEditorDescriptionHtml: vi.fn(() => ""),
  getProjectProductField: vi.fn(() => ({ source: "component", categoryName: "Default", label: "Feld" })),
  isProductSelectionField: vi.fn(() => true),
  mapProjectOrderItemsToDynamicSelections: vi.fn(() => ({})),
  mapProjectOrderItemsToSelections: vi.fn(() => ({})),
  PROJECT_PRODUCT_FIELDS: [],
  resolveSelectionsFromExtraction: vi.fn(() => ({})),
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

vi.mock("@/components/ui/relation-slot", () => ({
  RelationSlot: (props: Record<string, unknown> & { children?: React.ReactNode }) => (
    <section data-testid={String(props.testId)}>{props.children}</section>
  ),
}));

vi.mock("@/components/ui/customer-detail-card", () => ({
  CustomerDetailCard: ({ testId }: { testId?: string }) => <div data-testid={testId}>customer-card</div>,
}));

vi.mock("@/components/ProjectAppointmentsPanel", () => ({
  ProjectAppointmentsPanel: (props: Record<string, unknown>) => {
    projectAppointmentsPanelCalls.push(props);
    return <section data-testid="project-appointments-panel-marker">appointments</section>;
  },
}));

vi.mock("@/components/ProjectAttachmentsPanel", () => ({
  ProjectAttachmentsPanel: (props: Record<string, unknown>) => {
    projectAttachmentsPanelCalls.push(props);
    return <section data-testid="project-attachments-panel-marker">attachments</section>;
  },
}));

vi.mock("@/components/ProjectOrderForm", () => ({
  ProjectOrderForm: () => <section data-testid="project-order-form-marker">order-form</section>,
  ProjectProductFields: () => <section data-testid="project-product-fields-marker">product-fields</section>,
}));

vi.mock("@/components/RichTextEditor", () => ({
  RichTextEditor: () => <div>editor</div>,
}));

vi.mock("@/components/DocumentExtractionDropzone", () => ({
  DocumentExtractionDropzone: () => <section data-testid="document-extraction-dropzone-marker">dropzone</section>,
}));

vi.mock("@/components/DocumentExtractionDialog", () => ({
  DocumentExtractionDialog: () => <div>dialog</div>,
}));

vi.mock("@/components/CustomersPage", () => ({
  CustomersPage: () => <div>customers-page</div>,
}));

vi.mock("@/components/NotesSection", () => ({
  NotesSection: (props: Record<string, unknown>) => {
    notesSectionCalls.push(props);
    return <section data-testid="project-notes-section-marker">notes</section>;
  },
}));

vi.mock("@/components/TagPickerPanel", () => ({
  TagPickerPanel: (props: Record<string, unknown>) => {
    tagPickerPanelCalls.push(props);
    return <section data-testid="project-tag-picker-marker">tags</section>;
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  TabsTrigger: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
  AlertDialogCancel: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
  AlertDialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import { ProjectForm } from "../../../client/src/components/ProjectForm";

function buildQueryResult(queryKey: unknown): { data: unknown; isLoading: boolean; error?: unknown } {
  if (Array.isArray(queryKey) && queryKey[0] === "/api/projects" && queryKey[1] === 7 && queryKey.length === 2) {
    return {
      data: {
        project: {
          id: 7,
          customerId: 21,
          name: "Projekt A",
          orderNumber: "ORD-7",
          amount: null,
          type: 1,
          descriptionMd: null,
          projectOrder: null,
          version: 3,
        },
        customer: {
          id: 21,
          customerNumber: "C-21",
          fullName: "Kunde A",
          firstName: "Kunde",
          lastName: "A",
          isActive: true,
        },
      },
      isLoading: false,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/projects" && queryKey[2] === "tags") {
    return { data: [], isLoading: false, error: null };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/projects" && queryKey[2] === "notes") {
    return { data: [], isLoading: false };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/customers") {
    return {
      data: [
        {
          id: 21,
          customerNumber: "C-21",
          fullName: "Kunde A",
          firstName: "Kunde",
          lastName: "A",
          isActive: true,
        },
      ],
      isLoading: false,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/tags") {
    return { data: [], isLoading: false };
  }

  if (typeof queryKey === "string" && queryKey.startsWith("/api/admin/master-data/")) {
    return { data: [], isLoading: false };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/projects") {
    return { data: undefined, isLoading: false };
  }

  return { data: [], isLoading: false };
}

function getIndex(markup: string, marker: string) {
  const index = markup.indexOf(marker);
  if (index < 0) {
    throw new Error(`Missing marker ${marker}`);
  }
  return index;
}

describe("FT02/FT13/FT24 project form shell layout integration", () => {
  beforeEach(() => {
    projectAppointmentsPanelCalls.length = 0;
    projectAttachmentsPanelCalls.length = 0;
    tagPickerPanelCalls.length = 0;
    notesSectionCalls.length = 0;
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => buildQueryResult(options.queryKey));
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "DISPATCHER",
      },
    });
  });

  it("renders shell main and sidebar with the same sidebar order in create mode", () => {
    const markup = renderToStaticMarkup(<ProjectForm />);

    expect(markup).toContain("entity-form-shell");
    expect(markup).not.toContain("tabs-project-main");
    expect(markup).not.toContain("tab-project-journal");
    expect(getIndex(markup, "project-form-main-column")).toBeLessThan(getIndex(markup, "project-form-sidebar"));
    expect(getIndex(markup, "project-form-sidebar")).toBeLessThan(getIndex(markup, "project-appointments-panel-marker"));
    expect(getIndex(markup, "project-appointments-panel-marker")).toBeLessThan(getIndex(markup, "project-attachments-panel-marker"));
    expect(getIndex(markup, "project-attachments-panel-marker")).toBeLessThan(getIndex(markup, "project-tag-picker-marker"));
    expect(getIndex(markup, "project-tag-picker-marker")).toBeLessThan(getIndex(markup, "project-notes-section-marker"));
    expect(markup).toContain("document-extraction-dropzone-marker");

    expect(projectAppointmentsPanelCalls.at(-1)).toMatchObject({ isEditing: false });
    expect(projectAttachmentsPanelCalls.at(-1)?.pendingProjectAttachments).toEqual([]);
    expect(projectAttachmentsPanelCalls.at(-1)?.onUploadPendingProjectAttachment).toBeTypeOf("function");
  });

  it("renders shell main and sidebar with the same sidebar order in edit mode", () => {
    const markup = renderToStaticMarkup(<ProjectForm projectId={7} />);

    expect(markup).toContain("entity-form-shell");
    expect(markup).toContain("tabs-project-main");
    expect(markup).toContain("tab-project-details");
    expect(markup).toContain("tab-project-journal");
    expect(getIndex(markup, "project-form-main-column")).toBeLessThan(getIndex(markup, "project-form-sidebar"));
    expect(getIndex(markup, "project-form-sidebar")).toBeLessThan(getIndex(markup, "project-appointments-panel-marker"));
    expect(getIndex(markup, "project-appointments-panel-marker")).toBeLessThan(getIndex(markup, "project-attachments-panel-marker"));
    expect(getIndex(markup, "project-attachments-panel-marker")).toBeLessThan(getIndex(markup, "project-tag-picker-marker"));
    expect(getIndex(markup, "project-tag-picker-marker")).toBeLessThan(getIndex(markup, "project-notes-section-marker"));
    expect(markup).not.toContain("document-extraction-dropzone-marker");

    expect(projectAppointmentsPanelCalls.at(-1)).toMatchObject({ isEditing: true, projectId: 7 });
    expect(projectAttachmentsPanelCalls.at(-1)?.pendingProjectAttachments).toEqual([]);
    expect(projectAttachmentsPanelCalls.at(-1)?.onUploadPendingProjectAttachment).toBeTypeOf("function");
  });

  it("keeps footer actions split and shows delete only in edit mode", () => {
    const createMarkup = renderToStaticMarkup(<ProjectForm />);
    const editMarkup = renderToStaticMarkup(<ProjectForm projectId={7} />);

    expect(createMarkup).toContain("button-close-project");
    expect(createMarkup).toContain("button-cancel-project");
    expect(createMarkup).toContain("button-save-project");
    expect(createMarkup).toContain("project-form-functions-panel");
    expect(createMarkup).toContain("button-set-project-reklamation");
    expect(createMarkup).not.toContain("button-delete-project");
    expect(getIndex(createMarkup, "project-form-functions-panel")).toBeLessThan(getIndex(createMarkup, "project-appointments-panel-marker"));
    expect(getIndex(createMarkup, "button-cancel-project")).toBeLessThan(getIndex(createMarkup, "button-save-project"));

    expect(editMarkup).toContain("project-form-functions-panel");
    expect(editMarkup).toContain("button-set-project-reklamation");
    expect(editMarkup).toContain("button-delete-project");
    expect(getIndex(editMarkup, "project-form-functions-panel")).toBeLessThan(getIndex(editMarkup, "project-appointments-panel-marker"));
    expect(getIndex(editMarkup, "button-cancel-project")).toBeLessThan(getIndex(editMarkup, "button-save-project"));
  });

  it("renders edit mode as readonly for reader roles", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "READER",
      },
    });

    const markup = renderToStaticMarkup(<ProjectForm projectId={7} />);

    expect(markup).not.toContain("project-readonly-alert");
    expect(markup).not.toContain("project-form-functions-panel");
    expect(markup).not.toContain("button-delete-project");
    expect(markup).not.toContain("button-save-project");

    expect(projectAppointmentsPanelCalls.at(-1)).toMatchObject({ readOnly: true });
    expect(projectAttachmentsPanelCalls.at(-1)).toMatchObject({ readOnly: true });
    expect(tagPickerPanelCalls.at(-1)?.canEdit).toBe(false);
    expect(notesSectionCalls.at(-1)?.readOnly).toBe(true);
  });
});
