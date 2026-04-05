/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Standalone-Wochenroute übersetzt gültige KW-/Jahr-Parameter in das erwartete aktuelle Kalenderdatum.
 * - Das sichtbare currentDate wird stabil als kw/year in die URL zurückgeschrieben.
 * - ISO-Jahreswechsel werden beim Zurückschreiben korrekt abgebildet.
 * - Fehlende oder ungültige Query-Parameter fallen auf "heute" zurück.
 *
 * Fehlerfälle:
 * - Die Route rendert mit einem falschen Wochenstart für gültige KW-/Jahr-Parameter.
 * - URL-Synchronisation schreibt falsche ISO-Werte oder driftet über den Jahreswechsel.
 * - Ungültige Query-Parameter führen nicht robust auf ein gültiges Tagesdatum zurück.
 *
 * Ziel:
 * Die Standalone-Wochenroutinglogik isoliert und ohne Browserlauf auf Lese-, Schreib- und Fallback-Verhalten absichern.
 */
import React from "react";
import { format, getISOWeek, getISOWeekYear } from "date-fns";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hookMocks = vi.hoisted(() => ({
  useState: vi.fn(),
  useEffect: vi.fn(),
}));

const captured = vi.hoisted(() => ({
  calendarWorkspaceProps: null as Record<string, unknown> | null,
}));

vi.mock("react", async (importOriginal) => {
  const ReactModule = await importOriginal<typeof import("react")>();
  return {
    ...ReactModule,
    useState: hookMocks.useState,
    useEffect: hookMocks.useEffect,
  };
});

vi.mock("@/components/CalendarWorkspace", () => ({
  CalendarWorkspace: (props: Record<string, unknown>) => {
    captured.calendarWorkspaceProps = props;
    return <div data-testid="calendar-workspace-marker">calendar-workspace</div>;
  },
}));

vi.mock("@/components/StandaloneLayout", () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div data-testid="standalone-layout-marker">{children}</div>,
}));

vi.mock("@/components/AppointmentForm", () => ({
  AppointmentForm: () => <div data-testid="appointment-form-marker">appointment-form</div>,
}));

import StandaloneCalendarWeek from "../../client/src/pages/StandaloneCalendarWeek";

function configureDefaultStateMocks() {
  hookMocks.useState.mockImplementation((initial: unknown) => [
    typeof initial === "function" ? (initial as () => unknown)() : initial,
    vi.fn(),
  ]);
}

function renderStandaloneWeek() {
  vi.stubGlobal("React", React);
  return renderToStaticMarkup(<StandaloneCalendarWeek />);
}

describe("standalone week routing", () => {
  beforeEach(() => {
    captured.calendarWorkspaceProps = null;
    vi.clearAllMocks();
    vi.useRealTimers();
    hookMocks.useEffect.mockImplementation(() => undefined);
    configureDefaultStateMocks();
  });

  it("translates the KW query parameters into the expected currentDate", () => {
    vi.stubGlobal("window", {
      location: {
        search: "?kw=14&year=2026",
        pathname: "/standalone/calendar/week",
      },
      history: {
        state: null,
        replaceState: vi.fn(),
      },
    });

    renderStandaloneWeek();

    const currentDate = captured.calendarWorkspaceProps?.currentDate;
    expect(currentDate).toBeInstanceOf(Date);
    expect(getISOWeek(currentDate as Date)).toBe(14);
    expect(getISOWeekYear(currentDate as Date)).toBe(2026);
    expect(format(currentDate as Date, "yyyy-MM-dd")).toBe("2026-03-30");
  });

  it("writes the currentDate back into stable kw and year query parameters", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: {
        search: "?foo=bar",
        pathname: "/standalone/calendar/week",
      },
      history: {
        state: { from: "test" },
        replaceState,
      },
    });

    const targetDate = new Date("2026-03-30T00:00:00.000Z");
    let stateCall = 0;
    hookMocks.useState.mockImplementation((initial: unknown) => {
      stateCall += 1;
      if (stateCall === 1) {
        return [targetDate, vi.fn()];
      }
      return [typeof initial === "function" ? (initial as () => unknown)() : initial, vi.fn()];
    });
    hookMocks.useEffect.mockImplementation((callback: () => void) => {
      callback();
    });

    renderStandaloneWeek();

    expect(replaceState).toHaveBeenCalledWith(
      { from: "test" },
      "",
      "/standalone/calendar/week?foo=bar&kw=14&year=2026",
    );
  });

  it("maps a year change from the last ISO week into the next ISO year correctly", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: {
        search: "",
        pathname: "/standalone/calendar/week",
      },
      history: {
        state: null,
        replaceState,
      },
    });

    const boundaryDate = new Date("2024-12-30T00:00:00.000Z");
    let stateCall = 0;
    hookMocks.useState.mockImplementation((initial: unknown) => {
      stateCall += 1;
      if (stateCall === 1) {
        return [boundaryDate, vi.fn()];
      }
      return [typeof initial === "function" ? (initial as () => unknown)() : initial, vi.fn()];
    });
    hookMocks.useEffect.mockImplementation((callback: () => void) => {
      callback();
    });

    renderStandaloneWeek();

    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/standalone/calendar/week?kw=1&year=2025",
    );
  });

  it("falls back to today when the week query is missing or invalid", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:34:56.000Z"));
    vi.stubGlobal("window", {
      location: {
        search: "?kw=99&year=abc",
        pathname: "/standalone/calendar/week",
      },
      history: {
        state: null,
        replaceState: vi.fn(),
      },
    });

    renderStandaloneWeek();

    const currentDate = captured.calendarWorkspaceProps?.currentDate;
    expect(currentDate).toBeInstanceOf(Date);
    expect((currentDate as Date).toISOString()).toBe("2026-04-05T12:34:56.000Z");
  });
});
