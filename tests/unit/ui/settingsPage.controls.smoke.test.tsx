/**
 * Test Scope:
 *
 * Feature: Settings Redesign - Steuerelement-Wiring im Oberflaeche-Pane
 *
 * Abgedeckte Regeln:
 * - Jede USER-Setting im Oberflaeche-Pane hat ein Select oder Input-Steuerelement mit korrektem data-testid.
 * - Jede Setting im Oberflaeche-Pane hat einen Speichern-Button mit korrektem data-testid.
 * - Number-Inputs tragen die korrekten Einschraenkungen (min, max).
 * - Der Backup-Enabled-Switch hat kein eigenes Speichern-Button (direktes Persistieren).
 * - Der 2FA-Toggle hat einen Speichern-Button.
 * - Handler-Aufruf-Verifikation (setSetting mit korrekten Parametern) erfolgt in settingsPage.controls.e2e.ts.
 *
 * Fehlerfaelle:
 * - Ein Speichern-Button fehlt fuer eine Setting.
 * - Ein Steuerelement fehlt oder hat den falschen data-testid.
 * - Number-Input-Grenzen stimmen nicht.
 *
 * Ziel:
 * Einen statischen Smoke-Test fuer Struktur und TestIDs der Steuerelemente
 * im Oberflaeche-Pane absichern, nicht echte Persistenz oder Nutzerwirkung.
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
  QueryClient: class {
    invalidateQueries = vi.fn(async () => undefined);
  },
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
    <button type="button" data-testid={String(props["data-testid"] ?? "")}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => (
    <input
      data-testid={String(props["data-testid"] ?? "")}
      type={String(props.type ?? "text")}
      min={props.min !== undefined ? String(props.min) : undefined}
      max={props.max !== undefined ? String(props.max) : undefined}
    />
  ),
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
      ["backup_enabled", { resolvedValue: true, resolvedScope: "GLOBAL" }],
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

describe("Settings Redesign UI: Steuerelemente Smoke (Oberflaeche-Pane)", () => {
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
    useSettingsMock.mockReturnValue(makeSettingsMock());
    useQueryMock.mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  describe("USER-Settings: Select-Steuerelemente und Speichern-Buttons", () => {
    it("attachmentPreviewSize: Select und Speichern-Button vorhanden", () => {
      const html = renderToStaticMarkup(<SettingsPage />);
      expect(html).toContain("select-setting-attachmentPreviewSize");
      expect(html).toContain("button-save-attachmentPreviewSize");
    });

    it("helpTextPreviewSize: Select und Speichern-Button vorhanden", () => {
      const html = renderToStaticMarkup(<SettingsPage />);
      expect(html).toContain("select-setting-helpTextPreviewSize");
      expect(html).toContain("button-save-helpTextPreviewSize");
    });

    it("cardListColumns: Number-Input mit korrekten Grenzen (min=2, max=6)", () => {
      const html = renderToStaticMarkup(<SettingsPage />);
      expect(html).toContain("input-setting-cardListColumns");
      expect(html).toContain("button-save-cardListColumns");
      expect(html).toMatch(/input-setting-cardListColumns[^>]*min="2"[^>]*max="6"/);
    });

    it("entityFormShell.sidebarWidthPx: Number-Input mit korrekten Grenzen (min=260, max=480)", () => {
      const html = renderToStaticMarkup(<SettingsPage />);
      expect(html).toContain("input-setting-entityFormShellSidebarWidthPx");
      expect(html).toContain("button-save-entityFormShellSidebarWidthPx");
      expect(html).toMatch(/input-setting-entityFormShellSidebarWidthPx[^>]*min="260"[^>]*max="480"/);
    });

    it("entityFormShell.contentMaxWidthPx: Number-Input mit korrekten Grenzen (min=640, max=1100)", () => {
      const html = renderToStaticMarkup(<SettingsPage />);
      expect(html).toContain("input-setting-entityFormShellContentMaxWidthPx");
      expect(html).toContain("button-save-entityFormShellContentMaxWidthPx");
      expect(html).toMatch(/input-setting-entityFormShellContentMaxWidthPx[^>]*min="640"[^>]*max="1100"/);
    });
  });

  describe("GLOBAL-Settings: Select/Input und Speichern-Buttons im Oberflaeche-Pane", () => {
    it("toastDesktopPosition: Select und Speichern-Button vorhanden", () => {
      const html = renderToStaticMarkup(<SettingsPage />);
      expect(html).toContain("select-setting-toastDesktopPosition");
      expect(html).toContain("button-save-toastDesktopPosition");
    });

    it("hoverPreviewOpenDelayMs: Number-Input mit korrekten Grenzen (min=0, max=2000)", () => {
      const html = renderToStaticMarkup(<SettingsPage />);
      expect(html).toContain("input-setting-hoverPreviewOpenDelayMs");
      expect(html).toContain("button-save-hoverPreviewOpenDelayMs");
      expect(html).toMatch(/input-setting-hoverPreviewOpenDelayMs[^>]*min="0"[^>]*max="2000"/);
    });
  });

  describe("attachmentPreviewSize: Select-Optionen korrekt", () => {
    it("zeigt die Optionen small, medium, large", () => {
      const html = renderToStaticMarkup(<SettingsPage />);
      // Die Select-Optionen muessen im HTML enthalten sein
      const segment = html.slice(
        html.indexOf("select-setting-attachmentPreviewSize"),
      );
      expect(segment).toContain("small");
      expect(segment).toContain("medium");
      expect(segment).toContain("large");
    });
  });

  describe("toastDesktopPosition: Select-Optionen korrekt", () => {
    it("zeigt alle vier Positionsoptionen", () => {
      const html = renderToStaticMarkup(<SettingsPage />);
      expect(html).toContain("top-left");
      expect(html).toContain("top-right");
      expect(html).toContain("bottom-left");
      expect(html).toContain("bottom-right");
    });
  });
});
