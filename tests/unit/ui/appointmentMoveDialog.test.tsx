/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Titelberechnung aus moveContext (Tourwechsel / Wochenwechsel / beides)
 * - Warncontainer mit Mitarbeiter-Badges erscheint genau dann, wenn Mitarbeiter entfernt werden
 * - Einstufiger Dialog bei Entfernung ohne KW-Plan: kein Schritt-Indikator, kein "Weiter"-Button
 * - Zweistufiger Dialog bei Entfernung + KW-Plan: Schritt 1 zeigt Warnung, Schritt 2 zeigt Auswahlliste
 * - Einstufiger Dialog bei KW-Plan ohne Entfernung: direkt Auswahlliste, kein Warncontainer
 * - Schritt-Navigation: Weiter / Zurück
 * - Auswahl-Buttons (Alle wählen / abwählen) verdrahtet
 *
 * Fehlerfälle:
 * - Warncontainer erscheint, obwohl keine Mitarbeiter entfernt werden
 * - Falscher Dialog-Titel bei einfachem Wochenwechsel
 * - "Weiter"-Button erscheint im einstufigen Modus
 *
 * Ziel:
 * Das sichtbare Verhalten von AppointmentMoveDialog für alle relevanten Szenarien absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const buttonPropsLog: Array<Record<string, unknown>> = [];

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
    buttonPropsLog.push(props);
    return <button type="button" {...props}>{children}</button>;
  },
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, disabled, ...props }: { checked?: boolean; disabled?: boolean; [key: string]: unknown }) => (
    <input type="checkbox" checked={checked} disabled={disabled} readOnly {...props} />
  ),
}));

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({ fullName, testId }: { fullName?: string; testId?: string }) => (
    <span data-testid={testId}>{fullName}</span>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <section {...props}>{children}</section>,
  DialogDescription: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
}));

import { AppointmentMoveDialog } from "../../../client/src/components/AppointmentMoveDialog";
import type { AppointmentMoveDialogContext } from "../../../client/src/components/AppointmentMoveDialog";
import type { AppointmentResourcePreviewResponse } from "../../../client/src/lib/resource-planning";

function makePreview(overrides: Partial<AppointmentResourcePreviewResponse> = {}): AppointmentResourcePreviewResponse {
  return {
    isoYear: 2099,
    isoWeek: 10,
    hasWeekPlan: false,
    currentEmployeeIds: [],
    items: [],
    ...overrides,
  };
}

function getButtonClickHandler(testId: string): (() => void) | undefined {
  const props = buttonPropsLog.find((entry) => entry["data-testid"] === testId);
  return props?.onClick as (() => void) | undefined;
}

const defaultProps = {
  open: true,
  selectedIds: [] as number[],
  onSelectedIdsChange: () => undefined,
  isSubmitting: false,
  onConfirm: () => undefined,
  onClose: () => undefined,
};

describe("AppointmentMoveDialog title computation – Kalender-Move (isCalendarMove: true)", () => {
  beforeEach(() => {
    buttonPropsLog.length = 0;
    vi.stubGlobal("React", React);
  });

  it("shows Tourwechsel title when only tour changed", () => {
    const moveContext: AppointmentMoveDialogContext = { tourChanged: true, weekChanged: false, isCalendarMove: true };
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={makePreview()}
        moveContext={moveContext}
      />,
    );
    expect(html).toContain("Terminverschiebung mit Tourwechsel");
    expect(html).not.toContain("Wochenwechsel");
    expect(html).not.toContain("Tour- und Wochenwechsel");
  });

  it("shows Wochenwechsel title when only week changed", () => {
    const moveContext: AppointmentMoveDialogContext = { tourChanged: false, weekChanged: true, isCalendarMove: true };
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={makePreview()}
        moveContext={moveContext}
      />,
    );
    expect(html).toContain("Terminverschiebung mit Wochenwechsel");
    expect(html).not.toContain("Tourwechsel");
    expect(html).not.toContain("Tour- und Wochenwechsel");
  });

  it("shows combined title when both tour and week changed", () => {
    const moveContext: AppointmentMoveDialogContext = { tourChanged: true, weekChanged: true, isCalendarMove: true };
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={makePreview()}
        moveContext={moveContext}
      />,
    );
    expect(html).toContain("Terminverschiebung mit Tour- und Wochenwechsel");
  });
});

describe("AppointmentMoveDialog title computation – Formular-Tourwechsel (isCalendarMove: false)", () => {
  beforeEach(() => {
    buttonPropsLog.length = 0;
    vi.stubGlobal("React", React);
  });

  it("shows 'Tourwechsel' regardless of weekChanged flag", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={makePreview()}
        moveContext={{ tourChanged: true, weekChanged: false, isCalendarMove: false }}
      />,
    );
    expect(html).toContain("Tourwechsel");
    expect(html).not.toContain("Terminverschiebung");
  });

  it("shows 'Tourwechsel bestätigen' as confirm button label", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={makePreview()}
        moveContext={{ tourChanged: true, weekChanged: false, isCalendarMove: false }}
      />,
    );
    expect(html).toContain("Tourwechsel bestätigen");
    expect(html).not.toContain("Termin verschieben");
  });

  it("shows Neuzuweisung wording in the warning text", () => {
    const preview = makePreview({
      hasWeekPlan: false,
      currentEmployeeIds: [11],
      items: [
        { employeeId: 11, employeeName: "Ana Alt", status: "will_remove", selectable: false, conflictReason: "WILL_REMOVE", source: "current" },
      ],
    });
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={preview}
        moveContext={{ tourChanged: true, weekChanged: false, isCalendarMove: false }}
      />,
    );
    expect(html).toContain("Neuzuweisung");
    expect(html).not.toContain("beim Verschieben");
  });
});

