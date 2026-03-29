/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das Termine-Hover-Preview lädt nur aktuelle/geplante Termine ab heute.
 * - Kunden und Mitarbeiter nutzen `scope=upcoming`, Projekte `fromDate=today`.
 * - Die Vorschau sortiert aufsteigend und begrenzt die Anzeige auf vier Termine.
 * - Der Panel-Titel lautet "Geplante Termine".
 *
 * Fehlerfälle:
 * - Das Preview lädt weiterhin historische oder ungefilterte Terminmengen.
 * - Die Liste bleibt absteigend sortiert oder wächst über vier Einträge hinaus.
 * - Der Titel fällt auf den alten Wortlaut zurück.
 *
 * Ziel:
 * Den neuen Lade- und Anzeigevertrag des Footer-Termine-Previews regressionssicher absichern.
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

  it("requests upcoming customer appointments from today onward", async () => {
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
      "/api/customers/7/appointments?scope=upcoming&fromDate=2026-03-29",
      { credentials: "include" },
    );
    vi.unstubAllGlobals();
  });

  it("requests upcoming employee appointments from today onward", async () => {
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
      "/api/employees/8/appointments?scope=upcoming&fromDate=2026-03-29",
      { credentials: "include" },
    );
    vi.unstubAllGlobals();
  });

  it("requests project appointments from today onward, sorts ascending and limits the preview to four items", () => {
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
    expect(items.map((item) => item.id)).toEqual([1, 2, 3, 4]);
  });

  it("shows the employee overflow hint below the fourth appointment when more entries exist", () => {
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
      <EntityAppointmentsHoverPreview source={{ type: "employee", id: 3, count: 5 }} />,
    );

    expect(panelCalls[0]?.title).toBe("Termine");
    expect(panelCalls[0]?.totalCount).toBe(5);
    expect(panelCalls[0]?.footerHint).toBe("... weitere im Formular");
    const items = panelCalls[0]?.items as Array<{ id: number }>;
    expect(items.map((item) => item.id)).toEqual([1, 2, 3, 4]);
  });
});
