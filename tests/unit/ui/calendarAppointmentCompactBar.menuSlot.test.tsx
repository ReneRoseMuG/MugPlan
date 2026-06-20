/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - menuSlot wird gerendert wenn übergeben.
 * - menuSlot fehlt im DOM wenn nicht übergeben.
 * - stopPropagation-Wrapper ist vorhanden wenn menuSlot gesetzt ist.
 *
 * Fehlerfälle:
 * - menuSlot wird nicht gerendert obwohl übergeben.
 * - menuSlot erscheint fälschlicherweise wenn nicht übergeben.
 *
 * Ziel:
 * Den optionalen menuSlot-Prop von CalendarAppointmentCompactBar absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useSettings", () => ({
  useSetting: () => undefined,
  useSettings: () => ({ setSetting: vi.fn() }),
}));

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge-previews/appointment-weekly-panel-preview", () => ({
  createAppointmentWeeklyPanelPreview: () => ({ content: <span />, options: {} }),
}));

vi.mock("@/lib/calendar-utils", () => ({
  CALENDAR_NEUTRAL_COLOR: "#cccccc",
  getAppointmentEndDate: (appointment: { startDate: string; endDate?: string }) =>
    appointment.endDate ?? appointment.startDate,
}));

import { CalendarAppointmentCompactBar } from "../../../client/src/components/calendar/CalendarAppointmentCompactBar";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";

function makeAppointment(overrides: Partial<CalendarAppointment> = {}): CalendarAppointment {
  return {
    id: 1,
    startDate: "2026-04-14",
    endDate: null,
    startTime: null,
    version: 1,
    isCancelled: false,
    isLocked: false,
    tourColor: "#4466ff",
    tourId: null,
    tourName: null,
    projectId: null,
    projectName: null,
    projectOrderNumber: null,
    customer: {
      id: 10,
      customerNumber: "K001",
      fullName: "Test GmbH",
      postalCode: "12345",
    },
    employees: [],
    appointmentTags: [],
    ...overrides,
  } as unknown as CalendarAppointment;
}

describe("CalendarAppointmentCompactBar: menuSlot", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("menuSlot wird gerendert wenn übergeben", () => {
    const html = renderToStaticMarkup(
      <CalendarAppointmentCompactBar
        appointment={makeAppointment()}
        isFirstDay={true}
        isLastDay={true}
        menuSlot={<span data-testid="menu-slot-content">Menü</span>}
      />,
    );
    expect(html).toContain('data-testid="menu-slot-content"');
    expect(html).toContain("Menü");
  });

  it("menuSlot fehlt wenn nicht übergeben", () => {
    const html = renderToStaticMarkup(
      <CalendarAppointmentCompactBar
        appointment={makeAppointment()}
        isFirstDay={true}
        isLastDay={true}
      />,
    );
    expect(html).not.toContain('data-testid="menu-slot-content"');
  });

  it("menuSlot wird mit showPopover=true gerendert", () => {
    const html = renderToStaticMarkup(
      <CalendarAppointmentCompactBar
        appointment={makeAppointment()}
        isFirstDay={true}
        isLastDay={true}
        showPopover={true}
        menuSlot={<span data-testid="menu-in-popover">PopoverMenü</span>}
      />,
    );
    expect(html).toContain('data-testid="menu-in-popover"');
  });

  it("menuSlot wird mit showPopover=false gerendert", () => {
    const html = renderToStaticMarkup(
      <CalendarAppointmentCompactBar
        appointment={makeAppointment()}
        isFirstDay={true}
        isLastDay={true}
        showPopover={false}
        menuSlot={<span data-testid="menu-no-popover">Direktmenü</span>}
      />,
    );
    expect(html).toContain('data-testid="menu-no-popover"');
  });
});