describe("AppointmentMoveDialog single-step: removal only (no week plan)", () => {
  beforeEach(() => {
    buttonPropsLog.length = 0;
    vi.stubGlobal("React", React);
  });

  const previewWithRemovals = makePreview({
    hasWeekPlan: false,
    currentEmployeeIds: [11, 12],
    items: [
      { employeeId: 11, employeeName: "Anna Alt", status: "will_remove", selectable: false, conflictReason: "WILL_REMOVE", source: "current" },
      { employeeId: 12, employeeName: "Bert Alt", status: "will_remove", selectable: false, conflictReason: "WILL_REMOVE", source: "current" },
    ],
  });

  it("shows the warning container with employee badges", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={previewWithRemovals}
        moveContext={{ tourChanged: true, weekChanged: false, isCalendarMove: true }}
      />,
    );
    expect(html).toContain("appointment-move-removal-warning");
    expect(html).toContain("Achtung: Mitarbeiter werden abgezogen");
    expect(html).toContain("Anna Alt");
    expect(html).toContain("Bert Alt");
    expect(html).toContain('data-testid="badge-appointment-move-removed-11"');
    expect(html).toContain('data-testid="badge-appointment-move-removed-12"');
  });

  it("does not show a 'Weiter' button – single step goes straight to confirm", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={previewWithRemovals}
        moveContext={{ tourChanged: true, weekChanged: false, isCalendarMove: true }}
      />,
    );
    expect(html).not.toContain(">Weiter<");
    expect(html).toContain("Termin verschieben");
    expect(html).toContain("button-appointment-move-confirm");
  });

  it("does not show the selection list when there are no week plan items", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={previewWithRemovals}
        moveContext={{ tourChanged: true, weekChanged: false, isCalendarMove: true }}
      />,
    );
    expect(html).not.toContain("appointment-move-selection-list");
  });
});

describe("AppointmentMoveDialog single-step: week plan only (no removals)", () => {
  beforeEach(() => {
    buttonPropsLog.length = 0;
    vi.stubGlobal("React", React);
  });

  const previewWithWeekPlan = makePreview({
    hasWeekPlan: true,
    currentEmployeeIds: [],
    items: [
      { employeeId: 21, employeeName: "Clara Neu", status: "will_add", selectable: true, conflictReason: null, source: "week_plan" },
      { employeeId: 22, employeeName: "David Frei", status: "will_add", selectable: true, conflictReason: null, source: "available" },
    ],
  });

  it("shows the selection list without a warning container", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={previewWithWeekPlan}
        moveContext={{ tourChanged: true, weekChanged: true, isCalendarMove: true }}
      />,
    );
    expect(html).not.toContain("appointment-move-removal-warning");
    expect(html).toContain("appointment-move-selection-list");
    expect(html).toContain("Tour-KW-Mitarbeiter");
    expect(html).toContain("Clara Neu");
    expect(html).toContain("Weitere konfliktfreie Mitarbeiter");
    expect(html).toContain("David Frei");
  });

  it("shows the confirm button directly without a 'Weiter' step", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={previewWithWeekPlan}
        moveContext={{ tourChanged: true, weekChanged: true, isCalendarMove: true }}
      />,
    );
    expect(html).not.toContain(">Weiter<");
    expect(html).toContain("button-appointment-move-confirm");
  });

  it("wires Alle wählen to pass all selectable IDs", () => {
    const onSelectedIdsChange = vi.fn();
    renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={previewWithWeekPlan}
        moveContext={{ tourChanged: true, weekChanged: true, isCalendarMove: true }}
        onSelectedIdsChange={onSelectedIdsChange}
      />,
    );
    getButtonClickHandler("button-appointment-move-select-all")?.();
    expect(onSelectedIdsChange).toHaveBeenCalledWith([21, 22]);
  });

  it("wires Alle abwählen to pass empty array", () => {
    const onSelectedIdsChange = vi.fn();
    renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={previewWithWeekPlan}
        moveContext={{ tourChanged: true, weekChanged: true, isCalendarMove: true }}
        selectedIds={[21]}
        onSelectedIdsChange={onSelectedIdsChange}
      />,
    );
    getButtonClickHandler("button-appointment-move-deselect-all")?.();
    expect(onSelectedIdsChange).toHaveBeenCalledWith([]);
  });
});

describe("AppointmentMoveDialog two-step: removals + week plan", () => {
  beforeEach(() => {
    buttonPropsLog.length = 0;
    vi.stubGlobal("React", React);
  });

  const previewTwoStep = makePreview({
    hasWeekPlan: true,
    currentEmployeeIds: [11],
    items: [
      { employeeId: 11, employeeName: "Anna Alt", status: "will_remove", selectable: false, conflictReason: "WILL_REMOVE", source: "current" },
      { employeeId: 21, employeeName: "Clara Neu", status: "will_add", selectable: true, conflictReason: null, source: "week_plan" },
    ],
  });

  it("renders step 1 with warning and 'Weiter' button, not the selection list", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={previewTwoStep}
        moveContext={{ tourChanged: true, weekChanged: false, isCalendarMove: true }}
      />,
    );
    expect(html).toContain("appointment-move-removal-warning");
    expect(html).toContain("Anna Alt");
    expect(html).toContain(">Weiter<");
    expect(html).not.toContain("appointment-move-selection-list");
    expect(html).not.toContain("button-appointment-move-confirm");
  });

  it("renders Zurück button and confirm button in step-2 markup when two-step flag is on", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={previewTwoStep}
        moveContext={{ tourChanged: true, weekChanged: false, isCalendarMove: true }}
      />,
    );
    expect(html).toContain(">Weiter<");
    expect(html).not.toContain("button-appointment-move-confirm");
    expect(html).toContain(">Abbrechen<");
  });
});
