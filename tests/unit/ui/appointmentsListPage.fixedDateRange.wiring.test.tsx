/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - AppointmentsListPage uebernimmt feste KW-Grenzen in die Basisfilter.
 * - Der Zeitraum-Picker bleibt bei festen Wochenfiltern ausgeblendet.
 * - Die Terminlisten-Abfrage verwendet die feste Woche im Query-Key.
 *
 * Fehlerfaelle:
 * - Das Wochenformular kann den Zeitraum in der eingebetteten Terminliste verlassen.
 * - Die Filterleiste zeigt trotz festem KW-Fenster den Zeitraum-Picker weiter an.
 *
 * Ziel:
 * Die feste KW-Verdrahtung der eingebetteten Terminliste fuer das tour_week-Formular absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const filterPanelCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
  };
});

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({
    filterSlot,
    contentSlot,
    footerSlot,
  }: {
    filterSlot?: React.ReactNode;
    contentSlot?: React.ReactNode;
    footerSlot?: React.ReactNode;
  }) => <div>{filterSlot}{contentSlot}{footerSlot}</div>,
}));

vi.mock("@/components/ui/table-view", () => ({
  TableView: () => <div data-testid="appointments-list-table">table</div>,
}));

vi.mock("@/components/ui/filter-panels/appointments-filter-panel", () => ({
  AppointmentsFilterPanel: (props: Record<string, unknown>) => {
    filterPanelCalls.push(props);
    return <div data-testid="appointments-filter-panel">filters</div>;
  },
}));

vi.mock("@/components/ui/list-empty-state", () => ({
  ListEmptyState: ({ fallbackTitle }: { fallbackTitle: string }) => <div>{fallbackTitle}</div>,
}));

vi.mock("@/components/ui/list-paging-footer", () => ({
  ListPagingFooter: () => <div>paging</div>,
}));

vi.mock("@/components/ui/badge-previews/appointment-weekly-panel-preview", () => ({
  createAppointmentWeeklyPanelPreview: () => <div>preview</div>,
}));

vi.mock("@/lib/domain-icons", () => ({
  domainIcons: {
    appointmentsList: () => <span>icon</span>,
  },
}));

vi.mock("@/lib/tags", () => ({
  getTagCatalogQueryKey: () => ["/api/tags", "appointment"],
  fetchTagCatalog: vi.fn(async () => []),
}));

import { AppointmentsListPage } from "../../../client/src/components/AppointmentsListPage";

describe("appointmentsListPage fixedDateRange wiring", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: { getItem: () => "DISPATCHER" } },
      configurable: true,
    });
    filterPanelCalls.length = 0;
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown }) => {
      if (Array.isArray(queryKey) && queryKey[0] === "/api/tours") {
        return { data: [], isLoading: false };
      }
      if (Array.isArray(queryKey) && queryKey[0] === "/api/tags") {
        return { data: [], isLoading: false };
      }
      if (Array.isArray(queryKey) && queryKey[0] === "appointments-list") {
        return {
          data: {
            page: 1,
            pageSize: 25,
            total: 0,
            totalPages: 0,
            availableRange: { dateFrom: "2026-04-27", dateTo: "2026-05-03" },
            items: [],
          },
          isLoading: false,
        };
      }
      return { data: [], isLoading: false };
    });
  });

  it("passes fixed week dates to filters and hides the period picker", () => {
    const markup = renderToStaticMarkup(
      <AppointmentsListPage
        context={{ type: "tour", tourId: 7 }}
        fixedDateRange={{ dateFrom: "2026-04-27", dateTo: "2026-05-03" }}
      />,
    );

    const filterPanelProps = filterPanelCalls[0];
    expect(filterPanelProps?.hidePeriodPicker).toBe(true);
    expect(filterPanelProps?.filters).toMatchObject({
      tourId: 7,
      dateFrom: "2026-04-27",
      dateTo: "2026-05-03",
    });
    expect(markup).toContain("appointments-list-table");

    const appointmentsQueryCall = useQueryMock.mock.calls.find(
      ([options]) => Array.isArray((options as { queryKey?: unknown[] }).queryKey) && (options as { queryKey: unknown[] }).queryKey[0] === "appointments-list",
    )?.[0] as { queryKey: unknown[] } | undefined;

    expect(appointmentsQueryCall?.queryKey[2]).toMatchObject({
      tourId: 7,
      dateFrom: "2026-04-27",
      dateTo: "2026-05-03",
    });
  });
});
