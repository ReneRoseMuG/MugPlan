/**
 * Test Scope:
 *
 * Feature: FT07/FT16/FT29 - SettingsPage
 *
 * Abgedeckte Regeln:
 * - Die SettingsPage zeigt die sichtbaren Save-Controls fuer `helpTextPreviewSize`, die EntityFormShell-Breiten und `auth_two_factor_enabled`.
 * - Der Backup-Bereich zeigt den ZIP-Download, die verdichteten Monitoring-Spalten und den direkt persistierten `backup_enabled`-Switch.
 * - Der Dump-Import ist in den Backup-Bereich integriert.
 *
 * Fehlerfaelle:
 * - Einstellungs-Save-Controls verschwinden aus der Seite.
 * - Die Backup-Uebersicht verliert ZIP-Download, Importbereich oder den direkten Backup-Switch.
 *
 * Ziel:
 * Sichtbares Settings-Seitenverhalten ueber gerendertes Markup statt ueber Quelltextmarker absichern.
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

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => <div {...props}>{children}</div>,
  TabsList: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => <div {...props}>{children}</div>,
  TabsTrigger: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => <button type="button" {...props}>{children}</button>,
  TabsContent: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => <section {...props}>{children}</section>,
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
        ["helpTextPreviewSize", { resolvedValue: "large" }],
        ["entityFormShell.sidebarWidthPx", { resolvedValue: 360 }],
        ["entityFormShell.contentMaxWidthPx", { resolvedValue: 760 }],
        ["backup_enabled", { resolvedValue: true }],
        ["auth_two_factor_enabled", { resolvedValue: true }],
      ]),
      isLoading: false,
      isError: false,
      errorMessage: null,
      retry: vi.fn(),
      setSetting: vi.fn().mockResolvedValue(undefined),
      isSaving: false,
    });
    useQueryMock.mockReturnValue({
      data: [
        {
          id: 1,
          createdAt: "2026-03-20T10:00:00.000Z",
          status: "success",
          errorMessage: null,
          exportedRecordCount: 12,
          filePath: "{\"excelPath\":\"backup.xlsx\",\"pdfPath\":\"backup.pdf\",\"zipPath\":\"backup.zip\"}",
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders the backup panel with zip download, direct backup switch persistence and integrated dump import", () => {
    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain("tab-settings-general");
    expect(html).toContain("tab-settings-backup");
    expect(html).not.toContain("tab-settings-db-dump");
    expect(html).toContain("Sicherheit");
    expect(html).toContain("select-setting-helpTextPreviewSize");
    expect(html).toContain("button-save-helpTextPreviewSize");
    expect(html).toContain("input-setting-entityFormShellSidebarWidthPx");
    expect(html).toContain("button-save-entityFormShellSidebarWidthPx");
    expect(html).toContain("input-setting-entityFormShellContentMaxWidthPx");
    expect(html).toContain("button-save-entityFormShellContentMaxWidthPx");
    expect(html).toContain("switch-setting-auth-two-factor-enabled");
    expect(html).toContain("button-save-auth-two-factor-enabled");
    expect(html).toContain("switch-setting-backup-enabled");
    expect(html).not.toContain("button-save-backup-enabled");
    expect(html).toContain("Backups");
    expect(html).toContain("button-backups-run-now");
    expect(html).toContain("Datum");
    expect(html).toContain("Status");
    expect(html).toContain("Umfang");
    expect(html).toContain("Download");
    expect(html).toContain("table-backup-logs-frame");
    expect(html).toContain("Eintraege: 1");
    expect(html).toContain("backup-download-excel-1");
    expect(html).toContain("backup-download-pdf-1");
    expect(html).toContain("backup-download-zip-1");
    expect(html).toContain("Dump Import");
    expect(html).toContain("input-dump-import-file");
    expect(html).toContain("button-dump-import-preview");
  });
});
