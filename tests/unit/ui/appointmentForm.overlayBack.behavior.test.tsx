/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das Terminformular rendert im Overlay-Kontext einen sichtbaren Zurück-Button im Header.
 * - Der gleiche Close-Handler wird für Close und Cancel an das Formularlayout übergeben.
 * - Erfolgreiches Stornieren nutzt denselben `onSaved`-Rückweg und kann das Formular dadurch schließen.
 *
 * Fehlerfaelle:
 * - Overlay-Kontexte verlieren den sichtbaren Zurück-Button.
 * - Close und Cancel laufen über unterschiedliche Handler.
 * - Der Storno-Erfolg lässt das Formular offen, obwohl ein `onSaved`-Schließpfad vorhanden ist.
 *
 * Ziel:
 * Sichtbare Overlay-Navigation und den Schließpfad nach erfolgreichem Storno ohne Quelltext-Assertions absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let layoutProps:
  | {
      header?: React.ReactNode;
      footer?: React.ReactNode;
      children?: React.ReactNode;
    }
  | undefined;

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const mutationConfigs: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: Record<string, unknown>) => {
    mutationConfigs.push(options);
    return useMutationMock(options);
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
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
    layoutProps = props;
    return (
      <div data-testid="entity-form-shell">
        <div>{props.header}</div>
        <div>{props.children}</div>
        <div>{props.footer}</div>
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

describe("FT01/FT04 UI: appointment form overlay back behavior", () => {
  beforeEach(() => {
    layoutProps = undefined;
    mutationConfigs.length = 0;
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
    expect(withBack).toContain("Zurück");
  });

  it("passes one shared close handler into close and cancel slots", () => {
    renderToStaticMarkup(<AppointmentForm showBackButton onBack={() => undefined} />);

    const closeButton = findElementByTestId(layoutProps?.header, "button-close-appointment");
    const cancelButton = findElementByTestId(layoutProps?.footer, "button-secondary-cancel-appointment");

    expect(closeButton?.props.onClick).toBeTypeOf("function");
    expect(closeButton?.props.onClick).toBe(cancelButton?.props.onClick);
  });

  it("uses onSaved after a successful cancellation mutation", async () => {
    const onSaved = vi.fn();
    renderToStaticMarkup(<AppointmentForm appointmentId={77} onSaved={onSaved} />);

    const cancelMutationConfig = mutationConfigs[2] as { onSuccess?: () => Promise<void> } | undefined;
    expect(cancelMutationConfig?.onSuccess).toBeTypeOf("function");

    await cancelMutationConfig?.onSuccess?.();

    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});
