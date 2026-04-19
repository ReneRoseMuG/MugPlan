/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Standard- und Mehrtagesterminkarten verwenden dieselbe zusätzliche Footer-Höhe sowie gemeinsame Header-/Footer-Mindesthöhen.
 * - Beide Wochenkarten rendern denselben dezent tourfarbenen Footer-Rahmen und denselben sichtbaren Body-Container.
 * - Compact- und Collapsed-Varianten behalten die äußere Kartenhöhe und verdichten nur den Inhalt.
 *
 * Fehlerfälle:
 * - Mehrtagestermine weichen bei Höhe, Header oder Footer-Fläche wieder von normalen Terminkarten ab.
 * - Compact- oder Collapsed-Karten verlieren ihre gemeinsame Außenhöhe.
 *
 * Ziel:
 * Die sichtbare Layout-Angleichung der Wochenkartenfamilie regressionssicher absichern.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarWeekAppointmentPanel, WEEK_CARD_FOOTER_SAFE_SPACE_PX } from "../../../client/src/components/calendar/CalendarWeekAppointmentPanel";
import { CalendarWeekSpanningTile, WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX } from "../../../client/src/components/calendar/CalendarWeekSpanningTile";
import { CalendarWeekAppointmentPanelHeader } from "../../../client/src/components/calendar/CalendarWeekAppointmentPanelHeader";
import {
  WEEK_APPOINTMENT_CARD_FOOTER_MIN_HEIGHT_PX,
  WEEK_APPOINTMENT_CARD_HEADER_MIN_HEIGHT_PX,
} from "../../../client/src/components/calendar/weekAppointmentCardStyles";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";

const customerPanelCalls: Array<Record<string, unknown>> = [];
const projectPanelCalls: Array<Record<string, unknown>> = [];

vi.mock("../../../client/src/components/calendar/CalendarWeekAppointmentPanelCustomer", () => ({
  CalendarWeekAppointmentPanelCustomer: (props: Record<string, unknown>) => {
    customerPanelCalls.push(props);
    return <div data-testid="mock-week-customer-panel" />;
  },
}));

vi.mock("../../../client/src/components/calendar/CalendarWeekAppointmentPanelProject", () => ({
  CalendarWeekAppointmentPanelProject: (props: Record<string, unknown>) => {
    projectPanelCalls.push(props);
    return <div data-testid="mock-week-project-panel" />;
  },
}));

vi.mock("../../../client/src/components/calendar/CalendarWeekAppointmentEmployeesHover", () => ({
  CalendarWeekAppointmentEmployeesHover: () => <div data-testid="mock-week-employees-hover" />,
}));

vi.mock("../../../client/src/components/calendar/CalendarWeekAppointmentNotesHover", () => ({
  CalendarWeekAppointmentNotesHover: () => <div data-testid="mock-week-notes-hover" />,
}));

vi.mock("../../../client/src/components/calendar/CalendarWeekAppointmentAttachmentsHover", () => ({
  CalendarWeekAppointmentAttachmentsHover: () => <div data-testid="mock-week-attachments-hover" />,
}));

vi.mock("../../../client/src/components/calendar/CalendarWeekAppointmentTagPicker", () => ({
  CalendarWeekAppointmentTagPicker: (props: { testId: string; canEdit: boolean }) => (
    <div data-testid={props.testId} data-can-edit={props.canEdit ? "true" : "false"} />
  ),
}));

vi.mock("../../../client/src/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children?: React.ReactNode }) => <div data-testid="mock-dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="mock-dropdown-content">{children}</div>,
  DropdownMenuItem: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => <button type="button" {...props}>{children}</button>,
}));

