/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Sicherheit-Pane rendert einen eigenen Abschnitt fuer System-Stammdaten.
 * - Die System-Seed-Aktion ist im Sicherheit-Pane fuer ADMIN sichtbar.
 * - Der Button wechselt im Pending-Zustand auf den Lauftext.
 * - Ein erfolgreicher Apply invalidiert die betroffenen Stammdaten-Queries.
 *
 * Fehlerfaelle:
 * - Der Abschnitt fuer den System-Seed fehlt im Sicherheit-Pane.
 * - Der Buttontext spiegelt den laufenden Request nicht wider.
 * - Seed-Aenderungen bleiben im Client-Cache haengen und werden in Folgeansichten nicht sichtbar.
 *
 * Ziel:
 * Die statische Verdrahtung des neuen System-Seed-Abschnitts in den Admin-Einstellungen absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let useStateCall = 0;
const useSettingsMock = vi.fn();
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const invalidateTagProjectionQueriesMock = vi.fn();

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: (initial: unknown) => {
      useStateCall += 1;
      if (useStateCall === 2) {
        return ["sicherheit", vi.fn()] as const;
      }
      return actual.useState(initial);
    },
  };
});

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => useSettingsMock(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: {
    invalidateQueries: (...args: unknown[]) => invalidateQueriesMock(...args),
  },
}));

vi.mock("@/lib/tag-invalidation", () => ({
  invalidateTagProjectionQueries: () => invalidateTagProjectionQueriesMock(),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) => (
    <button type="button" data-testid={String(props["data-testid"] ?? "")} disabled={Boolean(props.disabled)}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: (props: Record<string, unknown>) => (
    <input type="checkbox" data-testid={String(props["data-testid"] ?? "")} checked={Boolean(props.checked)} readOnly />
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input data-testid={String(props["data-testid"] ?? "")} />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: (props: Record<string, unknown>) => (
    <input type="checkbox" data-testid={String(props["data-testid"] ?? "")} checked={Boolean(props.checked)} readOnly />
  ),
}));

import { SettingsPage } from "../../../client/src/components/SettingsPage";

describe("SettingsPage system seed section", () => {
  beforeEach(() => {
    useStateCall = 0;
    Object.assign(globalThis, {
      window: {
        localStorage: {
          getItem: (key: string) => (key === "userRole" ? "ADMIN" : null),
        },
      },
    });
    useSettingsMock.mockReset();
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    invalidateQueriesMock.mockReset();
    invalidateTagProjectionQueriesMock.mockReset();
    useSettingsMock.mockReturnValue({
      settingsByKey: new Map([
        ["backup_enabled", { resolvedValue: true, resolvedScope: "GLOBAL" }],
        ["auth_two_factor_enabled", { resolvedValue: false, resolvedScope: "DEFAULT" }],
      ]),
      isLoading: false,
      isError: false,
      errorMessage: null,
      retry: vi.fn(),
      setSetting: vi.fn().mockResolvedValue(undefined),
      isSaving: false,
    });
    useQueryMock.mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() });
  });

  it("renders the system seed section in the security pane", () => {
    useMutationMock
      .mockReturnValueOnce({ mutate: vi.fn(), isPending: false })
      .mockReturnValueOnce({ mutate: vi.fn(), isPending: false });

    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain("settings-pane-sicherheit");
    expect(html).toContain("settings-system-seed-section");
    expect(html).toContain("button-preview-system-seed");
    expect(html).toContain("System-Seed prüfen");
    expect(html).toContain("button-apply-system-seed");
    expect(html).toContain("Ausgewählte Einträge anlegen");
  });

  it("shows the pending label while the system seed preview runs", () => {
    useMutationMock
      .mockReturnValueOnce({ mutate: vi.fn(), isPending: true })
      .mockReturnValueOnce({ mutate: vi.fn(), isPending: false });

    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain("System-Seed wird geprüft...");
    expect(html).toMatch(/button-preview-system-seed[^>]*disabled/);
  });

  it("invalidates affected master-data queries after a successful system-seed apply", async () => {
    const mutationOptions: Array<{ onSuccess?: (payload: { logLines: string[] }) => unknown }> = [];
    useMutationMock.mockImplementation((options: { onSuccess?: (payload: { logLines: string[] }) => unknown }) => {
      mutationOptions.push(options);
      return { mutate: vi.fn(), isPending: false };
    });

    renderToStaticMarkup(<SettingsPage />);

    const applyMutation = mutationOptions[1];
    expect(applyMutation).toBeDefined();

    await applyMutation.onSuccess?.({ logLines: ["Tour angelegt: Tour 4"] });

    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["/api/tours"] });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      predicate: expect.any(Function),
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["/api/note-templates"] });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      predicate: expect.any(Function),
    });
    expect(invalidateTagProjectionQueriesMock).toHaveBeenCalledTimes(1);
  });
});
