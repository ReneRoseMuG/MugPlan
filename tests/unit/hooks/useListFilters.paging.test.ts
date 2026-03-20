/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - `setFilter` setzt Paging deterministisch auf Seite 1 zurueck.
 * - `resetFilters` stellt Initialfilter wieder her und setzt Seite 1.
 * - `buildQueryParams` erhaelt Filterzustand und aktuelle Seite fuer paginierte Listen.
 *
 * Fehlerfaelle:
 * - Paging bleibt nach Filteraenderungen auf einer alten Seite stehen.
 * - Query-Parameter verlieren den Seitenbezug.
 *
 * Ziel:
 * Den Paging-/Filtervertrag von `useListFilters` ueber Hook-Verhalten statt ueber Quelltextmarker absichern.
 */
import type React from "react";
import { describe, expect, it, vi } from "vitest";

async function loadUseListFilters<TFilters extends object>(params: {
  filters: TFilters;
  page: number;
}) {
  vi.resetModules();

  const setFiltersMock = vi.fn();
  const setPageMock = vi.fn();

  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    return {
      ...actual,
      useState: vi
        .fn()
        .mockImplementationOnce(() => [params.filters, setFiltersMock] as [TFilters, React.Dispatch<React.SetStateAction<TFilters>>])
        .mockImplementationOnce(() => [params.page, setPageMock] as [number, React.Dispatch<React.SetStateAction<number>>]),
      useMemo: ((factory: () => unknown) => factory()) as typeof actual.useMemo,
    };
  });

  const module = await import("../../../client/src/hooks/useListFilters");
  return { ...module, setFiltersMock, setPageMock };
}

describe("PKG-08 useListFilters paging behavior", () => {
  it("resets paging to 1 when a filter changes or filters are reset", async () => {
    const { useListFilters, setFiltersMock, setPageMock } = await loadUseListFilters({
      filters: { query: "Alt", archived: false },
      page: 4,
    });

    const result = useListFilters({
      initialFilters: { query: "", archived: false },
      initialPage: 4,
    });

    result.setFilter("query", "Neu");
    expect(setFiltersMock).toHaveBeenNthCalledWith(1, expect.any(Function));
    const filterUpdater = setFiltersMock.mock.calls[0]?.[0] as (value: { query: string; archived: boolean }) => { query: string; archived: boolean };
    expect(filterUpdater({ query: "Alt", archived: false })).toEqual({ query: "Neu", archived: false });
    expect(setPageMock).toHaveBeenNthCalledWith(1, 1);

    result.resetFilters();
    expect(setFiltersMock).toHaveBeenNthCalledWith(2, { query: "", archived: false });
    expect(setPageMock).toHaveBeenNthCalledWith(2, 1);
  });

  it("passes the current page into query param construction", async () => {
    const buildQueryParams = vi.fn((filters: { query: string; archived: boolean }, page: number) => ({
      q: filters.query,
      archived: filters.archived,
      page,
    }));

    const { useListFilters } = await loadUseListFilters({
      filters: { query: "Tour", archived: true },
      page: 3,
    });

    const result = useListFilters({
      initialFilters: { query: "", archived: false },
      initialPage: 1,
      buildQueryParams,
    });

    expect(buildQueryParams).toHaveBeenCalledWith({ query: "Tour", archived: true }, 3);
    expect(result.queryParams.toString()).toBe("q=Tour&archived=true&page=3");
  });
});
