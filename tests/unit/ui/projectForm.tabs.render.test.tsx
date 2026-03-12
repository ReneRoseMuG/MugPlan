/**
 * Test Scope:
 *
 * Feature: FT21 - Projektformular Tabs
 *
 * Abgedeckte Regeln:
 * - Das Projektformular zeigt den Tab `Anmerkungen` sichtbar im gerenderten Markup.
 * - Beschreibungseditor und Artikellisten-Panel bleiben als getrennte angedockte Panels erhalten.
 * - Das Artikellisten-Panel rendert keine doppelte Innen-Headline.
 *
 * Fehlerfaelle:
 * - Der Beschreibungs-Tab verschwindet oder wird wieder falsch benannt.
 * - Editor und Artikelliste fallen in einen gemeinsamen Block zurueck.
 * - Die alte doppelte Artikellisten-Ueberschrift taucht erneut auf.
 *
 * Ziel:
 * Das sichtbare Tab- und Panel-Markup des Projektformulars regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/project-edit-form", () => ({
  DEFAULT_PROJECT_TYPE: 1,
  resolveProjectEditForm: vi.fn(() => ({ normalizedType: 1 })),
}));

vi.mock("@/lib/project-product-form", () => ({
  buildPersistedProjectDescription: vi.fn(() => ""),
  buildProjectArticleLines: vi.fn(() => []),
  cloneProjectProductSelections: vi.fn((input: unknown) => input ?? {}),
  createEmptyProjectProductSelections: () => ({}),
  extractEditorDescriptionHtml: vi.fn(() => ""),
  getProjectProductField: vi.fn(() => ({ source: "component", categoryName: "Default", label: "Feld" })),
  isProductSelectionField: vi.fn(() => true),
  mapProjectOrderItemsToSelections: vi.fn(() => ({})),
  PROJECT_PRODUCT_FIELDS: [],
  resolveSelectionsFromExtraction: vi.fn(() => ({})),
}));

vi.mock("@/components/ui/entity-form-layout", () => ({
  EntityFormLayout: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/relation-slot", () => ({
  RelationSlot: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock("@/components/ui/customer-detail-card", () => ({
  CustomerDetailCard: () => <div>customer-card</div>,
}));

vi.mock("@/components/ui/component-dropdown", () => ({
  ComponentDropdown: () => <div>component-dropdown</div>,
}));

vi.mock("@/components/ui/product-selection-dropdown", () => ({
  ProductSelectionDropdown: () => <div>product-selection</div>,
}));

vi.mock("@/components/ProjectAppointmentsPanel", () => ({
  ProjectAppointmentsPanel: () => <div>appointments-panel</div>,
}));

vi.mock("@/components/ProjectAttachmentsPanel", () => ({
  ProjectAttachmentsPanel: () => <div>attachments-panel</div>,
}));

vi.mock("@/components/ProjectOrderForm", () => ({
  ProjectOrderForm: () => <div>order-form</div>,
  ProjectProductFields: () => <div>product-fields</div>,
}));

vi.mock("@/components/ProjectStatusPanel", () => ({
  ProjectStatusPanel: () => <div>status-panel</div>,
}));

vi.mock("@/components/RichTextEditor", () => ({
  RichTextEditor: () => <div data-testid="richtext-editor">editor</div>,
}));

vi.mock("@/components/DocumentExtractionDropzone", () => ({
  DocumentExtractionDropzone: () => <div>dropzone</div>,
}));

vi.mock("@/components/DocumentExtractionDialog", () => ({
  DocumentExtractionDialog: () => <div>dialog</div>,
}));

vi.mock("@/components/CustomersPage", () => ({
  CustomersPage: () => <div>customers-page</div>,
}));

vi.mock("@/components/NotesSection", () => ({
  NotesSection: () => <div>notes</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children, value }: { children?: React.ReactNode; value?: string }) => <section data-value={value}>{children}</section>,
  TabsList: ({ children, className }: { children?: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  TabsTrigger: ({ children, value }: { children?: React.ReactNode; value?: string }) => <button type="button" data-value={value}>{children}</button>,
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

describe("FT21 project form tabs render", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useQueryMock.mockImplementation((options: { queryKey?: unknown }) => {
      if (Array.isArray(options.queryKey) && options.queryKey[0] === "/api/projects") {
        return { data: undefined, isLoading: false };
      }
      if (Array.isArray(options.queryKey) && options.queryKey[0] === "/api/customers") {
        return { data: [], isLoading: false };
      }
      return { data: [], isLoading: false };
    });
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "DISPATCHER",
      },
    });
  });

  it("renders the Anmerkungen tab and separate description/article panels", () => {
    const html = renderToStaticMarkup(<ProjectForm />);

    expect(html).toContain(">Anmerkungen<");
    expect(html).toContain("project-description-editor-panel");
    expect(html).toContain("project-article-list-panel");
    expect(html).not.toContain(">Artikelliste</h3>");
  });
});
