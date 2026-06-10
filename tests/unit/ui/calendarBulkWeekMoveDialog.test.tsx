/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Konfigurationsschritt: "Zwischenreport erstellen" ist deaktiviert ohne Quelltour, aktiv mit Auswahl.
 * - Zwischenreport: blockierte Termine haben eine deaktivierte Checkbox und eine sichtbare Begründung.
 * - Zwischenreport: Feiertagshinweis erscheint mit dem Zusatz, dass die Verschiebung möglich bleibt.
 * - Zwischenreport: "Sammelverschiebung ausführen" ist ohne Auswahl deaktiviert, mit Auswahl aktiv.
 * - Ergebnis: verschobene Anzahl und fehlgeschlagene Termine werden ausgewiesen.
 *
 * Fehlerfälle:
 * - Ausführen-Button aktiv, obwohl kein Termin ausgewählt ist.
 * - Blockierte Checkbox ist nicht deaktiviert.
 *
 * Ziel:
 * Das sichtbare Verhalten des Zwischenreport-Dialogs der KW-Sammelverschiebung absichern (UC-258).
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

type ActionLike = { label?: string; disabled?: boolean; testId?: string } | undefined;
const footerLog: Array<{ primary: ActionLike; secondary: ActionLike; back: ActionLike }> = [];
const checkboxLog: Array<{ testId: string | undefined; checked: boolean | undefined; disabled: boolean | undefined }> = [];

vi.mock("@/components/ui/dialog-base", () => ({
  MutationPreviewDialogBase: ({ children, footer, title }: { children?: React.ReactNode; footer?: React.ReactNode; title?: string }) => (
    <section><h2>{title}</h2>{children}{footer}</section>
  ),
  DialogBaseFooter: (props: { primaryAction?: ActionLike; secondaryAction?: ActionLike; backAction?: ActionLike }) => {
    footerLog.push({ primary: props.primaryAction, secondary: props.secondaryAction, back: props.backAction });
    return (
      <footer>
        {props.primaryAction ? (
          <button type="button" data-testid={props.primaryAction.testId} disabled={props.primaryAction.disabled}>
            {props.primaryAction.label}
          </button>
        ) : null}
      </footer>
    );
  },
  DialogBaseInlineMessage: ({ title, description }: { title?: string; description?: string }) => (
    <div data-testid="inline-message"><strong>{title}</strong><span>{description}</span></div>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, disabled, ...props }: { checked?: boolean; disabled?: boolean; [key: string]: unknown }) => {
    checkboxLog.push({ testId: props["data-testid"] as string | undefined, checked, disabled });
    return <input type="checkbox" checked={checked} disabled={disabled} readOnly />;
  },
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children?: React.ReactNode }) => <label>{children}</label>,
}));

import {
  CalendarBulkWeekMoveDialog,
  type CalendarBulkWeekMoveDialogProps,
} from "@/components/CalendarBulkWeekMoveDialog";
import type { BulkWeekMovePreviewItem } from "@/lib/calendar-bulk-week-move";

function buildItem(overrides: Partial<BulkWeekMovePreviewItem> & { appointmentId: number }): BulkWeekMovePreviewItem {
  return {
    appointmentId: overrides.appointmentId,
    version: overrides.version ?? 1,
    title: overrides.title ?? `Termin ${overrides.appointmentId}`,
    tourId: overrides.tourId ?? 10,
    tourName: overrides.tourName ?? "Tour A",
    sourceStartDate: overrides.sourceStartDate ?? "2026-07-06",
    sourceEndDate: overrides.sourceEndDate ?? null,
    startTime: overrides.startTime ?? null,
    targetStartDate: overrides.targetStartDate ?? "2026-07-20",
    targetEndDate: overrides.targetEndDate ?? null,
    status: overrides.status ?? "movable",
    selectable: overrides.selectable ?? true,
    preselected: overrides.preselected ?? true,
    blockReasons: overrides.blockReasons ?? [],
    hints: overrides.hints ?? [],
  };
}

function baseProps(overrides: Partial<CalendarBulkWeekMoveDialogProps>): CalendarBulkWeekMoveDialogProps {
  return {
    open: true,
    phase: "config",
    tours: [{ id: 10, name: "Tour A" }, { id: 11, name: "Tour B" }],
    tags: [{ id: 1, name: "Fix" }],
    isCatalogLoading: false,
    sourceTourIds: [],
    onToggleTour: () => undefined,
    shiftWeeks: 1,
    onShiftWeeksChange: () => undefined,
    blockingTagIds: [1],
    onToggleBlockingTag: () => undefined,
    onRunPreview: () => undefined,
    isPreviewPending: false,
    previewError: null,
    preview: null,
    selectedIds: [],
    onToggleItem: () => undefined,
    onBackToConfig: () => undefined,
    onConfirm: () => undefined,
    isExecutePending: false,
    executeResult: null,
    onClose: () => undefined,
    ...overrides,
  };
}

