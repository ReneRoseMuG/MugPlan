/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - AppointmentForm rendert EntityFormShell mit sichtbarem Hauptbereich und rechter Sidebar in Create und Edit.
 * - Im Edit-Modus zeigt AppointmentForm die Haupttabs `Details` und `Journal`; im Create-Modus bleibt der Journal-Tab verborgen.
 * - Ohne selektierte Tour bleibt die Tour-Auswahl ueber AppointmentEmployeeSlot im Hauptbereich.
 * - Attachments, Tags und Notizen bleiben in der rechten Sidebar.
 * - Die separate Tour-Badge bleibt oberhalb des Mitarbeiterpanels im Hauptbereich.
 *
 * Fehlerfaelle:
 * - Die rechte Formularspalte verschwindet erneut.
 * - Der neue Journal-Haupttab erscheint im Create-Modus oder fehlt im Edit-Modus.
 * - Tour-Badge oder Mitarbeiterpanel rutschen in die Sidebar.
 *
 * Ziel:
 * Formularlayout und Tour-Integration ueber gerenderte Struktur statt Quelltext-Strings absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const employeeSlotCalls: Array<Record<string, unknown>> = [];
const tagPickerCalls: Array<Record<string, unknown>> = [];
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
let appointmentDetailOverride:
  | {
      id: number;
      version: number;
      projectId: number | null;
      customerId: number;
      displayMode: "standard" | "compact" | "detail";
      tourId: number | null;
      title: string;
      description: string | null;
      startDate: string;
      startTime: string | null;
      endDate: string | null;
      endTime: string | null;
      employees: Array<Record<string, unknown>>;
      customerTags?: Array<Record<string, unknown>>;
      projectTags?: Array<Record<string, unknown>>;
      isCancelled: boolean;
    }
  | null = null;
let appointmentTagRelationsOverride: Array<Record<string, unknown>> = [];

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

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children?: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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
    return (
      <section data-testid="appointment-employee-slot-marker">
        employee-slot
        {props.selectedTour === null ? <div data-testid="section-tour-picker">tour-picker</div> : null}
      </section>
    );
  },
}));

