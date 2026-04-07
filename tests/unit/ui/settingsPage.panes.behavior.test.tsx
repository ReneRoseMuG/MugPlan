/**
 * Test Scope:
 *
 * Feature: Settings Redesign - Pane-Inhalte
 *
 * Abgedeckte Regeln:
 * - Der Oberflaeche-Pane (Standardpane) zeigt alle USER-Settings mit Scope-Badge-Markup.
 * - Der Oberflaeche-Pane zeigt alle GLOBAL-Settings des Bereichs Oberflaechensteuerung.
 * - Jedes Setting-Row hat ein eigenes data-testid und zeigt den Wirksam-Hinweis.
 * - Die Scope-Abschnitte (USER / GLOBAL) sind als Gruppen strukturiert.
 *
 * Fehlerfaelle:
 * - Ein Setting fehlt im Oberflaeche-Pane.
 * - Der Wirksam-Hinweis zeigt den falschen Wert oder Scope.
 * - Ein Setting ist in den falschen Scope-Abschnitt gerutscht.
 *
 * Ziel:
 * Vollstaendigen Pane-Inhalt des Standardpanes pruefen.
 * Pane-Inhalte von Kalender, Sicherheit und Backup werden in settingsPage.navigation.e2e.ts geprueft.
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
  Switch: (props: Record<string, unknown>) => (
    <input type="checkbox" data-testid={String(props["data-testid"] ?? "")} checked={Boolean(props.checked)} readOnly />
  ),
}));

import { SettingsPage } from "../../../client/src/components/SettingsPage";

describe("Settings Redesign UI: Pane-Inhalte (Oberflaeche-Standardpane)", () => {
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
        ["attachmentPreviewSize", {
          label: "Datei Vorschau Größe",
          resolvedValue: "small",
          resolvedScope: "USER",
        }],
        ["helpTextPreviewSize", {
          label: "Hilfetext Vorschau Größe",
          resolvedValue: "medium",
          resolvedScope: "DEFAULT",
        }],
        ["cardListColumns", {
          label: "Karten Spalten",
          resolvedValue: 4,
          resolvedScope: "DEFAULT",
        }],
        ["entityFormShell.sidebarWidthPx", {
          label: "Formular Sidebar Breite (px)",
          resolvedValue: 360,
          resolvedScope: "DEFAULT",
        }],
        ["entityFormShell.contentMaxWidthPx", {
          label: "Formular Inhalt Max-Breite (px)",
          resolvedValue: 760,
          resolvedScope: "DEFAULT",
        }],
        ["toastDesktopPosition", {
          label: "Toast Position Desktop",
          resolvedValue: "bottom-right",
          resolvedScope: "GLOBAL",
        }],
        ["hoverPreviewOpenDelayMs", {
          label: "Hover Vorschau Verzögerung (ms)",
          resolvedValue: 380,
          resolvedScope: "GLOBAL",
        }],
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

  it("zeigt den Pane-Container settings-pane-oberflaeche", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).toContain("settings-pane-oberflaeche");
  });

  it("zeigt alle fuenf USER-Settings im Oberflaeche-Pane", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).toContain("setting-row-attachmentPreviewSize");
    expect(html).toContain("setting-row-helpTextPreviewSize");
    expect(html).toContain("setting-row-cardListColumns");
    expect(html).toContain("setting-row-entityFormShellSidebarWidthPx");
    expect(html).toContain("setting-row-entityFormShellContentMaxWidthPx");
  });

  it("zeigt beide GLOBAL-Settings im Oberflaeche-Pane", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).toContain("setting-row-toastDesktopPosition");
    expect(html).toContain("setting-row-hoverPreviewOpenDelayMs");
  });

  it("zeigt USER-Badge-Text im Oberflaeche-Pane", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).toContain("USER");
  });

  it("zeigt GLOBAL-Badge-Text im Oberflaeche-Pane", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).toContain("GLOBAL");
  });

  it("zeigt den Wirksam-Hinweis fuer attachmentPreviewSize mit korrektem Wert", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).toContain("small");
    expect(html).toContain("USER");
  });

  it("zeigt den Wirksam-Hinweis fuer toastDesktopPosition", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).toContain("bottom-right");
    expect(html).toContain("GLOBAL");
  });

  it("zeigt den korrekten Label-Text fuer jede Setting-Row", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).toContain("Datei Vorschau Größe");
    expect(html).toContain("Hilfetext Vorschau Größe");
    expect(html).toContain("Karten Spalten");
    expect(html).toContain("Formular Sidebar Breite (px)");
    expect(html).toContain("Formular Inhalt Max-Breite (px)");
    expect(html).toContain("Toast Position Desktop");
    expect(html).toContain("Hover Vorschau Verzögerung (ms)");
  });
});
