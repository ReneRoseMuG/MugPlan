/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Kaskadendialog zeigt fuer Hinzufuegen und Abziehen die neue KW-Titelcopy.
 * - Der Header zeigt das aktuelle Mitarbeiter-Badge und bei mehreren Mitarbeitern die Position.
 * - Vorschauzeilen zeigen Kurzdatum, Projektkontext, optionalen Kundenkontext und Konflikthinweise.
 * - Die Sammelaktionen "Alle waehlen" und "Alle abwaehlen" sind im Wochenplanungsdialog nicht sichtbar.
 *
 * Fehlerfaelle:
 * - Der Dialog faellt auf generische Copy zurueck.
 * - Datums- und Kontextinformationen verschwinden aus der sichtbaren Vorschau.
 * - Konflikte bleiben ohne sichtbaren Hinweis.
 *
 * Ziel:
 * Das sichtbare Verhalten des TourEmployeeCascadeDialog direkt ueber gerendertes Markup absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
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

import { TourEmployeeCascadeDialog } from "../../../client/src/components/TourEmployeeCascadeDialog";

const basePreviewItems = [
  {
    appointmentId: 41,
    startDate: "2099-02-03",
    endDate: "2099-02-05",
    tourName: "Nordtour",
    customerNumber: "C-100",
    customerName: "Kunde Nord",
    projectName: "Projekt Nord",
    orderNumber: "A-100",
    currentEmployees: [],
    eligible: true,
    conflictReason: null,
  },
  {
    appointmentId: 42,
    startDate: "2099-02-10",
    endDate: null,
    tourName: "Nordtour",
    customerNumber: null,
    customerName: null,
    projectName: "Projekt Sued",
    orderNumber: null,
    currentEmployees: [],
    eligible: false,
    conflictReason: "EMPLOYEE_OVERLAP" as const,
  },
];

