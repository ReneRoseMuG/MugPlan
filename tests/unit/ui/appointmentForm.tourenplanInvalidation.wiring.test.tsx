/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Terminnotiz-Updates invalidieren die Termin-Notiz-Queries sowie kalendernahe Appointment-Queries.
 * - Appointment-bezogene Invalidierung nimmt die neue Tour-Lane-Hover-Preview des Wochenkalenders mit.
 *
 * Fehlerfaelle:
 * - Kalender- oder Lane-Hover-Daten bleiben nach geaenderter Terminnotiz stale, weil nur lokale Notiz-Queries invalidiert werden.
 * - Die neue Lane-Hover-Preview wird nach Terminnotiz-Mutationen nicht aktualisiert.
 *
 * Ziel:
 * Die Invalidierungsverdrahtung fuer Terminnotiz-Updates gegen stale Kalender- und Hoverdaten absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MutationOptions = {
  mutationFn?: (input: any) => Promise<unknown> | unknown;
  onSuccess?: (...args: any[]) => Promise<unknown> | unknown;
};

const queryInvalidateMock = vi.fn(async () => undefined);
const apiRequestMock = vi.fn(async () => ({ json: async () => ({}) }));
const invalidateTagProjectionQueriesMock = vi.fn(async () => undefined);
const useQueryMock = vi.fn();
const mutationOptions: MutationOptions[] = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: unknown }) => useQueryMock(options),
  useMutation: (options: MutationOptions) => {
    mutationOptions.push(options);
    return {
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    };
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
  queryClient: { invalidateQueries: (...args: unknown[]) => queryInvalidateMock(...args) },
}));

vi.mock("@/lib/tag-invalidation", () => ({
  invalidateTagProjectionQueries: () => invalidateTagProjectionQueriesMock(),
}));

vi.mock("@/lib/tags", () => ({
  getTagCatalogQueryKey: (domain: string) => ["/api/tags", domain],
  fetchTagCatalog: vi.fn(async () => []),
}));

vi.mock("@/lib/project-product-form", () => ({
  createEmptyProjectProductSelections: () => ({}),
}));

vi.mock("@/lib/project-appointments", () => ({
  PROJECT_APPOINTMENTS_ALL_FROM_DATE: "1900-01-01",
  getBerlinTodayDateString: () => "2099-01-01",
  getProjectAppointmentsQueryKey: vi.fn(({ projectId, fromDate }: { projectId: number; fromDate: string }) => [
    "/api/projects",
    projectId,
    "appointments",
    fromDate,
  ]),
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
  }) => <div>{header}{children}{sidebar}{footer}</div>,
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
  RelationSlot: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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

vi.mock("@/components/NotesSection", () => ({
  NotesSection: () => <div>notes-section</div>,
}));

vi.mock("@/components/TagPickerPanel", () => ({
  TagPickerPanel: () => <div>tag-picker</div>,
}));

vi.mock("@/components/DocumentExtractionDropzone", () => ({
  DocumentExtractionDropzone: () => <div>dropzone</div>,
}));

vi.mock("@/components/DocumentExtractionDialog", () => ({
  DocumentExtractionDialog: () => <div>dialog</div>,
}));

vi.mock("@/components/ProjectDuplicateResolutionDialog", () => ({
  ProjectDuplicateResolutionDialog: () => <div>duplicate-dialog</div>,
}));

import { AppointmentForm } from "../../../client/src/components/AppointmentForm";

function buildQueryResult(queryKey: unknown) {
  if (queryKey === "/api/projects?filter=all&scope=all") {
    return {
      data: [{
        id: 11,
        customerId: 21,
        name: "Projekt A",
        orderNumber: "ORD-11",
        descriptionMd: null,
        isActive: true,
        type: 1,
      }],
      isLoading: false,
      error: null,
    };
  }

  if (queryKey === "/api/customers") {
    return {
      data: [{
        id: 21,
        customerNumber: "C-21",
        fullName: "Kunde A",
        firstName: "Kunde",
        lastName: "A",
        isActive: true,
      }],
      isLoading: false,
      error: null,
    };
  }

  if (queryKey === "/api/tours") {
    return {
      data: [{
        id: 31,
        name: "Nordtour",
        color: "#226688",
      }],
      isLoading: false,
      error: null,
    };
  }

  if (queryKey === "/api/teams" || queryKey === "/api/employees") {
    return { data: [], isLoading: false, error: null };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/appointments" && queryKey[1] === 77 && queryKey.length === 2) {
    return {
      data: {
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
      },
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/appointments" && queryKey[1] === 77 && queryKey[2] === "notes") {
    return {
      data: [{
        id: 5,
        title: "Bestehende Notiz",
        body: "<p>Body</p>",
        cardColor: "#22c55e",
        print: false,
        isPinned: false,
        version: 3,
      }],
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/appointments" && queryKey[1] === 77 && queryKey[2] === "tags") {
    return { data: [], isLoading: false, error: null };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/tags") {
    return { data: [], isLoading: false, error: null };
  }

  return { data: [], isLoading: false, error: null };
}

async function findMutationByRequest(pathPattern: RegExp, payload: unknown) {
  for (const options of mutationOptions) {
    if (!options.mutationFn) continue;
    apiRequestMock.mockClear();
    try {
      await options.mutationFn(payload);
    } catch {
      // Only the called request path matters for mutation identification.
    }

    const call = apiRequestMock.mock.calls[0];
    if (!call) continue;
    const path = call[1];
    if (typeof path === "string" && pathPattern.test(path)) {
      return options;
    }
  }

  throw new Error(`Mutation for ${String(pathPattern)} not found`);
}

async function flushAsyncInvalidations() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("Tourenplan report invalidation wiring in AppointmentForm", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    mutationOptions.length = 0;
    queryInvalidateMock.mockClear();
    apiRequestMock.mockClear();
    invalidateTagProjectionQueriesMock.mockClear();
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => buildQueryResult(options.queryKey));
    Object.defineProperty(globalThis, "window", {
      value: {
        confirm: () => true,
        localStorage: {
          getItem: vi.fn(() => "DISPATCHER"),
        },
      },
      configurable: true,
    });
  });

  it("invalidates appointment and hover preview queries after an appointment note update", async () => {
    renderToStaticMarkup(<AppointmentForm appointmentId={77} projectId={11} />);

    const updateMutation = await findMutationByRequest(/\/api\/notes\/\d+$/, {
      noteId: 5,
      title: "Bestehende Notiz",
      body: "<p>Body</p>",
      cardColor: "#22c55e",
      print: true,
      version: 3,
    });

    updateMutation.onSuccess?.();
    await flushAsyncInvalidations();

    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["/api/appointments", 77, "notes"] });
    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["/api/notes-preview"] });
    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["calendarAppointments"] });
    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
  });
});
