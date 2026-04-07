/**
 * Test Scope:
 *
 * Feature: FT07/FT16/FT29 - SettingsPage
 *
 * Abgedeckte Regeln:
 * - Die SettingsPage rendert eine Sidebar-Navigation mit vier Eintraegen in zwei Gruppen.
 * - Der Standard-Pane "Oberflaeche" ist beim ersten Laden sichtbar.
 * - Die Oberflaeche-Einstellungen (helpTextPreviewSize, EntityFormShell-Breiten) zeigen Save-Controls.
 * - Pane-spezifische Assertions (Sicherheit, Backup) sind in settingsPage.panes.behavior.test.tsx.
 *
 * Fehlerfaelle:
 * - Sidebar-Navigation fehlt oder zeigt nicht alle vier Eintraege.
 * - Der Oberflaeche-Pane fehlt oder verliert Save-Controls.
 *
 * Ziel:
 * Seitenskelett und Standardpane-Verhalten absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useSettingsMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => useSettingsMock(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
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
  Switch: (props: Record<string, unknown>) => <input type="checkbox" data-testid={String(props["data-testid"] ?? "")} checked={Boolean(props.checked)} readOnly />,
}));

import { SettingsPage } from "../../../client/src/components/SettingsPage";

describe("FT07/FT16/FT29 UI: SettingsPage behavior", () => {
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
    useSettingsMock.mockReturnValue({
      settingsByKey: new Map([
        ["helpTextPreviewSize", { resolvedValue: "large", resolvedScope: "DEFAULT" }],
        ["attachmentPreviewSize", { resolvedValue: "large", resolvedScope: "DEFAULT" }],
        ["entityFormShell.sidebarWidthPx", { resolvedValue: 360, resolvedScope: "DEFAULT" }],
        ["entityFormShell.contentMaxWidthPx", { resolvedValue: 760, resolvedScope: "DEFAULT" }],
        ["cardListColumns", { resolvedValue: 4, resolvedScope: "DEFAULT" }],
        ["backup_enabled", { resolvedValue: true, resolvedScope: "GLOBAL" }],
        ["auth_two_factor_enabled", { resolvedValue: true, resolvedScope: "GLOBAL" }],
      ]),
      isLoading: false,
      isError: false,
      errorMessage: null,
      retry: vi.fn(),
      setSetting: vi.fn().mockResolvedValue(undefined),
      isSaving: false,
    });
    useQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("rendert die Sidebar-Navigation mit allen vier Eintraegen", () => {
    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain("settings-nav");
    expect(html).toContain("nav-item-oberflaeche");
    expect(html).toContain("nav-item-kalender");
    expect(html).toContain("nav-item-sicherheit");
    expect(html).toContain("nav-item-backup");
    expect(html).toContain("Oberfläche");
    expect(html).toContain("Kalender");
    expect(html).toContain("Sicherheit");
    expect(html).toContain("Backup");
  });

  it("zeigt den Oberflaeche-Pane als Standard beim ersten Laden mit allen Save-Controls", () => {
    const html = renderToStaticMarkup(<SettingsPage />);

    // Standard-Pane ist "Oberflaeche" -> settings-pane-oberflaeche muss sichtbar sein
    expect(html).toContain("settings-pane-oberflaeche");

    // USER-Einstellungen
    expect(html).toContain("select-setting-helpTextPreviewSize");
    expect(html).toContain("button-save-helpTextPreviewSize");
    expect(html).toContain("input-setting-entityFormShellSidebarWidthPx");
    expect(html).toContain("button-save-entityFormShellSidebarWidthPx");
    expect(html).toContain("input-setting-entityFormShellContentMaxWidthPx");
    expect(html).toContain("button-save-entityFormShellContentMaxWidthPx");

    // GLOBAL-Einstellungen (ebenfalls im Oberflaeche-Pane)
    expect(html).toContain("button-save-toastDesktopPosition");
    expect(html).toContain("button-save-hoverPreviewOpenDelayMs");
  });

  it("zeigt die anderen Panes im Standard-Render nicht", () => {
    const html = renderToStaticMarkup(<SettingsPage />);

    // Nur Oberflaeche ist der Standard — andere Panes sind initial nicht gerendert
    expect(html).not.toContain("settings-pane-kalender");
    expect(html).not.toContain("settings-pane-sicherheit");
    expect(html).not.toContain("settings-pane-backup");
  });
});
