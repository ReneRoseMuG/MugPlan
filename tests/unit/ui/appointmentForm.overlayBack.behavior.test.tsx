/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das Terminformular rendert im Overlay-Kontext einen sichtbaren Zurueck-Button im Header.
 * - Der gleiche Close-Handler wird fuer Close und Cancel an das Formularlayout uebergeben.
 *
 * Fehlerfaelle:
 * - Overlay-Kontexte verlieren den sichtbaren Zurueck-Button.
 * - Close und Cancel laufen ueber unterschiedliche Handler.
 *
 * Ziel:
 * Sichtbare Overlay-Navigation des Terminformulars ohne Quelltext-Assertions absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let layoutProps:
  | {
      headerStartAction?: React.ReactNode;
      onClose?: () => void;
      onCancel?: () => void;
      children?: React.ReactNode;
    }
  | undefined;

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
  EntityFormLayout: (props: {
    headerStartAction?: React.ReactNode;
    onClose?: () => void;
    onCancel?: () => void;
    children?: React.ReactNode;
  }) => {
    layoutProps = props;
    return (
      <div data-testid="entity-form-layout">
        <div>{props.headerStartAction}</div>
        <div>{props.children}</div>
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
  if (key === "/api/projects?filter=all&scope=all" || key === "/api/customers" || key === "/api/tours" || key === "/api/teams" || key === "/api/employees" || key === "/api/tags") {
    return { data: [], isLoading: false };
  }
  if (typeof key === "string" && key.startsWith("/api/admin/master-data/")) {
    return { data: [], isLoading: false };
  }
  return { data: [], isLoading: false };
}

describe("FT01/FT04 UI: appointment form overlay back behavior", () => {
  beforeEach(() => {
    layoutProps = undefined;
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

  it("renders a visible back button only when overlay mode requests it", () => {
    const withoutBack = renderToStaticMarkup(<AppointmentForm />);
    const withBack = renderToStaticMarkup(<AppointmentForm showBackButton onBack={() => undefined} />);

    expect(withoutBack).not.toContain("button-back-appointment");
    expect(withBack).toContain("button-back-appointment");
    expect(withBack).toContain("Zurueck");
  });

  it("passes one shared close handler into close and cancel slots", () => {
    renderToStaticMarkup(<AppointmentForm showBackButton onBack={() => undefined} />);

    expect(layoutProps?.onClose).toBeTypeOf("function");
    expect(layoutProps?.onClose).toBe(layoutProps?.onCancel);
  });
});
