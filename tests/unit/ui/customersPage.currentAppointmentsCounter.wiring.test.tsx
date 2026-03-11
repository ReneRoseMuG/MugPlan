/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Kundenkarte zeigt den Footer-Baustein fuer geplante Termine mit dem gelieferten Zaehlerwert.
 * - Die Kundenkarte bindet fuer Notizen den wiederverwendbaren EntityNotesHoverPreview-Trigger.
 * - Der Kartenfooter bleibt explizit sichtbar.
 *
 * Fehlerfaelle:
 * - Footer-Counter oder Notiz-Trigger gehen bei internen Refactorings verloren.
 * - Der Footer wird nicht mehr sichtbar an EntityCard uebergeben.
 *
 * Ziel:
 * Den Kundenkarten-Footer ueber gerenderte Komponenten-Props statt ueber Quelltext-Strings absichern.
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

import { CustomersPage } from "../../../client/src/components/CustomersPage";

describe("FT05+ customers page current appointments counter wiring", () => {
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
      filters: { lastName: "", customerNumber: "" },
      setFilter: vi.fn(),
      page: 1,
      setPage: vi.fn(),
    });
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
                notesCount: 2,
                plannedAppointmentsCount: 4,
                nextAppointmentStartDate: "2099-05-20",
                nextAppointmentStartTimeHour: 9,
              },
            ],
          },
          isLoading: false,
        };
      }
      return { data: undefined, isLoading: false };
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

  it("renders planned appointments and notes in the customer card footer", () => {
    const markup = renderToStaticMarkup(<CustomersPage />);

    expect(markup).toContain("Geplante Termine:4");
    expect(markup).toContain("Notizen:2");
    expect(appointmentBadgeCalls).toHaveLength(1);
    expect(appointmentBadgeCalls[0]).toMatchObject({
      count: 4,
      testId: "text-customer-planned-appointments-7",
      fullWidth: true,
    });
    expect(notesPreviewCalls).toHaveLength(1);
    expect(notesPreviewCalls[0]).toMatchObject({
      sourceMode: "single-parent",
      triggerTestId: "text-customer-notes-count-7",
      sources: { type: "customer", id: 7, count: 2 },
    });
  });

  it("keeps the entity card footer explicitly visible", () => {
    renderToStaticMarkup(<CustomersPage />);

    expect(entityCardCalls).toHaveLength(1);
    expect(entityCardCalls[0]).toMatchObject({
      testId: "customer-card-7",
      footerVisibility: "visible",
    });
  });
});
