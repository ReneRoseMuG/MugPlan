/**
 * Test Scope:
 *
 * Feature: FT01 - Terminverwaltung
 * Use Case: UC Termin-Projekt/Kunde Relationen in Slots
 *
 * Abgedeckte Regeln:
 * - Projektrelation im Terminformular nutzt RelationSlot mit Projektdaten.
 * - Die Projektdatenquelle des Formulars nutzt `scope=all`.
 * - Ein gesetztes Projekt rendert im Terminformular keine Remove-Aktion mehr.
 * - Bei Projektkontext ist der Kundenslot readonly und zeigt die abgeleitete Kundenkarte.
 * - Ohne Projektkontext bleiben Projekt- und Kundenslot leer und selektierbar.
 *
 * Fehlerfaelle:
 * - Projekt-Slot rendert keine aktive Relation trotz gewaehltem Projekt.
 * - Projekt-Slot bietet weiter eine Abloeseaktion fuer bestehende Projektzuordnungen an.
 * - Kunden-Slot ignoriert die vom Projekt abgeleitete Readonly-Regel.
 *
 * Ziel:
 * Die Slot-Relationen des Terminformulars ueber gerenderte Komponentenbeziehungen statt Source-Strings absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const relationSlotCalls: Array<Record<string, unknown>> = [];
const projectDetailCardCalls: Array<Record<string, unknown>> = [];
const customerDetailCardCalls: Array<Record<string, unknown>> = [];
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

vi.mock("@/lib/project-product-form", () => ({
  createEmptyProjectProductSelections: () => ({}),
  resolveSelectionsFromExtraction: vi.fn(() => ({})),
}));

vi.mock("@/lib/project-appointments", () => ({
  PROJECT_APPOINTMENTS_ALL_FROM_DATE: "1900-01-01",
  getBerlinTodayDateString: () => "2099-01-01",
  getProjectAppointmentsQueryKey: vi.fn(() => ["projectAppointments"]),
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

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children?: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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

vi.mock("@/components/ui/relation-slot", () => ({
  RelationSlot: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    relationSlotCalls.push(props);
    const state = props.state;
    const canAdd = state === "empty" && typeof props.onAdd === "function";
    const canRemove = state === "active" && typeof props.onRemove === "function";
    return (
      <section data-testid={String(props.testId)}>
        <span>{String(props.title)}</span>
        <span>{String(state)}</span>
        {canAdd ? <button type="button">{String(props.addActionTestId)}</button> : null}
        {canRemove ? <button type="button">{String(props.removeActionTestId ?? `${String(props.testId)}-action-remove`)}</button> : null}
        {props.children}
      </section>
    );
  },
}));

vi.mock("@/components/ui/project-detail-card", () => ({
  ProjectDetailCard: (props: Record<string, unknown>) => {
    projectDetailCardCalls.push(props);
    return <div data-testid={String(props.testId)}>project-card</div>;
  },
}));

vi.mock("@/components/ui/customer-detail-card", () => ({
  CustomerDetailCard: (props: Record<string, unknown>) => {
    customerDetailCardCalls.push(props);
    return <div data-testid={String(props.testId)}>customer-card</div>;
  },
}));

vi.mock("@/components/ui/tour-info-badge", () => ({
  TourInfoBadge: ({ testId }: { testId?: string }) => <div data-testid={testId}>tour-badge</div>,
}));

vi.mock("@/components/ProjectForm", () => ({
  ProjectForm: () => <div>project-form</div>,
}));

vi.mock("@/components/ProjectsPage", () => ({
  ProjectsPage: () => <div>projects-page</div>,
}));

vi.mock("@/components/CustomersPage", () => ({
  CustomersPage: () => <div>customers-page</div>,
}));

vi.mock("@/components/EmployeePickerDialogList", () => ({
  EmployeePickerDialogList: () => <div>employee-picker</div>,
}));

vi.mock("@/components/AppointmentAttachmentsPanel", () => ({
  AppointmentAttachmentsPanel: () => <div>attachments</div>,
}));

vi.mock("@/components/AppointmentEmployeeSlot", () => ({
  AppointmentEmployeeSlot: () => <div>employee-slot</div>,
}));

vi.mock("@/components/TagPickerPanel", () => ({
  TagPickerPanel: () => <div>tags</div>,
}));

vi.mock("@/components/NotesSection", () => ({
  NotesSection: () => <div>notes</div>,
}));

vi.mock("@/components/DocumentExtractionDropzone", () => ({
  DocumentExtractionDropzone: () => <div>dropzone</div>,
}));

vi.mock("@/components/DocumentExtractionDialog", () => ({
  DocumentExtractionDialog: () => <div>dialog</div>,
}));

import { AppointmentForm } from "../../../client/src/components/AppointmentForm";

function buildQueryResult(queryKey: unknown): { data: unknown; isLoading: boolean } {
  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;

  if (typeof key === "string" && key.startsWith("/api/projects/")) {
    return { data: null, isLoading: false };
  }

  if (key === "/api/projects?filter=all&scope=all") {
    return {
      data: [
        {
          id: 11,
          customerId: 21,
          name: "Projekt A",
          orderNumber: "ORD-11",
          projectArticleItems: [{ label: "Saunamodell", value: "Modell A" }],
          descriptionMd: null,
          isActive: true,
          type: 1,
        },
      ],
      isLoading: false,
    };
  }

  if (key === "/api/customers") {
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

  if (key === "/api/tours" || key === "/api/teams" || key === "/api/employees" || key === "/api/appointments") {
    return { data: [], isLoading: false };
  }

  return { data: [], isLoading: false };
}

function getSlot(testId: string) {
  const slot = relationSlotCalls.find((entry) => entry.testId === testId);
  if (!slot) {
    throw new Error(`Missing slot ${testId}`);
  }
  return slot;
}

describe("FT01 appointment form relation slots", () => {
  beforeEach(() => {
    relationSlotCalls.length = 0;
    projectDetailCardCalls.length = 0;
    customerDetailCardCalls.length = 0;
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

  it("loads projects via scope=all and renders project/customer cards for a selected project", () => {
    renderToStaticMarkup(<AppointmentForm projectId={11} />);

    const projectSlot = getSlot("slot-project-relation");
    const customerSlot = getSlot("slot-customer-relation");

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["/api/projects?filter=all&scope=all"],
      }),
    );
    expect(projectSlot.state).toBe("active");
    expect(projectSlot.addActionTestId).toBe("button-select-project");
    expect(projectSlot.onRemove).toBeUndefined();
    expect(customerSlot.state).toBe("readonly");
    expect(customerSlot.emptyText).toBe("Kein Kunde ausgewählt");
    expect(projectDetailCardCalls[0]).toMatchObject({
      testId: "badge-project",
      project: expect.objectContaining({
        id: 11,
        customerId: 21,
        projectArticleItems: [{ label: "Saunamodell", value: "Modell A" }],
      }),
    });
    expect(customerDetailCardCalls[0]).toMatchObject({
      testId: "badge-customer",
      customer: expect.objectContaining({ id: 21 }),
      variant: "relationCompact",
    });
  });

  it("keeps both relation slots selectable when no project context exists", () => {
    renderToStaticMarkup(<AppointmentForm />);

    const projectSlot = getSlot("slot-project-relation");
    const customerSlot = getSlot("slot-customer-relation");

    expect(projectSlot.state).toBe("empty");
    expect(typeof projectSlot.onAdd).toBe("function");
    expect(customerSlot.state).toBe("empty");
    expect(customerSlot.emptyText).toBe("Kein Kunde ausgewählt");
    expect(typeof customerSlot.onAdd).toBe("function");
    expect(projectDetailCardCalls).toHaveLength(0);
    expect(customerDetailCardCalls).toHaveLength(0);
  });
});