vi.mock("@/components/TagPickerPanel", () => ({
  TagPickerPanel: (props: Record<string, unknown>) => {
    tagPickerCalls.push(props);
    const inheritedGroups = (props.inheritedTagGroups ?? []) as Array<{
      source: string;
      title: string;
      tags: Array<{ id: number; name: string }>;
    }>;

    return (
      <section data-testid="appointment-tag-picker-marker">
        tags
        {inheritedGroups.map((group) => (
          <div key={group.source} data-testid={`appointment-tag-picker-inherited-${group.source}`}>
            <span>{group.title}</span>
            {group.tags.map((tag) => (
              <span key={tag.id} data-testid={`appointment-tag-picker-inherited-${group.source}-tag-${tag.id}`}>
                {tag.name}
              </span>
            ))}
          </div>
        ))}
      </section>
    );
  },
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

import { AppointmentForm, buildAppointmentCardTagGroups } from "../../../client/src/components/AppointmentForm";

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

  if (Array.isArray(queryKey) && queryKey[0] === "/api/appointments" && queryKey[1] === 77 && queryKey.length === 2) {
    return { data: appointmentDetailOverride, isLoading: false };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/appointments" && queryKey[2] === "tags") {
    return { data: appointmentTagRelationsOverride, isLoading: false };
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
  beforeEach(() => {
    employeeSlotCalls.length = 0;
    tagPickerCalls.length = 0;
    appointmentDetailOverride = null;
    appointmentTagRelationsOverride = [];
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

    expect(markup).toContain("entity-form-shell");
    expect(markup).not.toContain("tabs-appointment-main");
    expect(markup).not.toContain("tab-appointment-journal");
    expect(getIndex(markup, "appointment-form-main-column")).toBeLessThan(getIndex(markup, "appointment-employee-slot-marker"));
    expect(getIndex(markup, "appointment-employee-slot-marker")).toBeLessThan(getIndex(markup, "slot-project-relation"));
    expect(getIndex(markup, "slot-project-relation")).toBeLessThan(getIndex(markup, "slot-customer-relation"));
    expect(getIndex(markup, "appointment-employee-slot-marker")).toBeLessThan(getIndex(markup, "document-extraction-dropzone-marker"));

    const employeeSlotProps = employeeSlotCalls.at(-1);
    expect(employeeSlotProps).toMatchObject({
      tours: [expect.objectContaining({ id: 31 })],
      selectedTour: null,
    });
    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["/api/tags", "appointment"],
    }));
  });

  it("renders attachments, tags and notes inside the sidebar in create mode", () => {
    const markup = renderToStaticMarkup(<AppointmentForm />);

    expect(markup).toContain("appointment-form-sidebar");
    expect(getIndex(markup, "appointment-form-main-column")).toBeLessThan(getIndex(markup, "appointment-form-sidebar"));
    expect(getIndex(markup, "appointment-form-sidebar")).toBeLessThan(getIndex(markup, "appointment-attachments-panel"));
    expect(getIndex(markup, "appointment-attachments-panel")).toBeLessThan(getIndex(markup, "appointment-tag-picker-marker"));
    expect(getIndex(markup, "appointment-tag-picker-marker")).toBeLessThan(getIndex(markup, "notes-section-marker"));
  });

  it("renders attachments, tags and notes inside the sidebar in edit mode", () => {
    appointmentDetailOverride = {
      id: 77,
      version: 4,
      projectId: 11,
      customerId: 21,
      displayMode: "standard",
      tourId: null,
      title: "Termin A",
      description: null,
      startDate: "2099-01-02",
      startTime: "08:00:00",
      endDate: "2099-01-02",
      endTime: "09:00:00",
      employees: [],
      isCancelled: false,
    };
    const markup = renderToStaticMarkup(<AppointmentForm appointmentId={77} projectId={11} />);

    expect(markup).toContain("appointment-form-sidebar");
    expect(markup).toContain("tabs-appointment-main");
    expect(markup).toContain("tab-appointment-details");
    expect(markup).toContain("tab-appointment-journal");
    expect(getIndex(markup, "appointment-form-main-column")).toBeLessThan(getIndex(markup, "appointment-form-sidebar"));
    expect(getIndex(markup, "appointment-form-sidebar")).toBeLessThan(getIndex(markup, "appointment-attachments-panel"));
    expect(getIndex(markup, "appointment-attachments-panel")).toBeLessThan(getIndex(markup, "appointment-tag-picker-marker"));
    expect(getIndex(markup, "appointment-tag-picker-marker")).toBeLessThan(getIndex(markup, "notes-section-marker"));
  });

  it("shows project and customer tags from the appointment card in the form sidebar as read-only inherited tags", () => {
    appointmentDetailOverride = {
      id: 77,
      version: 4,
      projectId: 11,
      customerId: 21,
      displayMode: "standard",
      tourId: null,
      title: "Termin A",
      description: null,
      startDate: "2099-01-02",
      startTime: "08:00:00",
      endDate: "2099-01-02",
      endTime: "09:00:00",
      employees: [],
      projectTags: [{ id: 201, name: "Reklamation", color: "#ff011b" }],
      customerTags: [{ id: 202, name: "VIP", color: "#2255aa" }],
      isCancelled: false,
    };
    appointmentTagRelationsOverride = [
      { tag: { id: 203, name: "Montage", color: "#22aa55" }, relationVersion: 1 },
    ];

    const markup = renderToStaticMarkup(<AppointmentForm appointmentId={77} projectId={11} />);

    expect(markup).not.toContain("appointment-card-tags-panel");
    expect(markup).toContain("appointment-tag-picker-inherited-project");
    expect(markup).toContain("appointment-tag-picker-inherited-project-tag-201");
    expect(markup).toContain("appointment-tag-picker-inherited-customer");
    expect(markup).toContain("appointment-tag-picker-inherited-customer-tag-202");
    expect(markup).toContain("Tags vom Projekt");
    expect(markup).toContain("Tags vom Kunden");
    expect(getIndex(markup, "appointment-tag-picker-marker")).toBeLessThan(getIndex(markup, "notes-section-marker"));
    expect(tagPickerCalls.at(-1)).toMatchObject({
      emptyText: "Keine Termin-Tags zugewiesen",
      inheritedTagGroups: [
        {
          source: "project",
          title: "Tags vom Projekt",
          tags: [expect.objectContaining({ name: "Reklamation" })],
        },
        {
          source: "customer",
          title: "Tags vom Kunden",
          tags: [expect.objectContaining({ name: "VIP" })],
        },
      ],
    });
  });

  it("keeps card tag groups aligned with the calendar card union and does not duplicate direct appointment tags", () => {
    const groups = buildAppointmentCardTagGroups({
      appointmentTags: [{ id: 301, name: "Montage", color: "#22aa55" }] as any,
      projectTags: [
        { id: 201, name: "Reklamation", color: "#ff011b" },
        { id: 301, name: "Montage", color: "#22aa55" },
      ] as any,
      customerTags: [
        { id: 202, name: "VIP", color: "#2255aa" },
        { id: 201, name: "Reklamation", color: "#ff011b" },
      ] as any,
    });

    expect(groups).toEqual([
      {
        source: "project",
        title: "Tags vom Projekt",
        tags: [expect.objectContaining({ id: 201, name: "Reklamation" })],
      },
      {
        source: "customer",
        title: "Tags vom Kunden",
        tags: [expect.objectContaining({ id: 202, name: "VIP" })],
      },
    ]);
  });

  it("keeps cancel and park actions in edit mode without rendering the former tooltip texts", () => {
    appointmentDetailOverride = {
      id: 77,
      version: 4,
      projectId: 11,
      customerId: 21,
      displayMode: "standard",
      tourId: null,
      title: "Termin A",
      description: null,
      startDate: "2099-01-02",
      startTime: "08:00:00",
      endDate: "2099-01-02",
      endTime: "09:00:00",
      employees: [],
      isCancelled: false,
    };

    const markup = renderToStaticMarkup(<AppointmentForm appointmentId={77} projectId={11} />);

    expect(markup).toContain("appointment-form-functions-panel");
    expect(markup).toContain("button-cancel-appointment");
    expect(markup).toContain("button-park-appointment");
    expect(markup).toContain("button-delete-appointment");
    expect(markup).not.toContain("Markiert den Termin als storniert");
    expect(markup).not.toContain("Verschiebt den Termin in die Parkplatz-Tour");
  });

  it("keeps document extraction in create mode only, while edit mode stays focused on sidebar content", () => {
    appointmentDetailOverride = {
      id: 77,
      version: 4,
      projectId: 11,
      customerId: 21,
      displayMode: "standard",
      tourId: null,
      title: "Termin A",
      description: null,
      startDate: "2099-01-02",
      startTime: "08:00:00",
      endDate: "2099-01-02",
      endTime: "09:00:00",
      employees: [],
      isCancelled: false,
    };
    const createMarkup = renderToStaticMarkup(<AppointmentForm />);
    const editMarkup = renderToStaticMarkup(<AppointmentForm appointmentId={77} projectId={11} />);

    expect(createMarkup).toContain("document-extraction-dropzone-marker");
    expect(editMarkup).not.toContain("document-extraction-dropzone-marker");
  });

  it("keeps the start date section before the project slot inside the shell main column", () => {
    const markup = renderToStaticMarkup(<AppointmentForm />);

    expect(getIndex(markup, "input-start-date")).toBeLessThan(getIndex(markup, "slot-project-relation"));
  });

  it("keeps editable shell actions in header and footer for create mode", () => {
    const markup = renderToStaticMarkup(<AppointmentForm />);

    expect(markup).toContain("button-close-appointment");
    expect(markup).toContain("button-secondary-cancel-appointment");
    expect(markup).toContain("button-save-appointment");
    expect(markup).toContain("Neuer Termin");
    expect(getIndex(markup, "button-secondary-cancel-appointment")).toBeLessThan(getIndex(markup, "button-save-appointment"));
  });

  it("keeps the tour picker inside the employee panel when no tour is selected", () => {
    const markup = renderToStaticMarkup(<AppointmentForm />);

    expect(markup).not.toContain("badge-tour");
    expect(markup).toContain("section-tour-picker");
    const employeeSlotProps = employeeSlotCalls.at(-1);
    expect(employeeSlotProps?.selectedTour).toBeNull();
  });
});
