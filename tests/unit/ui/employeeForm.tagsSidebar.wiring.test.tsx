/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - EmployeeForm rendert den TagPickerPanel im Shell-Layout in Edit und Create.
 * - Der TagPickerPanel erhaelt die geladenen Mitarbeiter-Tag-Relationen und den Tag-Katalog.
 *
 * Fehlerfaelle:
 * - Der Mitarbeiter-Tag-Picker fehlt trotz persistiertem oder neuem Mitarbeiterformular.
 * - Der Tag-Picker bekommt keine geladenen Tags oder keine Bearbeitungsrechte.
 *
 * Ziel:
 * Die Sidebar-Verdrahtung fuer Mitarbeiter-Tags ueber gerenderte Props statt Quelltext absichern.
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
  useQueryClient: () => ({ invalidateQueries: vi.fn(), fetchQuery: vi.fn() }),
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
    return <section data-testid="employee-tag-picker-marker">employee-tags</section>;
  },
}));

vi.mock("@/components/NotesSection", () => ({
  NotesSection: () => <section>notes</section>,
}));

vi.mock("@/components/EmployeeAttachmentsPanel", () => ({
  EmployeeAttachmentsPanel: () => <section>attachments</section>,
}));

vi.mock("@/components/AppointmentsListPage", () => ({
  AppointmentsListPage: () => <section>appointments</section>,
}));

vi.mock("@/components/ui/team-info-badge", () => ({
  TeamInfoBadge: () => <div>team</div>,
}));

vi.mock("@/components/ui/tour-info-badge", () => ({
  TourInfoBadge: () => <div>tour</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: () => <input type="checkbox" />,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children?: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: vi.fn(() => null),
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

import { EmployeeForm } from "../../../client/src/components/EmployeeForm";

function buildQueryResult(queryKey: unknown) {
  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;

  if (Array.isArray(queryKey) && queryKey[0] === "/api/employees" && queryKey[2] === "absence-appointments") {
    return { data: [], isLoading: false, error: null };
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

  if (Array.isArray(queryKey) && queryKey[0] === "/api/employees" && queryKey[1] === 17) {
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
        },
        team: null,
        tour: null,
      },
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/tags" && queryKey[1] === "employee") {
    return {
      data: [
        { id: 5, name: "Service", color: "#112233", isDefault: false, version: 1 },
        { id: 6, name: "Montage", color: "#334455", isDefault: false, version: 1 },
      ],
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/help-texts") {
    return { data: null, isLoading: false, isError: false, error: null };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/employees") {
    return { data: [], isLoading: false, error: null };
  }

  return { data: [], isLoading: false, error: null };
}

describe("FT05+ employee form tags sidebar wiring", () => {
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

  it("renders the employee tag picker in edit mode with loaded relations and catalog", () => {
    const markup = renderToStaticMarkup(<EmployeeForm employeeId={17} />);

    expect(markup).toContain("employee-tag-picker-marker");
    expect(tagPickerCalls).toHaveLength(1);
    expect(tagPickerCalls[0]).toMatchObject({
      title: "Tags",
      canEdit: true,
      testIdPrefix: "employee-tag-picker",
    });
    expect(tagPickerCalls[0].assignedTags).toMatchObject([
      { relationVersion: 2, tag: { id: 5, name: "Service" } },
    ]);
    expect(tagPickerCalls[0].availableTags).toMatchObject([
      { id: 5, name: "Service" },
      { id: 6, name: "Montage" },
    ]);
    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["/api/tags", "employee"],
    }));
  });

  it("renders the employee tag picker in create mode with empty draft tags", () => {
    const markup = renderToStaticMarkup(<EmployeeForm />);

    expect(markup).toContain("employee-tag-picker-marker");
    expect(tagPickerCalls).toHaveLength(1);
    expect(tagPickerCalls[0]).toMatchObject({
      title: "Tags",
      canEdit: true,
      testIdPrefix: "employee-tag-picker",
      assignedTags: [],
    });
    expect(tagPickerCalls[0].availableTags).toMatchObject([
      { id: 5, name: "Service" },
      { id: 6, name: "Montage" },
    ]);
  });
});
