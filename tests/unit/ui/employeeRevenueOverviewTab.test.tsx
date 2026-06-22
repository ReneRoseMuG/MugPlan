/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Umsatz-Tab verdrahtet `TableView` mit Sticky-Header, Footer-Filter und Hover-Preview.
 * - Umsatzwerte werden im deutschen EUR-Format sichtbar weitergegeben.
 * - Der KW-Freitextfilter erkennt die vorgesehenen sichtbaren Token.
 * - Je Wochenzeile gibt es eine Aktionsspalte mit „Aufträge zeigen"-Button (MS-52 TASK-226).
 *
 * Fehlerfälle:
 * - Das neue Tab verliert Sticky-Header oder Footer-Verdrahtung.
 * - Hover-Preview enthält die erwarteten Identitätsdaten nicht.
 * - KW-Filter matcht sichtbare Wochenlabels nicht mehr.
 *
 * Ziel:
 * Die zentrale UI-Verdrahtung des neuen Umsatz-Tabs regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tableViewCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/ui/table-view", () => ({
  TableView: (props: Record<string, unknown> & { footerSlot?: React.ReactNode; emptyState?: React.ReactNode }) => {
    tableViewCalls.push(props);
    return (
      <section data-testid="employee-revenue-table-mock">
        <div data-testid="employee-revenue-footer">{props.footerSlot}</div>
        <div data-testid="employee-revenue-empty">{props.emptyState}</div>
      </section>
    );
  },
}));

vi.mock("@/components/EmployeeRevenueWeekAppointmentsDialog", () => ({
  EmployeeRevenueWeekAppointmentsDialog: () => null,
}));

import {
  EmployeeRevenueOverviewTab,
  matchesEmployeeRevenueOverviewWeekFilter,
} from "../../../client/src/components/EmployeeRevenueOverviewTab";

const overview = {
  employeeId: 17,
  employeeFullName: "Mitarbeiter, Mia",
  weeks: [
    {
      isoYear: 2026,
      isoWeek: 18,
      weekStartDate: "2026-04-27",
      weekEndDate: "2026-05-03",
      weekLabel: "KW 18 / 2026",
      orderCount: 2,
      revenueAmount: "3500.50",
      appointments: [
        {
          appointmentId: 91,
          startDate: "2026-04-27",
          projectName: "Nord Projekt",
          orderNumber: "REV-91",
          amount: "1500.00",
        },
        {
          appointmentId: 92,
          startDate: "2026-04-29",
          projectName: "Süd Projekt",
          orderNumber: "REV-92",
          amount: "2000.50",
        },
      ],
    },
  ],
} as const;

describe("employee revenue overview tab", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    tableViewCalls.length = 0;
  });

  it("wires the table with sticky header, footer filter and preview renderer", () => {
    const markup = renderToStaticMarkup(<EmployeeRevenueOverviewTab overview={overview} />);

    expect(markup).toContain("employee-revenue-footer");
    expect(markup).toContain("Kalenderwoche");
    expect(tableViewCalls).toHaveLength(1);
    expect(tableViewCalls[0]).toMatchObject({
      stickyHeader: true,
      testId: "employee-revenue-overview-table",
      rows: overview.weeks,
    });

    const columns = tableViewCalls[0]?.columns as Array<{ header: React.ReactNode; cell?: (context: { row: typeof overview.weeks[number] }) => React.ReactNode }>;
    expect(columns.map((column) => renderToStaticMarkup(<>{column.header}</>))).toEqual([
      "KW/Jahr",
      "Anzahl Aufträge",
      "Umsatz",
      "",
    ]);
    expect(renderToStaticMarkup(<>{columns[2]?.cell?.({ row: overview.weeks[0] })}</>)).toContain("3.500,50");
    const actionsMarkup = renderToStaticMarkup(<>{columns[3]?.cell?.({ row: overview.weeks[0] })}</>);
    expect(actionsMarkup).toContain("Aufträge zeigen");
    expect(actionsMarkup).toContain("employee-revenue-overview-show-orders-2026-18");

    const rowPreviewRenderer = tableViewCalls[0]?.rowPreviewRenderer as ((row: typeof overview.weeks[number]) => {
      content: React.ReactNode;
    });
    const previewMarkup = renderToStaticMarkup(<>{rowPreviewRenderer(overview.weeks[0]).content}</>);
    expect(previewMarkup).toContain("Mitarbeiter, Mia");
    expect(previewMarkup).toContain("KW 18 / 2026");
    expect(previewMarkup).toContain("Nord Projekt");
  });

  it("shows the empty-state copy when no weeks are present", () => {
    const markup = renderToStaticMarkup(
      <EmployeeRevenueOverviewTab
        overview={{ employeeId: 18, employeeFullName: "Leer, Lara", weeks: [] }}
      />,
    );

    expect(markup).toContain("Keine Umsatzwochen vorhanden.");
  });

  it("matches the supported week filter tokens against visible labels", () => {
    const week = overview.weeks[0];

    expect(matchesEmployeeRevenueOverviewWeekFilter(week, "KW 18")).toBe(true);
    expect(matchesEmployeeRevenueOverviewWeekFilter(week, "18/2026")).toBe(true);
    expect(matchesEmployeeRevenueOverviewWeekFilter(week, "2026")).toBe(true);
    expect(matchesEmployeeRevenueOverviewWeekFilter(week, "19/2026")).toBe(false);
  });
});
