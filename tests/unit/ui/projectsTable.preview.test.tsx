/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekte-Tabelle verwendet die standardisierte Weekly-Preview im Sidebar-/Tabellenprofil.
 * - Der Fallback fuer fehlende Termine bleibt in der Tabellenvorschau sichtbar.
 *
 * Fehlerfaelle:
 * - Tabellenpreview ruft den gemeinsamen Preview-Builder nicht mehr auf.
 * - Fehlende Termine rendern keinen stabilen Fallback mehr.
 *
 * Ziel:
 * Die Projekt-Tabellenpreview ueber den tatsaechlichen rowPreviewRenderer statt ueber Quelltext-Strings absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useSettingsMock = vi.fn();
const useListFiltersMock = vi.fn();
const tableViewCalls: Array<Record<string, unknown>> = [];

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
  ListLayout: ({ contentSlot }: { contentSlot?: React.ReactNode }) => <section>{contentSlot}</section>,
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
  EntityCard: ({ children, footer }: { children?: React.ReactNode; footer?: React.ReactNode }) => (
    <article>
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

vi.mock("@/components/ui/filter-panels/project-filter-panel", () => ({
  ProjectFilterPanel: () => <div>project-filter-panel</div>,
}));

vi.mock("@/components/ui/table-view", () => ({
  TableView: (props: Record<string, unknown>) => {
    tableViewCalls.push(props);
    return <div>table-view</div>;
  },
}));

import { ProjectsPage } from "../../../client/src/components/ProjectsPage";

describe("FT03 projects table preview wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    tableViewCalls.length = 0;

    useSettingsMock.mockReturnValue({
      settingsByKey: new Map(),
      setSetting: vi.fn().mockResolvedValue(undefined),
    });
    useListFiltersMock.mockReturnValue({
      filters: { title: "", customerLastName: "", customerNumber: "", orderNumber: "", tagIds: [] },
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
            total: 2,
            totalPages: 1,
            items: [
              {
                id: 31,
                customerId: 4,
                name: "Projekt Mit Termin",
                orderNumber: "ORD-31",
                amount: null,
                descriptionMd: null,
                isActive: true,
                version: 9,
                projectArticleItems: [{ label: "Saunamodell", value: "Modell Table" }],
                notesCount: 5,
                plannedAppointmentsCount: 1,
                nextAppointmentStartDate: "2099-08-09",
                nextAppointmentStartTimeHour: 14,
                customer: {
                  id: 4,
                  customerNumber: "C-4",
                  fullName: "Kunde Vier",
                  lastName: "Vier",
                },
              },
              {
                id: 32,
                customerId: 5,
                name: "Projekt Ohne Termin",
                orderNumber: "ORD-32",
                amount: null,
                descriptionMd: null,
                isActive: true,
                version: 10,
                projectArticleItems: [],
                notesCount: 0,
                plannedAppointmentsCount: 0,
                nextAppointmentStartDate: null,
                nextAppointmentStartTimeHour: null,
                customer: {
                  id: 5,
                  customerNumber: "C-5",
                  fullName: "Kunde Fuenf",
                  lastName: "Fuenf",
                },
              },
            ],
          },
          isLoading: false,
        };
      }
      if (key === "/api/tags") {
        return { data: [], isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });
  });

  it("renders the shared project table hover preview with project and appointment data", () => {
    renderToStaticMarkup(<ProjectsPage tableOnly />);

    const rowPreviewRenderer = tableViewCalls[0].rowPreviewRenderer as (row: Record<string, unknown>) => React.ReactNode;
    const markup = renderToStaticMarkup(rowPreviewRenderer((tableViewCalls[0].rows as Array<Record<string, unknown>>)[0]));

    expect(markup).toContain("ORD-31");
    expect(markup).toContain("Projekt Mit Termin");
    expect(markup).toContain("Kunde Vier");
    expect(markup).toContain("14:00 - 09.08.99");
  });

  it("keeps the stable no-appointment preview state without a date label", () => {
    renderToStaticMarkup(<ProjectsPage tableOnly />);

    const rowPreviewRenderer = tableViewCalls[0].rowPreviewRenderer as (row: Record<string, unknown>) => React.ReactNode;
    const markup = renderToStaticMarkup(rowPreviewRenderer((tableViewCalls[0].rows as Array<Record<string, unknown>>)[1]));

    expect(markup).toContain("ORD-32");
    expect(markup).toContain("Projekt Ohne Termin");
    expect(markup).toContain("Kunde Fuenf");
    expect(markup).toContain(">0</span>");
  });
});
