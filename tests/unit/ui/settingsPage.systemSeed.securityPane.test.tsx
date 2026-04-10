/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Sicherheit-Pane rendert einen eigenen Abschnitt fuer System-Stammdaten.
 * - Die System-Seed-Aktion ist im Sicherheit-Pane fuer ADMIN sichtbar.
 * - Der Button wechselt im Pending-Zustand auf den Lauftext.
 *
 * Fehlerfaelle:
 * - Der Abschnitt fuer den System-Seed fehlt im Sicherheit-Pane.
 * - Der Buttontext spiegelt den laufenden Request nicht wider.
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

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) => (
    <button type="button" data-testid={String(props["data-testid"] ?? "")} disabled={Boolean(props.disabled)}>
      {children}
    </button>
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
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false });

    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain("settings-pane-sicherheit");
    expect(html).toContain("settings-system-seed-section");
    expect(html).toContain("button-run-system-seed");
    expect(html).toContain("System-Seed ausführen");
  });

  it("shows the pending label while the system seed mutation runs", () => {
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: true });

    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain("System-Seed läuft...");
    expect(html).toMatch(/button-run-system-seed[^>]*disabled/);
  });
});
