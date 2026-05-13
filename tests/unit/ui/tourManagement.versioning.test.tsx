/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TourCreate sendet nur den Create-Request ohne direkte Mitarbeiterzuweisung.
 * - TourUpdate sendet Name, Farbe und Version als versionierten PATCH-Payload.
 * - Der Admin-Dialog behaelt den Delete-Flow mit versioniertem DELETE-Payload.
 * - Erfolgreiche Wochenplan-Mutationen bestaetigen den Execute-Request und triggern Refresh/Invalidierung fuer abhaengige Views.
 * - Erfolgreiche Wochenplan-Mutationen invalidieren auch die neue Tour-Lane-Hover-Preview des Wochenkalenders.
 * - Wochenplan-Dialoge starten mit sinnvoller Vorauswahl und bulk-selektierte Mitarbeitende laufen sequentiell durch denselben Preview-Pfad.
 * - Listenbasierte Mehrfachauswahl im Wochenplan-Picker startet denselben Preview-Fluss sequentiell fuer weitere Mitarbeitende.
 * - Blockieren und Freigeben der Wochenplanung bestaetigen nur den Statuswechsel, ohne stille Termin-Tag-Mutationen im Toast auszuspielen.
 *
 * Fehlerfaelle:
 * - Versiondaten fehlen in Tour-Mutationen.
 * - Der Tourname wird im Update-Payload nicht mitgesendet.
 * - Der Admin-Delete-Flow driftet aus dem Dialog heraus.
 * - Erfolgreiche Wochenplan-Aktionen lassen Monitoring- und Query-Refresh aus.
 * - Mehrfach ausgewaehlte Wochenplan-Mitarbeiter verlieren den Folge-Preview nach dem ersten Execute.
 * - Stille Termin-Tag-Mutationen werden im UI als sichtbare Termin-Anpassungen fehlkommuniziert.
 *
 * Ziel:
 * TourManagement ueber beobachtbare Mutations- und Folgeeffekte der Wochenplanung statt ueber Quelltextstrings absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequestMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const setQueryDataMock = vi.fn();
const invalidateTagProjectionQueriesMock = vi.fn();
const refreshMonitoringWithNotificationMock = vi.fn();
const toastMock = vi.fn();
const useQueryMock = vi.fn();
const setEditingTourMock = vi.fn();
const setIsCreatingMock = vi.fn();
const setCascadeDialogStateMock = vi.fn();
const setPendingBlockWeekMock = vi.fn();
const tourEditFormCalls: Array<Record<string, unknown>> = [];
const cascadeDialogCalls: Array<Record<string, unknown>> = [];
const confirmDialogCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useQueryClient: () => ({ invalidateQueries: vi.fn(), fetchQuery: vi.fn() }),
  useMutation: (options: {
    mutationFn: (variables: unknown) => Promise<unknown>;
    onSuccess?: (result: unknown, variables: unknown, context: unknown) => unknown;
    onError?: (error: unknown, variables: unknown, context: unknown) => unknown;
  }) => {
    const run = async (
      variables: unknown,
      mutateOptions?: {
        onSuccess?: (result: unknown, variables: unknown, context: unknown) => unknown;
        onError?: (error: unknown, variables: unknown, context: unknown) => unknown;
      },
    ) => {
      try {
        const result = await options.mutationFn(variables);
        await options.onSuccess?.(result, variables, undefined);
        await mutateOptions?.onSuccess?.(result, variables, undefined);
        return result;
      } catch (error) {
        options.onError?.(error, variables, undefined);
        mutateOptions?.onError?.(error, variables, undefined);
        throw error;
      }
    };

    return {
      mutateAsync: (variables: unknown) => run(variables),
      mutate: (variables: unknown, mutateOptions?: { onSuccess?: (result: unknown) => unknown; onError?: (error: unknown) => unknown }) =>
        run(variables, mutateOptions).catch(() => undefined),
      isPending: false,
    };
  },
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
  queryClient: {
    invalidateQueries: (...args: unknown[]) => invalidateQueriesMock(...args),
    setQueryData: (...args: unknown[]) => setQueryDataMock(...args),
  },
}));

vi.mock("@/lib/project-appointments", () => ({
  getBerlinTodayDateString: () => "2099-01-10",
}));

vi.mock("@/lib/tag-invalidation", () => ({
  invalidateTagProjectionQueries: (...args: unknown[]) => invalidateTagProjectionQueriesMock(...args),
}));

