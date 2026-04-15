/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - JournalRecordsView uebergibt Kontext-, Filter- und Paging-Zustand an den Journal-Read-Query.
 * - Filter-Reset leert alle Eingaben und setzt die Pagination zurueck.
 * - Empty-State und Fehlerzustand werden fuer den Journal-Tab sichtbar gerendert.
 *
 * Fehlerfaelle:
 * - Kontextfilter fehlen im Query trotz Detailjournal-Kontext.
 * - Filter-Reset laesst alte Eingaben oder Seitenzahl stehen.
 * - Leere oder fehlerhafte Responses bleiben unsichtbar.
 *
 * Ziel:
 * Das UI-Verhalten der JournalRecordsView ohne Browser-DOM ueber Query-Konfiguration und sichtbare States absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  useStateMock: vi.fn(),
  useEffectMock: vi.fn(),
  useDeferredValueMock: vi.fn((value: unknown) => value),
  useQueryMock: vi.fn(),
  buttonProps: [] as Array<Record<string, unknown>>,
  inputProps: [] as Array<Record<string, unknown>>,
  queryOptions: [] as Array<Record<string, unknown>>,
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: hooks.useStateMock,
    useEffect: hooks.useEffectMock,
    useDeferredValue: hooks.useDeferredValueMock,
  };
});

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: hooks.useQueryMock,
  };
});

vi.mock("../../../client/src/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => {
    hooks.inputProps.push(props);
    return <input {...props} />;
  },
}));

vi.mock("../../../client/src/components/ui/button", () => ({
  Button: (props: Record<string, unknown>) => {
    hooks.buttonProps.push(props);
    return <button {...props}>{props.children as React.ReactNode}</button>;
  },
}));

vi.mock("../../../client/src/components/ui/list-empty-state", () => ({
  ListEmptyState: ({
    fallbackTitle,
    fallbackBody,
  }: {
    fallbackTitle: string;
    fallbackBody: string;
  }) => <div>{fallbackTitle} {fallbackBody}</div>,
}));

vi.mock("../../../client/src/components/ui/list-paging-footer", () => ({
  ListPagingFooter: ({
    summaryText,
    stateTestId,
    page,
    totalPages,
  }: {
    summaryText?: string;
    stateTestId: string;
    page: number;
    totalPages: number;
  }) => <div data-testid={stateTestId}>{summaryText} {page}/{totalPages}</div>,
}));

vi.mock("../../../client/src/components/ui/table-view", () => ({
  TableView: ({
    testId,
    rows,
    emptyState,
    footerSlot,
  }: {
    testId: string;
    rows: Array<{ id: number; messageText: string }>;
    emptyState?: React.ReactNode;
    footerSlot?: React.ReactNode;
  }) => (
    <div data-testid={testId}>
      {rows.length === 0 ? emptyState : rows.map((row) => <div key={row.id}>{row.messageText}</div>)}
      {footerSlot}
    </div>
  ),
}));

import { JournalRecordsView } from "../../../client/src/components/JournalRecordsView";

function queueStateMocks(values: Array<[unknown, (...args: unknown[]) => void]>) {
  hooks.useStateMock.mockReset();
  for (const [value, setter] of values) {
    hooks.useStateMock.mockImplementationOnce(() => [value, setter]);
  }
}

describe("journal records view behavior", () => {
  beforeEach(() => {
    hooks.useEffectMock.mockReset();
    hooks.useDeferredValueMock.mockImplementation((value: unknown) => value);
    hooks.useQueryMock.mockReset();
    hooks.buttonProps.length = 0;
    hooks.inputProps.length = 0;
    hooks.queryOptions.length = 0;
    vi.restoreAllMocks();
    vi.stubGlobal("React", React);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the journal query from context, filters and paging state and resets filters", async () => {
    const setPage = vi.fn();
    const setFromDate = vi.fn();
    const setToDate = vi.fn();
    const setActorFilter = vi.fn();
    const setQueryFilter = vi.fn();

    queueStateMocks([
      [2, setPage],
      ["2026-04-01", setFromDate],
      ["2026-04-30", setToDate],
      ["Anna", setActorFilter],
      ["Projekt", setQueryFilter],
    ]);

    hooks.useQueryMock.mockImplementation((options: Record<string, unknown>) => {
      hooks.queryOptions.push(options);
      return {
        data: {
          items: [
            {
              id: 1,
              tableName: "project",
              recordId: 42,
              recordKey: null,
              op: "update",
              field: null,
              oldValue: null,
              newValue: null,
              snapshot: null,
              actorUserId: 1,
              actorName: "Anna Admin",
              triggerKey: "project.update",
              messageText: "Projekt aktualisiert",
              isRaw: false,
              createdAt: "2099-08-15T08:00:00.000Z",
              contexts: [],
            },
          ],
          page: 2,
          pageSize: 10,
          total: 3,
          totalPages: 3,
        },
        error: null,
      };
    });

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ items: [], page: 2, pageSize: 10, total: 0, totalPages: 0 }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    renderToStaticMarkup(
      <JournalRecordsView
        context={{ tableName: "project", recordId: 42 }}
        pageSize={10}
        testIdPrefix="journal-test"
      />,
    );

    expect(hooks.queryOptions).toHaveLength(1);
    expect(hooks.queryOptions[0].queryKey).toEqual([
      "/api/journal/messages",
      2,
      10,
      "2026-04-01",
      "2026-04-30",
      "Anna",
      "Projekt",
      "project",
      42,
      null,
    ]);

    const queryFn = hooks.queryOptions[0].queryFn as (() => Promise<unknown>);
    await queryFn();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestUrl).toContain("page=2");
    expect(requestUrl).toContain("pageSize=10");
    expect(requestUrl).toContain("from=2026-04-01");
    expect(requestUrl).toContain("to=2026-04-30");
    expect(requestUrl).toContain("actor=Anna");
    expect(requestUrl).toContain("q=Projekt");
    expect(requestUrl).toContain("contextTable=project");
    expect(requestUrl).toContain("contextId=42");

    const resetButton = hooks.buttonProps.find((props) => props["data-testid"] === "journal-test-filter-reset");
    expect(resetButton).toBeTruthy();
    (resetButton?.onClick as (() => void))();

    expect(setFromDate).toHaveBeenCalledWith("");
    expect(setToDate).toHaveBeenCalledWith("");
    expect(setActorFilter).toHaveBeenCalledWith("");
    expect(setQueryFilter).toHaveBeenCalledWith("");
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it("renders the empty state when no journal items are returned", () => {
    queueStateMocks([
      [1, vi.fn()],
      ["", vi.fn()],
      ["", vi.fn()],
      ["", vi.fn()],
      ["", vi.fn()],
    ]);

    hooks.useQueryMock.mockImplementation(() => ({
      data: {
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
      error: null,
    }));

    const markup = renderToStaticMarkup(
      <JournalRecordsView testIdPrefix="journal-empty" />,
    );

    expect(markup).toContain("Keine Journaleintr");
    expect(markup).toContain("keine passenden");
  });

  it("renders the error state when the query fails", () => {
    queueStateMocks([
      [1, vi.fn()],
      ["", vi.fn()],
      ["", vi.fn()],
      ["", vi.fn()],
      ["", vi.fn()],
    ]);

    hooks.useQueryMock.mockImplementation(() => ({
      data: undefined,
      error: new Error("FORBIDDEN"),
    }));

    const markup = renderToStaticMarkup(
      <JournalRecordsView testIdPrefix="journal-error" />,
    );

    expect(markup).toContain("Journal konnte nicht geladen werden.");
    expect(markup).toContain("FORBIDDEN");
  });
});
