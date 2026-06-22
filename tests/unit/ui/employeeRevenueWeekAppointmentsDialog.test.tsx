/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit (UI, Server-Rendering)
 *
 * Realitätsgrad:
 * - Echte Dialog-Komponente; die portalnde DialogBaseShell wird durch eine schlanke Hülle ersetzt,
 *   damit der gerenderte Inhalt im statischen Markup beobachtbar ist.
 *
 * Mock-Entscheidung:
 * - Unit-Mock nur für die Dialog-Hülle (Portal/Radix). Die zu prüfende Render-Logik bleibt echt.
 *
 * Isolation:
 * - Keine DB/FS. Reines Komponenten-Rendering.
 *
 * Abgedeckte Regeln:
 * - Der Dialog listet genau die übergebenen Wochen-Termine mit Datum (dd.MM.yy), Projekt, Auftragsnummer und Betrag.
 * - Eine Woche ohne Termine zeigt den Leerzustand.
 * - Ohne Woche wird keine Terminzeile gerendert.
 *
 * Fehlerfälle:
 * - Termine fehlen oder werden mit falschem Datumsformat dargestellt.
 * - Leerzustand fehlt bei terminloser Woche.
 *
 * Ziel:
 * Den wiederverwendeten Termin-Dialog der Umsatzübersicht in Isolation absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/dialog-base", () => ({
  DialogBaseShell: (props: {
    open: boolean;
    title?: React.ReactNode;
    headerMeta?: React.ReactNode;
    children?: React.ReactNode;
    footer?: React.ReactNode;
  }) =>
    props.open ? (
      <section data-testid="dialog-shell-mock">
        <header>
          {props.title}
          {props.headerMeta}
        </header>
        <div data-testid="dialog-body">{props.children}</div>
        <footer>{props.footer}</footer>
      </section>
    ) : null,
  DialogBaseFooter: (props: { primaryAction?: { label: string } }) => (
    <button type="button">{props.primaryAction?.label}</button>
  ),
}));

import { EmployeeRevenueWeekAppointmentsDialog } from "../../../client/src/components/EmployeeRevenueWeekAppointmentsDialog";

const week = {
  isoYear: 2026,
  isoWeek: 18,
  weekStartDate: "2026-04-27",
  weekEndDate: "2026-05-03",
  weekLabel: "KW 18 / 2026",
  orderCount: 2,
  revenueAmount: "3500.50",
  appointments: [
    { appointmentId: 91, startDate: "2026-04-27", projectName: "Nord Projekt", orderNumber: "REV-91", amount: "1500.00" },
    { appointmentId: 92, startDate: "2026-04-29", projectName: "Süd Projekt", orderNumber: "REV-92", amount: "2000.50" },
  ],
};

describe("employee revenue week appointments dialog", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders all appointments of the week with date, project, order number and amount", () => {
    const html = renderToStaticMarkup(
      <EmployeeRevenueWeekAppointmentsDialog
        open
        onOpenChange={() => {}}
        employeeFullName="Mitarbeiter, Mia"
        week={week}
      />,
    );

    expect(html).toContain("Mitarbeiter, Mia");
    expect(html).toContain("KW 18 / 2026");
    expect(html).toContain("Nord Projekt");
    expect(html).toContain("Süd Projekt");
    expect(html).toContain("27.04.26");
    expect(html).toContain("29.04.26");
    expect(html).toContain("REV-91");
    expect(html).toContain("REV-92");
    expect(html).toContain("1.500,00");
    expect(html).toContain("2.000,50");
    expect(html).toContain("revenue-week-appointments-item-91");
    expect(html).toContain("revenue-week-appointments-item-92");
  });

  it("shows the empty state when the week has no appointments", () => {
    const html = renderToStaticMarkup(
      <EmployeeRevenueWeekAppointmentsDialog
        open
        onOpenChange={() => {}}
        employeeFullName="Leer, Lars"
        week={{ ...week, appointments: [], orderCount: 0, revenueAmount: "0.00" }}
      />,
    );

    expect(html).toContain("Keine Aufträge in dieser Woche.");
    expect(html).toContain("revenue-week-appointments-empty");
    expect(html).not.toContain("revenue-week-appointments-item-");
  });

  it("renders no appointment rows when week is null", () => {
    const html = renderToStaticMarkup(
      <EmployeeRevenueWeekAppointmentsDialog
        open
        onOpenChange={() => {}}
        employeeFullName="Ohne, Woche"
        week={null}
      />,
    );

    expect(html).not.toContain("revenue-week-appointments-item-");
    expect(html).not.toContain("revenue-week-appointments-empty");
  });
});
