/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Manuelle Terminnotizen verwenden die Appointment-Note-Mutation ohne Template-Editor-Reopen.
 * - Template-getriebene Notizen setzen das lokale openEditorOnSuccess-Flag.
 * - Der Template-Editor oeffnet nur fuer den Template-Pfad und schliesst danach wieder.
 * - Draft-Notizen im Create-Modus bleiben lokal und triggern keine Server-Mutation.
 *
 * Ziel:
 * Das lokale Zusammenspiel aus NotesSection, Terminnotiz-Mutation und Template-Editor im AppointmentForm absichern.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MutationOptions = {
  mutationFn?: (input: any) => Promise<unknown> | unknown;
  onSuccess?: (...args: any[]) => Promise<unknown> | unknown;
  onError?: (...args: any[]) => Promise<unknown> | unknown;
};

const stateStore: unknown[] = [];
const setterSpies: Array<ReturnType<typeof vi.fn>> = [];
let stateCursor = 0;
const mutationOptions: Array<MutationOptions & { mutate: ReturnType<typeof vi.fn>; mutateAsync: ReturnType<typeof vi.fn> }> = [];
const queryInvalidateMock = vi.fn(async () => undefined);
const apiRequestMock = vi.fn(async () => ({ json: async () => ({}) }));
const invalidateTagProjectionQueriesMock = vi.fn(async () => undefined);
const useQueryMock = vi.fn();
let lastNotesSectionProps: Record<string, unknown> | null = null;
const alertActionProps = new Map<string, Record<string, unknown>>();
const alertCancelProps = new Map<string, Record<string, unknown>>();
const buttonProps = new Map<string, Record<string, unknown>>();

const appointmentFormStateHook = {
  noteSuggestionDialog: 17,
  templateNoteEditorOpen: 21,
  templateNoteEditorId: 22,
  templateNoteEditorVersion: 23,
  templateNoteTitle: 24,
  templateNoteBody: 25,
  templateNoteCardColor: 26,
  templateNotePrint: 27,
  templateNoteCardColorLocked: 28,
  draftAppointmentNotes: 40,
  userRole: 43,
} as const;

function resetStateHooks(overrides: Record<number, unknown> = {}) {
  stateStore.length = 0;
  setterSpies.length = 0;
  stateCursor = 0;
  for (const [key, value] of Object.entries(overrides)) {
    stateStore[Number(key)] = value;
  }
}

function resetRenderRegistries() {
  lastNotesSectionProps = null;
  alertActionProps.clear();
  alertCancelProps.clear();
  buttonProps.clear();
}

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    default: actual,
    useState: <T,>(initialValue: T | (() => T)) => {
      const index = stateCursor++;
      if (!(index in stateStore)) {
        stateStore[index] = typeof initialValue === "function"
          ? (initialValue as () => T)()
          : initialValue;
      }
      if (!setterSpies[index]) {
        setterSpies[index] = vi.fn((nextValue: T | ((current: T) => T)) => {
          const currentValue = stateStore[index] as T;
          stateStore[index] = typeof nextValue === "function"
            ? (nextValue as (current: T) => T)(currentValue)
            : nextValue;
        });
      }
      return [stateStore[index] as T, setterSpies[index]] as const;
    },
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: unknown }) => useQueryMock(options),
  useMutation: (options: MutationOptions) => {
    const mutate = vi.fn();
    const mutateAsync = vi.fn(async (payload: unknown) => payload);
    mutationOptions.push({ ...options, mutate, mutateAsync });
    return {
      mutate,
      mutateAsync,
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
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
    const testId = typeof props["data-testid"] === "string" ? props["data-testid"] : null;
    if (testId) {
      buttonProps.set(testId, props);
    }
    return <button type="button" {...props}>{children}</button>;
  },
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
  AlertDialogAction: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
    const testId = typeof props["data-testid"] === "string" ? props["data-testid"] : null;
    if (testId) {
      alertActionProps.set(testId, props);
    }
    return <button type="button" {...props}>{children}</button>;
  },
  AlertDialogCancel: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
    const testId = typeof props["data-testid"] === "string" ? props["data-testid"] : null;
    if (testId) {
      alertCancelProps.set(testId, props);
    }
    return <button type="button" {...props}>{children}</button>;
  },
  AlertDialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/customer-detail-card", () => ({
  CustomerDetailCard: () => <div>customer-card</div>,
}));

