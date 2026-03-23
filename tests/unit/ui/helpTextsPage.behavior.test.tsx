/**
 * Test Scope:
 *
 * Feature: FT16/FT28 - HelpTextsPage
 *
 * Abgedeckte Regeln:
 * - Board-Karten zeigen den HelpKey sichtbar an und leiten Doppelklicks in den Edit-Flow weiter.
 * - Leere Listen nutzen den fachlichen Empty-State fuer Helptexte.
 * - Tabellenansicht leitet Row-Doppelklicks weiter und zeigt fuer leere Bodies den sichtbaren Preview-Fallback.
 *
 * Fehlerfaelle:
 * - Edit-Navigation oder sichtbarer HelpKey gehen im HelpTexts-Board verloren.
 * - Die HelpTexts-Liste verliert ihren Empty-State-Kontext.
 *
 * Ziel:
 * HelpTextsPage ueber gerenderte Card-/Table-Props statt ueber Quelltextstrings absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const useSettingMock = vi.fn();
const useSettingsMock = vi.fn();
const entityCardCalls: Array<Record<string, unknown>> = [];
const tableViewCalls: Array<Record<string, unknown>> = [];
const listEmptyStateCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: (key: string) => useSettingMock(key),
  useSettings: () => useSettingsMock(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
    <button type="button" data-testid={String(props["data-testid"] ?? "")}>{children}</button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/entity-card", () => ({
  EntityCard: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    entityCardCalls.push(props);
    return <article data-testid={String(props.testId ?? "")}>{props.children}</article>;
  },
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ filterSlot, viewModeToggle, contentSlot, footerSlot }: {
    filterSlot?: React.ReactNode;
    viewModeToggle?: React.ReactNode;
    contentSlot?: React.ReactNode;
    footerSlot?: React.ReactNode;
  }) => (
    <section>
      {filterSlot}
      {viewModeToggle}
      {contentSlot}
      {footerSlot}
    </section>
  ),
}));

vi.mock("@/components/ui/board-view", () => ({
  BoardView: ({ children, emptyState }: { children?: React.ReactNode; emptyState?: React.ReactNode }) => (
    <div data-testid="board-view">
      {children}
      {emptyState}
    </div>
  ),
}));

vi.mock("@/components/ui/list-empty-state", () => ({
  ListEmptyState: (props: Record<string, unknown>) => {
    listEmptyStateCalls.push(props);
    return <div data-testid={`empty-${String(props.helpKey ?? "none")}`}>{String(props.fallbackTitle ?? "")}</div>;
  },
}));

vi.mock("@/components/ui/table-view", () => ({
  TableView: (props: Record<string, unknown>) => {
    tableViewCalls.push(props);
    return <div data-testid={String(props.testId ?? "table-view")}>table-view</div>;
  },
}));

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/filter-panels/help-texts-filter-panel", () => ({
  HelpTextsFilterPanel: ({ searchQuery }: { searchQuery: string }) => <div data-testid="helptexts-filter">{searchQuery}</div>,
}));

vi.mock("@/components/HelpTextsImportExportDialog", () => ({
  HelpTextsImportExportDialog: () => null,
}));

import { HelpTextsPage, shouldBlockHelpTextsLayout } from "../../../client/src/components/HelpTextsPage";

describe("FT16/FT28 UI: HelpTextsPage behavior", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    entityCardCalls.length = 0;
    tableViewCalls.length = 0;
    listEmptyStateCalls.length = 0;
    useSettingMock.mockReset();
    useSettingsMock.mockReset();
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useSettingMock.mockReturnValue("large");
    useSettingsMock.mockReturnValue({
      settingsByKey: new Map(),
      setSetting: vi.fn().mockResolvedValue(undefined),
    });
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("shows the help key on board cards and routes card double clicks into editing", () => {
    const onEditHelpText = vi.fn();
    useQueryMock.mockImplementation((options: { queryKey?: unknown[] }) => {
      const firstKey = options.queryKey?.[0];
      if (firstKey === "/api/help-texts") {
        return {
          data: [{ id: 7, helpKey: "alpha.help", title: "Alpha", body: "<p>Body</p>", isActive: true, version: 1 }],
          isLoading: false,
        };
      }
      return { data: [], isLoading: false };
    });

    const html = renderToStaticMarkup(
      <HelpTextsPage onCreateHelpText={vi.fn()} onEditHelpText={onEditHelpText} />,
    );

    expect(html).toContain("button-new-helptext");
    expect(html).toContain("Key: alpha.help");

    (entityCardCalls[0].onDoubleClick as (() => void) | undefined)?.();
    expect(onEditHelpText).toHaveBeenCalledWith(7);
  });

  it("blocks the layout only during the initial load, not during an active search", () => {
    expect(shouldBlockHelpTextsLayout({
      isLoading: true,
      searchQuery: "",
      helpTextsCount: 0,
    })).toBe(true);

    expect(shouldBlockHelpTextsLayout({
      isLoading: true,
      searchQuery: "reports",
      helpTextsCount: 0,
    })).toBe(false);

    expect(shouldBlockHelpTextsLayout({
      isLoading: true,
      searchQuery: "",
      helpTextsCount: 2,
    })).toBe(false);
  });

  it("keeps the dedicated helptexts empty-state when no rows are available", () => {
    useQueryMock.mockReturnValue({ data: [], isLoading: false });

    const html = renderToStaticMarkup(
      <HelpTextsPage onCreateHelpText={vi.fn()} onEditHelpText={vi.fn()} />,
    );

    expect(listEmptyStateCalls[0]).toMatchObject({
      helpKey: "helptexts.empty",
      fallbackTitle: "Keine Hilfetexte vorhanden.",
    });
    expect(html).toContain("empty-helptexts.empty");
  });

  it("forwards table row double clicks and renders the preview fallback for empty bodies", () => {
    const onEditHelpText = vi.fn();
    useSettingsMock.mockReturnValue({
      settingsByKey: new Map([["helptexts.viewMode", { resolvedValue: "table" }]]),
      setSetting: vi.fn().mockResolvedValue(undefined),
    });
    useQueryMock.mockImplementation((options: { queryKey?: unknown[] }) => {
      const firstKey = options.queryKey?.[0];
      if (firstKey === "/api/help-texts") {
        return {
          data: [{ id: 9, helpKey: "beta.help", title: "Beta", body: "   ", isActive: true, version: 1 }],
          isLoading: false,
        };
      }
      return { data: [], isLoading: false };
    });

    renderToStaticMarkup(<HelpTextsPage onCreateHelpText={vi.fn()} onEditHelpText={onEditHelpText} />);

    (tableViewCalls[0].onRowDoubleClick as ((row: { id: number }) => void) | undefined)?.({ id: 9 });
    expect(onEditHelpText).toHaveBeenCalledWith(9);

    const previewHtml = renderToStaticMarkup(
      <>
        {(tableViewCalls[0].rowPreviewRenderer as (row: { title: string; helpKey: string; body: string }) => React.ReactNode)({
          title: "Beta",
          helpKey: "beta.help",
          body: "   ",
        })}
      </>,
    );

    expect(previewHtml).toContain("Kein Inhalt vorhanden.");
    expect(previewHtml).toContain("beta.help");
  });
});