function createAppointment(overrides: Partial<CalendarAppointment> = {}): CalendarAppointment {
  return {
    id: 42,
    version: 1,
    projectId: 12,
    projectName: "Projekt Delta",
    projectVersion: 3,
    projectOrderNumber: "A-100",
    projectArticleItems: [{ label: "Artikel", value: "Wert" }],
    projectDescription: "<p>Beschreibung</p>",
    project: null,
    startDate: "2099-03-01",
    endDate: "2099-03-03",
    startTime: "08:00",
    tourId: 9,
    tourName: "Tour 9",
    tourColor: "#225588",
    customer: {
      id: 7,
      customerNumber: "C-7",
      fullName: "Kunde Test",
      postalCode: "12345",
      city: "Berlin",
      addressLine1: "Musterstraße 1",
      phone: "0123 456",
      email: "kunde@example.test",
    },
    customerNotesCount: 1,
    projectNotesCount: 1,
    appointmentNotesCount: 1,
    customerAttachmentsCount: 0,
    projectAttachmentsCount: 0,
    appointmentAttachmentsCount: 0,
    totalAttachmentsCount: 1,
    appointmentTags: [],
    customerTags: [],
    projectTags: [],
    displayMode: "standard",
    employees: [{ id: 3, fullName: "Mitarbeiter Eins" }],
    isLocked: false,
    isCancelled: false,
    ...overrides,
  };
}

function renderWithQueryClient(node: React.ReactNode): string {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      {node}
    </QueryClientProvider>,
  );
}