vi.mock("@/lib/monitoring", () => ({
  refreshMonitoringWithNotification: (...args: unknown[]) => refreshMonitoringWithNotificationMock(...args),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: () => false,
  useSettings: () => ({ setSetting: vi.fn() }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/dialog-base", () => ({
  ConfirmDialogBase: (props: Record<string, unknown>) => {
    confirmDialogCalls.push(props);
    return <section data-testid={props.testId as string | undefined}>confirm-dialog</section>;
  },
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ footerSlot, contentSlot }: { footerSlot?: React.ReactNode; contentSlot?: React.ReactNode }) => (
    <section>
      {footerSlot}
      {contentSlot}
    </section>
  ),
}));

vi.mock("@/components/ui/board-view", () => ({
  BoardView: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/colored-entity-card", () => ({
  ColoredEntityCard: ({ children, footer, testId }: { children?: React.ReactNode; footer?: React.ReactNode; testId?: string }) => (
    <article data-testid={testId}>
      {children}
      {footer}
    </article>
  ),
}));

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({ testId }: { testId?: string }) => <div data-testid={testId}>member</div>,
}));

vi.mock("@/components/ui/members-section-header", () => ({
  MembersSectionHeader: () => <div>members</div>,
}));

vi.mock("@/components/ui/badge-interaction-provider", () => ({
  BadgeInteractionProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/appointment-count-badge", () => ({
  AppointmentCountBadge: ({ count, testId }: { count: number; testId?: string }) => <div data-testid={testId}>{count}</div>,
}));

vi.mock("@/components/TourEditForm", () => ({
  TourEditForm: (props: Record<string, unknown>) => {
    tourEditFormCalls.push(props);
    return <section data-testid="tour-edit-form">tour-edit-form</section>;
  },
}));

vi.mock("@/components/TourEmployeeCascadeDialog", () => ({
  TourEmployeeCascadeDialog: (props: Record<string, unknown>) => {
    cascadeDialogCalls.push(props);
    return <section data-testid="tour-cascade-dialog">tour-cascade-dialog</section>;
  },
}));

async function loadTourManagement(options?: {
  editingTour?: Record<string, unknown> | null;
  isCreating?: boolean;
  activeTourWeek?: Record<string, unknown> | null;
  cascadeDialogState?: Record<string, unknown> | null;
  pendingBlockWeek?: Record<string, unknown> | null;
}) {
  vi.resetModules();

  let stateCall = 0;
  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    return {
      ...actual,
      useState: (<T,>(initial: T) => {
        stateCall += 1;
        if (stateCall === 1) {
          return [options?.editingTour ?? null, setEditingTourMock] as unknown as [T, React.Dispatch<React.SetStateAction<T>>];
        }
        if (stateCall === 2) {
          return [options?.isCreating ?? false, setIsCreatingMock] as unknown as [T, React.Dispatch<React.SetStateAction<T>>];
        }
        if (stateCall === 3) {
          return [options?.activeTourWeek ?? null, vi.fn()] as unknown as [T, React.Dispatch<React.SetStateAction<T>>];
        }
        if (stateCall === 4) {
          return [options?.cascadeDialogState ?? null, setCascadeDialogStateMock] as unknown as [T, React.Dispatch<React.SetStateAction<T>>];
        }
        if (stateCall === 5) {
          return [options?.pendingBlockWeek ?? null, setPendingBlockWeekMock] as unknown as [T, React.Dispatch<React.SetStateAction<T>>];
        }
        return actual.useState(initial);
      }) as typeof actual.useState,
    };
  });

  return import("../../../client/src/components/TourManagement");
}

