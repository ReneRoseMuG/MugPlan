/**
 * Test Scope:
 *
 * Feature: Settings Redesign - Sidebar-Navigation
 *
 * Abgedeckte Regeln:
 * - Die Sidebar-Navigation rendert alle vier Eintraege in zwei Gruppen (Anzeige, System).
 * - Der initiale Pane "Oberflaeche" ist der Standard und traegt aria-current="page".
 * - Alle anderen Nav-Eintraege haben kein aria-current im Ausgangszustand.
 * - Nur der aktive Pane-Container (settings-pane-oberflaeche) wird initial gerendert.
 *
 * Fehlerfaelle:
 * - Ein Nav-Eintrag fehlt oder traegt den falschen data-testid.
 * - Der falsche Pane ist initial aktiv.
 * - aria-current fehlt oder steht auf dem falschen Nav-Eintrag.
 *
 * Ziel:
 * Statische Nav-Struktur und initiales Pane-Rendering absichern.
 * Klick-Navigationverhalten wird in settingsPage.navigation.e2e.ts geprueft.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useSettingsMock = vi.fn();
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => useSettingsMock(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
    <button type="button" data-testid={String(props["data-testid"] ?? "")}>{children}</button>
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

function makeDefaultSettings() {
  return {
    settingsByKey: new Map([
      ["attachmentPreviewSize", { resolvedValue: "large", resolvedScope: "DEFAULT" }],
      ["helpTextPreviewSize", { resolvedValue: "medium", resolvedScope: "DEFAULT" }],
      ["toastDesktopPosition", { resolvedValue: "bottom-right", resolvedScope: "DEFAULT" }],
      ["entityFormShell.sidebarWidthPx", { resolvedValue: 360, resolvedScope: "DEFAULT" }],
      ["entityFormShell.contentMaxWidthPx", { resolvedValue: 760, resolvedScope: "DEFAULT" }],
      ["hoverPreviewOpenDelayMs", { resolvedValue: 380, resolvedScope: "DEFAULT" }],
      ["cardListColumns", { resolvedValue: 4, resolvedScope: "DEFAULT" }],
      ["backup_enabled", { resolvedValue: true, resolvedScope: "GLOBAL" }],
      ["auth_two_factor_enabled", { resolvedValue: false, resolvedScope: "DEFAULT" }],
    ]),
    isLoading: false,
    isError: false,
    errorMessage: null,
    retry: vi.fn(),
    setSetting: vi.fn().mockResolvedValue(undefined),
    isSaving: false,
  };
}

describe("Settings Redesign UI: Sidebar-Navigation", () => {
  beforeEach(() => {
    Object.assign(globalThis, {
      React,
      window: {
        localStorage: {
          getItem: (key: string) => (key === "userRole" ? "ADMIN" : null),
        },
      },
    });
    useSettingsMock.mockReset();
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useSettingsMock.mockReturnValue(makeDefaultSettings());
    useQueryMock.mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it("rendert den Nav-Container mit data-testid settings-nav", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).toContain("settings-nav");
  });

  it("rendert alle vier Nav-Eintraege mit korrekten data-testid", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).toContain("nav-item-oberflaeche");
    expect(html).toContain("nav-item-kalender");
    expect(html).toContain("nav-item-sicherheit");
    expect(html).toContain("nav-item-backup");
  });

  it("zeigt die Gruppen-Labels Anzeige und System in der Navigation", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).toContain("Anzeige");
    expect(html).toContain("System");
  });

  it("setzt aria-current=page auf den initialen Nav-Eintrag Oberflaeche", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    // nav-item-oberflaeche muss aria-current="page" tragen
    expect(html).toMatch(/nav-item-oberflaeche[^>]*aria-current="page"/);
  });

  it("setzt kein aria-current auf die anderen Nav-Eintraege im Ausgangszustand", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    // nav-item-kalender, -sicherheit, -backup duerfen kein aria-current haben
    expect(html).not.toMatch(/nav-item-kalender[^>]*aria-current="page"/);
    expect(html).not.toMatch(/nav-item-sicherheit[^>]*aria-current="page"/);
    expect(html).not.toMatch(/nav-item-backup[^>]*aria-current="page"/);
  });

  it("rendert initial nur den Oberflaeche-Pane und nicht die anderen", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).toContain("settings-pane-oberflaeche");
    expect(html).not.toContain("settings-pane-kalender");
    expect(html).not.toContain("settings-pane-sicherheit");
    expect(html).not.toContain("settings-pane-backup");
  });
});
