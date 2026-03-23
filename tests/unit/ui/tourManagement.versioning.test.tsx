/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TourCreate sendet den Create-Request und danach die Mitarbeiterzuweisung mit employee-version.
 * - TourUpdate sendet Name, Farbe und Version als versionierten PATCH-Payload.
 * - Der Admin-Dialog behaelt den Delete-Flow mit versioniertem DELETE-Payload.
 * - Erfolgreiche Kaskaden bestaetigen den Execute-Request und triggern Refresh/Invalidierung fuer abhaengige Views.
 *
 * Fehlerfaelle:
 * - Versionsdaten fehlen in Tour- oder Mitarbeiter-Mutationen.
 * - Der Tourname wird im Update-Payload nicht mitgesendet.
 * - Der Admin-Delete-Flow driftet aus dem Dialog heraus.
 * - Erfolgreiche Kaskaden lassen Monitoring- und Query-Refresh aus.
 *
 * Ziel:
 * TourManagement ueber beobachtbare Mutations- und Folgeeffekte statt ueber Quelltextstrings absichern.
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
const tourEditFormCalls: Array<Record<string, unknown>> = [];
const cascadeDialogCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
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

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
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
  cascadeDialogState?: Record<string, unknown> | null;
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
          return [options?.editingTour ?? null, vi.fn()] as unknown as [T, React.Dispatch<React.SetStateAction<T>>];
        }
        if (stateCall === 2) {
          return [options?.isCreating ?? false, vi.fn()] as unknown as [T, React.Dispatch<React.SetStateAction<T>>];
        }
        if (stateCall === 3) {
          return [options?.cascadeDialogState ?? null, vi.fn()] as unknown as [T, React.Dispatch<React.SetStateAction<T>>];
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
    tourId: 5,
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
    useQueryMock.mockReset();
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

  it("creates a tour and assigns selected employees with their versions", async () => {
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

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, "POST", "/api/tours", { color: "#1188aa" });
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, "POST", "/api/tours/77/employees", {
      items: [{ employeeId: 11, version: 8 }],
    });
  });

  it("sends the edited tour name in the versioned update payload", async () => {
    apiRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ...tour, name: "Suedtour", color: "#1188aa", version: 7 }),
    });

    const { TourManagement } = await loadTourManagement({
      editingTour: { ...tour, members: [employee] },
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
  });

  it("keeps an admin delete action in the edit dialog and sends a versioned delete", async () => {
    apiRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const { TourManagement } = await loadTourManagement({
      editingTour: { ...tour, members: [employee] },
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

  it("executes cascade updates and refreshes dependent views after success", async () => {
    apiRequestMock.mockImplementation(async (method: string, url: string, payload?: unknown) => {
      if (method === "POST" && url === "/api/tours/5/employees/cascade-add") {
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
      editingTour: { ...tour, members: [employee] },
      isCreating: false,
      cascadeDialogState: {
        open: true,
        mode: "add",
        tourId: 5,
        employeeId: 11,
        employeeVersion: 8,
        employeeName: "Mia Tour",
        previewItems: [{
          appointmentId: 900,
          startDate: "2099-02-01",
          endDate: null,
          tourName: "Nordtour",
          customerNumber: "C-1",
          customerName: "Kunde Eins",
          projectName: "Projekt Eins",
          orderNumber: "A-1",
          currentEmployees: [],
          eligible: true,
          conflictReason: null,
        }],
        selectedAppointmentIds: [900],
      },
    });

    renderToStaticMarkup(<TourManagement userRole="ADMIN" />);

    expect(cascadeDialogCalls).toHaveLength(1);

    const onConfirm = cascadeDialogCalls[0].onConfirm as () => void;
    onConfirm();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/api/tours/5/employees/cascade-add", {
      employeeId: 11,
      employeeVersion: 8,
      selectedAppointmentIds: [900],
    });
    expect(invalidateTagProjectionQueriesMock).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["/api/tours"],
    }));
    expect(refreshMonitoringWithNotificationMock).toHaveBeenCalledWith(toastMock);
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: "Kaskade abgeschlossen",
      description: "1 Termine wurden aktualisiert.",
    }));
  });
});
