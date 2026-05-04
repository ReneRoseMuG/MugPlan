/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Projekte-Tabelle verwendet die gemeinsame Tabellen-Preview mit Footer-Badges.
 * - Die Preview zeigt Termine, Notizen, Anhänge und Tag-Zeile über denselben Renderer.
 *
 * Fehlerfälle:
 * - Der Tabellen-Preview-Footer fällt auf Legacy-Badges zurück.
 * - Die Preview verliert Footer-Badges oder Tag-Zeile.
 *
 * Ziel:
 * Die Projekt-Tabellenpreview über den tatsächlichen rowPreviewRenderer statt über Quelltext-Strings absichern.
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
  keepPreviousData: Symbol("keepPreviousData"),
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
  EntityCard: ({
    title,
    headerMeta,
    children,
    footer,
  }: {
    title?: React.ReactNode;
    headerMeta?: React.ReactNode;
    children?: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <article>
      <div>{title}</div>
      <div>{headerMeta}</div>
      {children}
      {footer}
    </article>
  ),
}));

vi.mock("@/components/ui/entity-appointments-hover-preview", () => ({
  EntityAppointmentsHoverPreview: ({ source, triggerTestId }: { source: { count: number }; triggerTestId?: string }) => (
    <div data-testid={triggerTestId}>Termine:{source.count}</div>
  ),
}));

vi.mock("@/components/notes/EntityNotesHoverPreview", () => ({
  EntityNotesHoverPreview: ({
    sources,
    triggerTestId,
  }: {
    sources:
      | { count: number }
      | {
          customer?: { count: number };
          project?: { count: number };
        };
    triggerTestId?: string;
  }) => {
    const count = "count" in sources
      ? sources.count
      : (sources.customer?.count ?? 0) + (sources.project?.count ?? 0);
    return <div data-testid={triggerTestId}>Notizen:{count}</div>;
  },
}));

vi.mock("@/components/ui/ProjectAttachmentsHover", () => ({
  ProjectAttachmentsHover: ({ totalAttachmentsCount }: { totalAttachmentsCount: number }) => <div>Anhänge:{totalAttachmentsCount}</div>,
}));

vi.mock("@/components/ui/filter-panels/project-filter-panel", () => ({
  ProjectFilterPanel: () => <div>project-filter-panel</div>,
}));

vi.mock("@/components/ui/entity-tag-footer-row", () => ({
  EntityTagFooterRow: ({ tags, testId }: { tags: Array<{ name: string }>; testId?: string }) => (
    <div data-testid={testId}>{tags.map((tag) => tag.name).join(",")}</div>
  ),
}));

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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
      settingsByKey: new Map([["projects.viewMode", { resolvedValue: "table" }]]),
      setSetting: vi.fn().mockResolvedValue(undefined),
    });
    useListFiltersMock.mockReturnValue({
      filters: {
        title: "",
        customerLastName: "",
        customerNumber: "",
        orderNumber: "",
        tagIds: [],
        articleProductIds: [],
        articleComponentIds: [],
      },
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
                id: 31,
                customerId: 4,
                name: "Projekt Mit Footer",
                orderNumber: "ORD-31",
                amount: null,
                descriptionMd: null,
                isActive: true,
                version: 9,
                projectArticleItems: [{ label: "Sauna", value: "Modell Table" }],
                tags: [{ id: 3, name: "Tag A", color: "#123456", isDefault: false, version: 1 }],
                notesCount: 5,
                appointmentsCount: 1,
                nextAppointmentStartDate: "2099-08-09",
                nextAppointmentStartTimeHour: 14,
                nextAppointmentTourName: "Tour Table",
                nextAppointmentTourColor: "#884422",
                attachmentsCount: 2,
                customer: {
                  id: 4,
                  customerNumber: "C-4",
                  fullName: "Kunde Vier",
                  lastName: "Vier",
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

  it("renders the shared project table hover preview with appointment info, footer badges and tags", () => {
    renderToStaticMarkup(<ProjectsPage />);

    const rowPreviewRenderer = tableViewCalls[0].rowPreviewRenderer as (row: Record<string, unknown>) => React.ReactNode;
    const markup = renderToStaticMarkup(rowPreviewRenderer((tableViewCalls[0].rows as Array<Record<string, unknown>>)[0]));

    expect(markup).toContain("ORD-31");
    expect(markup).toContain("Projekt Mit Footer");
    expect(markup).toContain("Kunde Vier");
    expect(markup).toContain("14:00 - 09.08.99 · Tour Table");
    expect(markup).toContain("background-color:#884422");
    expect(markup).not.toContain("Termine:1");
    expect(markup).toContain("Notizen:5");
    expect(markup).toContain("Anhänge:2");
    expect(markup).toContain("Tag A");
  });
});
