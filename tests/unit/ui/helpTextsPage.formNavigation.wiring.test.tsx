/**
 * Test Scope:
 *
 * Feature: FT16 - Hilfetextlisten-Navigation
 *
 * Abgedeckte Regeln:
 * - Board-Karten delegieren Bearbeiten per Doppelklick an den Parent.
 * - Tabellenmodus delegiert Bearbeiten ueber `onRowDoubleClick`.
 * - Die Neuanlage bleibt eine Parent-Navigation statt eines lokalen Dialogs.
 *
 * Fehlerfaelle:
 * - HelpTextsPage kapselt Bearbeitung wieder lokal statt sauber zu delegieren.
 *
 * Ziel:
 * Die Navigationsverdrahtung der Hilfetextliste ueber weitergereichte Callbacks absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const entityCardCalls: Array<Record<string, unknown>> = [];
const tableViewCalls: Array<Record<string, unknown>> = [];
const buttonCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ settingsByKey: new Map([["helptexts.viewMode", { resolvedValue: "board" }]]), setSetting: vi.fn().mockResolvedValue(undefined) }),
  useSetting: () => "large",
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/components/ui/button", () => ({
  Button: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    buttonCalls.push(props);
    return <button type="button">{props.children}</button>;
  },
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/entity-card", () => ({
  EntityCard: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    entityCardCalls.push(props);
    return <article>{props.children}</article>;
  },
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ contentSlot, footerSlot }: { contentSlot?: React.ReactNode; footerSlot?: React.ReactNode }) => <section>{contentSlot}{footerSlot}</section>,
}));

vi.mock("@/components/ui/board-view", () => ({
  BoardView: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/list-empty-state", () => ({
  ListEmptyState: ({ fallbackTitle }: { fallbackTitle: string }) => <div>{fallbackTitle}</div>,
}));

vi.mock("@/components/ui/table-view", () => ({
  TableView: (props: Record<string, unknown>) => {
    tableViewCalls.push(props);
    return <div>table-view</div>;
  },
}));

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/filter-panels/help-texts-filter-panel", () => ({
  HelpTextsFilterPanel: () => <div>helptexts-filter</div>,
}));

vi.mock("@/components/HelpTextsImportExportDialog", () => ({
  HelpTextsImportExportDialog: () => <div>import-export-dialog</div>,
}));

vi.mock("lucide-react", () => ({
  HelpCircle: () => <span>help</span>,
  Plus: () => <span>plus</span>,
  LayoutGrid: () => <span>grid</span>,
  Table2: () => <span>table</span>,
  ArrowDown: () => <span>down</span>,
  ArrowUp: () => <span>up</span>,
  ArrowUpDown: () => <span>sort</span>,
  Upload: () => <span>upload</span>,
}));

async function loadHelpTextsPageWithState(viewMode: "board" | "table") {
  vi.resetModules();
  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    let stateCall = 0;
    return {
      ...actual,
      useState: (<T,>(initial: T) => {
        stateCall += 1;
        if (stateCall === 1) {
          return [viewMode, vi.fn()] as unknown as [T, React.Dispatch<React.SetStateAction<T>>];
        }
        return actual.useState(initial);
      }) as typeof actual.useState,
    };
  });
  return import("../../../client/src/components/HelpTextsPage");
}

describe("FT16 help texts page navigation behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    entityCardCalls.length = 0;
    tableViewCalls.length = 0;
    buttonCalls.length = 0;
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      data: [{
        id: 5,
        version: 2,
        helpKey: "help.beta",
        title: "Beta",
        body: "",
        isActive: true,
      }],
      isLoading: false,
    });
  });

  it("delegates board create/edit actions to the parent callbacks", async () => {
    const onCreateHelpText = vi.fn();
    const onEditHelpText = vi.fn();
    const { HelpTextsPage } = await loadHelpTextsPageWithState("board");

    renderToStaticMarkup(
      <HelpTextsPage onCreateHelpText={onCreateHelpText} onEditHelpText={onEditHelpText} />,
    );

    const createButton = buttonCalls.find((call) => call["data-testid"] === "button-new-helptext");
    expect(createButton?.onClick).toBe(onCreateHelpText);

    const onDoubleClick = entityCardCalls[0].onDoubleClick as () => void;
    onDoubleClick();
    expect(onEditHelpText).toHaveBeenCalledWith(5);
  });

  it("delegates table row editing through onRowDoubleClick", async () => {
    const onEditHelpText = vi.fn();
    const { HelpTextsPage } = await loadHelpTextsPageWithState("table");

    renderToStaticMarkup(
      <HelpTextsPage onCreateHelpText={() => undefined} onEditHelpText={onEditHelpText} />,
    );

    const onRowDoubleClick = tableViewCalls[0].onRowDoubleClick as (row: { id: number }) => void;
    onRowDoubleClick({ id: 5 });
    expect(onEditHelpText).toHaveBeenCalledWith(5);
  });
});
