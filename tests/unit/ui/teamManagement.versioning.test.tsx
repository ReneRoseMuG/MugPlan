/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TeamEditForm erhaelt im Bearbeitungsmodus einen Admin-Delete-Flow.
 * - Das Speichern eines bestehenden Teams sendet PATCH mit aktueller Version und die Batch-Zuweisung mit employee-version.
 * - Beim Speichern eines bestehenden Teams werden entfernte Mitglieder ueber die Remove-API geloest.
 * - VERSION_CONFLICT aus dem Speichern wird als sichtbarer Konflikt-Toast gemeldet.
 *
 * Fehlerfaelle:
 * - Versionsdaten gehen in Update- oder Zuweisungspayloads verloren.
 * - Entfernte Team-Mitglieder bleiben serverseitig haengen.
 * - Admin-Delete verschwindet aus dem Teamdialog.
 * - Konflikte bleiben fuer den Nutzer ohne Rueckmeldung.
 *
 * Ziel:
 * TeamManagement ueber gerenderte Dialog-Props und Mutationswirkungen statt ueber Quelltextmarker absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequestMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const toastMock = vi.fn();
const useQueryMock = vi.fn();
const teamEditFormCalls: Array<Record<string, unknown>> = [];

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
  },
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

vi.mock("@/components/TeamEditForm", () => ({
  TeamEditForm: (props: Record<string, unknown>) => {
    teamEditFormCalls.push(props);
    return <section data-testid="team-edit-form">team-edit-form</section>;
  },
}));

async function loadTeamManagement(options?: {
  editingTeam?: Record<string, unknown> | null;
  isCreating?: boolean;
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
          return [options?.editingTeam ?? null, vi.fn()] as unknown as [T, React.Dispatch<React.SetStateAction<T>>];
        }
        if (stateCall === 2) {
          return [options?.isCreating ?? false, vi.fn()] as unknown as [T, React.Dispatch<React.SetStateAction<T>>];
        }
        return actual.useState(initial);
      }) as typeof actual.useState,
    };
  });

  return import("../../../client/src/components/TeamManagement");
}

describe("FT06 TeamManagement behavior", () => {
  const team = {
    id: 7,
    name: "Team Blau",
    color: "#225577",
    version: 4,
  };

  const employee = {
    id: 101,
    firstName: "Ina",
    lastName: "Beispiel",
    fullName: "Ina Beispiel",
    teamId: 7,
    version: 9,
    isActive: true,
  };

  const removedEmployee = {
    id: 102,
    firstName: "Ria",
    lastName: "Alt",
    fullName: "Ria Alt",
    teamId: null,
    version: 5,
    isActive: true,
  };

  beforeEach(() => {
    teamEditFormCalls.length = 0;
    apiRequestMock.mockReset();
    invalidateQueriesMock.mockReset();
    toastMock.mockReset();
    useQueryMock.mockReset();
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const key = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (key === "/api/teams") return { data: [team], isLoading: false };
      if (key === "/api/employees") return { data: [employee, removedEmployee], isLoading: false };
      return { data: [], isLoading: false };
    });

    vi.unstubAllGlobals();
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: { getItem: () => "ADMIN" },
      confirm: vi.fn(() => true),
    });
  });

  it("submits versioned update and employee assignment payloads through the edit form", async () => {
    apiRequestMock.mockImplementation(async (method: string, url: string) => ({
      ok: true,
      json: async () => ({ id: 7, method, url }),
    }));

    const { TeamManagement } = await loadTeamManagement({
      editingTeam: { ...team, members: [employee] },
      isCreating: false,
    });

    renderToStaticMarkup(<TeamManagement />);

    expect(teamEditFormCalls).toHaveLength(1);
    expect(teamEditFormCalls[0]).toMatchObject({
      team: expect.objectContaining({ id: 7, version: 4 }),
      canDelete: true,
    });

    const onSubmit = teamEditFormCalls[0].onSubmit as (teamId: number | null, employeeIds: number[], color: string) => Promise<void>;
    await onSubmit(7, [101], "#114488");

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, "PATCH", "/api/teams/7", { color: "#114488", version: 4 });
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, "POST", "/api/teams/7/employees", {
      items: [{ employeeId: 101, version: 9 }],
    });
  });

  it("removes deselected team members before reassigning the remaining selection", async () => {
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const key = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (key === "/api/teams") return { data: [team], isLoading: false };
      if (key === "/api/employees") return { data: [employee, { ...removedEmployee, teamId: 7 }], isLoading: false };
      return { data: [], isLoading: false };
    });

    apiRequestMock.mockImplementation(async (method: string, url: string) => ({
      ok: true,
      json: async () => ({ method, url }),
    }));

    const { TeamManagement } = await loadTeamManagement({
      editingTeam: { ...team, members: [employee, removedEmployee] },
      isCreating: false,
    });

    renderToStaticMarkup(<TeamManagement />);

    const onSubmit = teamEditFormCalls[0].onSubmit as (teamId: number | null, employeeIds: number[], color: string) => Promise<void>;
    await onSubmit(7, [101], "#114488");

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, "PATCH", "/api/teams/7", { color: "#114488", version: 4 });
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, "DELETE", "/api/teams/7/employees/102", { version: 5 });
    expect(apiRequestMock).toHaveBeenNthCalledWith(3, "POST", "/api/teams/7/employees", {
      items: [{ employeeId: 101, version: 9 }],
    });
  });

  it("sends a versioned delete from the dialog delete action for admins", async () => {
    apiRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const { TeamManagement } = await loadTeamManagement({
      editingTeam: { ...team, members: [] },
      isCreating: false,
    });

    renderToStaticMarkup(<TeamManagement />);

    const onDelete = teamEditFormCalls[0].onDelete as () => void;
    await onDelete();

    expect(apiRequestMock).toHaveBeenCalledWith("DELETE", "/api/teams/7", { version: 4 });
  });

  it("shows a destructive conflict toast when the update was changed concurrently", async () => {
    apiRequestMock.mockImplementation(async (method: string) => {
      if (method === "PATCH") {
        throw new Error('409: {"code":"VERSION_CONFLICT"}');
      }
      return {
        ok: true,
        json: async () => ({}),
      };
    });

    const { TeamManagement } = await loadTeamManagement({
      editingTeam: { ...team, members: [employee] },
      isCreating: false,
    });

    renderToStaticMarkup(<TeamManagement />);

    const onSubmit = teamEditFormCalls[0].onSubmit as (teamId: number | null, employeeIds: number[], color: string) => Promise<void>;
    await expect(onSubmit(7, [101], "#aa4400")).rejects.toThrow(/VERSION_CONFLICT/);

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: "Speichern nicht möglich",
      description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
      variant: "destructive",
    }));
  });
});
