/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Kundenkarte bindet die gemeinsame Footer-Badge-Zeile fuer Termine, Notizen und Anhänge.
 * - Notizen bleiben auch bei `0` als Trigger im Footer sichtbar.
 * - Der Kartenfooter bleibt explizit sichtbar.
 *
 * Fehlerfälle:
 * - Einzelne Footer-Badges gehen bei Refactorings verloren.
 * - Notiz-Badges werden bei `0` weiterhin ausgeblendet.
 *
 * Ziel:
 * Das Footer-Wiring der Kundenkarte über gerenderte Komponenten-Props regressionssicher absichern.
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
  BoardView: ({ children }: { children?: React.ReactNode }) => <div data-testid="board-view">{children}</div>,
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

vi.mock("@/components/ui/filter-panels/customer-filter-panel", () => ({
  CustomerFilterPanel: () => <div>customer-filter-panel</div>,
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

vi.mock("@/components/ui/CustomerAttachmentsHover", () => ({
  CustomerAttachmentsHover: (props: Record<string, unknown>) => {
    attachmentPreviewCalls.push(props);
    return <span>Anhänge:{String(props.totalAttachmentsCount ?? 0)}</span>;
  },
}));

import { CustomersPage } from "../../../client/src/components/CustomersPage";

describe("FT05+ customers page footer badge wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    entityCardCalls.length = 0;
    appointmentPreviewCalls.length = 0;
    notesPreviewCalls.length = 0;
    attachmentPreviewCalls.length = 0;

    useSettingsMock.mockReturnValue({
      settingsByKey: new Map(),
      setSetting: vi.fn().mockResolvedValue(undefined),
    });
    useListFiltersMock.mockReturnValue({
      filters: { lastName: "", customerNumber: "", tagIds: [] },
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

  function mockCustomers(notesCount: number) {
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const key = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (key === "/api/customers/list") {
        return {
          data: {
            page: 1,
            pageSize: 50,
            total: 1,
            totalPages: 1,
            items: [
              {
                id: 7,
                customerNumber: "K-007",
                fullName: "Mina Muster",
                firstName: "Mina",
                lastName: "Muster",
                company: null,
                phone: "01234",
                email: null,
                postalCode: "12345",
                city: "Berlin",
                addressLine1: null,
                addressLine2: null,
                isActive: true,
                version: 3,
                tags: [],
                notesCount,
                appointmentsCount: 4,
                nextAppointmentStartDate: "2099-05-20",
                nextAppointmentStartTimeHour: 9,
                nextAppointmentId: 70,
                historicalAppointments: [],
                attachmentsCount: 2,
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

  it("renders appointments, notes and attachments in the visible customer card footer", () => {
    mockCustomers(2);

    const markup = renderToStaticMarkup(<CustomersPage />);

    expect(markup).toContain("Termine:4");
    expect(markup).toContain("Notizen:2");
    expect(markup).toContain("Anhänge:2");
    expect(appointmentPreviewCalls[0]).toMatchObject({
      triggerTestId: "text-customer-planned-appointments-7",
      source: { type: "customer", id: 7, count: 4 },
    });
    expect(notesPreviewCalls[0]).toMatchObject({
      sourceMode: "single-parent",
      triggerTestId: "text-customer-notes-count-7",
      sources: { type: "customer", id: 7, count: 2 },
    });
    expect(attachmentPreviewCalls[0]).toMatchObject({
      customerId: 7,
      totalAttachmentsCount: 2,
    });
    expect(renderToStaticMarkup(entityCardCalls[0].headerMeta as React.ReactElement)).toContain("K-Nr. K-007");
  });

  it("keeps the notes badge visible with count 0", () => {
    mockCustomers(0);

    const markup = renderToStaticMarkup(<CustomersPage />);

    expect(markup).toContain("Notizen:0");
    expect(notesPreviewCalls[0]).toMatchObject({
      sources: { type: "customer", id: 7, count: 0 },
    });
  });

  it("keeps the entity card footer explicitly visible", () => {
    mockCustomers(1);
    renderToStaticMarkup(<CustomersPage />);

    expect(entityCardCalls[0]).toMatchObject({
      testId: "customer-card-7",
      footerVisibility: "visible",
    });
  });
});
