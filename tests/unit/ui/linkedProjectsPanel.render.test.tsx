/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das Projekte-Panel im Kundenformular verwendet die kompakte LinkedProjectCard in der Sidebar.
 * - Die Datenquelle nutzt den paginierten Listenendpunkt `/api/projects/list` mit `customerId`.
 * - Die Karten bleiben ueber `linked-project-card-*` testbar und werden nach naechstem Termin absteigend sortiert.
 *
 * Fehlerfaelle:
 * - Das Panel rendert statt der kompakten Sidebar-Karte wieder eine andere Projektkarte oder den alten Endpunkt.
 * - Paging oder Sortierung der Projektkarten bricht weg.
 *
 * Ziel:
 * Das kompakte Sidebar-Rendering fuer verknuepfte Projekte inklusive Listenendpunkt und Sortierung absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const linkedProjectCardMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@/components/LinkedProjectCard", () => ({
  LinkedProjectCard: (props: Record<string, unknown>) => {
    linkedProjectCardMock(props);
    return <div data-testid={`linked-project-card-${String((props.project as { id: number }).id)}`} />;
  },
}));

import { LinkedProjectsPanel } from "../../../client/src/components/LinkedProjectsPanel";

describe("FT05+ linked projects panel", () => {
  afterEach(() => {
    useQueryMock.mockReset();
    linkedProjectCardMock.mockReset();
    vi.restoreAllMocks();
  });

  it("loads linked projects via projects/list and renders compact sidebar cards in appointment order", async () => {
    let capturedQueryFn: null | (() => Promise<unknown>) = null;

    useQueryMock.mockImplementation((options: { queryFn?: () => Promise<unknown> }) => {
      capturedQueryFn = options.queryFn ?? null;
      return {
        data: [
          {
            id: 11,
            customerId: 5,
            name: "Projekt ohne Termin",
            orderNumber: "A-11",
            descriptionMd: null,
            isActive: true,
            version: 1,
            notesCount: 0,
            plannedAppointmentsCount: 0,
            nextAppointmentStartDate: null,
            nextAppointmentStartTimeHour: null,
            projectArticleItems: [],
            tags: [],
            attachmentsCount: 0,
            customer: {
              id: 5,
              customerNumber: "C-5",
              fullName: "Kunde Fuenf",
              addressLine1: null,
              postalCode: null,
              city: null,
              phone: null,
              email: null,
            },
          },
          {
            id: 12,
            customerId: 5,
            name: "Projekt frueher",
            orderNumber: "A-12",
            descriptionMd: null,
            isActive: true,
            version: 1,
            notesCount: 0,
            plannedAppointmentsCount: 1,
            nextAppointmentStartDate: "2099-04-05",
            nextAppointmentStartTimeHour: 8,
            projectArticleItems: [],
            tags: [],
            attachmentsCount: 0,
            customer: {
              id: 5,
              customerNumber: "C-5",
              fullName: "Kunde Fuenf",
              addressLine1: null,
              postalCode: null,
              city: null,
              phone: null,
              email: null,
            },
          },
          {
            id: 13,
            customerId: 5,
            name: "Projekt spaeter",
            orderNumber: "A-13",
            descriptionMd: null,
            isActive: true,
            version: 1,
            notesCount: 0,
            plannedAppointmentsCount: 1,
            nextAppointmentStartDate: "2099-04-06",
            nextAppointmentStartTimeHour: 7,
            projectArticleItems: [],
            tags: [],
            attachmentsCount: 0,
            customer: {
              id: 5,
              customerNumber: "C-5",
              fullName: "Kunde Fuenf",
              addressLine1: null,
              postalCode: null,
              city: null,
              phone: null,
              email: null,
            },
          },
        ],
        isLoading: false,
        isError: false,
      };
    });

    renderToStaticMarkup(<LinkedProjectsPanel customerId={5} customerNumber="C-5" onOpenProject={vi.fn()} />);

    expect(linkedProjectCardMock.mock.calls.map(([props]) => `linked-project-card-${String((props as { project: { id: number } }).project.id)}`)).toEqual([
      "linked-project-card-13",
      "linked-project-card-12",
      "linked-project-card-11",
    ]);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          page: 1,
          totalPages: 2,
          items: [
            { id: 21, isActive: true },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          page: 2,
          totalPages: 2,
          items: [
            { id: 22, isActive: false },
            { id: 23, isActive: true },
          ],
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    await capturedQueryFn?.();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/projects/list?customerId=5&scope=all&page=1&pageSize=100",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/projects/list?customerId=5&scope=all&page=2&pageSize=100",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