describe("calendar week appointment card layout", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    customerPanelCalls.length = 0;
    projectPanelCalls.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps standard and spanning cards on the same footer height budget", () => {
    expect(WEEK_CARD_FOOTER_SAFE_SPACE_PX).toBe(WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX);

    const appointment = createAppointment();

    const html = renderWithQueryClient(
      <>
        <CalendarWeekAppointmentPanel
          appointment={appointment}
          context="week-calendar"
          uniformHeightPx={240}
        />
        <CalendarWeekSpanningTile
          appointment={appointment}
          spanColumns={2}
          visibleStartDate="2099-03-01"
          visibleDayNumberStart={1}
          uniformHeightPx={240}
        />
      </>,
    );

    expect(html).toContain('data-testid="week-appointment-panel-42"');
    expect(html).toContain('data-testid="week-spanning-tile-42"');
    expect(html.match(/height:260px/g)).toHaveLength(2);
    expect(html.match(new RegExp(`min-height:${WEEK_APPOINTMENT_CARD_HEADER_MIN_HEIGHT_PX}px`, "g"))).toHaveLength(2);
    expect(html.match(new RegExp(`min-height:${WEEK_APPOINTMENT_CARD_FOOTER_MIN_HEIGHT_PX}px`, "g"))).toHaveLength(2);
  });

  it("renders the same compact content insets and tinted footer on both card types", () => {
    const appointment = createAppointment();

    const html = renderWithQueryClient(
      <>
        <CalendarWeekAppointmentPanel
          appointment={appointment}
          context="week-calendar"
        />
        <CalendarWeekSpanningTile
          appointment={appointment}
          spanColumns={3}
          visibleStartDate="2099-03-01"
          visibleDayNumberStart={1}
        />
      </>,
    );

    expect(html).toContain('data-testid="week-appointment-content-42"');
    expect(html.match(/class="relative flex min-h-0 flex-1 flex-col bg-white\/90 px-1 pt-1 pb-2"/g)).toHaveLength(2);
    expect(html).toContain('data-testid="week-spanning-tile-content-42"');
    expect(html).toContain('data-testid="week-appointment-footer-42"');
    expect(html).toContain('data-testid="week-spanning-tile-footer-42"');
    expect(html.match(/background-color:rgba\(34, 85, 136, 0\.1\);border-top-color:rgba\(34, 85, 136, 0\.22\)/g)).toHaveLength(2);
  });

  it("keeps the tag action slot local to week cards and opt-in for editing", () => {
    const appointment = createAppointment();

    const html = renderWithQueryClient(
      <>
        <CalendarWeekAppointmentPanel
          appointment={appointment}
          context="week-calendar"
          showTagActions
          canEditTags
        />
        <CalendarWeekSpanningTile
          appointment={appointment}
          spanColumns={2}
          visibleStartDate="2099-03-01"
          visibleDayNumberStart={1}
          showTagActions
          canEditTags
        />
        <CalendarWeekAppointmentPanel
          appointment={appointment}
          context="week-calendar"
        />
      </>,
    );

    expect(html).toContain('data-testid="week-appointment-tags-42"');
    expect(html).toContain('data-testid="week-spanning-tile-tags-42"');
    expect(html).toContain('data-can-edit="true"');
    expect(html).toContain('data-can-edit="false"');
  });

  it("keeps the footer tag row bottom-docked on both week card variants", () => {
    const appointment = createAppointment();

    const html = renderWithQueryClient(
      <>
        <CalendarWeekAppointmentPanel
          appointment={appointment}
          context="week-calendar"
          showTagActions
          canEditTags
          uniformHeightPx={240}
        />
        <CalendarWeekSpanningTile
          appointment={appointment}
          spanColumns={2}
          visibleStartDate="2099-03-01"
          visibleDayNumberStart={1}
          showTagActions
          canEditTags
          uniformHeightPx={240}
        />
      </>,
    );

    expect(html.match(/class="grid h-full grid-rows-\[1\.75rem_1\.75rem\] gap-1"/g)).toHaveLength(2);
    expect(html.match(/class="h-7 overflow-hidden"/g)).toHaveLength(2);
    expect(html).toContain('data-testid="week-spanning-tile-body-filled-42"');
    expect(html).toContain('class="flex min-h-0 h-full flex-col bg-white/90"');
    expect(html).toContain('class="flex min-h-0 flex-1 flex-col"');
    expect(html).toContain('data-testid="week-appointment-tags-42"');
    expect(html).toContain('data-testid="week-spanning-tile-tags-42"');
  });

  it("renders the schraffierte conflict overlay on both week card variants", () => {
    const appointment = createAppointment();

    const html = renderWithQueryClient(
      <>
        <CalendarWeekAppointmentPanel
          appointment={appointment}
          context="week-calendar"
          isConflict
        />
        <CalendarWeekSpanningTile
          appointment={appointment}
          spanColumns={2}
          visibleStartDate="2099-03-01"
          visibleDayNumberStart={1}
          isConflict
        />
      </>,
    );

    expect(html).toContain('data-testid="week-appointment-conflict-overlay-42"');
    expect(html).toContain('data-testid="week-spanning-tile-conflict-overlay-42"');
    expect(html).toContain("group-hover/calendar-card:opacity-25");
    expect(html).toContain("pointer-events-none absolute inset-0");
    expect(html).toContain("opacity-100 transition-opacity duration-200");
  });

  it("dims the colored header chrome on blocked week card variants", () => {
    const appointment = createAppointment();

    const html = renderWithQueryClient(
      <>
        <CalendarWeekAppointmentPanel
          appointment={appointment}
          context="week-calendar"
          isBlocked
        />
        <CalendarWeekSpanningTile
          appointment={appointment}
          spanColumns={2}
          visibleStartDate="2099-03-01"
          visibleDayNumberStart={1}
          isBlocked
        />
      </>,
    );

    expect(html).toContain("filter:saturate(0.38) brightness(0.82)");
    expect(html).toContain("opacity:0.86");
  });

  it("keeps both sub panels visible in collapsed body mode while reducing the card shell height", () => {
    const appointment = createAppointment();

    const html = renderWithQueryClient(
      <>
        <CalendarWeekAppointmentPanel
          appointment={appointment}
          context="week-calendar"
          weekTileBodyMode="collapsed"
          uniformHeightPx={240}
        />
        <CalendarWeekSpanningTile
          appointment={appointment}
          spanColumns={2}
          weekTileBodyMode="collapsed"
          visibleStartDate="2099-03-01"
          visibleDayNumberStart={1}
          uniformHeightPx={240}
        />
      </>,
    );

    expect(customerPanelCalls).toHaveLength(2);
    expect(customerPanelCalls.every((call) => call.mode === "collapsed")).toBe(true);
    expect(projectPanelCalls).toHaveLength(2);
    expect(projectPanelCalls.every((call) => call.collapsed === true)).toBe(true);
    expect(projectPanelCalls.every((call) => call.className === "h-8 overflow-hidden")).toBe(true);
    expect(html).not.toContain("height:260px");
    expect(html).toContain('class="flex shrink-0 flex-col"');
    expect(html).toContain('class="relative shrink-0 flex flex-col bg-white/90 px-1 pt-1 pb-0"');
  });

  it("keeps single-day collapsed body cards on the reduced shell and removes the extra body height", () => {
    const appointment = createAppointment();

    const html = renderWithQueryClient(
      <CalendarWeekAppointmentPanel
        appointment={appointment}
        context="week-calendar"
        weekTileBodyMode="collapsed"
        uniformHeightPx={240}
      />,
    );

    expect(customerPanelCalls).toHaveLength(1);
    expect(customerPanelCalls[0]?.mode).toBe("collapsed");
    expect(customerPanelCalls[0]?.className).toBe("h-8 overflow-hidden");
    expect(projectPanelCalls).toHaveLength(1);
    expect(projectPanelCalls[0]?.collapsed).toBe(true);
    expect(projectPanelCalls[0]?.className).toBe("h-8 overflow-hidden");
    expect(html).toContain('data-testid="week-appointment-content-42"');
    expect(html).toContain('data-testid="week-appointment-footer-42"');
    expect(html).not.toContain('height:260px');
    expect(html).toContain("grid-template-rows:2rem 2rem");
    expect(html).toContain('class="flex shrink-0 flex-col"');
    expect(html).toContain('class="relative shrink-0 flex flex-col bg-white/90 px-1 pt-1 pb-0"');
    expect(html).toContain('class="grid shrink-0 content-start gap-1 overflow-hidden"');
    expect(html).toContain('class="relative shrink-0 border-t px-1 py-1"');
  });

  it("hides the header menu trigger for historical non-Parkplatz appointments on both card types", () => {
    const appointment = createAppointment({ startDate: "2000-01-01" });

    const html = renderWithQueryClient(
      <>
        <CalendarWeekAppointmentPanel
          appointment={appointment}
          context="week-calendar"
        />
        <CalendarWeekSpanningTile
          appointment={appointment}
          spanColumns={2}
          visibleStartDate="2000-01-01"
          visibleDayNumberStart={1}
        />
      </>,
    );

    expect(html).not.toContain('week-appointment-menu-trigger-42');
    expect(html).not.toContain('week-spanning-tile-menu-trigger-42');
    expect(html).not.toContain("Termin löschen");
  });

  it("keeps the header menu trigger for historical Parkplatz appointments on both card types", () => {
    const appointment = createAppointment({
      startDate: "2000-01-01",
      tourName: "Parkplatz",
    });

    const html = renderWithQueryClient(
      <>
        <CalendarWeekAppointmentPanel
          appointment={appointment}
          context="week-calendar"
        />
        <CalendarWeekSpanningTile
          appointment={appointment}
          spanColumns={2}
          visibleStartDate="2000-01-01"
          visibleDayNumberStart={1}
        />
      </>,
    );

    expect(html).toContain('week-appointment-menu-trigger-42');
    expect(html).toContain('week-spanning-tile-menu-trigger-42');
    expect(html).toContain("Termin");
  });

  it("renders the delete menu action for editable week appointments on both card types", () => {
    const appointment = createAppointment();

    const html = renderWithQueryClient(
      <>
        <CalendarWeekAppointmentPanel
          appointment={appointment}
          context="week-calendar"
        />
        <CalendarWeekSpanningTile
          appointment={appointment}
          spanColumns={2}
          visibleStartDate="2099-03-01"
          visibleDayNumberStart={1}
        />
      </>,
    );

    expect(html).toContain('week-appointment-menu-trigger-42');
    expect(html).toContain('week-spanning-tile-menu-trigger-42');
    expect(html.match(/Termin löschen/g)).toHaveLength(2);
  });
  it("passes expanded week cards through the existing expanded customer panel path and keeps project panel rendering local", () => {
    const appointment = createAppointment();

    renderWithQueryClient(
      <CalendarWeekAppointmentPanel
        appointment={appointment}
        context="week-calendar"
        weekTileBodyMode="expanded"
      />,
    );

    expect(customerPanelCalls).toHaveLength(1);
    expect(customerPanelCalls[0]?.mode).toBe("expanded");
    expect(projectPanelCalls).toHaveLength(1);
  });

  it("marks the single-card header date as the first responsive hide target while keeping key identifiers no-wrap", () => {
    const html = renderWithQueryClient(
      <CalendarWeekAppointmentPanelHeader
        customerNumber="K-17"
        postalCode="12345"
        color="#225588"
        startDate="2099-03-01"
        endDate={null}
        startTime="08:15"
      />,
    );

    expect(html).toContain("data-role=\"header-time\"");
    expect(html).toContain("data-role=\"header-date\"");
    expect(html).toContain("data-role=\"header-separator\"");
    expect(html).toContain("@container(max-width:110px)");
    expect(html).toContain("min-w-0 truncate");
    expect(html).toContain("whitespace-nowrap");
  });
});