vi.mock("@/components/ui/edit-form-context-text", () => ({
  EditFormContextText: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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

vi.mock("@/components/TagPickerPanel", () => ({
  TagPickerPanel: () => <div>tag-picker</div>,
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

vi.mock("@/components/TourEmployeeCascadeDialog", () => ({
  TourEmployeeCascadeDialog: () => <div>employee-cascade</div>,
}));

vi.mock("@/components/AppointmentAttachmentsPanel", () => ({
  AppointmentAttachmentsPanel: () => <div>attachments</div>,
}));

vi.mock("@/components/AppointmentEmployeeSlot", () => ({
  AppointmentEmployeeSlot: () => <div>employee-slot</div>,
}));

vi.mock("@/components/JournalRecordsView", () => ({
  JournalRecordsView: () => <div>journal</div>,
}));

vi.mock("@/components/NotesSection", () => ({
  NotesSection: (props: Record<string, unknown>) => {
    lastNotesSectionProps = props;
    return <div>notes-section</div>;
  },
}));

vi.mock("@/components/RichTextEditor", () => ({
  RichTextEditor: () => <div>editor</div>,
}));

vi.mock("@/components/DocumentExtractionDropzone", () => ({
  DocumentExtractionDropzone: () => <div>dropzone</div>,
}));

vi.mock("@/components/AppointmentCancelConfirmDialog", () => ({
  AppointmentCancelConfirmDialog: () => <div>cancel-dialog</div>,
}));

vi.mock("@/components/DocumentExtractionDialog", () => ({
  DocumentExtractionDialog: () => <div>document-dialog</div>,
}));

vi.mock("@/components/ProjectDuplicateResolutionDialog", () => ({
  ProjectDuplicateResolutionDialog: () => <div>duplicate-dialog</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: (props: Record<string, unknown>) => <input type="checkbox" readOnly {...props} />,
}));

vi.mock("@/components/ui/color-select-button", () => ({
  ColorSelectButton: () => <button type="button">color</button>,
}));

import React from "react";
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
      data: [{ id: 31, name: "Nordtour", color: "#226688" }],
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
        appointmentTags: [],
        isCancelled: false,
      },
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/appointments" && queryKey[1] === 77 && queryKey[2] === "notes") {
    return {
      data: [],
      isLoading: false,
      error: null,
    };
  }

  if (Array.isArray(queryKey) && queryKey[0] === "/api/note-templates") {
    return {
      data: [
        { id: 5, title: "Reklamation", body: "<p>Reklamation</p>", cardColor: "#22c55e", print: true },
        { id: 6, title: "Messe Aufbau/Abbau", body: "<p>Messe</p>", cardColor: "#f97316", print: false },
      ],
      isLoading: false,
      error: null,
    };
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
      // Mutation discovery relies only on the request path.
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

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("FT13 UI: appointment form note editor behavior", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    resetStateHooks({
      [appointmentFormStateHook.userRole]: "DISPATCHER",
    });
    mutationOptions.length = 0;
    queryInvalidateMock.mockClear();
    apiRequestMock.mockClear();
    invalidateTagProjectionQueriesMock.mockClear();
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => buildQueryResult(options.queryKey));
    resetRenderRegistries();
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

  it("uses the appointment note mutation without openEditorOnSuccess for manual notes in edit mode", async () => {
    renderToStaticMarkup(<AppointmentForm appointmentId={77} projectId={11} />);

    const createMutation = await findMutationByRequest(/\/api\/appointments\/77\/notes$/, {
      appointmentId: 77,
      title: "Terminnotiz",
      body: "<p>Body</p>",
      cardColor: "#38bdf8",
      print: true,
    });

    expect(lastNotesSectionProps).toBeTruthy();
    (lastNotesSectionProps?.onAdd as (data: unknown) => void)({
      title: "Terminnotiz",
      body: "<p>Body</p>",
      cardColor: "#38bdf8",
      print: true,
    });

    expect(createMutation.mutate).toHaveBeenCalledWith({
      appointmentId: 77,
      title: "Terminnotiz",
      body: "<p>Body</p>",
      cardColor: "#38bdf8",
      print: true,
    });
  });

  it("keeps the template editor closed after manual note creation success but still invalidates note queries", async () => {
    renderToStaticMarkup(<AppointmentForm appointmentId={77} projectId={11} />);

    const createMutation = await findMutationByRequest(/\/api\/appointments\/77\/notes$/, {
      appointmentId: 77,
      title: "Terminnotiz",
      body: "<p>Body</p>",
      cardColor: "#38bdf8",
      print: true,
    });

    createMutation.onSuccess?.(
      {
        id: 10,
        version: 2,
        title: "Terminnotiz",
        body: "<p>Body</p>",
        cardColor: "#38bdf8",
        print: true,
        cardColorLocked: false,
      },
      {
        appointmentId: 77,
        title: "Terminnotiz",
        body: "<p>Body</p>",
        cardColor: "#38bdf8",
        print: true,
      },
    );
    await flushMicrotasks();

    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["/api/appointments", 77, "notes"] });
    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["/api/notes-preview"] });
    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["calendarAppointments"] });
    expect(queryInvalidateMock).toHaveBeenCalledWith({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
    expect(setterSpies[appointmentFormStateHook.templateNoteEditorOpen]).not.toHaveBeenCalledWith(true);
  });

  it("stores draft notes locally in create mode without calling the appointment note mutation", async () => {
    renderToStaticMarkup(<AppointmentForm projectId={11} />);

    const createMutation = await findMutationByRequest(/\/api\/appointments\/\d+\/notes$/, {
      appointmentId: 77,
      title: "Terminnotiz",
      body: "<p>Body</p>",
      cardColor: "#38bdf8",
      print: true,
    });

    (lastNotesSectionProps?.onAdd as (data: unknown) => void)({
      title: "Draftnotiz",
      body: "<p>Draft</p>",
      cardColor: "#38bdf8",
      print: false,
      templateId: 9,
    });

    expect(createMutation.mutate).not.toHaveBeenCalled();
    const nextDrafts = stateStore.find((value): value is Array<Record<string, unknown>> => (
      Array.isArray(value)
      && value.some((item) => item.title === "Draftnotiz")
    ));
    expect(nextDrafts).toBeDefined();
    expect(nextDrafts).toHaveLength(1);
    expect(nextDrafts?.[0]).toMatchObject({
      title: "Draftnotiz",
      body: "<p>Draft</p>",
      cardColor: "#38bdf8",
      print: false,
      templateId: 9,
    });
  });

  it("sets openEditorOnSuccess only for the template suggestion confirm flow", async () => {
    resetStateHooks({
      [appointmentFormStateHook.noteSuggestionDialog]: { templateTitle: "Reklamation", appointmentId: 77 },
      [appointmentFormStateHook.userRole]: "DISPATCHER",
    });

    renderToStaticMarkup(<AppointmentForm appointmentId={77} projectId={11} />);

    const createMutation = await findMutationByRequest(/\/api\/appointments\/77\/notes$/, {
      appointmentId: 77,
      title: "Reklamation",
      body: "<p>Reklamation</p>",
      cardColor: "#22c55e",
      print: true,
      templateId: 5,
    });

    const confirmAction = buttonProps.get("button-note-suggestion-confirm");
    expect(confirmAction).toBeTruthy();
    (confirmAction?.onClick as (() => void))();
    await flushMicrotasks();

    expect(createMutation.mutateAsync).toHaveBeenCalledWith({
      appointmentId: 77,
      title: "Reklamation",
      body: "<p>Reklamation</p>",
      cardColor: "#22c55e",
      print: true,
      templateId: 5,
      openEditorOnSuccess: true,
    });
    expect(setterSpies[appointmentFormStateHook.noteSuggestionDialog]).toHaveBeenCalledWith(null);
  });

  it("opens the template editor only when onSuccess receives openEditorOnSuccess", async () => {
    renderToStaticMarkup(<AppointmentForm appointmentId={77} projectId={11} />);

    const createMutation = await findMutationByRequest(/\/api\/appointments\/77\/notes$/, {
      appointmentId: 77,
      title: "Reklamation",
      body: "<p>Reklamation</p>",
      cardColor: "#22c55e",
      print: true,
      templateId: 5,
    });

    createMutation.onSuccess?.(
      {
        id: 15,
        version: 4,
        title: "Reklamation",
        body: "<p>Reklamation</p>",
        cardColor: "#22c55e",
        print: true,
        cardColorLocked: true,
      },
      {
        appointmentId: 77,
        title: "Reklamation",
        body: "<p>Reklamation</p>",
        cardColor: "#22c55e",
        print: true,
        templateId: 5,
        openEditorOnSuccess: true,
      },
    );
    await flushMicrotasks();

    expect(setterSpies[appointmentFormStateHook.templateNoteEditorId]).toHaveBeenCalledWith(15);
    expect(setterSpies[appointmentFormStateHook.templateNoteEditorVersion]).toHaveBeenCalledWith(4);
    expect(setterSpies[appointmentFormStateHook.templateNoteTitle]).toHaveBeenCalledWith("Reklamation");
    expect(setterSpies[appointmentFormStateHook.templateNoteBody]).toHaveBeenCalledWith("<p>Reklamation</p>");
    expect(setterSpies[appointmentFormStateHook.templateNoteCardColor]).toHaveBeenCalledWith("#22c55e");
    expect(setterSpies[appointmentFormStateHook.templateNotePrint]).toHaveBeenCalledWith(true);
    expect(setterSpies[appointmentFormStateHook.templateNoteCardColorLocked]).toHaveBeenCalledWith(true);
    expect(setterSpies[appointmentFormStateHook.templateNoteEditorOpen]).toHaveBeenCalledWith(true);
  });

  it("closes the suggestion dialog on skip and closes the template editor on cancel", () => {
    resetStateHooks({
      [appointmentFormStateHook.noteSuggestionDialog]: { templateTitle: "Reklamation", appointmentId: 77 },
      [appointmentFormStateHook.userRole]: "DISPATCHER",
    });

    renderToStaticMarkup(<AppointmentForm appointmentId={77} projectId={11} />);

    const skipAction = buttonProps.get("button-note-suggestion-skip");
    expect(skipAction).toBeTruthy();
    (skipAction?.onClick as (() => void))();
    expect(setterSpies[appointmentFormStateHook.noteSuggestionDialog]).toHaveBeenCalledWith(null);

    const cancelNoteButton = buttonProps.get("button-cancel-note");
    expect(cancelNoteButton).toBeTruthy();
    (cancelNoteButton?.onClick as (() => void))();
    expect(setterSpies[appointmentFormStateHook.templateNoteEditorOpen]).toHaveBeenCalledWith(false);
  });
});
