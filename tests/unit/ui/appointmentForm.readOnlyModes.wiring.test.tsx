/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Historische Termine werden im Formular für Admin und Disponent als reine Schließansicht gerendert.
 * - Stornierte Termine werden im Formular für Admin und Disponent ebenfalls als reine Schließansicht gerendert.
 * - Planung blockierte Termine werden im Formular für Admin und Disponent ebenfalls als reine Schließansicht gerendert.
 * - Das Formular reicht den Readonly-Modus an Dokumente, Tags, Notizen und Mitarbeiterbereich weiter.
 *
 * Fehlerfälle:
 * - Historische oder stornierte Termine zeigen weiterhin Speichern-, Storno-, Lösch- oder Zurück-Aktionen.
 * - Einzelne Sidebar-Bereiche bleiben trotz Readonly-Vertrag editierbar.
 *
 * Ziel:
 * Das sichtbare Readonly-Zielverhalten des Terminformulars für beide Rollen und beide Sperrgründe absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let currentRole = "DISPATCHER";
let currentMode: "historical" | "historicalParked" | "cancelled" | "planningBlocked" = "historical";
const attachmentPanelCalls: Array<Record<string, unknown>> = [];
const employeeSlotCalls: Array<Record<string, unknown>> = [];
const notesSectionCalls: Array<Record<string, unknown>> = [];
const tagPickerCalls: Array<Record<string, unknown>> = [];
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
  queryClient: { invalidateQueries: vi.fn(), fetchQuery: vi.fn() },
}));

vi.mock("@/lib/monitoring", () => ({
  refreshMonitoringWithNotification: vi.fn(async () => undefined),
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
  EntityFormShell: (props: {
    header?: React.ReactNode;
    footer?: React.ReactNode;
    sidebar?: React.ReactNode;
    children?: React.ReactNode;
  }) => {
    return (
      <div data-testid="entity-form-shell">
        <header>{props.header}</header>
        <main>{props.children}</main>
        <aside>{props.sidebar}</aside>
        <footer>{props.footer}</footer>
      </div>
    );
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children?: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) => (open ? <div>{children}</div> : null),
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
  AlertDialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) => (open ? <div>{children}</div> : null),
  AlertDialogAction: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
  AlertDialogCancel: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
  AlertDialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/customer-detail-card", () => ({
  CustomerDetailCard: () => <div>customer-card</div>,
}));

vi.mock("@/components/ui/project-detail-card", () => ({
  ProjectDetailCard: () => <div>project-card</div>,
}));

