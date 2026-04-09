/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Kaskadendialog zeigt fuer Hinzufuegen und Abziehen unterschiedliche sichtbare Texte.
 * - Der Header zeigt Terminanzahl und Zeitraum aller Vorschautermine.
 * - Vorschauzeilen zeigen Kurzdatum, Projektkontext, optionalen Kundenkontext und Konflikthinweise.
 * - Die Sammelaktionen "Alle waehlen" und "Alle abwaehlen" sind sichtbar verdrahtet.
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

  it("renders add mode with sharpened copy, range summary and contextual preview rows", () => {
    const html = renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        mode="add"
        employeeName="Mia Muster"
        previewItems={basePreviewItems}
        selectedAppointmentIds={[41]}
        isSubmitting={false}
        onSelectedAppointmentIdsChange={() => undefined}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("Mitarbeiter zu Tour-Terminen hinzuf");
    expect(html).toContain("W");
    expect(html).toContain("Mia Muster");
    expect(html).toContain("Termine (2) - Termine im Zeitraum von 03.02.99 bis 10.02.99");
    expect(html).toContain("03.02.99");
    expect(html).toContain("bis 05.02.99");
    expect(html).toContain("A-100 - Projekt Nord");
    expect(html).toContain("K: C-100 - Kunde Nord");
    expect(html).toContain("Projekt Sued");
    expect(html).toContain("Ueberschneidung mit bestehendem Termin");
    expect(html).toContain("button-tour-employee-cascade-confirm");
    expect(html).toContain("button-tour-cascade-select-all");
    expect(html).toContain("button-tour-cascade-deselect-all");
    expect(html).not.toContain("input-tour-cascade-date-from");
    expect(html).not.toContain("input-tour-cascade-date-to");
  });

  it("renders remove mode with the dedicated removal copy", () => {
    const html = renderToStaticMarkup(
      <TourEmployeeCascadeDialog
        open
        mode="remove"
        employeeName="Mia Muster"
        previewItems={[basePreviewItems[0]]}
        selectedAppointmentIds={[41]}
        isSubmitting={false}
        onSelectedAppointmentIdsChange={() => undefined}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("Mitarbeiter von Tour-Terminen abziehen");
    expect(html).toContain("von denen Mia Muster abgezogen werden soll");
    expect(html).toContain("Termine (1) - Termine im Zeitraum von 03.02.99 bis 05.02.99");
    expect(html).toContain("button-tour-cascade-select-all");
    expect(html).toContain("button-tour-cascade-deselect-all");
  });
});
