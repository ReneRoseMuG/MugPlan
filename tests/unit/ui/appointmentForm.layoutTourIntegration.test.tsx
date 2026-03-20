/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - AppointmentForm rendert Hauptbereich und rechte Sidebar in Create und Edit sichtbar getrennt.
 * - Ohne selektierte Tour bleibt die Tour-Auswahl ueber AppointmentEmployeeSlot im Hauptbereich.
 * - Attachments, Tags und Notizen bleiben in der rechten Sidebar.
 * - Die separate Tour-Badge bleibt oberhalb des Mitarbeiterpanels im Hauptbereich.
 *
 * Fehlerfaelle:
 * - Die rechte Formularspalte verschwindet erneut.
 * - Tour-Badge oder Mitarbeiterpanel rutschen in die Sidebar.
 *
 * Ziel:
 * Formularlayout und Tour-Integration ueber gerenderte Struktur statt Quelltext-Strings absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const employeeSlotCalls: Array<Record<string, unknown>> = [];
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: () => useMutationMock(),
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

vi.mock("@/components/ui/entity-form-layout", () => ({
  EntityFormLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

vi.mock("@/components/ui/customer-detail-card", () => ({
  CustomerDetailCard: ({ testId }: { testId?: string }) => <div data-testid={testId}>customer-card</div>,
}));

vi.mock("@/components/ui/project-detail-card", () => ({
  ProjectDetailCard: ({ testId }: { testId?: string }) => <div data-testid={testId}>project-card</div>,
}));

vi.mock("@/components/ui/relation-slot", () => ({
  RelationSlot: (props: Record<string, unknown> & { children?: React.ReactNode }) => (
    <section data-testid={String(props.testId)}>
      {String(props.title)}
      {props.children}
    </section>
  ),
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
  AppointmentAttachmentsPanel: () => <section data-testid="appointment-attachments-panel">attachments</section>,
}));

vi.mock("@/components/AppointmentEmployeeSlot", () => ({
  AppointmentEmployeeSlot: (props: Record<string, unknown>) => {
    employeeSlotCalls.push(props);
    return <section data-testid="appointment-employee-slot-marker">employee-slot</section>;
  },
}));

vi.mock("@/components/TagPickerPanel", () => ({
  TagPickerPanel: () => <section data-testid="appointment-tag-picker-marker">tags</section>,
}));

vi.mock("@/components/NotesSection", () => ({
  NotesSection: () => <section data-testid="notes-section-marker">notes</section>,
}));

vi.mock("@/components/DocumentExtractionDropzone", () => ({
  DocumentExtractionDropzone: () => <section data-testid="document-extraction-dropzone-marker">dropzone</section>,
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

  if (key === "/api/tours") {
    return {
      data: [
        {
          id: 31,
          name: "Nordtour",
          color: "#226688",
        },
      ],
      isLoading: false,
    };
  }

  if (key === "/api/teams" || key === "/api/employees" || key === "/api/tags") {
    return { data: [], isLoading: false };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/appointments" && (queryKey[2] === "tags" || queryKey[2] === "notes")) {
    return { data: [], isLoading: false };
  }

  if (typeof key === "string" && key.startsWith("/api/admin/master-data/")) {
    return { data: [], isLoading: false };
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

describe("FT01 appointment form layout tour integration", () => {
  beforeEach(() => {
    employeeSlotCalls.length = 0;
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

  it("keeps create mode flow in the main column and routes tour selection through AppointmentEmployeeSlot", () => {
    const markup = renderToStaticMarkup(<AppointmentForm />);

    expect(getIndex(markup, "appointment-form-main-column")).toBeLessThan(getIndex(markup, "slot-project-relation"));
    expect(getIndex(markup, "slot-project-relation")).toBeLessThan(getIndex(markup, "slot-customer-relation"));
    expect(getIndex(markup, "slot-customer-relation")).toBeLessThan(getIndex(markup, "appointment-employee-slot-marker"));
    expect(getIndex(markup, "appointment-employee-slot-marker")).toBeLessThan(getIndex(markup, "document-extraction-dropzone-marker"));

    const employeeSlotProps = employeeSlotCalls.at(-1);
    expect(employeeSlotProps).toMatchObject({
      tours: [expect.objectContaining({ id: 31 })],
      selectedTour: null,
    });
  });

  it("renders attachments, tags and notes inside the sidebar in edit mode", () => {
    const markup = renderToStaticMarkup(<AppointmentForm appointmentId={77} projectId={11} />);

    expect(markup).toContain("appointment-form-sidebar");
    expect(getIndex(markup, "appointment-form-main-column")).toBeLessThan(getIndex(markup, "appointment-form-sidebar"));
    expect(getIndex(markup, "appointment-form-sidebar")).toBeLessThan(getIndex(markup, "appointment-attachments-panel"));
    expect(getIndex(markup, "appointment-attachments-panel")).toBeLessThan(getIndex(markup, "appointment-tag-picker-marker"));
    expect(getIndex(markup, "appointment-tag-picker-marker")).toBeLessThan(getIndex(markup, "notes-section-marker"));
  });

  it("keeps document extraction in create mode only, while edit mode stays focused on sidebar content", () => {
    const createMarkup = renderToStaticMarkup(<AppointmentForm />);
    const editMarkup = renderToStaticMarkup(<AppointmentForm appointmentId={77} projectId={11} />);

    expect(createMarkup).toContain("document-extraction-dropzone-marker");
    expect(editMarkup).not.toContain("document-extraction-dropzone-marker");
  });
});
