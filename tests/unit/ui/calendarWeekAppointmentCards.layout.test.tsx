/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Standard- und Mehrtagesterminkarten verwenden dieselbe zusätzliche Footer-Höhe.
 * - Beide Wochenkarten rendern denselben dezent tourfarbenen Footer-Rahmen.
 * - Beide Wochenkarten verwenden denselben kompakten Content-Inset für Panels und Footer.
 *
 * Fehlerfälle:
 * - Mehrtagestermine weichen bei Höhe oder Footer-Fläche wieder von normalen Terminkarten ab.
 * - Panels und Footer erhalten unterschiedliche Innenabstände.
 *
 * Ziel:
 * Die sichtbare Layout-Angleichung der Wochenkartenfamilie regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarWeekAppointmentPanel, WEEK_CARD_FOOTER_SAFE_SPACE_PX } from "../../../client/src/components/calendar/CalendarWeekAppointmentPanel";
import { CalendarWeekSpanningTile, WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX } from "../../../client/src/components/calendar/CalendarWeekSpanningTile";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";

vi.mock("../../../client/src/components/calendar/CalendarWeekAppointmentPanelCustomer", () => ({
  CalendarWeekAppointmentPanelCustomer: () => <div data-testid="mock-week-customer-panel" />,
}));

vi.mock("../../../client/src/components/calendar/CalendarWeekAppointmentPanelProject", () => ({
  CalendarWeekAppointmentPanelProject: () => <div data-testid="mock-week-project-panel" />,
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

describe("calendar week appointment card layout", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps standard and spanning cards on the same footer height budget", () => {
    expect(WEEK_CARD_FOOTER_SAFE_SPACE_PX).toBe(WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX);

    const appointment = createAppointment();

    const html = renderToStaticMarkup(
      <>
        <CalendarWeekAppointmentPanel
          appointment={appointment}
          context="week-calendar"
          uniformHeightPx={240}
        />
        <CalendarWeekSpanningTile
          appointment={appointment}
          spanColumns={2}
          displayMode="detail"
          visibleStartDate="2099-03-01"
          visibleDayNumberStart={1}
          uniformHeightPx={240}
        />
      </>,
    );

    expect(html).toContain('data-testid="week-appointment-panel-42"');
    expect(html).toContain('data-testid="week-spanning-tile-42"');
    expect(html.match(/height:260px/g)).toHaveLength(2);
  });

  it("renders the same compact content insets and tinted footer on both card types", () => {
    const appointment = createAppointment();

    const html = renderToStaticMarkup(
      <>
        <CalendarWeekAppointmentPanel
          appointment={appointment}
          context="week-calendar"
        />
        <CalendarWeekSpanningTile
          appointment={appointment}
          spanColumns={3}
          displayMode="detail"
          visibleStartDate="2099-03-01"
          visibleDayNumberStart={1}
        />
      </>,
    );

    expect(html).toContain('data-testid="week-appointment-content-42"');
    expect(html).toContain('class="min-h-0 flex-1 px-1 pt-1"');
    expect(html).toContain('data-testid="week-spanning-tile-content-42"');
    expect(html).toContain('data-testid="week-appointment-footer-42"');
    expect(html).toContain('data-testid="week-spanning-tile-footer-42"');
    expect(html.match(/background-color:rgba\(34, 85, 136, 0\.1\);border-top-color:rgba\(34, 85, 136, 0\.22\)/g)).toHaveLength(2);
  });

  it("keeps the tag action slot local to week cards and opt-in for editing", () => {
    const appointment = createAppointment();

    const html = renderToStaticMarkup(
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
          displayMode="detail"
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
});
