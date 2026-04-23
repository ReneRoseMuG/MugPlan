/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Jahresansicht blendet fuer Leser alle Tages-Create-Buttons aus.
 * - Schreibberechtigte Rollen behalten die vorhandenen Tages-Create-Buttons.
 *
 * Fehlerfaelle:
 * - Leser sehen weiterhin `+`-Einstiege zur Terminanlage in der Jahresansicht.
 * - Die neue Leser-Sperre blendet die Jahresanlage versehentlich fuer alle Rollen aus.
 *
 * Ziel:
 * Die Leser-Readonly-Verdrahtung der Jahresansicht ueber sichtbare Create-Einstiege regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useCalendarAppointmentsMock = vi.fn();

vi.mock("@/lib/calendar-appointments", async () => {
  const actual = await vi.importActual<typeof import("../../../client/src/lib/calendar-appointments")>(
    "../../../client/src/lib/calendar-appointments",
  );
  return {
    ...actual,
    useCalendarAppointments: (options: unknown) => useCalendarAppointmentsMock(options),
  };
});

vi.mock("@/lib/project-appointments", () => ({
  getBerlinTodayDateString: () => "2099-01-01",
}));

describe("calendar year view reader readonly", () => {
  beforeEach(() => {
    useCalendarAppointmentsMock.mockReset();
    useCalendarAppointmentsMock.mockReturnValue({ data: [] });
    vi.stubGlobal("React", React);
  });

  it("hides future create buttons when the year view is readonly", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "READER",
      },
    });

    const { CalendarYearView } = await import("../../../client/src/components/calendar/CalendarYearView");
    const markup = renderToStaticMarkup(
      <CalendarYearView currentDate={new Date("2099-01-01T00:00:00Z")} readOnly />,
    );

    expect(markup).not.toContain("button-new-appointment-year-2099-01-01");
  });

  it("keeps future create buttons for writable roles", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "ADMIN",
      },
    });

    const { CalendarYearView } = await import("../../../client/src/components/calendar/CalendarYearView");
    const markup = renderToStaticMarkup(
      <CalendarYearView currentDate={new Date("2099-01-01T00:00:00Z")} />,
    );

    expect(markup).toContain("button-new-appointment-year-2099-01-01");
  });
});
