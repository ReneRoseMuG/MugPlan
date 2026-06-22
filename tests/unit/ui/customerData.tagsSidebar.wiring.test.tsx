/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CustomerData rendert den TagPickerPanel im Shell-Layout in Edit und Create.
 * - Der Kunden-Tag-Picker laedt den domänenspezifischen Tag-Katalog fuer `customer`.
 *
 * Fehlerfaelle:
 * - Der Kunden-Tag-Picker fehlt trotz bestehendem oder neuem Kundenformular.
 * - CustomerData fragt weiterhin einen generischen statt domänenspezifischen Tag-Katalog an.
 *
 * Ziel:
 * Die Sidebar-Verdrahtung der Kunden-Tags im neuen Shell-Layout ueber beobachtbare Query-Keys und Panel-Props absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const tagPickerCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: () => useMutationMock(),
}));

vi.mock("@/components/ui/entity-form-shell", () => ({
  EntityFormShell: ({ children, sidebar, header, footer }: { children?: React.ReactNode; sidebar?: React.ReactNode; header?: React.ReactNode; footer?: React.ReactNode }) => (
    <div>
      {header}
      {children}
      {sidebar}
      {footer}
    </div>
  ),
}));

vi.mock("@/components/TagPickerPanel", () => ({
  TagPickerPanel: (props: Record<string, unknown>) => {
    tagPickerCalls.push(props);
    return <section data-testid="customer-tag-picker-marker">customer-tags</section>;
  },
}));

vi.mock("@/components/LinkedProjectsPanel", () => ({
  LinkedProjectsPanel: () => <section>projects</section>,
}));

vi.mock("@/components/CustomerAppointmentsPanel", () => ({
  CustomerAppointmentsPanel: () => <section>appointments</section>,
}));

vi.mock("@/components/CustomerAttachmentsPanel", () => ({
  CustomerAttachmentsPanel: () => <section>attachments</section>,
}));

vi.mock("@/components/CustomerAddressesPanel", () => ({
  CustomerAddressesPanel: () => <section>addresses</section>,
}));

vi.mock("@/components/NotesSection", () => ({
  NotesSection: () => <section>notes</section>,
}));

vi.mock("@/components/DocumentExtractionDropzone", () => ({
  DocumentExtractionDropzone: () => <section>dropzone</section>,
}));

vi.mock("@/components/DocumentExtractionDialog", () => ({
  DocumentExtractionDialog: () => <section>dialog</section>,
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

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/lib/tag-invalidation", () => ({
  invalidateTagProjectionQueries: vi.fn(),
}));

vi.mock("@/lib/tags", () => ({
  getTagCatalogQueryKey: (domain: string) => ["/api/tags", domain],
  fetchTagCatalog: vi.fn(),
}));

import { CustomerData } from "../../../client/src/components/CustomerData";

function buildQueryResult(queryKey: unknown) {
  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;

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

  if (Array.isArray(queryKey) && queryKey[0] === "/api/tags" && queryKey[1] === "customer") {
    return {
      data: [
        { id: 7, name: "Service", color: "#112233", isDefault: false, version: 1 },
      ],
      isLoading: false,
      error: null,
    };
  }

  if (key === "/api/customers" || (Array.isArray(queryKey) && queryKey[0] === "/api/customers")) {
    return { data: [], isLoading: false, error: null };
  }

  return { data: [], isLoading: false, error: null };
}

describe("FT28 customer data tags sidebar wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    tagPickerCalls.length = 0;
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
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

  it("renders the customer tag picker with the customer domain catalog in edit mode", () => {
    const markup = renderToStaticMarkup(<CustomerData customerId={11} />);

    expect(markup).toContain("customer-tag-picker-marker");
    expect(tagPickerCalls).toHaveLength(1);
    expect(tagPickerCalls[0]).toMatchObject({
      testIdPrefix: "customer-tag-picker",
      canEdit: true,
      availableTags: [{ id: 7, name: "Service" }],
    });
    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["/api/tags", "customer"],
    }));
  });

  it("renders the customer tag picker with empty draft tags in create mode", () => {
    const markup = renderToStaticMarkup(<CustomerData />);

    expect(markup).toContain("customer-tag-picker-marker");
    expect(tagPickerCalls).toHaveLength(1);
    expect(tagPickerCalls[0]).toMatchObject({
      testIdPrefix: "customer-tag-picker",
      canEdit: true,
      assignedTags: [],
      availableTags: [{ id: 7, name: "Service" }],
    });
    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["/api/tags", "customer"],
    }));
  });

  it("renders the customer tag picker as readonly for reader roles", () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: vi.fn(() => "READER"),
        },
      },
      configurable: true,
    });

    const markup = renderToStaticMarkup(<CustomerData customerId={11} />);

    expect(markup).toContain("customer-tag-picker-marker");
    expect(tagPickerCalls).toHaveLength(1);
    expect(tagPickerCalls[0]).toMatchObject({
      testIdPrefix: "customer-tag-picker",
      canEdit: false,
      availableTags: [{ id: 7, name: "Service" }],
    });
  });
});
