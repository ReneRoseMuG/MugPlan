/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Projektkarte zeigt den Footer-Baustein fuer geplante Termine mit dem gelieferten Zaehlerwert.
 * - Die Projektkarte bindet fuer Notizen den wiederverwendbaren EntityNotesHoverPreview-Trigger.
 * - Die Projektkarte teilt die Footer-Zeile 2:1 fuer Termine und Notizen auf.
 * - Der Kartenfooter bleibt explizit sichtbar.
 *
 * Fehlerfaelle:
 * - Footer-Counter oder Notiz-Trigger gehen bei Refactorings verloren.
 * - Der Footer wird nicht mehr sichtbar an EntityCard uebergeben.
 *
 * Ziel:
 * Den Projektkarten-Footer ueber gerenderte Komponenten-Props statt ueber Quelltext-Strings absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useSettingsMock = vi.fn();
const useListFiltersMock = vi.fn();
const entityCardCalls: Array<Record<string, unknown>> = [];
const appointmentBadgeCalls: Array<Record<string, unknown>> = [];
const notesPreviewCalls: Array<Record<string, unknown>> = [];

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
  ListLayout: ({ filterSlot, footerSlot, contentSlot }: { filterSlot?: React.ReactNode; footerSlot?: React.ReactNode; contentSlot?: React.ReactNode }) => (
    <section>
      {filterSlot}
      {footerSlot}
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

vi.mock("@/components/ui/table-view", () => ({
  TableView: () => <div>table-view</div>,
}));

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/filter-panels/project-filter-panel", () => ({
  ProjectFilterPanel: () => <div>project-filter-panel</div>,
}));

vi.mock("@/components/ui/entity-card", () => ({
  EntityCard: (props: Record<string, unknown> & { children?: React.ReactNode; footer?: React.ReactNode }) => {
    entityCardCalls.push(props);
    return (
      <article data-testid={String(props.testId)}>
        {props.children}
        {props.footer}
      </article>
    );
  },
}));

vi.mock("@/components/ui/appointment-count-badge", () => ({
  AppointmentCountBadge: (props: Record<string, unknown>) => {
    appointmentBadgeCalls.push(props);
    return (
      <div data-testid={String(props.testId)}>
        Geplante Termine:{String(props.count)}
      </div>
    );
  },
}));

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/project-article-description-renderer", () => ({
  ProjectArticleDescriptionRenderer: () => <div>project-article-renderer</div>,
}));

vi.mock("@/components/notes/EntityNotesHoverPreview", () => ({
  EntityNotesHoverPreview: (props: Record<string, unknown>) => {
    notesPreviewCalls.push(props);
    const sources = props.sources as { count?: number } | undefined;
    return <span>Notizen:{String(sources?.count ?? 0)}</span>;
  },
}));

vi.mock("@/components/ui/badge-previews/appointment-weekly-panel-preview", () => ({
  createAppointmentWeeklyPanelPreview: vi.fn(() => <div>preview</div>),
}));

import { ProjectsPage } from "../../../client/src/components/ProjectsPage";

describe("FT02 projects page current appointments counter wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    entityCardCalls.length = 0;
    appointmentBadgeCalls.length = 0;
    notesPreviewCalls.length = 0;

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
            total: 1,
            totalPages: 1,
            items: [
              {
                id: 8,
                customerId: 17,
                name: "Projekt Sonne",
                orderNumber: "AUF-88",
                amount: "4999.95",
                descriptionMd: null,
                isActive: true,
                version: 5,
                projectArticleItems: [],
                tags: [],
                notesCount: 3,
                plannedAppointmentsCount: 6,
                nextAppointmentStartDate: "2099-06-01",
                nextAppointmentStartTimeHour: 10,
                customer: {
                  id: 17,
                  customerNumber: "K-17",
                  fullName: "Mina Muster",
                  lastName: "Muster",
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

  it("renders planned appointments and notes in the project card footer", () => {
    const markup = renderToStaticMarkup(<ProjectsPage />);

    expect(markup).toContain("Geplante Termine:6");
    expect(markup).toContain("Notizen:3");
    expect(markup).toContain("grid-cols-[max-content_1fr]");
    expect(appointmentBadgeCalls).toHaveLength(1);
    expect(appointmentBadgeCalls[0]).toMatchObject({
      count: 6,
      testId: "text-project-planned-appointments-8",
    });
    expect(notesPreviewCalls).toHaveLength(1);
    expect(notesPreviewCalls[0]).toMatchObject({
      sourceMode: "single-parent",
      triggerTestId: "text-project-notes-count-8",
      sources: { type: "project", id: 8, count: 3 },
    });
    expect(markup).toContain("grid-cols-[max-content_1fr]");
    expect(markup).toContain("justify-end");
    expect(renderToStaticMarkup(entityCardCalls[0].headerMeta as React.ReactElement)).toContain("A-Nr. AUF-88");
  });

  it("omits the notes slot when the project has no notes", () => {
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
                id: 8,
                customerId: 17,
                name: "Projekt Sonne",
                orderNumber: "AUF-88",
                amount: "4999.95",
                descriptionMd: null,
                isActive: true,
                version: 5,
                projectArticleItems: [],
                tags: [],
                notesCount: 0,
                plannedAppointmentsCount: 6,
                nextAppointmentStartDate: "2099-06-01",
                nextAppointmentStartTimeHour: 10,
                customer: {
                  id: 17,
                  customerNumber: "K-17",
                  fullName: "Mina Muster",
                  lastName: "Muster",
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

    const markup = renderToStaticMarkup(<ProjectsPage />);

    expect(markup).toContain("Geplante Termine:6");
    expect(markup).not.toContain("Notizen:");
    expect(markup).not.toContain("text-project-notes-count-8");
  });

  it("keeps the entity card footer explicitly visible", () => {
    renderToStaticMarkup(<ProjectsPage />);

    expect(entityCardCalls).toHaveLength(1);
    expect(entityCardCalls[0]).toMatchObject({
      testId: "project-card-8",
      footerVisibility: "visible",
    });
  });
});