beforeEach(() => {
  footerLog.length = 0;
  checkboxLog.length = 0;
});

describe("CalendarBulkWeekMoveDialog – Konfiguration", () => {
  it("deaktiviert den Report-Button ohne ausgewählte Quelltour", () => {
    renderToStaticMarkup(<CalendarBulkWeekMoveDialog {...baseProps({ phase: "config", sourceTourIds: [] })} />);
    const primary = footerLog.at(-1)?.primary;
    expect(primary?.testId).toBe("button-bulk-week-move-preview");
    expect(primary?.disabled).toBe(true);
  });

  it("aktiviert den Report-Button mit Quelltour und gültiger Distanz", () => {
    renderToStaticMarkup(<CalendarBulkWeekMoveDialog {...baseProps({ phase: "config", sourceTourIds: [10], shiftWeeks: 2 })} />);
    expect(footerLog.at(-1)?.primary?.disabled).toBe(false);
  });
});

describe("CalendarBulkWeekMoveDialog – Zwischenreport", () => {
  const preview = {
    sourceWeek: { isoYear: 2026, isoWeek: 28, fromDate: "2026-07-06", toDate: "2026-07-12" },
    shiftWeeks: 2,
    items: [
      buildItem({ appointmentId: 100, status: "movable", selectable: true, preselected: true }),
      buildItem({
        appointmentId: 200,
        status: "blocked",
        selectable: false,
        preselected: false,
        blockReasons: [{ code: "BLOCKING_TAG", message: "Termin ist durch blockierende Tags ausgeschlossen: Fix" }],
      }),
      buildItem({
        appointmentId: 300,
        status: "movable",
        selectable: true,
        preselected: true,
        hints: [{ code: "PUBLIC_HOLIDAY", message: "Ziel liegt auf einem bundeseinheitlichen Feiertag (Testtag). Die Verschiebung bleibt möglich." }],
      }),
    ],
  } as CalendarBulkWeekMoveDialogProps["preview"];

  it("deaktiviert die Checkbox blockierter Termine und zeigt die Begründung", () => {
    const markup = renderToStaticMarkup(
      <CalendarBulkWeekMoveDialog {...baseProps({ phase: "report", preview, selectedIds: [100, 300] })} />,
    );
    const blockedCheckbox = checkboxLog.find((entry) => entry.testId === "bulk-week-move-item-200");
    const movableCheckbox = checkboxLog.find((entry) => entry.testId === "bulk-week-move-item-100");
    expect(blockedCheckbox?.disabled).toBe(true);
    expect(movableCheckbox?.disabled).toBe(false);
    expect(markup).toContain("durch blockierende Tags ausgeschlossen");
  });

  it("zeigt den Feiertagshinweis mit dem Zusatz, dass die Verschiebung möglich bleibt", () => {
    const markup = renderToStaticMarkup(
      <CalendarBulkWeekMoveDialog {...baseProps({ phase: "report", preview, selectedIds: [100, 300] })} />,
    );
    expect(markup).toContain("bulk-week-move-holiday-300");
    expect(markup).toContain("Die Verschiebung bleibt m");
  });

  it("deaktiviert das Ausführen ohne Auswahl und aktiviert es mit Auswahl", () => {
    renderToStaticMarkup(<CalendarBulkWeekMoveDialog {...baseProps({ phase: "report", preview, selectedIds: [] })} />);
    expect(footerLog.at(-1)?.primary?.testId).toBe("button-bulk-week-move-confirm");
    expect(footerLog.at(-1)?.primary?.disabled).toBe(true);

    renderToStaticMarkup(<CalendarBulkWeekMoveDialog {...baseProps({ phase: "report", preview, selectedIds: [100] })} />);
    expect(footerLog.at(-1)?.primary?.disabled).toBe(false);
  });
});

describe("CalendarBulkWeekMoveDialog – Ergebnis", () => {
  it("weist verschobene und fehlgeschlagene Termine aus", () => {
    const executeResult = {
      moved: [{ appointmentId: 100, sourceStartDate: "2026-07-06", targetStartDate: "2026-07-20" }],
      failed: [{ appointmentId: 200, code: "VERSION_CONFLICT", message: "Termin wurde zwischenzeitlich geändert" }],
    } as CalendarBulkWeekMoveDialogProps["executeResult"];
    const markup = renderToStaticMarkup(
      <CalendarBulkWeekMoveDialog {...baseProps({ phase: "result", executeResult })} />,
    );
    expect(markup).toContain("1 Termine verschoben");
    expect(markup).toContain("1 Termine nicht verschoben");
    expect(markup).toContain("zwischenzeitlich ge");
  });
});
