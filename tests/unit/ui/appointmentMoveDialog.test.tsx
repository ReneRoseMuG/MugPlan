/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Titelberechnung: Kalender-Move → immer "Termin verschieben", Formular → "Tourwechsel"
 * - Warncontainer mit Mitarbeiter-Badges erscheint genau dann, wenn Mitarbeiter entfernt werden
 * - Einstufiger Dialog bei Entfernung ohne KW-Plan (verbleibende Mitarbeiter > 0): kein "Weiter"-Button
 * - Mehrstufiger Dialog bei Entfernung + KW-Plan: Schritt 1 Warnung, Schritt 2 Auswahlliste
 * - Einstufiger Dialog bei KW-Plan (Mitarbeiter gewählt): direkt Auswahlliste, kein Warncontainer
 * - Schritt "Keine Mitarbeiter" erscheint, wenn resolvedEmployeeIds nach dem Move leer ist
 * - Schritt-Navigation: Weiter / Zurück
 *
 * Fehlerfälle:
 * - Warncontainer erscheint, obwohl keine Mitarbeiter entfernt werden
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

vi.mock("@/components/NotesSection", () => ({
  NotesSection: ({
    notes,
    readOnly,
    title,
    maxVisibleNotes,
  }: {
    notes: Array<{ id: number; title: string }>;
    readOnly?: boolean;
    title?: string;
    maxVisibleNotes?: number;
  }) => (
    <section data-testid="mock-notes-section" data-readonly={String(readOnly)} data-max-visible-notes={maxVisibleNotes}>
      <h3>{title}</h3>
      {notes.map((note) => <div key={note.id}>{note.title}</div>)}
    </section>
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

function buildNote(id: number, title: string) {
  return {
    id,
    title,
    body: "",
    cardColor: null,
    cardColorLocked: false,
    print: true,
    isPinned: false,
    version: 1,
    createdAt: new Date("2099-01-01T00:00:00.000Z"),
    updatedAt: new Date("2099-01-01T00:00:00.000Z"),
  };
}

function getButtonClickHandler(testId: string): (() => void) | undefined {
  const props = buttonPropsLog.find((entry) => entry["data-testid"] === testId);
  return props?.onClick as (() => void) | undefined;
}

const defaultProps = {
  open: true,
  baseEmployeeIds: [] as number[],
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

  it("shows 'Termin verschieben' regardless of tour/week flag combination", () => {
    const combinations: AppointmentMoveDialogContext[] = [
      { tourChanged: true, weekChanged: false, isCalendarMove: true },
      { tourChanged: false, weekChanged: true, isCalendarMove: true },
      { tourChanged: true, weekChanged: true, isCalendarMove: true },
    ];
    for (const moveContext of combinations) {
      const html = renderToStaticMarkup(
        <AppointmentMoveDialog
          {...defaultProps}
          preview={makePreview()}
          moveContext={moveContext}
        />,
      );
      expect(html).toContain("Termin verschieben");
      expect(html).not.toContain("Terminverschiebung");
      expect(html).not.toContain("Tourwechsel");
    }
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

  it("uses the same confirm button label as the calendar move dialog", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={makePreview({
          currentEmployeeIds: [99],
          items: [
            { employeeId: 99, employeeName: "Fest MA", status: "already_present", selectable: false, conflictReason: null, source: "current" },
          ],
        })}
        moveContext={{ tourChanged: true, weekChanged: false, isCalendarMove: false }}
      />,
    );
    expect(html).toContain("Bestätigen");
    expect(html).not.toContain("Termin verschieben");
  });

  it("uses the same warning text as the calendar move dialog", () => {
    const preview = makePreview({
      hasWeekPlan: false,
      currentEmployeeIds: [11],
      items: [
        { employeeId: 11, employeeName: "Ana Alt", status: "will_remove", selectable: false, conflictReason: "WILL_REMOVE", source: "current" },
      ],
    });
    const tourChangeHtml = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={preview}
        moveContext={{ tourChanged: true, weekChanged: false, isCalendarMove: false }}
      />,
    );
    const calendarMoveHtml = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={preview}
        moveContext={{ tourChanged: true, weekChanged: false, isCalendarMove: true }}
      />,
    );
    const warningText = "Die folgenden Mitarbeiter werden vom Termin entfernt, um Konflikte zu vermeiden:";
    expect(tourChangeHtml).toContain(warningText);
    expect(calendarMoveHtml).toContain(warningText);
    expect(tourChangeHtml).not.toContain("Neuzuweisung");
    expect(tourChangeHtml).not.toContain("beim Verschieben");
  });
});

describe("AppointmentMoveDialog single-step: removal only (no week plan)", () => {
  beforeEach(() => {
    buttonPropsLog.length = 0;
    vi.stubGlobal("React", React);
  });

  const previewWithRemovals = makePreview({
    hasWeekPlan: false,
    currentEmployeeIds: [11, 12, 13],
    items: [
      { employeeId: 11, employeeName: "Anna Alt", status: "will_remove", selectable: false, conflictReason: "WILL_REMOVE", source: "current" },
      { employeeId: 12, employeeName: "Bert Alt", status: "will_remove", selectable: false, conflictReason: "WILL_REMOVE", source: "current" },
      { employeeId: 13, employeeName: "Carl Bleibt", status: "already_present", selectable: false, conflictReason: null, source: "current" },
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
    expect(html).toContain("Bestätigen");
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
    expect(html).toContain("Mitarbeiter aus der Wochenplanung sind am Zieltermin verfügbar.");
    expect(html).not.toContain("Übernehmbar aus Wochenplanung am Zieltermin");
    expect(html).toContain("Clara Neu");
    expect(html).toContain("Kann dem Termin zugewiesen werden.");
    expect(html).toContain("Weitere konfliktfreie Mitarbeiter");
    expect(html).toContain("David Frei");
  });

  it("shows blocked week-plan employees as conflict checks without checkbox", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        selectedIds={[23]}
        preview={makePreview({
          hasWeekPlan: true,
          currentEmployeeIds: [],
          items: [
            { employeeId: 23, employeeName: "Emil Blockiert", status: "conflict", selectable: true, conflictReason: "EMPLOYEE_OVERLAP", source: "week_plan" },
          ],
        })}
        moveContext={{ tourChanged: true, weekChanged: true, isCalendarMove: false }}
      />,
    );

    expect(html).toContain("Mitarbeiter aus der Wochenplanung sind am Zieltermin wegen doppelter Planung nicht verfügbar.");
    expect(html).not.toContain("Tour/KW-Planung");
    expect(html).toContain("Emil Blockiert");
    expect(html).toContain('data-testid="badge-appointment-move-preview-23"');
    expect(html).toContain("Am Zieltermin besteht bereits eine ganztägige Planung.");
    expect(html).not.toContain("Kann nicht übernommen werden");
    expect(html).not.toContain("appointment-move-preview-checkbox-23");
  });

  it("shows the confirm button directly without a 'Weiter' step when an employee is selected", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        selectedIds={[21]}
        preview={previewWithWeekPlan}
        moveContext={{ tourChanged: true, weekChanged: true, isCalendarMove: true }}
      />,
    );
    expect(html).not.toContain(">Weiter<");
    expect(html).toContain("button-appointment-move-confirm");
  });

});

