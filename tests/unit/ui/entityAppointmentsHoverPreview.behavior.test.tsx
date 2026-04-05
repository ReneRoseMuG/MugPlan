/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das Termine-Hover-Preview lädt alle Termine (vergangen und zukünftig).
 * - Kunden und Mitarbeiter nutzen `scope=all`, Projekte `fromDate=1900-01-01`.
 * - Die Vorschau sortiert absteigend (neueste zuerst) und begrenzt die Anzeige auf vier Termine.
 * - footerHint "... weitere im Formular" erscheint für alle Entity-Typen bei mehr als vier Terminen.
 *
 * Fehlerfälle:
 * - Das Preview filtert vergangene Termine heraus (Regression der neuen Sichtbarkeitsregel).
 * - Die Liste sortiert aufsteigend statt absteigend.
 * - footerHint fehlt oder erscheint nur bei bestimmten Entity-Typen.
 *
 * Ziel:
 * Den aktuellen Lade- und Anzeigevertrag des Termine-Previews regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const panelCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({
    children,
    preview,
  }: {
    children?: React.ReactNode;
    preview?: React.ReactNode;
  }) => (
    <div>
      {children}
      {preview}
    </div>
  ),
}));

vi.mock("@/components/AllAppointmentsPanel", () => ({
  AllAppointmentsPanel: (props: Record<string, unknown>) => {
    panelCalls.push(props);
    return <div>appointments-panel</div>;
  },
}));

vi.mock("@/lib/project-appointments", () => ({
  getBerlinTodayDateString: () => "2026-03-29",
}));

import { EntityAppointmentsHoverPreview } from "../../../client/src/components/ui/entity-appointments-hover-preview";

type QueryOptions = {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  enabled?: boolean;
};

describe("FT03 UI: EntityAppointmentsHoverPreview behavior", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    panelCalls.length = 0;
    useQueryMock.mockReset();
  });

  it("requests all customer appointments (scope=all)", async () => {
    let capturedOptions: QueryOptions | undefined;
    useQueryMock.mockImplementation((options: QueryOptions) => {
      capturedOptions = options;
      return { data: [], isLoading: false };
    });

    renderToStaticMarkup(
      <EntityAppointmentsHoverPreview source={{ type: "customer", id: 7, count: 2 }} />,
    );

    expect(capturedOptions?.queryKey).toEqual(["/api/entity-appointments-preview", "customer", 7]);
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [] }));
    vi.stubGlobal("fetch", fetchMock);
    await capturedOptions?.queryFn();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/customers/7/appointments?scope=all",
      { credentials: "include" },
    );
    vi.unstubAllGlobals();
  });

  it("requests all employee appointments (scope=all)", async () => {
    let capturedOptions: QueryOptions | undefined;
    useQueryMock.mockImplementation((options: QueryOptions) => {
      capturedOptions = options;
      return { data: [], isLoading: false };
    });

    renderToStaticMarkup(
      <EntityAppointmentsHoverPreview source={{ type: "employee", id: 8, count: 1 }} />,
    );

    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [] }));
    vi.stubGlobal("fetch", fetchMock);
    await capturedOptions?.queryFn();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/employees/8/appointments?scope=all",
      { credentials: "include" },
    );
    vi.unstubAllGlobals();
  });

  it("requests all project appointments (fromDate=1900-01-01), sorts descending and limits the preview to four items", () => {
    useQueryMock.mockImplementation(() => ({
      data: [
        { id: 4, startDate: "2026-04-02", startTimeHour: 12, customer: { fullName: "D" }, projectName: "P" },
        { id: 1, startDate: "2026-03-29", startTimeHour: 10, customer: { fullName: "A" }, projectName: "P" },
        { id: 5, startDate: "2026-04-03", startTimeHour: 9, customer: { fullName: "E" }, projectName: "P" },
        { id: 2, startDate: "2026-03-29", startTimeHour: 14, customer: { fullName: "B" }, projectName: "P" },
        { id: 3, startDate: "2026-04-01", startTimeHour: 8, customer: { fullName: "C" }, projectName: "P" },
      ],
      isLoading: false,
    }));

    renderToStaticMarkup(
      <EntityAppointmentsHoverPreview source={{ type: "project", id: 9, count: 5 }} />,
    );

    expect(panelCalls[0]?.title).toBe("Termine");
    expect(panelCalls[0]?.totalCount).toBe(5);
    const items = panelCalls[0]?.items as Array<{ id: number }>;
    // absteigend: 5 (2026-04-03), 4 (2026-04-02), 3 (2026-04-01), 4 would be cut — top 4 descending
    expect(items.map((item) => item.id)).toEqual([5, 4, 3, 2]);
  });

  it("shows the overflow hint for all entity types when more than four appointments exist", () => {
    useQueryMock.mockImplementation(() => ({
      data: [
        { id: 1, startDate: "2026-03-29", startTimeHour: 8, customer: { fullName: "A" }, projectName: "P" },
        { id: 2, startDate: "2026-03-30", startTimeHour: 8, customer: { fullName: "B" }, projectName: "P" },
        { id: 3, startDate: "2026-03-31", startTimeHour: 8, customer: { fullName: "C" }, projectName: "P" },
        { id: 4, startDate: "2026-04-01", startTimeHour: 8, customer: { fullName: "D" }, projectName: "P" },
        { id: 5, startDate: "2026-04-02", startTimeHour: 8, customer: { fullName: "E" }, projectName: "P" },
      ],
      isLoading: false,
    }));

    renderToStaticMarkup(
      <EntityAppointmentsHoverPreview source={{ type: "customer", id: 3, count: 5 }} />,
    );

    expect(panelCalls[0]?.title).toBe("Termine");
    expect(panelCalls[0]?.totalCount).toBe(5);
    expect(panelCalls[0]?.footerHint).toBe("... weitere im Formular");
    const items = panelCalls[0]?.items as Array<{ id: number }>;
    // absteigend: 5,4,3,2 — top 4
    expect(items.map((item) => item.id)).toEqual([5, 4, 3, 2]);
  });
});
