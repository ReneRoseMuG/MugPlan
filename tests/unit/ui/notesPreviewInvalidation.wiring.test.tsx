/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekt-Notizmutationen invalidieren neben den Entity-Queries auch den gemeinsamen Notiz-Preview-Cache.
 * - Kunden-Notizmutationen invalidieren neben den Entity-Queries auch den gemeinsamen Notiz-Preview-Cache.
 *
 * Fehlerfälle:
 * - Kalender-Hover zeigt nach Projekt- oder Kundennotiz-Mutationen stale Preview-Daten.
 * - Notizmutationen aktualisieren nur Listen-/Kalenderqueries, aber nicht `"/api/notes-preview"`.
 *
 * Ziel:
 * Die Invalidierungsverdrahtung der Projekt- und Kundennotiz-Mutationen gegen stale Kalender-Notiz-Previews absichern.
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
const invalidateTagProjectionQueriesMock = vi.fn(async () => undefined);
const useQueryMock = vi.fn();
const mutationOptions: MutationOptions[] = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: unknown }) => useQueryMock(options),
  useMutation: (options: MutationOptions) => {
    mutationOptions.push(options);
    return {
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    };
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
  queryClient: { invalidateQueries: (...args: unknown[]) => queryInvalidateMock(...args) },
}));

vi.mock("@/lib/tag-invalidation", () => ({
  invalidateTagProjectionQueries: () => invalidateTagProjectionQueriesMock(),
}));

vi.mock("@/lib/tags", () => ({
  getTagCatalogQueryKey: (domain: string) => ["/api/tags", domain],
  fetchTagCatalog: vi.fn(async () => []),
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
  getProjectProductField: vi.fn(() => ({ source: "component", categoryName: "Default" })),
  isProductSelectionField: vi.fn(() => true),
  mapProjectOrderItemsToDynamicSelections: vi.fn(() => ({})),
  mapProjectOrderItemsToSelections: vi.fn(() => ({})),
  PROJECT_PRODUCT_FIELDS: [],
  resolveSelectionsFromExtraction: vi.fn(() => ({})),
}));

vi.mock("@/components/ui/entity-form-shell", () => ({
  EntityFormShell: ({ children, sidebar, header, footer }: { children?: React.ReactNode; sidebar?: React.ReactNode; header?: React.ReactNode; footer?: React.ReactNode }) => (
    <div>{header}{children}{sidebar}{footer}</div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children?: React.ReactNode }) => <label>{children}</label>,
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

vi.mock("@/components/ui/relation-slot", () => ({
  RelationSlot: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/customer-detail-card", () => ({
  CustomerDetailCard: () => <div>customer-card</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
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

vi.mock("@/components/ProjectAppointmentsPanel", () => ({
  ProjectAppointmentsPanel: () => <div>appointments-panel</div>,
}));

vi.mock("@/components/ProjectAttachmentsPanel", () => ({
  ProjectAttachmentsPanel: () => <div>project-attachments</div>,
}));

vi.mock("@/components/ProjectOrderForm", () => ({
  ProjectOrderForm: () => <div>project-order-form</div>,
  ProjectProductFields: () => <div>project-product-fields</div>,
}));

vi.mock("@/components/RichTextEditor", () => ({
  RichTextEditor: () => <div>editor</div>,
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
  NotesSection: () => <div>notes-section</div>,
}));

vi.mock("@/components/TagPickerPanel", () => ({
  TagPickerPanel: () => <div>tag-picker</div>,
}));

vi.mock("@/components/LinkedProjectsPanel", () => ({
  LinkedProjectsPanel: () => <div>linked-projects</div>,
}));

vi.mock("@/components/CustomerAppointmentsPanel", () => ({
  CustomerAppointmentsPanel: () => <div>customer-appointments</div>,
}));

vi.mock("@/components/CustomerAttachmentsPanel", () => ({
  CustomerAttachmentsPanel: () => <div>customer-attachments</div>,
}));

function buildQueryResult(queryKey: unknown) {
  if (Array.isArray(queryKey) && queryKey[0] === "/api/projects" && queryKey[1] === 7) {
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
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/customers" && queryKey[1] === 11) {
    return {
      data: {
        id: 11,
        customerNumber: "C-11",
        firstName: "Klara",
        lastName: "Kunde",
        fullName: "Kunde, Klara",
        version: 3,
        isActive: true,
        tags: [],
      },
      isLoading: false,
      error: null,
    };
  }

  return { data: [], isLoading: false, error: null };
}

async function findMutationByRequest(pathPattern: RegExp, payload: unknown) {
  for (const options of mutationOptions) {
    if (!options.mutationFn) continue;
    apiRequestMock.mockClear();
    try {
      await options.mutationFn(payload);
    } catch {
      // Irrelevant for wiring identification; only the requested route matters.
    }

    const call = apiRequestMock.mock.calls[0];
    if (!call) continue;
    const path = call[1];
    if (typeof path === "string" && pathPattern.test(path)) {
      return options;
    }
  }

  throw new Error(`Mutation for ${String(pathPattern)} not found`);
}

async function flushAsyncInvalidations() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("FT13 UI: notes preview invalidation wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    mutationOptions.length = 0;
    queryInvalidateMock.mockClear();
    apiRequestMock.mockClear();
    invalidateTagProjectionQueriesMock.mockClear();
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => buildQueryResult(options.queryKey));
    Object.defineProperty(globalThis, "window", {
      value: {
        confirm: () => true,
        localStorage: {
          getItem: vi.fn(() => "DISPATCHER"),
        },
      },
      configurable: true,
    });
  });

  it("invalidates the shared notes preview cache after project note deletion", async () => {
    const { ProjectForm } = await import("../../../client/src/components/ProjectForm");
    renderToStaticMarkup(<ProjectForm projectId={7} />);

    const deleteMutation = await findMutationByRequest(/\/api\/projects\/7\/notes\/\d+$/, { noteId: 5, version: 1 });

    deleteMutation.onSuccess?.();
    await flushAsyncInvalidations();

    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["/api/projects", 7, "notes"] });
    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["/api/projects/list"] });
    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["/api/notes-preview"] });
    expect(invalidateTagProjectionQueriesMock).toHaveBeenCalled();
  });

  it("invalidates the shared notes preview cache after customer note deletion", async () => {
    const { CustomerData } = await import("../../../client/src/components/CustomerData");
    renderToStaticMarkup(<CustomerData customerId={11} />);

    const deleteMutation = await findMutationByRequest(/\/api\/customers\/11\/notes\/\d+$/, { noteId: 8, version: 1 });

    deleteMutation.onSuccess?.();
    await flushAsyncInvalidations();

    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["/api/customers", 11, "notes"] });
    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["/api/customers/list"] });
    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["/api/notes-preview"] });
    expect(invalidateTagProjectionQueriesMock).toHaveBeenCalled();
  });
});
