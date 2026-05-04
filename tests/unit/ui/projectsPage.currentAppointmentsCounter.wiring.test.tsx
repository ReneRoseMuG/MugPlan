/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Projektkarte bindet die gemeinsame Footer-Badge-Zeile für Termine, Notizen und Anhänge.
 * - Notiz-Badges bleiben auch bei `0` sichtbar.
 * - Der Kartenfooter bleibt explizit sichtbar.
 *
 * Fehlerfälle:
 * - Footer-Badges gehen bei Refactorings verloren.
 * - Projekt-Notizen werden bei `0` weiterhin ausgeblendet.
 *
 * Ziel:
 * Den Projektkarten-Footer über gerenderte Komponenten-Props statt über Quelltext-Strings absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useSettingsMock = vi.fn();
const useListFiltersMock = vi.fn();
const entityCardCalls: Array<Record<string, unknown>> = [];
const appointmentPreviewCalls: Array<Record<string, unknown>> = [];
const notesPreviewCalls: Array<Record<string, unknown>> = [];
const attachmentPreviewCalls: Array<Record<string, unknown>> = [];
const hoverPreviewCalls: Array<Record<string, unknown>> = [];

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

vi.mock("@/components/ui/entity-appointments-hover-preview", () => ({
  EntityAppointmentsHoverPreview: (props: Record<string, unknown>) => {
    appointmentPreviewCalls.push(props);
    const source = props.source as { count?: number } | undefined;
    return <span>Termine:{String(source?.count ?? 0)}</span>;
  },
}));

vi.mock("@/components/notes/EntityNotesHoverPreview", () => ({
  EntityNotesHoverPreview: (props: Record<string, unknown>) => {
    notesPreviewCalls.push(props);
    const sources = props.sources as { count?: number } | undefined;
    return <span>Notizen:{String(sources?.count ?? 0)}</span>;
  },
}));

vi.mock("@/components/ui/ProjectAttachmentsHover", () => ({
  ProjectAttachmentsHover: (props: Record<string, unknown>) => {
    attachmentPreviewCalls.push(props);
    return <span>Anhänge:{String(props.totalAttachmentsCount ?? 0)}</span>;
  },
}));

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({
    children,
    preview,
    className,
    ...props
  }: {
    children?: React.ReactNode;
    preview?: React.ReactNode;
    className?: string;
  }) => {
    hoverPreviewCalls.push({ className, ...props });
    return (
      <div data-testid="hover-preview-wrapper" className={className}>
        <div data-testid="hover-preview-trigger">{children}</div>
        <div data-testid="hover-preview-content">{preview}</div>
      </div>
    );
  },
}));

vi.mock("@/components/ui/project-article-description-renderer", () => ({
  ProjectArticleDescriptionRenderer: () => <div>project-article-renderer</div>,
}));

import { ProjectsPage } from "../../../client/src/components/ProjectsPage";

describe("FT02 projects page footer badge wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    entityCardCalls.length = 0;
    appointmentPreviewCalls.length = 0;
    notesPreviewCalls.length = 0;
    attachmentPreviewCalls.length = 0;
    hoverPreviewCalls.length = 0;

    useSettingsMock.mockReturnValue({
      settingsByKey: new Map(),
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

    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: vi.fn(() => "DISPATCHER"),
        },
      },
      configurable: true,
    });
  });

  function mockProjects(
    notesCount: number,
    overrides: Partial<{
      name: string;
      descriptionMd: string | null;
      projectArticleItems: Array<{ label: string; value: string }>;
    }> = {},
  ) {
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
                name: overrides.name ?? "Projekt Sonne",
                orderNumber: "AUF-88",
                amount: "4999.95",
                descriptionMd: overrides.descriptionMd ?? null,
                isActive: true,
                version: 5,
                projectArticleItems: overrides.projectArticleItems ?? [],
                tags: [],
                notesCount,
                appointmentsCount: 6,
                nextAppointmentStartDate: "2099-06-01",
                nextAppointmentStartTimeHour: 10,
                attachmentsCount: 3,
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
  }

  it("renders appointments, notes and attachments in the project card footer", () => {
    mockProjects(3, {
      projectArticleItems: [{ label: "Modell", value: "Classic 200" }],
    });

    const markup = renderToStaticMarkup(<ProjectsPage />);

    expect(markup).toContain("h-[6.5rem]");
    expect(markup).toContain("gap-1");
    expect(markup).toContain("-mt-3");
    expect(markup).toContain("w-[420px] p-2");
    expect(markup).not.toContain("w-[400px] rounded-lg bg-white p-2");
    expect(markup).toContain("Termine:6");
    expect(markup).toContain("Notizen:3");
    expect(markup).toContain("Anhänge:3");
    expect(appointmentPreviewCalls[0]).toMatchObject({
      triggerTestId: "text-project-planned-appointments-8",
      source: { type: "project", id: 8, count: 6 },
    });
    expect(notesPreviewCalls[0]).toMatchObject({
      sourceMode: "single-parent",
      triggerTestId: "text-project-notes-count-8",
      sources: { type: "project", id: 8, count: 3 },
    });
    expect(attachmentPreviewCalls[0]).toMatchObject({
      projectId: 8,
      totalAttachmentsCount: 3,
    });
    expect(renderToStaticMarkup(entityCardCalls[0].headerMeta as React.ReactElement)).toContain("A-Nr. AUF-88");
    expect(hoverPreviewCalls[1]).toMatchObject({
      className: "w-[420px] p-2",
      mode: "cursor",
      cursorOffsetX: 20,
      cursorOffsetY: 20,
    });
  });

  it("keeps the notes badge visible with count 0", () => {
    mockProjects(0);

    const markup = renderToStaticMarkup(<ProjectsPage />);

    expect(markup).toContain("Notizen:0");
    expect(notesPreviewCalls[0]).toMatchObject({
      sources: { type: "project", id: 8, count: 0 },
    });
  });

  it("keeps the entity card footer explicitly visible", () => {
    mockProjects(1);
    renderToStaticMarkup(<ProjectsPage />);

    expect(entityCardCalls[0]).toMatchObject({
      testId: "project-card-8",
      footerVisibility: "visible",
    });
  });

  it("shows the fallback text and disables the project hover preview when no project content exists", () => {
    mockProjects(1, {
      descriptionMd: null,
      projectArticleItems: [],
    });

    const markup = renderToStaticMarkup(<ProjectsPage />);

    expect(markup).toContain("Kein Auftrag hinterlegt");
    expect(markup.match(/hover-preview-wrapper/g)).toHaveLength(1);
  });
});
