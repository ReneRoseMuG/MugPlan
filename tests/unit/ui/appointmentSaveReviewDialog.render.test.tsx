import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type DialogAction = {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  testId?: string;
};

const actions = new Map<string, DialogAction>();

vi.mock("@/components/ui/dialog-base", () => ({
  DialogBaseShell: ({ children, footer, testId, title }: Record<string, any>) => (
    <section data-testid={testId}>
      <h2>{title}</h2>
      {children}
      <footer>{footer}</footer>
    </section>
  ),
  DialogBaseFooter: ({ backAction, primaryAction, secondaryAction }: Record<string, DialogAction | undefined>) => {
    for (const action of [backAction, secondaryAction, primaryAction]) {
      if (action?.testId) actions.set(action.testId, action);
    }
    return (
      <>
        {backAction ? <button type="button" disabled={backAction.disabled} data-testid={backAction.testId}>{backAction.label}</button> : null}
        {secondaryAction ? <button type="button" disabled={secondaryAction.disabled} data-testid={secondaryAction.testId}>{secondaryAction.label}</button> : null}
        {primaryAction ? <button type="button" disabled={primaryAction.disabled} data-testid={primaryAction.testId}>{primaryAction.label}</button> : null}
      </>
    );
  },
  DialogBaseInlineMessage: ({ title, description }: { title?: React.ReactNode; description?: React.ReactNode }) => (
    <aside>
      <strong>{title}</strong>
      <p>{description}</p>
    </aside>
  ),
  DialogBaseStepper: ({ steps }: { steps: Array<{ title: string }> }) => (
    <ol>{steps.map((step) => <li key={step.title}>{step.title}</li>)}</ol>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, ...props }: { checked?: boolean; [key: string]: unknown }) => (
    <input type="checkbox" checked={checked} readOnly {...props} />
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

import { AppointmentSaveReviewDialog } from "../../../client/src/components/AppointmentSaveReviewDialog";

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

describe("AppointmentSaveReviewDialog", () => {
  beforeEach(() => {
    actions.clear();
    vi.stubGlobal("React", React);
  });

  it("renders the no-employee save decision as a compact confirm dialog", () => {
    const html = renderToStaticMarkup(
      <AppointmentSaveReviewDialog
        open
        currentEmployeeIds={[]}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onOpenChange={() => undefined}
      />,
    );

    expect(html).toContain("dialog-appointment-save-review");
    expect(html).toContain("Termin hat keine Mitarbeiter");
    expect(html).toContain("Der Termin hat keine geplanten Mitarbeiter.");
    expect(html).toContain("Soll er trotzdem gespeichert werden?");
    expect(html).not.toContain("checkbox-appointment-save-review-no-employees");
    expect(actions.get("button-appointment-save-review-confirm")?.label).toBe("Trotzdem speichern");
    expect(actions.get("button-appointment-save-review-confirm")?.disabled).toBe(false);
  });

  it("renders resource preview rows before save", () => {
    const html = renderToStaticMarkup(
      <AppointmentSaveReviewDialog
        open
        currentEmployeeIds={[10]}
        resourceRequest={{
          resolutionKey: "tour:1|date:2099-01-01",
          selectedIds: [],
          resolutionMode: "additive",
          preview: {
            isoYear: 2099,
            isoWeek: 1,
            hasWeekPlan: true,
            currentEmployeeIds: [10],
            items: [
              {
                employeeId: 10,
                employeeName: "Konflikt Mitarbeiter",
                status: "conflict",
                selectable: false,
                conflictReason: "EMPLOYEE_OVERLAP",
                source: "current",
              },
            ],
          },
        }}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onOpenChange={() => undefined}
      />,
    );

    expect(html).toContain("appointment-save-review-step-resources");
    expect(html).toContain("Konfliktprüfung");
    expect(html).toContain("Mitarbeiter wegen doppelter Planung nicht verfügbar.");
    expect(html).toContain("Zwingend zu entfernen");
    expect(html).toContain("Konflikt Mitarbeiter");
    expect(html).toContain("Wird beim Speichern vom Termin entfernt.");
    expect(html).toContain("appointment-week-preview-status-10");
    expect(html).not.toContain("Bereits direkt am Termin");
    expect(html).not.toContain("appointment-week-preview-checkbox-10");
    expect(html).not.toContain("appointment-week-resolution-mode");
  });

  it("renders blocked week-plan employees as not transferable without a checkbox", () => {
    const html = renderToStaticMarkup(
      <AppointmentSaveReviewDialog
        open
        currentEmployeeIds={[]}
        resourceRequest={{
          resolutionKey: "tour:1|date:2099-01-01",
          selectedIds: [11],
          resolutionMode: "additive",
          preview: {
            isoYear: 2099,
            isoWeek: 1,
            hasWeekPlan: true,
            currentEmployeeIds: [],
            items: [
              {
                employeeId: 11,
                employeeName: "Blockierter KW Mitarbeiter",
                status: "conflict",
                selectable: true,
                conflictReason: "EMPLOYEE_OVERLAP",
                source: "week_plan",
              },
            ],
          },
        }}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onOpenChange={() => undefined}
      />,
    );

    expect(html).toContain("Konfliktprüfung");
    expect(html).toContain("Mitarbeiter aus der Wochenplanung sind am Zieltermin wegen doppelter Planung nicht verfügbar.");
    expect(html).not.toContain("Tour/KW-Planung");
    expect(html).toContain("Blockierter KW Mitarbeiter");
    expect(html).toContain('data-testid="badge-appointment-save-review-employee-11"');
    expect(html).toContain("Am Zieltermin besteht bereits eine ganztägige Planung.");
    expect(html).not.toContain("Kann nicht übernommen werden");
    expect(html).not.toContain("appointment-week-preview-checkbox-11");
    expect(html).not.toContain("TOUR-KW-MITARBEITER");
  });

  it("renders selected week-plan additions with target-date copy", () => {
    const html = renderToStaticMarkup(
      <AppointmentSaveReviewDialog
        open
        currentEmployeeIds={[]}
        resourceRequest={{
          resolutionKey: "tour:1|date:2099-01-01",
          selectedIds: [12],
          resolutionMode: "additive",
          preview: {
            isoYear: 2099,
            isoWeek: 1,
            hasWeekPlan: true,
            currentEmployeeIds: [],
            items: [
              {
                employeeId: 12,
                employeeName: "KW Ziel Mitarbeiter",
                status: "will_add",
                selectable: true,
                conflictReason: null,
                source: "week_plan",
              },
            ],
          },
        }}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onOpenChange={() => undefined}
      />,
    );

    expect(html).toContain("Mitarbeiter aus der Wochenplanung sind am Zieltermin verfügbar.");
    expect(html).not.toContain("Übernehmbar aus Wochenplanung am Zieltermin");
    expect(html).toContain("Kann dem Termin zugewiesen werden.");
    expect(html).toMatch(/<input(?=[^>]*data-testid="appointment-week-preview-checkbox-12")(?=[^>]*checked)/);
  });

  it("renders the resource mode selector only for explicit same-week decisions", () => {
    const html = renderToStaticMarkup(
      <AppointmentSaveReviewDialog
        open
        currentEmployeeIds={[10]}
        resourceRequest={{
          resolutionKey: "tour:1|date:2099-01-01",
          selectedIds: [11],
          resolutionMode: "additive",
          showResolutionMode: true,
          preview: {
            isoYear: 2099,
            isoWeek: 1,
            hasWeekPlan: true,
            currentEmployeeIds: [10],
            items: [
              {
                employeeId: 11,
                employeeName: "KW Mitarbeiter",
                status: "will_add",
                selectable: true,
                conflictReason: null,
                source: "week_plan",
              },
            ],
          },
        }}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onOpenChange={() => undefined}
      />,
    );

    expect(html).toContain("appointment-week-resolution-mode");
    expect(html).toContain("Additiv");
    expect(html).toContain("Ersetzen");
  });

  it("renders a fixed replacement notice without the mode selector", () => {
    const html = renderToStaticMarkup(
      <AppointmentSaveReviewDialog
        open
        currentEmployeeIds={[10]}
        resourceRequest={{
          resolutionKey: "tour:2|date:2099-01-01",
          selectedIds: [],
          resolutionMode: "replace",
          showResolutionMode: false,
          resolutionNotice: "Vorhandene Termin-Mitarbeiter werden entfernt.",
          preview: {
            isoYear: 2099,
            isoWeek: 1,
            hasWeekPlan: false,
            currentEmployeeIds: [10],
            items: [
              {
                employeeId: 10,
                employeeName: "Alter Mitarbeiter",
                status: "will_remove",
                selectable: false,
                conflictReason: "WILL_REMOVE",
                source: "current",
              },
            ],
          },
        }}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onOpenChange={() => undefined}
      />,
    );

    expect(html).toContain("Mitarbeiter werden ersetzt");
    expect(html).toContain("Wird vom Termin entfernt");
    expect(html).not.toContain("appointment-week-resolution-mode");
  });

  it("renders moved appointment notes as a blocking save-review step", () => {
    const html = renderToStaticMarkup(
      <AppointmentSaveReviewDialog
        open
        currentEmployeeIds={[10]}
        noteReview={{
          previousStartDate: "2099-01-02",
          previousEndDate: null,
          previousStartTime: "09:00:00",
          nextStartDate: "2099-01-03",
          nextEndDate: null,
          nextStartTime: "10:00:00",
          previousTourName: "Tour Alt",
          nextTourName: "Tour Neu",
          notes: [buildNote(44, "Terminnotiz mit altem Datum")],
        }}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onOpenChange={() => undefined}
      />,
    );

    expect(html).toContain("appointment-save-review-step-notes");
    expect(html).toContain("Terminnotizen prüfen");
    expect(html).toContain("Terminnotiz mit altem Datum");
    expect(html).toContain("Betroffene Terminnotizen");
    expect(html).toContain("data-readonly=\"true\"");
    expect(html).toContain("data-max-visible-notes=\"2\"");
    expect(html).toContain("Tour Alt");
    expect(html).toContain("Tour Neu");
    expect(html).toContain("02.01.99");
    expect(html).toContain("03.01.99");
    expect(html).not.toContain("checkbox-appointment-save-review-notes-reviewed");
    expect(actions.get("button-appointment-save-review-confirm")?.disabled).toBe(false);
  });
});
