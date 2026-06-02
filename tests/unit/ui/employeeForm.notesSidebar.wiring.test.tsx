/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - EmployeeForm verdrahtet die NotesSection in der Sidebar in Edit und Create.
 * - Edit nutzt den Query-Key `/api/employees/:id/notes` und uebergibt geladene Notizen.
 * - Create nutzt Draft-Notizen und laesst die Sidebar im editierbaren Zustand.
 *
 * Fehlerfaelle:
 * - Die Mitarbeiter-NotesSection fehlt in der Sidebar.
 * - Edit-Mode laedt keine bestehenden Notizen.
 * - Create-Mode startet nicht mit einer leeren Draft-Notizliste.
 *
 * Ziel:
 * Die Mitarbeiter-Notizverdrahtung ueber gerenderte Props statt Quelltext regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const notesSectionCalls: Array<Record<string, unknown>> = [];

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

vi.mock("@/components/NotesSection", () => ({
  NotesSection: (props: Record<string, unknown>) => {
    notesSectionCalls.push(props);
    return <section data-testid="employee-notes-marker">employee-notes</section>;
  },
}));

vi.mock("@/components/EmployeeAttachmentsPanel", () => ({
  EmployeeAttachmentsPanel: () => <section>attachments</section>,
}));

vi.mock("@/components/TagPickerPanel", () => ({
  TagPickerPanel: () => <section>tags</section>,
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

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: vi.fn(() => null),
  useSettings: () => ({ setSetting: vi.fn() }),
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
        },
        team: null,
        tour: null,
      },
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/employees" && queryKey[2] === "notes") {
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
          createdAt: new Date("2026-03-29T08:00:00.000Z"),
          updatedAt: new Date("2026-03-29T08:00:00.000Z"),
        },
      ],
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/tags") {
    return { data: [], isLoading: false, error: null };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/help-texts") {
    return { data: null, isLoading: false, isError: false, error: null };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/employees") {
    return { data: [], isLoading: false, error: null };
  }

  return { data: [], isLoading: false, error: null };
}

describe("FT05+/FT13 employee form notes sidebar wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    notesSectionCalls.length = 0;
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
        confirm: vi.fn(() => true),
      },
      configurable: true,
    });
  });

  it("renders loaded employee notes in edit mode", () => {
    const markup = renderToStaticMarkup(<EmployeeForm employeeId={17} />);

    expect(markup).toContain("employee-notes-marker");
    expect(notesSectionCalls).toHaveLength(1);
    expect(notesSectionCalls[0]).toMatchObject({
      notes: [{ id: 41, title: "Bestehende Notiz" }],
      isLoading: false,
      readOnly: false,
    });
    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["/api/employees", 17, "notes"],
    }));
  });

  it("renders an editable empty draft notes section in create mode", () => {
    const markup = renderToStaticMarkup(<EmployeeForm />);

    expect(markup).toContain("employee-notes-marker");
    expect(notesSectionCalls).toHaveLength(1);
    expect(notesSectionCalls[0]).toMatchObject({
      notes: [],
      isLoading: false,
      readOnly: false,
    });
  });

  it("renders employee notes readonly for reader roles", () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: vi.fn(() => "READER"),
        },
        confirm: vi.fn(() => true),
      },
      configurable: true,
    });

    const markup = renderToStaticMarkup(<EmployeeForm employeeId={17} />);

    expect(markup).toContain("employee-notes-marker");
    expect(notesSectionCalls).toHaveLength(1);
    expect(notesSectionCalls[0]).toMatchObject({
      notes: [{ id: 41, title: "Bestehende Notiz" }],
      isLoading: false,
      readOnly: true,
    });
  });
});