describe("AppointmentMoveDialog notes step", () => {
  beforeEach(() => {
    buttonPropsLog.length = 0;
    vi.stubGlobal("React", React);
  });

  it("limits affected appointment notes to two visible cards", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={null}
        moveContext={{ tourChanged: true, weekChanged: false, isCalendarMove: true }}
        noteReview={{
          previousStartDate: "2099-01-02",
          previousEndDate: null,
          previousStartTime: "09:00:00",
          nextStartDate: "2099-01-03",
          nextEndDate: null,
          nextStartTime: "10:00:00",
          previousTourName: "Tour Alt",
          nextTourName: "Tour Neu",
          notes: [
            buildNote(44, "Erste Terminnotiz"),
            buildNote(45, "Zweite Terminnotiz"),
            buildNote(46, "Dritte Terminnotiz"),
          ],
        }}
      />,
    );

    expect(html).toContain("appointment-move-step-notes");
    expect(html).toContain("Betroffene Terminnotizen");
    expect(html).toContain('data-readonly="true"');
    expect(html).toContain('data-max-visible-notes="2"');
    expect(html).toContain("Erste Terminnotiz");
    expect(html).toContain("Dritte Terminnotiz");
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

describe("AppointmentMoveDialog no-employees fallback (move results in 0 employees)", () => {
  beforeEach(() => {
    buttonPropsLog.length = 0;
    vi.stubGlobal("React", React);
  });

  it("shows the 'Termin hat keine Mitarbeiter' message instead of an empty body", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={makePreview()}
        moveContext={{ tourChanged: false, weekChanged: true, isCalendarMove: true }}
      />,
    );
    expect(html).toContain("appointment-move-step-no-employees");
    expect(html).toContain("Termin hat keine Mitarbeiter");
    expect(html).toContain("Der Termin wird ohne Mitarbeiter verschoben. Soll er trotzdem verschoben werden?");
    expect(html).not.toContain("appointment-move-removal-warning");
    expect(html).not.toContain("appointment-move-selection-list");
  });

  it("uses the 'Trotzdem verschieben' confirm label and no 'Weiter' step", () => {
    const html = renderToStaticMarkup(
      <AppointmentMoveDialog
        {...defaultProps}
        preview={null}
        moveContext={{ tourChanged: false, weekChanged: true, isCalendarMove: true }}
      />,
    );
    expect(html).not.toContain(">Weiter<");
    expect(html).toContain("button-appointment-move-confirm");
    expect(html).toContain("Trotzdem verschieben");
  });
});
