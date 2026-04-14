/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Konfliktmarkierungen auf Monatsbars werden als deutlich sichtbare Badge gerendert.
 * - Nicht-Konflikt-Bars erhalten keine Konflikt-Badge.
 * - Blockierte Monatsbars dimmen ihre Tourfarbe sichtbar ab.
 *
 * Fehlerfaelle:
 * - Der Konflikthinweis bleibt nur als kleines Overlay-Symbol erhalten.
 * - Normale Bars zeigen versehentlich eine Konfliktmarkierung.
 * - Blockierte Monatsbars bleiben trotz Sperrstatus vollsaettigt.
 *
 * Ziel:
 * Die auffaelligere Konflikt-Darstellung der CalendarAppointmentCompactBar regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarAppointmentCompactBar } from "../../../client/src/components/calendar/CalendarAppointmentCompactBar";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";

function createAppointment(overrides: Partial<CalendarAppointment> = {}): CalendarAppointment {
  return {
    id: 17,
    version: 1,
    projectId: null,
    projectName: "Projekt",
    projectVersion: null,
    projectOrderNumber: "A-100",
    projectArticleItems: [],
    projectDescription: null,
    project: null,
    startDate: "2099-05-12",
    endDate: null,
    startTime: null,
    tourId: 4,
    tourName: "Tour Blau",
    tourColor: "#225588",
    customer: {
      id: 7,
      customerNumber: "C-17",
      fullName: "Kunde Test",
      postalCode: "12345",
      city: "Berlin",
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

describe("CalendarAppointmentCompactBar conflict badge", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders a high-contrast conflict badge on conflict bars", () => {
    const html = renderToStaticMarkup(
      <CalendarAppointmentCompactBar
        appointment={createAppointment()}
        isFirstDay
        isLastDay
        isConflict
        showPopover={false}
      />,
    );

    expect(html).toContain("appointment-bar-conflict-icon-17");
    expect(html).toContain("Konflikt");
    expect(html).toContain("text-white");
    expect(html).toContain("ring-2");
    expect(html).toContain("ring-white");
  });

  it("does not render a conflict badge when the bar is not marked as conflict", () => {
    const html = renderToStaticMarkup(
      <CalendarAppointmentCompactBar
        appointment={createAppointment()}
        isFirstDay
        isLastDay
        isConflict={false}
        showPopover={false}
      />,
    );

    expect(html).not.toContain("appointment-bar-conflict-icon-17");
    expect(html).not.toContain("Konflikt");
  });

  it("dims blocked compact bars so the slot overlay stays readable", () => {
    const html = renderToStaticMarkup(
      <CalendarAppointmentCompactBar
        appointment={createAppointment()}
        isFirstDay
        isLastDay
        isBlocked
        showPopover={false}
      />,
    );

    expect(html).toContain("filter:saturate(0.38) brightness(0.82)");
    expect(html).toContain("opacity:0.86");
  });
});
