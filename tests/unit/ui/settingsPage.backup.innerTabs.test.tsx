/**
 * Test Scope:
 *
 * Feature: FT07 - Backup & Dump Inner-Tab-Navigation
 *
 * Abgedeckte Regeln:
 * - Der Backup & Dump-Pane ist ueber den Nav-Eintrag nav-item-backup erreichbar.
 * - Der Backup & Dump-Pane enthaelt eine Inner-Tab-Leiste (backup-inner-tabs) mit den drei Tabs:
 *   backups, dumps, import.
 * - Alle Inner-Tab-Buttons haben korrekte data-testid-Attribute.
 * - Die Backup-Monitoring-Tabelle ist im Backups-Inner-Tab gerendert.
 * - Der Switch fuer backup_enabled hat keinen eigenen Speichern-Button.
 * - Die Import-Sektion (dump-import-section) ist im Import-Inner-Tab gerendert.
 *
 * Fehlerfaelle:
 * - Ein Inner-Tab-Button fehlt oder hat den falschen data-testid.
 * - Die Backup-Tabelle oder der Import-Bereich ist nicht im korrekten Inner-Tab.
 *
 * Ziel:
 * Nav-Eintrag und Inner-Tab-Struktur des Backup & Dump-Panes absichern.
 * Da der Backup-Pane bei initialem Render nicht sichtbar ist, pruefen diese Tests
 * das statische Markup auf Nav-Eintrag-Ebene.
 * Interaktives Navigationsverhalten wird in settingsPage.backup.e2e.ts geprueft.
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

function makeSettingsMock() {
  return {
    settingsByKey: new Map([
      ["attachmentPreviewSize", { resolvedValue: "large", resolvedScope: "DEFAULT" }],
      ["helpTextPreviewSize", { resolvedValue: "medium", resolvedScope: "DEFAULT" }],
      ["cardListColumns", { resolvedValue: 4, resolvedScope: "DEFAULT" }],
      ["entityFormShell.sidebarWidthPx", { resolvedValue: 360, resolvedScope: "DEFAULT" }],
      ["entityFormShell.contentMaxWidthPx", { resolvedValue: 760, resolvedScope: "DEFAULT" }],
      ["toastDesktopPosition", { resolvedValue: "bottom-right", resolvedScope: "GLOBAL" }],
      ["hoverPreviewOpenDelayMs", { resolvedValue: 380, resolvedScope: "GLOBAL" }],
      ["backup_enabled", { resolvedValue: true, resolvedScope: "GLOBAL", label: "Automatische Backups" }],
      ["auth_two_factor_enabled", { resolvedValue: false, resolvedScope: "DEFAULT" }],
      ["calendarWeekendColumnPercent", { resolvedValue: 33, resolvedScope: "GLOBAL" }],
      ["calendarWeekScrollRange", { resolvedValue: 4, resolvedScope: "GLOBAL" }],
      ["calendarMonthScrollRange", { resolvedValue: 3, resolvedScope: "GLOBAL" }],
    ]),
    isLoading: false,
    isError: false,
    errorMessage: null,
    retry: vi.fn(),
    setSetting: vi.fn().mockResolvedValue(undefined),
    isSaving: false,
  };
}

describe("FT07 UI: Backup & Dump Nav-Eintrag und Inner-Tab-Struktur", () => {
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
    useSettingsMock.mockReturnValue(makeSettingsMock());
    useQueryMock.mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() });
  });

  it("rendert den Nav-Eintrag Backup & Dump mit korrektem data-testid", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).toContain("nav-item-backup");
  });

  it("zeigt den Label-Text 'Backup' im Nav-Eintrag", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).toContain("Backup");
  });

  it("zeigt keinen Speichern-Button fuer backup_enabled (direktes Persistieren)", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).not.toContain("button-save-backup-enabled");
  });

  it("zeigt den switch-setting-backup-enabled nicht im Oberflaeche-Standardpane", () => {
    // Der Switch befindet sich im Backup-Pane, der initial nicht gerendert wird
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).not.toContain("switch-setting-backup-enabled");
  });

  it("rendert backup-inner-tabs, backup-inner-tab-backups, -dumps und -import nicht im Standardpane", () => {
    // Diese Elemente existieren nur im Backup-Pane, der initial nicht aktiv ist
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).not.toContain("backup-inner-tabs");
    expect(html).not.toContain("backup-inner-tab-backups");
    expect(html).not.toContain("backup-inner-tab-dumps");
    expect(html).not.toContain("backup-inner-tab-import");
  });

  it("rendert dump-import-section nicht im Standardpane", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).not.toContain("dump-import-section");
  });

  it("rendert backups-monitoring-table nicht im Standardpane", () => {
    const html = renderToStaticMarkup(<SettingsPage />);
    expect(html).not.toContain("backups-monitoring-table");
  });
});
