/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Tour-PLZ-Wochenvorschau rendert den reduzierten Wochenkopf mit KW sowie Datumsbereich direkt am Wochencontainer.
 * - Die Vorschau erzwingt fuer Einzel- und Mehrtagestermine den Compact-/Collapsed-Pfad der bestehenden Wochenkarten.
 * - Die Tagesaktionen bleiben als `+`-Buttons pro Tag mit tourbezogenem Test-Id-Schema sichtbar.
 *
 * Fehlerfaelle:
 * - Der Wochenkopf am Wochencontainer verschwindet oder zeigt keine KW bzw. keinen Datumsbereich mehr.
 * - Die Vorschau verwendet nicht mehr die bestehenden Wochenkarten-Bausteine.
 * - Die `+`-Buttons pro Tag verschwinden oder verlieren ihre Tour-/Datumszuordnung.
 *
 * Ziel:
 * Die wiederverwendbare Tour-PLZ-Wochenvorschau gegen Layout- und Wiring-Regressionen absichern.
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";
import { TourPostalPlanWeekPreview } from "../../../client/src/components/calendar/TourPostalPlanWeekPreview";

const panelCalls: Array<Record<string, unknown>> = [];
const spanningCalls: Array<Record<string, unknown>> = [];

vi.mock("../../../client/src/components/calendar/CalendarWeekAppointmentPanel", () => ({
  CalendarWeekAppointmentPanel: (props: Record<string, unknown>) => {
    panelCalls.push(props);
    return <div data-testid={`panel-${String((props.appointment as { id?: number })?.id ?? "unknown")}`} />;
  },
}));

vi.mock("../../../client/src/components/calendar/CalendarWeekSpanningTile", () => ({
  CalendarWeekSpanningTile: (props: Record<string, unknown>) => {
    spanningCalls.push(props);
    return <div data-testid={`spanning-${String((props.appointment as { id?: number })?.id ?? "unknown")}`} />;
  },
}));

vi.mock("../../../client/src/components/calendar/CalendarWeekView", () => ({
  buildWeekLaneRenderData: () => ({
    spanningAppointments: [{ appointmentId: 1, rowIndex: 0 }],
    singleDayGridItems: [{ appointmentId: 2, gridColumn: 2, gridRow: 1 }],
    singleDayOverflowByBucket: [[], [], [], [], [], [], []],
    tileRowCount: 1,
    needsDayCellRow: false,
  }),
}));

function createAppointment(id: number, overrides: Partial<CalendarAppointment> = {}): CalendarAppointment {
  return {
    id,
    version: 1,
    projectId: 12,
    projectName: `Projekt ${id}`,
    projectVersion: 1,
    projectOrderNumber: `A-${id}`,
    projectArticleItems: [],
    projectDescription: null,
    startDate: "2099-04-20",
    endDate: null,
    startTime: "08:00",
    tourId: 7,
    tourName: "Tour 7",
    tourColor: "#225588",
    customer: {
      id,
      customerNumber: `K-${id}`,
      fullName: `Kunde ${id}`,
      postalCode: "26135",
      city: "Oldenburg",
    },
    customerNotesCount: 0,
    projectNotesCount: 0,
    appointmentNotesCount: 0,
    customerAttachmentsCount: 0,
    projectAttachmentsCount: 0,
    appointmentAttachmentsCount: 0,
    totalAttachmentsCount: 0,
    appointmentTags: [],
    customerTags: [],
    projectTags: [],
    displayMode: "standard",
    employees: [],
    isLocked: false,
    isCancelled: false,
    ...overrides,
  };
}

describe("TourPostalPlanWeekPreview", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    panelCalls.length = 0;
    spanningCalls.length = 0;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("renders week label and reduced weekday headers while keeping compact week cards plus create actions", () => {
    const html = renderToStaticMarkup(
      <TourPostalPlanWeekPreview
        weekStartDate="2099-04-20"
        tourId={7}
        tourName="Tour 7"
        tourColor="#225588"
        appointments={[
          createAppointment(1, { endDate: "2099-04-21" }),
          createAppointment(2, { startDate: "2099-04-21" }),
        ]}
        onCreateAppointment={() => undefined}
      />,
    );

    expect(html).toContain("Montag");
    expect(html).toContain("20.04.99");
    expect(html).toContain("KW 17 · 2099");
    expect(html).toContain("20.04.99 bis 26.04.99");
    expect(html).toContain("Tour 7");
    expect(html).toContain('data-testid="button-tour-postal-plan-create-2099-04-20-tour-7"');
    expect(html).toContain('data-testid="button-tour-postal-plan-create-2099-04-26-tour-7"');
    expect(spanningCalls).toHaveLength(1);
    expect(spanningCalls[0]?.weekTileBodyMode).toBe("collapsed");
    expect(panelCalls).toHaveLength(1);
    expect(panelCalls[0]?.weekTileBodyMode).toBe("collapsed");
  });
});
