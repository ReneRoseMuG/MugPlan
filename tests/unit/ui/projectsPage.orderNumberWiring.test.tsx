/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ProjectsPage verdrahtet den Auftragsnummer-Filter in das Projektfilterpanel.
 * - Auftragsnummer und Betrag bleiben in der Tabellenansicht verfuegbar.
 * - Board-Karten zeigen Auftragsnummer, Statusbadges und HTML-Beschreibung.
 * - PLZ/Ort aus ueberschuessigen Kundendaten erscheinen nicht in der Projektkarte.
 *
 * Fehlerfaelle:
 * - Filterhandler oder Spalten gehen bei Refactorings verloren.
 * - Projektstatus-Badges oder HTML-Beschreibung verschwinden aus der Board-Karte.
 * - Unerwuenschte Adressdaten tauchen in Projektkarten wieder auf.
 *
 * Ziel:
 * Den FT02-Auftragsnummer-Use-Case ueber gerenderte Props und Markup statt ueber Quelltext-Strings absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useSettingsMock = vi.fn();
const useListFiltersMock = vi.fn();
const projectFilterPanelCalls: Array<Record<string, unknown>> = [];
const tableViewCalls: Array<Record<string, unknown>> = [];
const projectStatusBadgeCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => useSettingsMock(),
}));

vi.mock("@/hooks/useListFilters", () => ({
  useListFilters: (options: unknown) => useListFiltersMock(options),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ filterSlot, contentSlot }: { filterSlot?: React.ReactNode; contentSlot?: React.ReactNode }) => (
    <section>
      {filterSlot}
      {contentSlot}
    </section>
  ),
}));

vi.mock("@/components/ui/board-view", () => ({
  BoardView: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/list-empty-state", () => ({
  ListEmptyState: ({ fallbackTitle }: { fallbackTitle: string }) => <div>{fallbackTitle}</div>,
}));

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/entity-card", () => ({
  EntityCard: ({ children, footer, testId }: { children?: React.ReactNode; footer?: React.ReactNode; testId?: string }) => (
    <article data-testid={testId}>
      {children}
      {footer}
    </article>
  ),
}));

vi.mock("@/components/ui/appointment-count-badge", () => ({
  AppointmentCountBadge: ({ count }: { count: number }) => <div>{count}</div>,
}));

vi.mock("@/components/notes/EntityNotesHoverPreview", () => ({
  EntityNotesHoverPreview: () => <div>notes-preview</div>,
}));

vi.mock("@/components/ui/project-status-info-badge", () => ({
  ProjectStatusInfoBadge: (props: Record<string, unknown> & { status: { title: string } }) => {
    projectStatusBadgeCalls.push(props);
    return <span>{props.status.title}</span>;
  },
}));

vi.mock("@/components/ui/filter-panels/project-filter-panel", () => ({
  ProjectFilterPanel: (props: Record<string, unknown>) => {
    projectFilterPanelCalls.push(props);
    return <div>project-filter-panel</div>;
  },
}));

vi.mock("@/components/ui/table-view", () => ({
  TableView: (props: Record<string, unknown>) => {
    tableViewCalls.push(props);
    return <div>table-view</div>;
  },
}));

vi.mock("@/components/ui/badge-previews/appointment-weekly-panel-preview", () => ({
  createAppointmentWeeklyPanelPreview: vi.fn(() => <div>preview</div>),
}));

import { ProjectsPage } from "../../../client/src/components/ProjectsPage";

describe("FT02 projects page order number wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    projectFilterPanelCalls.length = 0;
    tableViewCalls.length = 0;
    projectStatusBadgeCalls.length = 0;

    useSettingsMock.mockReturnValue({
      settingsByKey: new Map(),
      setSetting: vi.fn().mockResolvedValue(undefined),
    });
    useListFiltersMock.mockReturnValue({
      filters: { title: "", customerLastName: "", customerNumber: "", orderNumber: "ORD-1", statusIds: [] },
      setFilter: vi.fn(),
      page: 1,
      setPage: vi.fn(),
    });
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const key = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (key === "/api/projects/list") {
        return {
          data: {
            page: 1,
            pageSize: 50,
            total: 1,
            totalPages: 1,
            items: [
              {
                id: 11,
                customerId: 22,
                name: "Projekt Nord",
                orderNumber: "ORD-1",
                amount: 1234.5,
                descriptionMd: "<strong>Wichtig</strong>",
                isActive: true,
                version: 4,
                notesCount: 1,
                plannedAppointmentsCount: 2,
                nextAppointmentStartDate: "2099-07-10",
                nextAppointmentStartTimeHour: 8,
                customer: {
                  id: 22,
                  customerNumber: "C-22",
                  fullName: "Kunde Nord",
                  lastName: "Nord",
                  postalCode: "99999",
                  city: "Hamburg",
                },
                statuses: [
                  { id: 1, title: "Offen", color: "#ff0000" },
                  { id: 2, title: "Geplant", color: "#00ff00" },
                ],
              },
            ],
          },
          isLoading: false,
        };
      }
      if (key === "/api/project-status") {
        return { data: [], isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });
  });

  it("wires order number filter handlers into the filter panel", () => {
    renderToStaticMarkup(<ProjectsPage />);

    expect(projectFilterPanelCalls).toHaveLength(1);
    expect(projectFilterPanelCalls[0]).toMatchObject({
      orderNumber: "ORD-1",
      projectScope: "upcoming",
    });
    expect(projectFilterPanelCalls[0].onOrderNumberChange).toEqual(expect.any(Function));
    expect(projectFilterPanelCalls[0].onOrderNumberClear).toEqual(expect.any(Function));
  });

  it("keeps order number and amount available in the table view", () => {
    renderToStaticMarkup(<ProjectsPage tableOnly />);

    expect(tableViewCalls).toHaveLength(1);
    const columns = tableViewCalls[0].columns as Array<Record<string, unknown>>;
    const orderNumberColumn = columns.find((column) => column.id === "orderNumber");
    const amountColumn = columns.find((column) => column.id === "amount");
    const row = {
      project: {
        id: 11,
        name: "Projekt Nord",
        orderNumber: "ORD-1",
        amount: 1234.5,
      },
      customer: {
        id: 22,
        customerNumber: "C-22",
        fullName: "Kunde Nord",
      },
      relevantAppointment: null,
    };

    expect(orderNumberColumn?.header).toBe("Auftragsnummer");
    expect(renderToStaticMarkup((orderNumberColumn?.cell as ({ row }: { row: typeof row }) => React.ReactNode)({ row }))).toContain("ORD-1");
    expect(amountColumn?.header).toBe("Betrag");
    expect(renderToStaticMarkup((amountColumn?.cell as ({ row }: { row: typeof row }) => React.ReactNode)({ row }))).toContain("1.234,50");
  });

  it("renders status badges and html description in board cards without leaking customer address data", () => {
    const markup = renderToStaticMarkup(<ProjectsPage />);

    expect(markup).toContain("Auftrag:");
    expect(markup).toContain("ORD-1");
    expect(markup).toContain("<strong>Wichtig</strong>");
    expect(markup).not.toContain("99999");
    expect(markup).not.toContain("Hamburg");
    expect(projectStatusBadgeCalls).toHaveLength(2);
    expect(projectStatusBadgeCalls[0]).toMatchObject({ size: "sm", fullWidth: true });
    expect(projectStatusBadgeCalls[1]).toMatchObject({ size: "sm", fullWidth: true });
  });
});
