/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Tages- und Mehrtagestermine zeigen links den Kundennamen mit Kundennummer.
 * - Das alte "Name:"-Label erscheint nicht mehr in der Monatsbar.
 * - Die PLZ bleibt weiterhin als eigener rechter Inhalt sichtbar.
 *
 * Fehlerfälle:
 * - Tagestermine zeigen weiterhin nur die Kundennummer.
 * - Mehrtagestermine rendern erneut das alte "Name:"-Label.
 * - Die rechte PLZ-Angabe verschwindet bei langem Kundeninhalt.
 *
 * Ziel:
 * Die sichtbare Kundenbeschriftung der CalendarAppointmentCompactBar regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarAppointmentCompactBar } from "../../../client/src/components/calendar/CalendarAppointmentCompactBar";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";

function createAppointment(overrides: Partial<CalendarAppointment> = {}): CalendarAppointment {
  return {
    id: 23,
    version: 1,
    projectId: 9,
    projectName: "Projekt Blau",
    projectVersion: null,
    projectOrderNumber: "A-900",
    projectArticleItems: [],
    projectDescription: null,
    project: null,
    startDate: "2099-04-14",
    endDate: null,
    startTime: "08:30",
    tourId: 2,
    tourName: "Tour Nord",
    tourColor: "#227799",
    customer: {
      id: 5,
      customerNumber: "163273",
      fullName: "Hannig, Patrick",
      postalCode: "74889",
      city: "Sinsheim",
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
  } as CalendarAppointment;
}

describe("CalendarAppointmentCompactBar customer label", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("shows customer full name with customer number on same-day bars", () => {
    const html = renderToStaticMarkup(
      <CalendarAppointmentCompactBar
        appointment={createAppointment()}
        isFirstDay
        isLastDay
        showPopover={false}
      />,
    );

    expect(html).toContain("Hannig, Patrick");
    expect(html).toContain(" - 163273");
    expect(html).toContain("PLZ: 74889");
    expect(html).not.toContain("A-900");
  });

  it("removes the legacy name label on multi-day bars while keeping the postal code visible", () => {
    const html = renderToStaticMarkup(
      <CalendarAppointmentCompactBar
        appointment={createAppointment({
          startDate: "2099-04-14",
          endDate: "2099-04-16",
          startTime: null,
        })}
        isFirstDay
        isLastDay={false}
        showPopover={false}
      />,
    );

    expect(html).toContain("Hannig, Patrick");
    expect(html).toContain(" - 163273");
    expect(html).toContain("PLZ: 74889");
    expect(html).not.toContain("Name:");
    expect(html).not.toContain("K: 163273");
  });
});
