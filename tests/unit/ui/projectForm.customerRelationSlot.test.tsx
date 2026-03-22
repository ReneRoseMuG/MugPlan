/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Projekt-Kunde Relation im Projektformular
 *
 * Abgedeckte Regeln:
 * - Kundenrelation wird ueber den RelationSlot gerendert.
 * - Bei geladener Projektdetailansicht wird der Slot aktiv mit Kundenkarte dargestellt.
 * - Add/Remove Handler bleiben am Slot verdrahtet.
 * - Pflichtvalidierung fuer `customerId` bleibt beim Submit aktiv.
 *
 * Fehlerfaelle:
 * - Projektdetail zeigt keinen aktiven Kundenslot.
 * - Submit akzeptiert Projektanlage ohne Kundenbezug.
 *
 * Ziel:
 * Die Projekt-Kunde Slot-Verdrahtung ueber gerenderte Props und den Submit-Handler statt Source-Strings absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const relationSlotCalls: Array<Record<string, unknown>> = [];
const customerDetailCardCalls: Array<Record<string, unknown>> = [];
const entityFormShellCalls: Array<Record<string, unknown>> = [];
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
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
  buildDynamicProjectCategorySlots: vi.fn(() => []),
  buildPersistedProjectDescription: vi.fn(() => ""),
  buildProjectArticleLines: vi.fn(() => []),
  cloneProjectProductSelections: vi.fn((input: unknown) => input ?? {}),
  createEmptyDynamicProjectProductSelections: vi.fn(() => ({})),
  createEmptyProjectProductSelections: () => ({}),
  extractEditorDescriptionHtml: vi.fn(() => ""),
  getProjectProductField: vi.fn(() => ({ source: "component", categoryName: "Default" })),
  isProductSelectionField: vi.fn(() => true),
  mapProjectOrderItemsToDynamicSelections: vi.fn(() => ({})),
  mapProjectOrderItemsToSelections: vi.fn(() => ({})),
  PROJECT_PRODUCT_FIELDS: [],
  resolveSelectionsFromExtraction: vi.fn(() => ({})),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: vi.fn(() => ({ productCategoryIds: [], componentCategoryIds: [] })),
  useSettings: vi.fn(() => ({ setSetting: vi.fn() })),
}));

vi.mock("@/components/ui/entity-form-shell", () => ({
  EntityFormShell: (props: Record<string, unknown> & { children?: React.ReactNode; header?: React.ReactNode; sidebar?: React.ReactNode; footer?: React.ReactNode }) => {
    entityFormShellCalls.push(props);
    return (
      <div data-testid="entity-form-shell">
        <div>{props.header}</div>
        <div>{props.children}</div>
        <div>{props.sidebar}</div>
        <div>{props.footer}</div>
      </div>
    );
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/relation-slot", () => ({
  RelationSlot: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    relationSlotCalls.push(props);
    return <section data-testid={String(props.testId)}>{props.children}</section>;
  },
}));

vi.mock("@/components/ui/customer-detail-card", () => ({
  CustomerDetailCard: (props: Record<string, unknown>) => {
    customerDetailCardCalls.push(props);
    return <div data-testid={String(props.testId)}>customer-card</div>;
  },
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
  NotesSection: () => <div>notes</div>,
}));

vi.mock("@/components/TagPickerPanel", () => ({
  TagPickerPanel: () => <div>tags</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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

function buildQueryResult(queryKey: unknown): { data: unknown; isLoading: boolean } {
  if (Array.isArray(queryKey) && queryKey[0] === "/api/projects" && queryKey[2] === "tags") {
    return { data: [], isLoading: false };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/tags") {
    return { data: [], isLoading: false };
  }

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
    };
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

  if (Array.isArray(queryKey) && queryKey[0] === "/api/projects") {
    return { data: undefined, isLoading: false };
  }

  return { data: [], isLoading: false };
}

function getCustomerSlot() {
  const slot = relationSlotCalls.find((entry) => entry.testId === "slot-customer-relation-project");
  if (!slot) {
    throw new Error("Missing customer relation slot");
  }
  return slot;
}

function findElementByTestId(node: React.ReactNode, testId: string): React.ReactElement | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElementByTestId(child, testId);
      if (match) return match;
    }
    return null;
  }
  if (!React.isValidElement(node)) return null;
  if ((node.props as { ["data-testid"]?: string })["data-testid"] === testId) {
    return node;
  }
  return findElementByTestId((node.props as { children?: React.ReactNode }).children, testId);
}

async function importProjectForm() {
  return import("../../../client/src/components/ProjectForm");
}

describe("FT02 project form customer relation slot", () => {
  beforeEach(() => {
    relationSlotCalls.length = 0;
    customerDetailCardCalls.length = 0;
    entityFormShellCalls.length = 0;
    toastMock.mockReset();
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

  it("renders an active customer slot with the loaded project customer", async () => {
    const { ProjectForm } = await importProjectForm();
    renderToStaticMarkup(<ProjectForm projectId={7} />);

    const slot = getCustomerSlot();

    expect(slot.state).toBe("active");
    expect(slot.addActionTestId).toBe("button-select-customer");
    expect(slot.removeActionTestId).toBe("button-change-customer");
    expect(typeof slot.onAdd).toBe("function");
    expect(typeof slot.onRemove).toBe("function");
    expect(customerDetailCardCalls[0]).toMatchObject({
      testId: "badge-customer",
      customer: expect.objectContaining({ id: 21 }),
    });
    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["/api/tags", "project"],
    }));
  });

  it("keeps customer required validation on submit for a new project without customer", async () => {
    vi.resetModules();
    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");
      let stateCall = 0;
      return {
        ...actual,
        default: actual,
        useState<T>(initial: T | (() => T)) {
          stateCall += 1;
          if (stateCall === 1) {
            return actual.useState("Projekt ohne Kunde" as T);
          }
          return actual.useState(initial);
        },
      };
    });

    const { ProjectForm } = await importProjectForm();
    renderToStaticMarkup(<ProjectForm />);

    const shell = entityFormShellCalls[0];
    const saveButton = findElementByTestId(shell?.footer, "button-save-project");
    if (typeof saveButton?.props.onClick !== "function") {
      throw new Error("Missing save action");
    }

    await expect(saveButton.props.onClick()).rejects.toThrow("validation");
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Kunde muss"),
        variant: "destructive",
      }),
    );
    vi.doUnmock("react");
  });
});
