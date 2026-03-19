/**
 * Test Scope:
 *
 * Feature: FT01/FT04 - Terminformular Layout + Tour-Integration
 *
 * Abgedeckte Regeln:
 * - AppointmentForm trennt Hauptformular und rechte Sidebar in Create und Edit wieder in echte Spalten.
 * - Ohne selektierte Tour bleibt die Tour-Auswahl im AppointmentEmployeeSlot des Hauptbereichs.
 * - Dokumentextraktion bleibt im Hauptbereich, waehrend Attachments, Tags und Notizen in der Sidebar liegen.
 * - Die separate Tour-Badge bleibt im Hauptbereich oberhalb des Mitarbeiterpanels verdrahtet.
 *
 * Fehlerfaelle:
 * - Die rechte Formularspalte verschwindet erneut.
 * - Dokumente, Tags oder Notizen landen wieder inline im Hauptfluss.
 * - Die Tour-Badge driftet in die Sidebar oder unter das Mitarbeiterpanel.
 *
 * Ziel:
 * Die umgestellte Formularstruktur und Tour-Integration repo-konform ueber Source- und Markup-Wiring absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const employeeSlotCalls: Array<Record<string, unknown>> = [];
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

  if (Array.isArray(queryKey) && queryKey[0] === "/api/appointments" && queryKey[2] === "tags") {
    return { data: [], isLoading: false };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/appointments" && queryKey[2] === "notes") {
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
  const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx");
  const source = readFileSync(filePath, "utf8");

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

  it("defines a two-column layout with explicit main column and sidebar markers", () => {
    expect(source).toContain('data-testid="appointment-form-main-column"');
    expect(source).toContain('data-testid="appointment-form-sidebar"');
    expect(source).toContain('<div className="grid gap-6 lg:grid-cols-3 lg:items-start">');
    expect(source).toContain('<div className="space-y-6 lg:col-span-2" data-testid="appointment-form-main-column">');
  });

  it("keeps create mode flow in the main column, routes tour selection through AppointmentEmployeeSlot and keeps the sidebar visible", () => {
    const markup = renderToStaticMarkup(<AppointmentForm />);

    expect(getIndex(markup, "appointment-form-main-column")).toBeLessThan(getIndex(markup, "slot-project-relation"));
    expect(getIndex(markup, "slot-project-relation")).toBeLessThan(getIndex(markup, "slot-customer-relation"));
    expect(getIndex(markup, "slot-customer-relation")).toBeLessThan(getIndex(markup, "appointment-employee-slot-marker"));
    expect(getIndex(markup, "appointment-employee-slot-marker")).toBeLessThan(getIndex(markup, "document-extraction-dropzone-marker"));
    expect(getIndex(markup, "appointment-form-main-column")).toBeLessThan(getIndex(markup, "appointment-form-sidebar"));
    expect(getIndex(markup, "appointment-form-sidebar")).toBeLessThan(getIndex(markup, "appointment-attachments-panel"));
    expect(getIndex(markup, "appointment-attachments-panel")).toBeLessThan(getIndex(markup, "appointment-tag-picker-marker"));
    expect(getIndex(markup, "appointment-tag-picker-marker")).toBeLessThan(getIndex(markup, "notes-section-marker"));

    const employeeSlotProps = employeeSlotCalls.at(-1);
    expect(employeeSlotProps).toMatchObject({
      tours: [expect.objectContaining({ id: 31 })],
      selectedTour: null,
    });
    expect(typeof employeeSlotProps?.onTourChange).toBe("function");
  });

  it("renders attachments, tags and notes inside the sidebar in edit mode", () => {
    const markup = renderToStaticMarkup(<AppointmentForm appointmentId={77} projectId={11} />);

    expect(markup).toContain("appointment-form-sidebar");
    expect(getIndex(markup, "appointment-form-main-column")).toBeLessThan(getIndex(markup, "appointment-form-sidebar"));
    expect(getIndex(markup, "appointment-form-sidebar")).toBeLessThan(getIndex(markup, "appointment-attachments-panel"));
    expect(getIndex(markup, "appointment-attachments-panel")).toBeLessThan(getIndex(markup, "appointment-tag-picker-marker"));
    expect(getIndex(markup, "appointment-tag-picker-marker")).toBeLessThan(getIndex(markup, "notes-section-marker"));
  });

  it("keeps the selected tour badge wired in the main column above the employee slot", () => {
    expect(source).toContain("{selectedTour ? (");
    expect(source).toContain("testId=\"badge-tour\"");
    expect(source.indexOf("testId=\"badge-tour\"")).toBeLessThan(source.indexOf("<AppointmentEmployeeSlot"));
    expect(source.indexOf("<AppointmentEmployeeSlot")).toBeLessThan(source.indexOf("data-testid=\"appointment-form-sidebar\""));
  });
});
