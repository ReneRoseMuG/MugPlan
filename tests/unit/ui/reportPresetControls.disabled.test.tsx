/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Preset-Steuerung kann sichtbar, aber vollständig deaktiviert gerendert werden.
 * - Auswahl, Name, Scope, Aktion, Anwenden, Löschen und Speichern sind im deaktivierten Zustand gesperrt.
 *
 * Fehlerfälle:
 * - Einzelne Preset-Controls bleiben trotz temporärer Sperre editierbar.
 * - Einzelne Buttons werden trotz temporärer Sperre ohne Disabled-Zustand gerendert.
 *
 * Ziel:
 * Die temporäre UI-Sperre der Report-Preset-Funktionen für alle Report-Einbindungen zentral absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReportPreset, ReportPresetConfig } from "../../../shared/routes";

const useQueryMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) => (
    <button
      type="button"
      disabled={Boolean(disabled)}
      onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
      data-testid={String(props["data-testid"] ?? "")}
    >
      {children}
    </button>
  ),
}));

import { ReportPresetControls } from "../../../client/src/components/reports/ReportPresetControls";

const currentConfig: ReportPresetConfig = {
  range: { mode: "calendarWeek", start: "current", weeks: 1 },
};

const preset: ReportPreset = {
  id: "gesperrtes-preset",
  name: "Gesperrtes Preset",
  reportKey: "vorlaufliste",
  scope: "USER",
  config: currentConfig,
  actions: ["GENERATE_REPORT"],
  createdAt: "2026-05-06T00:00:00.000Z",
  updatedAt: "2026-05-06T00:00:00.000Z",
};

describe("ReportPresetControls disabled state", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      data: { reportKey: "vorlaufliste", presets: [preset] },
    });
  });

  it("locks all visible preset inputs and actions", () => {
    const applyPresetMock = vi.fn();

    const html = renderToStaticMarkup(
      <ReportPresetControls
        reportKey="vorlaufliste"
        isAdmin
        currentConfig={currentConfig}
        defaultName="Vorlaufliste Preset"
        onApplyPreset={applyPresetMock}
        testIdPrefix="reports-test"
        disabled
      />,
    );

    expect(html).toMatch(/<select[^>]*disabled=""[^>]*data-testid="reports-test-preset-select"/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-testid="reports-test-preset-apply"/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-testid="reports-test-preset-delete"/);
    expect(html).toMatch(/<input[^>]*disabled=""[^>]*data-testid="reports-test-preset-name"/);
    expect(html).toMatch(/<select[^>]*disabled=""[^>]*data-testid="reports-test-preset-scope"/);
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*disabled=""[^>]*data-testid="reports-test-preset-action-generate"/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-testid="reports-test-preset-save"/);
    expect(applyPresetMock).not.toHaveBeenCalled();
  });
});