vi.mock("@/components/ui/relation-slot", () => ({
  RelationSlot: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock("@/components/ui/tour-info-badge", () => ({
  TourInfoBadge: () => <div>tour-badge</div>,
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
  AppointmentAttachmentsPanel: (props: Record<string, unknown>) => {
    attachmentPanelCalls.push(props);
    return <section data-testid="attachments-panel">attachments</section>;
  },
}));

vi.mock("@/components/AppointmentEmployeeSlot", () => ({
  AppointmentEmployeeSlot: (props: Record<string, unknown>) => {
    employeeSlotCalls.push(props);
    return <section data-testid="employee-slot">employee-slot</section>;
  },
}));

vi.mock("@/components/TagPickerPanel", () => ({
  TagPickerPanel: (props: Record<string, unknown>) => {
    tagPickerCalls.push(props);
    return <section data-testid="tag-picker">tags</section>;
  },
}));

vi.mock("@/components/NotesSection", () => ({
  NotesSection: (props: Record<string, unknown>) => {
    notesSectionCalls.push(props);
    return <section data-testid="notes-section">notes</section>;
  },
}));

vi.mock("@/components/DocumentExtractionDropzone", () => ({
  DocumentExtractionDropzone: () => <div>dropzone</div>,
}));

vi.mock("@/components/DocumentExtractionDialog", () => ({
  DocumentExtractionDialog: () => <div>dialog</div>,
}));

import { AppointmentForm } from "../../../client/src/components/AppointmentForm";

function buildAppointmentDetail(mode: "historical" | "historicalParked" | "cancelled" | "planningBlocked") {
  return {
    id: 77,
    version: 3,
    projectId: null,
    customerId: 21,
    displayMode: "standard",
    tourId: mode === "historicalParked" ? 88 : null,
    title: "Termin A",
    description: null,
    startDate: mode === "cancelled" || mode === "planningBlocked" ? "2099-01-02" : "2000-01-01",
    startTime: "08:00:00",
    endDate: "2099-01-02",
    endTime: "09:00:00",
    employees: [{ id: 41, firstName: "Mia", lastName: "Muster" }],
    appointmentTags: mode === "planningBlocked" ? [{ id: 81, name: "Planung blockiert", color: "#8B6A00", version: 1 }] : [],
    isCancelled: mode === "cancelled",
  };
}

function buildQueryResult(queryKey: unknown): { data: unknown; isLoading: boolean } {
  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;

  if (Array.isArray(queryKey) && queryKey[0] === "/api/appointments" && queryKey[1] === 77 && queryKey.length === 2) {
    return { data: buildAppointmentDetail(currentMode), isLoading: false };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/appointments" && queryKey[2] === "tags") {
    return { data: [], isLoading: false };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/appointments" && queryKey[2] === "notes") {
    return {
      data: [{ id: 91, title: "Hinweis", body: "<p>Readonly</p>", isPinned: false, print: false, cardColor: null, cardColorLocked: false }],
      isLoading: false,
    };
  }

  if (key === "/api/projects?filter=all&scope=all") {
    return { data: [], isLoading: false };
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

  if ((Array.isArray(queryKey) && queryKey[0] === "/api/tours") || key === "/api/tours") {
    return {
      data: [
        { id: 88, name: "Parkplatz", color: "#D4537E" },
        { id: 99, name: "Tour A", color: "#123456" },
      ],
      isLoading: false,
    };
  }

  if (key === "/api/teams") {
    return { data: [{ id: 11, name: "Montage", color: "#111111" }], isLoading: false };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/employees") {
    return { data: [{ id: 41, firstName: "Mia", lastName: "Muster", isActive: true }], isLoading: false };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/tags" && queryKey[1] === "appointment") {
    return { data: [{ id: 61, name: "Demo", color: "#123456", domain: "appointment" }], isLoading: false };
  }

  if (typeof key === "string" && key.startsWith("/api/admin/master-data/")) {
    return { data: [], isLoading: false };
  }

  return { data: [], isLoading: false };
}

describe("FT01 UI: appointment form readonly modes", () => {
  beforeEach(() => {
    currentRole = "DISPATCHER";
    currentMode = "historical";
    attachmentPanelCalls.length = 0;
    employeeSlotCalls.length = 0;
    notesSectionCalls.length = 0;
    tagPickerCalls.length = 0;
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
        getItem: () => currentRole,
      },
      confirm: () => true,
    });
  });

  it.each([
    ["DISPATCHER", "historical"],
    ["ADMIN", "historical"],
    ["DISPATCHER", "cancelled"],
    ["ADMIN", "cancelled"],
    ["DISPATCHER", "planningBlocked"],
    ["ADMIN", "planningBlocked"],
  ] as const)(
    "renders only a close action for %s appointments in %s mode",
    (role, mode) => {
      currentRole = role;
      currentMode = mode;

      const markup = renderToStaticMarkup(
        <AppointmentForm
          appointmentId={77}
          showBackButton
          onBack={() => undefined}
          onCancel={() => undefined}
        />,
      );

      expect(markup).toContain("Schließen");
      expect(markup).not.toContain("Speichern");
      expect(markup).not.toContain("Termin stornieren");
      expect(markup).not.toContain("Termin löschen");
      expect(markup).not.toContain("button-back-appointment");
      expect(markup).not.toContain("Zurück");
      expect(markup).not.toContain("button-close-appointment");
      expect(markup).not.toContain("button-save-appointment");
      if (mode === "historical") {
        expect(markup).toContain("Termin gesperrt");
        expect(markup).not.toContain("Termin storniert");
        expect(markup).not.toContain("Planung blockiert");
      } else if (mode === "planningBlocked") {
        expect(markup).toContain("Planung blockiert");
        expect(markup).not.toContain("Termin storniert");
      } else {
        expect(markup).toContain("Termin storniert");
      }

      const latestAttachmentPanelCall = attachmentPanelCalls[attachmentPanelCalls.length - 1];
      const latestEmployeeSlotCall = employeeSlotCalls[employeeSlotCalls.length - 1];
      const latestNotesSectionCall = notesSectionCalls[notesSectionCalls.length - 1];
      const latestTagPickerCall = tagPickerCalls[tagPickerCalls.length - 1];

      expect(latestAttachmentPanelCall?.readOnly).toBe(true);
      expect(latestEmployeeSlotCall?.readOnly).toBe(true);
      expect(latestEmployeeSlotCall?.isLocked).toBe(true);
      expect(latestNotesSectionCall?.readOnly).toBe(true);
      expect(latestTagPickerCall?.canEdit).toBe(false);
    },
  );

  it.each([
    "DISPATCHER",
    "ADMIN",
  ] as const)("keeps historical Parkplatz appointments editable for %s", (role) => {
    currentRole = role;
    currentMode = "historicalParked";

    const markup = renderToStaticMarkup(
      <AppointmentForm
        appointmentId={77}
        showBackButton
        onBack={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain("Speichern");
    expect(markup).toContain("Stornieren");
    expect(markup).toContain("Löschen");
    expect(markup).not.toContain("Termin gesperrt");

    const latestAttachmentPanelCall = attachmentPanelCalls[attachmentPanelCalls.length - 1];
    const latestEmployeeSlotCall = employeeSlotCalls[employeeSlotCalls.length - 1];
    const latestNotesSectionCall = notesSectionCalls[notesSectionCalls.length - 1];
    const latestTagPickerCall = tagPickerCalls[tagPickerCalls.length - 1];

    expect(latestAttachmentPanelCall?.readOnly).toBe(false);
    expect(latestEmployeeSlotCall?.readOnly).toBe(false);
    expect(latestEmployeeSlotCall?.isLocked).toBe(false);
    expect(latestNotesSectionCall?.readOnly).toBe(false);
    expect(latestTagPickerCall?.canEdit).toBe(true);
  });
});