describe("FT07 TourManagement behavior", () => {
  const tour = {
    id: 5,
    name: "Nordtour",
    color: "#335577",
    version: 6,
  };

  const employee = {
    id: 11,
    firstName: "Mia",
    lastName: "Tour",
    fullName: "Mia Tour",
    version: 8,
    isActive: true,
  };

  beforeEach(() => {
    tourEditFormCalls.length = 0;
    cascadeDialogCalls.length = 0;
    apiRequestMock.mockReset();
    invalidateQueriesMock.mockReset();
    setQueryDataMock.mockReset();
    invalidateTagProjectionQueriesMock.mockReset();
    refreshMonitoringWithNotificationMock.mockReset();
    toastMock.mockReset();
    setEditingTourMock.mockReset();
    setIsCreatingMock.mockReset();
    setCascadeDialogStateMock.mockReset();
    setPendingBlockWeekMock.mockReset();
    useQueryMock.mockReset();
    confirmDialogCalls.length = 0;
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const key = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (key === "/api/tours") return { data: [tour], isLoading: false };
      if (key === "/api/employees") return { data: [employee], isLoading: false };
      if (key === "tour-management-appointments-count") return { data: new Map([[5, 3]]), isLoading: false };
      return { data: [], isLoading: false };
    });

    vi.unstubAllGlobals();
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: { getItem: () => "ADMIN" },
      confirm: vi.fn(() => true),
    });
  });

  it("creates a tour without direct employee assignment and closes the dialog", async () => {
    apiRequestMock.mockImplementation(async (method: string, url: string, payload?: unknown) => {
      if (method === "POST" && url === "/api/tours") {
        return {
          ok: true,
          json: async () => ({ id: 77, color: (payload as { color: string }).color }),
        };
      }
      return {
        ok: true,
        json: async () => ({}),
      };
    });

    const { TourManagement } = await loadTourManagement({
      editingTour: null,
      isCreating: true,
      cascadeDialogState: null,
    });

    renderToStaticMarkup(<TourManagement userRole="DISPONENT" />);

    expect(tourEditFormCalls).toHaveLength(1);
    expect(tourEditFormCalls[0]).toMatchObject({
      isCreate: true,
      canDelete: false,
    });

    const onSubmit = tourEditFormCalls[0].onSubmit as (
      tourId: number | null,
      employeeIds: number[],
      name: string,
      color: string,
    ) => Promise<void>;
    await onSubmit(null, [11], "Tour 6", "#1188aa");

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(apiRequestMock).toHaveBeenNthCalledWith(1, "POST", "/api/tours", { color: "#1188aa" });
    expect(setEditingTourMock).toHaveBeenCalledWith(null);
    expect(setIsCreatingMock).toHaveBeenCalledWith(false);
    expect(setCascadeDialogStateMock).toHaveBeenCalledWith(null);
  });

  it("sends the edited tour name in the versioned update payload and closes the dialog", async () => {
    apiRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ...tour, name: "Suedtour", color: "#1188aa", version: 7 }),
    });

    const { TourManagement } = await loadTourManagement({
      editingTour: { ...tour },
      isCreating: false,
      cascadeDialogState: null,
    });

    renderToStaticMarkup(<TourManagement userRole="DISPONENT" />);

    const onSubmit = tourEditFormCalls[0].onSubmit as (
      tourId: number | null,
      employeeIds: number[],
      name: string,
      color: string,
    ) => Promise<void>;
    await onSubmit(5, [], "Suedtour", "#1188aa");

    expect(apiRequestMock).toHaveBeenCalledWith("PATCH", "/api/tours/5", {
      name: "Suedtour",
      color: "#1188aa",
      version: 6,
    });
    expect(setQueryDataMock).toHaveBeenCalledWith(["/api/tours"], expect.any(Function));
    expect(setEditingTourMock).toHaveBeenCalledWith(null);
    expect(setIsCreatingMock).toHaveBeenCalledWith(false);
    expect(setCascadeDialogStateMock).toHaveBeenCalledWith(null);
  });

  it("keeps an admin delete action in the edit dialog and sends a versioned delete", async () => {
    apiRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const { TourManagement } = await loadTourManagement({
      editingTour: { ...tour },
      isCreating: false,
      cascadeDialogState: null,
    });

    renderToStaticMarkup(<TourManagement userRole="ADMIN" />);

    expect(tourEditFormCalls[0]).toMatchObject({
      canDelete: true,
      tour: expect.objectContaining({ id: 5, version: 6 }),
    });

    const onDelete = tourEditFormCalls[0].onDelete as () => Promise<void>;
    await onDelete();

    expect(apiRequestMock).toHaveBeenCalledWith("DELETE", "/api/tours/5", { version: 6 });
  });

  it("keeps the next generated tour name gap when a numeric tour name was renamed away", async () => {
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const key = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (key === "/api/tours") {
        return {
          data: [
            { id: 1, name: "Tour 1", color: "#111111", version: 1 },
            { id: 2, name: "Tour A", color: "#222222", version: 2 },
          ],
          isLoading: false,
        };
      }
      if (key === "/api/employees") return { data: [employee], isLoading: false };
      if (key === "tour-management-appointments-count") return { data: new Map(), isLoading: false };
      return { data: [], isLoading: false };
    });

    const { TourManagement } = await loadTourManagement({
      editingTour: null,
      isCreating: true,
      cascadeDialogState: null,
    });

    renderToStaticMarkup(<TourManagement userRole="ADMIN" />);

    expect(tourEditFormCalls[0]).toMatchObject({
      isCreate: true,
      defaultName: "Tour 2",
    });
  });

  it("opens week planning dialogs with a preselected conflict-free selection after preview loading", async () => {
    apiRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        isoYear: 2099,
        isoWeek: 6,
        weekStartDate: "2099-02-02",
        weekEndDate: "2099-02-08",
        employee: {
          employeeId: 11,
          fullName: "Mia Tour",
        },
        items: [{
          appointmentId: 900,
          startDate: "2099-02-03",
          endDate: null,
          customerName: "Kunde Eins",
          projectName: "Projekt Eins",
          status: "will_add",
          selectable: true,
          conflictReason: null,
        }],
      }),
    });

    const { TourManagement } = await loadTourManagement({
      editingTour: { ...tour },
      isCreating: false,
      cascadeDialogState: null,
    });

    renderToStaticMarkup(<TourManagement userRole="ADMIN" />);

    const onAddWeekEmployee = tourEditFormCalls[0].onAddWeekEmployee as (params: { isoYear: number; isoWeek: number; employeeId: number }) => Promise<void>;
    await onAddWeekEmployee({ isoYear: 2099, isoWeek: 6, employeeId: 11 });

    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/api/tours/5/week-employees/add/preview", {
      isoYear: 2099,
      isoWeek: 6,
      employeeId: 11,
    });
    expect(setCascadeDialogStateMock).toHaveBeenLastCalledWith(expect.objectContaining({
      open: true,
      mode: "add",
      activeIndex: 0,
      phase: "preview",
      operations: [
        expect.objectContaining({
          isoYear: 2099,
          isoWeek: 6,
          employeeId: 11,
          employeeName: "Mia Tour",
          selectedIds: [900],
          executionStatus: "pending",
        }),
      ],
    }));
  });

  it("queues bulk-selected week employees behind the first preview", async () => {
    apiRequestMock.mockImplementation(async (_method: string, url: string, payload?: unknown) => {
      if (url === "/api/tours/5/week-employees/add/preview") {
        return {
          ok: true,
          json: async () => ({
            isoYear: 2099,
            isoWeek: 6,
            weekStartDate: "2099-02-02",
            weekEndDate: "2099-02-08",
            employee: {
              employeeId: (payload as { employeeId: number }).employeeId,
              fullName: (payload as { employeeId: number }).employeeId === 11 ? "Mia Tour" : "Nora Queue",
            },
            items: [{
              appointmentId: 900,
              startDate: "2099-02-03",
              endDate: null,
              customerName: "Kunde Eins",
              projectName: "Projekt Eins",
              status: "will_add",
              selectable: true,
              conflictReason: null,
            }],
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({}),
      };
    });

    const { TourManagement } = await loadTourManagement({
      editingTour: { ...tour },
      isCreating: false,
      cascadeDialogState: null,
    });

    renderToStaticMarkup(<TourManagement userRole="ADMIN" />);

    const onAddWeekEmployees = tourEditFormCalls[0].onAddWeekEmployees as (
      params: { isoYear: number; isoWeek: number; employeeIds: number[] }
    ) => Promise<void>;
    await onAddWeekEmployees({ isoYear: 2099, isoWeek: 6, employeeIds: [11, 12] });

    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/api/tours/5/week-employees/add/preview", {
      isoYear: 2099,
      isoWeek: 6,
      employeeId: 11,
    });
    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/api/tours/5/week-employees/add/preview", {
      isoYear: 2099,
      isoWeek: 6,
      employeeId: 12,
    });

    const lastDialogCall = setCascadeDialogStateMock.mock.calls[setCascadeDialogStateMock.mock.calls.length - 1];
    const dialogState = lastDialogCall[0] as {
      operations: Array<{ employeeId: number; employeeName: string; selectedIds: number[]; executionStatus?: string }>;
    };
    expect(dialogState).toMatchObject({
      open: true,
      mode: "add",
      activeIndex: 0,
      phase: "preview",
    });
    expect(dialogState.operations).toHaveLength(2);
    expect(dialogState.operations.map((operation) => operation.employeeId)).toEqual([11, 12]);
    expect(dialogState.operations.map((operation) => operation.employeeName)).toEqual(["Mia Tour", "Nora Queue"]);
    expect(dialogState.operations.map((operation) => operation.selectedIds)).toEqual([[900], [900]]);
    expect(dialogState.operations.map((operation) => operation.executionStatus)).toEqual(["pending", "pending"]);
  });

  it("closes a week planning preview without executing when the dialog is cancelled", async () => {
    const { TourManagement } = await loadTourManagement({
      editingTour: { ...tour },
      isCreating: false,
      cascadeDialogState: {
        open: true,
        mode: "add",
        activeIndex: 0,
        phase: "preview",
        operations: [
          {
            mode: "add",
            tourId: 5,
            isoYear: 2099,
            isoWeek: 6,
            weekLabel: "KW 06 / 2099",
            employeeId: 11,
            employeeName: "Mia Tour",
            previewItems: [{
              appointmentId: 900,
              startDate: "2099-02-03",
              endDate: null,
              customerName: "Kunde Eins",
              projectName: "Projekt Eins",
              status: "will_add",
              selectable: true,
              conflictReason: null,
            }],
            selectedIds: [900],
            executionStatus: "pending",
          },
        ],
      },
    });

    renderToStaticMarkup(<TourManagement userRole="ADMIN" />);

    expect(cascadeDialogCalls).toHaveLength(1);
    const onClose = cascadeDialogCalls[0].onClose as () => void;
    onClose();

    expect(setCascadeDialogStateMock).toHaveBeenLastCalledWith(null);
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("executes queued week planning updates serially after final confirmation", async () => {
    apiRequestMock.mockImplementation(async (method: string, url: string, payload?: unknown) => {
      if (method === "POST" && url === "/api/tours/5/week-employees/add") {
        return {
          ok: true,
          json: async () => ({
            updatedAppointmentCount: (payload as { selectedAppointmentIds: number[] }).selectedAppointmentIds.length,
          skipped: [],
        }),
      };
    }
      return {
        ok: true,
        json: async () => ({}),
      };
    });

    const { TourManagement } = await loadTourManagement({
      editingTour: { ...tour },
      isCreating: false,
      cascadeDialogState: {
        open: true,
        mode: "add",
        activeIndex: 1,
        phase: "preview",
        operations: [
          {
            mode: "add",
            tourId: 5,
            isoYear: 2099,
            isoWeek: 6,
            weekLabel: "KW 06 / 2099",
            employeeId: 11,
            employeeName: "Mia Tour",
            previewItems: [{
              appointmentId: 900,
              startDate: "2099-02-03",
              endDate: null,
              customerName: "Kunde Eins",
              projectName: "Projekt Eins",
              status: "will_add",
              selectable: true,
              conflictReason: null,
            }],
            selectedIds: [900],
            executionStatus: "pending",
          },
          {
            mode: "add",
            tourId: 5,
            isoYear: 2099,
            isoWeek: 6,
            weekLabel: "KW 06 / 2099",
            employeeId: 12,
            employeeName: "Nora Queue",
            previewItems: [{
              appointmentId: 901,
              startDate: "2099-02-04",
              endDate: null,
              customerName: "Kunde Zwei",
              projectName: "Projekt Zwei",
              status: "will_add",
              selectable: true,
              conflictReason: null,
            }],
            selectedIds: [901],
            executionStatus: "pending",
          },
        ],
      },
    });

    renderToStaticMarkup(<TourManagement userRole="ADMIN" />);

    expect(cascadeDialogCalls).toHaveLength(1);

    const onConfirm = cascadeDialogCalls[0].onConfirm as () => void;
    onConfirm();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/api/tours/5/week-employees/add", {
      isoYear: 2099,
      isoWeek: 6,
      employeeId: 11,
      selectedAppointmentIds: [900],
    });
    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/api/tours/5/week-employees/add", {
      isoYear: 2099,
      isoWeek: 6,
      employeeId: 12,
      selectedAppointmentIds: [901],
    });
    const executeCalls = apiRequestMock.mock.calls.filter(([, url]) => url === "/api/tours/5/week-employees/add");
    expect(executeCalls.map(([, , payload]) => (payload as { employeeId: number }).employeeId)).toEqual([11, 12]);
    const activeMembersInvalidation = invalidateQueriesMock.mock.calls
      .map(([options]) => options as { predicate?: (query: { queryKey: unknown[] }) => boolean })
      .find((options) => typeof options.predicate === "function"
        && options.predicate?.({ queryKey: ["/api/tours/5/week-employees"] }));
    expect(activeMembersInvalidation).toBeTruthy();
    const availableMembersInvalidation = invalidateQueriesMock.mock.calls
      .map(([options]) => options as { predicate?: (query: { queryKey: unknown[] }) => boolean })
      .find((options) => typeof options.predicate === "function"
        && options.predicate?.({ queryKey: ["/api/tours/5/week-employees/available", 2099, 6] }));
    expect(availableMembersInvalidation).toBeTruthy();
    const lanePreviewInvalidation = invalidateQueriesMock.mock.calls
      .map(([options]) => options as { predicate?: (query: { queryKey: unknown[] }) => boolean })
      .find((options) => typeof options.predicate === "function"
        && options.predicate?.({ queryKey: ["calendarWeekLaneEmployeePreviews", "2099-02-02", "2099-02-08"] }));
    expect(lanePreviewInvalidation).toBeTruthy();
    expect(invalidateTagProjectionQueriesMock).toHaveBeenCalledTimes(2);
    expect(invalidateQueriesMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["/api/tours"],
    }));
    expect(refreshMonitoringWithNotificationMock).toHaveBeenCalledWith(toastMock);
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: "Wochenplanung gespeichert",
      description: "2 Termine wurden aktualisiert.",
    }));
    expect(setCascadeDialogStateMock).toHaveBeenLastCalledWith(null);
  });

  it("confirms week blocking without surfacing silent appointment-adjustment counts", async () => {
    apiRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        week: {
          id: 71,
          tourId: 5,
          isoYear: 2099,
          isoWeek: 6,
          weekStartDate: "2099-02-02",
          weekEndDate: "2099-02-08",
          isLocked: false,
          isBlocked: true,
        },
        affectedAppointmentCount: 5,
      }),
    });

    const { TourManagement } = await loadTourManagement({
      editingTour: { ...tour },
      isCreating: false,
      cascadeDialogState: null,
      pendingBlockWeek: null,
    });

    renderToStaticMarkup(<TourManagement userRole="ADMIN" />);

    const onBlockWeek = tourEditFormCalls[0].onBlockWeek as (params: { isoYear: number; isoWeek: number }) => Promise<void>;
    await onBlockWeek({ isoYear: 2099, isoWeek: 6 });

    expect(setPendingBlockWeekMock).toHaveBeenCalledWith({
      tourId: 5,
      isoYear: 2099,
      isoWeek: 6,
    });
    expect(apiRequestMock).not.toHaveBeenCalled();

    confirmDialogCalls.length = 0;
    const { TourManagement: TourManagementWithPendingBlock } = await loadTourManagement({
      editingTour: { ...tour },
      isCreating: false,
      cascadeDialogState: null,
      pendingBlockWeek: { tourId: 5, isoYear: 2099, isoWeek: 6 },
    });

    renderToStaticMarkup(<TourManagementWithPendingBlock userRole="ADMIN" />);

    expect(confirmDialogCalls[0]).toMatchObject({
      open: true,
      title: "Wochenplanung blockieren?",
      confirmLabel: "Blockieren",
      testId: "dialog-tour-week-block-confirm",
    });

    const onConfirmBlockWeek = confirmDialogCalls[0].onConfirm as () => void;
    onConfirmBlockWeek();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/api/tours/5/weeks/2099/6/block");
    expect(toastMock).toHaveBeenCalledWith({
      title: "Wochenplanung blockiert",
    });
  });

  it("confirms week unblocking without surfacing silent appointment-adjustment counts", async () => {
    apiRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        week: {
          id: 71,
          tourId: 5,
          isoYear: 2099,
          isoWeek: 6,
          weekStartDate: "2099-02-02",
          weekEndDate: "2099-02-08",
          isLocked: false,
          isBlocked: false,
        },
        affectedAppointmentCount: 5,
      }),
    });

    const { TourManagement } = await loadTourManagement({
      editingTour: { ...tour },
      isCreating: false,
      cascadeDialogState: null,
    });

    renderToStaticMarkup(<TourManagement userRole="ADMIN" />);

    const onUnblockWeek = tourEditFormCalls[0].onUnblockWeek as (params: { isoYear: number; isoWeek: number }) => Promise<void>;
    await onUnblockWeek({ isoYear: 2099, isoWeek: 6 });

    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/api/tours/5/weeks/2099/6/unblock");
    expect(toastMock).toHaveBeenCalledWith({
      title: "Wochenplanung freigegeben",
    });
  });
});
