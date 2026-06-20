/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ist eine Benutzerfarbe für die tourId gesetzt, überschreibt diese den Luminanz-Fallback.
 * - Ohne Benutzerfarbe liefert ein dunkler Hintergrund weißen Text (#ffffff).
 * - Ohne Benutzerfarbe liefert ein heller Hintergrund dunklen Text (#1a1a1a).
 * - tourId null: kein Benutzerfarb-Lookup; Luminanz-Fallback greift.
 *
 * Fehlerfälle:
 * - Benutzerfarbe wird ignoriert und der Luminanz-Fallback überschreibt sie.
 * - tourId null löst einen Fehler aus statt sauber auf den Fallback zu fallen.
 *
 * Ziel:
 * Die textColor-Logik des CompactBars (Monatskalender) gegen Luminanz-Fallback
 * und benutzerdefinierten Farboverride absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";

let useSettingReturnValue: Record<string, string> = {};

vi.mock("@/hooks/useSettings", () => ({
  useSetting: () => useSettingReturnValue,
}));

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/badge-previews/appointment-weekly-panel-preview", () => ({
  createAppointmentWeeklyPanelPreview: () => ({ content: null, options: {} }),
}));

import { CalendarAppointmentCompactBar } from "../../../client/src/components/calendar/CalendarAppointmentCompactBar";

function makeAppointment(overrides: Partial<CalendarAppointment> = {}): CalendarAppointment {
  return {
    id: 1,
    version: 1,
    projectId: null,
    projectName: null,
    projectVersion: null,
    projectOrderNumber: null,
    projectArticleItems: [],
    projectDescription: null,
    project: null,
    startDate: "2099-03-01",
    endDate: "2099-03-01",
    startTime: null,
    tourId: 7,
    tourName: "Nordtour",
    tourColor: "#225577",
    customer: {
      id: 1,
      customerNumber: "C-1",
      fullName: "Testkunde",
      postalCode: "12345",
      city: "Berlin",
      addressLine1: "Musterstraße 1",
      phone: null,
      email: null,
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

describe("CalendarAppointmentCompactBar textColor logic", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    useSettingReturnValue = {};
  });

  it("applies the user color when one is set for the tour", () => {
    useSettingReturnValue = { "7": "#cc3300" };
    const html = renderToStaticMarkup(
      <CalendarAppointmentCompactBar
        appointment={makeAppointment({ tourId: 7, tourColor: "#225577" })}
        isFirstDay
        isLastDay
      />,
    );
    expect(html).toContain("#cc3300");
  });

  it("falls back to white text for a dark background when no user color is set", () => {
    useSettingReturnValue = {};
    // #225577: luminance ≈ 0.29 → below 0.55 threshold → #ffffff
    const html = renderToStaticMarkup(
      <CalendarAppointmentCompactBar
        appointment={makeAppointment({ tourId: 7, tourColor: "#225577" })}
        isFirstDay
        isLastDay
      />,
    );
    expect(html).toContain("#ffffff");
  });

  it("falls back to dark text for a light background when no user color is set", () => {
    useSettingReturnValue = {};
    // #f5f0e8: luminance ≈ 0.94 → above 0.55 threshold → #1a1a1a
    const html = renderToStaticMarkup(
      <CalendarAppointmentCompactBar
        appointment={makeAppointment({ tourId: 7, tourColor: "#f5f0e8" })}
        isFirstDay
        isLastDay
      />,
    );
    expect(html).toContain("#1a1a1a");
  });

  it("does not apply a user color when tourId is null and uses luminance fallback instead", () => {
    useSettingReturnValue = { "7": "#cc3300" };
    // tourId is null — user color map entry "7" must not be applied
    const html = renderToStaticMarkup(
      <CalendarAppointmentCompactBar
        appointment={makeAppointment({ tourId: null, tourColor: "#225577" })}
        isFirstDay
        isLastDay
      />,
    );
    expect(html).not.toContain("#cc3300");
    // Dark background → luminance fallback returns #ffffff
    expect(html).toContain("#ffffff");
  });
});