describe("FT04 TourEmployeeCascadeDialog visible behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders add mode with the KW title, header badge and contextual preview rows", () => {
    const html = renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        mode="add"
        employeeId={7}
        employeeName="Mia Muster"
        weekLabel="KW 06 / 2099"
        previewItems={basePreviewItems}
        selectedAppointmentIds={[41]}
        isSubmitting={false}
        onSelectedAppointmentIdsChange={() => undefined}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("Mitarbeiter in Wochenplanung aufnehmen");
    expect(html).toContain('data-testid="badge-tour-employee-cascade-employee"');
    expect(html).toContain("Mia Muster");
    expect(html).not.toContain("Termine auswählen");
    expect(html).not.toContain("2 Termine, 03.02.99 bis 10.02.99");
    expect(html).not.toContain("Entscheidungsschritt");
    expect(html).not.toContain("text-tour-employee-cascade-range");
    expect(html).toContain("03.02.99");
    expect(html).toContain("bis 05.02.99");
    expect(html).toContain("A-100 - Projekt Nord");
    expect(html).toContain("K: C-100 - Kunde Nord");
    expect(html).toContain("Projekt Sued");
    expect(html).toContain("Überschneidung mit bestehendem Termin");
    expect(html).toContain("button-tour-employee-cascade-confirm");
    expect(html).toContain("Entscheidung bestätigen");
    expect(html).not.toContain("button-tour-cascade-select-all");
    expect(html).not.toContain("button-tour-cascade-deselect-all");
    expect(html).not.toContain("input-tour-cascade-date-from");
    expect(html).not.toContain("input-tour-cascade-date-to");
  });

  it("renders remove mode with the dedicated removal copy", () => {
    const html = renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        mode="remove"
        employeeId={7}
        employeeName="Mia Muster"
        weekLabel="KW 06 / 2099"
        previewItems={[basePreviewItems[0]]}
        selectedAppointmentIds={[41]}
        isSubmitting={false}
        onSelectedAppointmentIdsChange={() => undefined}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("Mitarbeiter aus Wochenplanung entfernen");
    expect(html).toContain('data-testid="badge-tour-employee-cascade-employee"');
    expect(html).toContain("Mia Muster");
    expect(html).not.toContain("Mia Muster: Termine zum Abziehen auswählen");
    expect(html).not.toContain("1 Termin, 03.02.99 bis 05.02.99");
    expect(html).toContain("Entscheidung bestätigen");
    expect(html).not.toContain("button-tour-cascade-select-all");
    expect(html).not.toContain("button-tour-cascade-deselect-all");
  });

  it("uses the existing tour name without adding another tour prefix", () => {
    const addHtml = renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        mode="add"
        employeeId={7}
        employeeName="Mia Muster"
        tourName="Tour 1"
        weekLabel="KW 06 / 2099"
        previewItems={[basePreviewItems[0]]}
        selectedAppointmentIds={[41]}
        isSubmitting={false}
        onSelectedAppointmentIdsChange={() => undefined}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );
    const removeHtml = renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        mode="remove"
        employeeId={7}
        employeeName="Mia Muster"
        tourName="Tour 1"
        weekLabel="KW 06 / 2099"
        previewItems={[basePreviewItems[0]]}
        selectedAppointmentIds={[41]}
        isSubmitting={false}
        onSelectedAppointmentIdsChange={() => undefined}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(addHtml).toContain("wird in die Wochenplanung von Tour 1 / KW 06 / 2099 übernommen");
    expect(removeHtml).toContain("wird aus der Wochenplanung von Tour 1 / KW 06 / 2099 entfernt");
    expect(addHtml).not.toContain("Tour Tour 1");
    expect(removeHtml).not.toContain("Tour Tour 1");
  });

  it("renders multi-employee progress and dedicated navigation labels", () => {
    const firstStepHtml = renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        mode="add"
        employeeId={7}
        employeeName="Mia Muster"
        weekLabel="KW 06 / 2099"
        previewItems={basePreviewItems}
        selectedAppointmentIds={[41]}
        steps={[
          { id: "employee-7", title: "Mia Muster", state: "active" },
          { id: "employee-8", title: "Max Muster", state: "pending" },
          { id: "employee-9", title: "Mona Muster", state: "pending" },
        ]}
        isSubmitting={false}
        onSelectedAppointmentIdsChange={() => undefined}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(firstStepHtml).toContain("Mehrere Mitarbeiter in Wochenplanung aufnehmen");
    expect(firstStepHtml).toContain("1/3");
    expect(firstStepHtml).toContain("Nächster Mitarbeiter");
    expect(firstStepHtml).not.toContain("Alle Entscheidungen bestätigen");

    const lastStepHtml = renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        mode="add"
        employeeId={9}
        employeeName="Mona Muster"
        weekLabel="KW 06 / 2099"
        previewItems={basePreviewItems}
        selectedAppointmentIds={[41]}
        steps={[
          { id: "employee-7", title: "Mia Muster", state: "complete" },
          { id: "employee-8", title: "Max Muster", state: "complete" },
          { id: "employee-9", title: "Mona Muster", state: "active" },
        ]}
        isSubmitting={false}
        onSelectedAppointmentIdsChange={() => undefined}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(lastStepHtml).toContain("3/3");
    expect(lastStepHtml).toContain("Alle Entscheidungen bestätigen");
    expect(lastStepHtml).not.toContain("Nächster Mitarbeiter");
  });

  it("groups appointment assignment candidates by week plan and conflict-free remainder", () => {
    const html = renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        variant="appointment"
        title="Mitarbeiter zuweisen"
        description="Mitarbeiter auswählen"
        previewItems={[
          {
            employeeId: 11,
            employeeName: "Mia Woche",
            status: "will_add",
            selectable: true,
            conflictReason: null,
            source: "week_plan",
          },
          {
            employeeId: 12,
            employeeName: "Mia Frei",
            status: "will_add",
            selectable: true,
            conflictReason: null,
            source: "available",
          },
        ]}
        selectedIds={[11]}
        isSubmitting={false}
        onSelectedIdsChange={() => undefined}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("Tour-KW-Mitarbeiter");
    expect(html).toContain("Weitere konfliktfreie Mitarbeiter");
    expect(html).toContain("appointment-week-selection-toolbar");
    expect(html).toContain("Mitarbeiterauswahl");
    expect(html).toContain("1 von 2 ausgewählt");
    expect(html).toContain("Auswahl übernehmen");
    expect(html).toContain("Mia Woche");
    expect(html).toContain("Mia Frei");
    expect(html).toContain("Konfliktfrei zuweisbar");
    expect(html).toContain("appointment-week-preview-group-week_plan");
    expect(html).toContain("appointment-week-preview-group-available");
    expect(html).toMatch(/<input(?=[^>]*data-testid="appointment-week-preview-checkbox-11")(?=[^>]*checked)/);
    expect(html).not.toMatch(/<input(?=[^>]*data-testid="appointment-week-preview-checkbox-12")(?=[^>]*checked)/);
    expect(html.indexOf('data-testid="list-tour-employee-cascade-preview"')).toBeLessThan(
      html.indexOf("button-appointment-week-select-all"),
    );
    expect(html.indexOf('data-testid="list-tour-employee-cascade-preview"')).toBeLessThan(
      html.indexOf("button-appointment-week-deselect-all"),
    );
    expect(html).not.toContain("Mitarbeiter auswählen");
  });

  it("renders a fixed replacement notice without additive/replace controls", () => {
    const html = renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        variant="appointment"
        title="Termin verschieben"
        description="Mitarbeiter prüfen"
        previewItems={[
          {
            employeeId: 11,
            employeeName: "Alter Mitarbeiter",
            status: "will_remove",
            selectable: false,
            conflictReason: "WILL_REMOVE",
            source: "current",
          },
        ]}
        selectedIds={[]}
        resolutionMode="replace"
        showResolutionMode={false}
        resolutionNotice="Vorhandene Termin-Mitarbeiter werden entfernt."
        isSubmitting={false}
        onSelectedIdsChange={() => undefined}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("Mitarbeiter werden ersetzt");
    expect(html).toContain("appointment-week-selection-toolbar");
    expect(html).toContain("Keine auswählbaren Mitarbeiter");
    expect(html).toContain("Auswahl übernehmen");
    expect(html).toContain("Wird vom Termin entfernt");
    expect(html).not.toContain("button-appointment-week-mode-additive");
    expect(html).not.toContain("button-appointment-week-mode-replace");
    expect(html.indexOf('data-testid="list-tour-employee-cascade-preview"')).toBeLessThan(
      html.indexOf("button-appointment-week-select-all"),
    );
    expect(html.indexOf('data-testid="list-tour-employee-cascade-preview"')).toBeLessThan(
      html.indexOf("button-appointment-week-deselect-all"),
    );
    expect(html).not.toContain("Mitarbeiter prüfen");
  });
});
