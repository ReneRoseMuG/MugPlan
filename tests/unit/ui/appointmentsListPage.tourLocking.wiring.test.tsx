/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Terminliste reagiert im Tour-Kontext sichtbar mit verstecktem Tour-Filter und ohne Tour-Spalte.
 * - Im Standalone-Kontext bleibt die Tour-Spalte sichtbar.
 * - Stornierte Termine werden in der Liste markiert und blockieren die Mitarbeiter-Entfernen-Aktion.
 *
 * Fehlerfaelle:
 * - Die Tour-Spalte bleibt in eingebetteten Tour-Kontexten sichtbar.
 * - Stornierte Zeilen verlieren ihre Kennzeichnung oder bleiben fuer Entfernen-Aktionen aktiv.
 *
 * Ziel:
 * Laufzeitverhalten der wiederverwendeten Terminliste statt Quelltext-Verdrahtung absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let appointmentItems: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === "/api/tours") return { data: [{ id: 9, name: "Nordtour", color: "#123456" }], isLoading: false };
    if (queryKey[0] === "/api/tags") return { data: [], isLoading: false };
    if (queryKey[0] === "appointments-list") {
      return {
        data: {
          page: 1,
          pageSize: 25,
          total: appointmentItems.length,
          totalPages: 1,
          items: appointmentItems,
        },
        isLoading: false,
      };
    }
    return { data: [], isLoading: false };
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    ...props
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({
    helpKey,
    showCloseButton,
    filterSlot,
    contentSlot,
    footerSlot,
  }: {
    helpKey?: string;
    showCloseButton?: boolean;
    filterSlot?: React.ReactNode;
    contentSlot?: React.ReactNode;
    footerSlot?: React.ReactNode;
  }) => (
    <div data-testid="appointments-list-layout">
      <div>{helpKey}</div>
      <div>{showCloseButton ? "close-visible" : "close-hidden"}</div>
      <div>{filterSlot}</div>
      <div>{contentSlot}</div>
      <div>{footerSlot}</div>
    </div>
  ),
}));

vi.mock("@/components/ui/list-empty-state", () => ({
  ListEmptyState: ({ fallbackTitle }: { fallbackTitle: string }) => <div>{fallbackTitle}</div>,
}));

vi.mock("@/components/ui/list-paging-footer", () => ({
  ListPagingFooter: ({ summaryText }: { summaryText: string }) => <div>{summaryText}</div>,
}));

vi.mock("@/components/ui/filter-panels/appointments-filter-panel", () => ({
  AppointmentsFilterPanel: ({
    hideTourFilter,
    appointmentScope,
  }: {
    hideTourFilter: boolean;
    appointmentScope: string;
  }) => (
    <div data-testid="appointments-filter-panel">
      <span>{hideTourFilter ? "tour-filter-hidden" : "tour-filter-visible"}</span>
      <span>{`scope-${appointmentScope}`}</span>
    </div>
  ),
}));

vi.mock("@/components/ui/table-view", () => ({
  TableView: ({
    columns,
    rows,
    rowClassName,
  }: {
    columns: Array<{ id: string; cell?: ({ row }: { row: Record<string, unknown> }) => React.ReactNode; accessor: (row: Record<string, unknown>) => unknown }>;
    rows: Array<Record<string, unknown>>;
    rowClassName?: (row: Record<string, unknown>) => string | undefined;
  }) => (
    <div data-testid="appointments-table">
      <div>{columns.map((column) => <span key={column.id}>{column.id}</span>)}</div>
      {rows.map((row) => (
        <article key={String(row.id)} data-row-class={rowClassName?.(row)}>
          {columns.map((column) => (
            <div key={column.id} data-column={column.id}>
              {column.cell
                ? renderToStaticMarkup(<>{column.cell({ row })}</>)
                : String(column.accessor(row) ?? "")}
            </div>
          ))}
        </article>
      ))}
    </div>
  ),
}));

vi.mock("@/components/ui/badge-previews/appointment-weekly-panel-preview", () => ({
  createAppointmentWeeklyPanelPreview: () => <div>preview</div>,
}));

vi.mock("@/lib/project-appointments", () => ({
  getBerlinTodayDateString: () => "2099-01-01",
}));

vi.mock("@/lib/domain-icons", () => ({
  domainIcons: {
    appointmentsList: () => <span>icon</span>,
  },
}));

vi.mock("@/lib/list-display-format", () => ({
  formatListDate: (value: string) => value,
  formatListTime: (value: string | null) => value ?? "",
}));

import { AppointmentsListPage } from "../../../client/src/components/AppointmentsListPage";

describe("FT04 appointments list page tour locking wiring", () => {
  beforeEach(() => {
    appointmentItems = [
      {
        id: 71,
        version: 1,
        startDate: "2099-02-01",
        startTime: "08:30",
        projectName: "Projekt Nord",
        projectOrderNumber: "ORD-71",
        customer: { customerNumber: "C-71", fullName: "Kunde Nord" },
        tourName: "Nordtour",
        isCancelled: false,
      },
      {
        id: 72,
        version: 1,
        startDate: "2099-02-02",
        startTime: "09:00",
        projectName: "Projekt Storno",
        projectOrderNumber: "ORD-72",
        customer: { customerNumber: "C-72", fullName: "Kunde Storno" },
        tourName: "Nordtour",
        isCancelled: true,
      },
    ];
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "DISPATCHER",
      },
    });
  });

  it("hides tour filter and tour column in tour context", () => {
    const markup = renderToStaticMarkup(
      <AppointmentsListPage context={{ type: "tour", tourId: 9 }} />,
    );

    expect(markup).toContain("appointments-list-layout");
    expect(markup).toContain("tour-filter-hidden");
    expect(markup).toContain("close-hidden");
    expect(markup).toContain("orderNumber");
    expect(markup).toContain("project");
    expect(markup).not.toContain(">tour<");
  });

  it("keeps the tour column in standalone mode and marks cancelled rows as non-removable", () => {
    const markup = renderToStaticMarkup(
      <AppointmentsListPage
        context={{ type: "standalone" }}
        onRemoveEmployee={() => undefined}
      />,
    );

    expect(markup).toContain("tour-filter-visible");
    expect(markup).toContain("close-visible");
    expect(markup).toContain(">tour<");
    expect(markup).toContain("Storniert");
    expect(markup).toContain("data-row-class=\"bg-amber-50/70 text-muted-foreground\"");
    expect(markup).toContain("button-remove-employee-from-appointment-72");
    expect(markup).toContain("disabled=&quot;&quot;");
  });
});
