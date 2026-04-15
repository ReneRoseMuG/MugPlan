/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Auslastungsansicht rendert Monatsgruppen, Wochenkoepfe, Tageskoepfe und Terminzaehler aus dem festen 6-Wochen-Fenster.
 * - Leere Zeitraeume erhalten einen eigenen Empty State statt leerer Board-Struktur.
 * - Termin-Karten bleiben ueber den Oeffnen-Callback klickbar verdrahtet.
 *
 * Fehlerfaelle:
 * - Die Board-Ansicht verliert Monats- oder Wochenbeschriftungen.
 * - Leere Zeitraeume zeigen keinen klaren Fallback.
 * - Termin-Karten reichen den Oeffnen-Callback nicht mehr weiter.
 *
 * Ziel:
 * Das sichtbare Rendering und die Oeffnen-Verdrahtung der Mitarbeiter-Auslastungsansicht regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";

const buttonCalls: Array<Record<string, unknown>> = [];
const useCalendarAppointmentsMock = vi.fn();

vi.mock("@/components/ui/button", () => ({
  Button: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    buttonCalls.push(props);
    return <button type="button" data-testid={String(props["data-testid"] ?? "")}>{props.children}</button>;
  },
}));

vi.mock("@/lib/project-appointments", () => ({
  getBerlinTodayDateString: () => "2026-04-15",
}));

vi.mock("@/lib/calendar-appointments", () => ({
  useCalendarAppointments: (options: unknown) => useCalendarAppointmentsMock(options),
}));

function createAppointment(overrides: Partial<CalendarAppointment>): CalendarAppointment {
  return {
    id: 1,
    version: 1,
    projectId: 77,
    projectName: "Projekt Nord",
    projectVersion: 1,
    projectOrderNumber: null,
    projectArticleItems: [],
    projectDescription: null,
    project: null,
    startDate: "2026-04-15",
    endDate: null,
    startTime: "13:00:00",
    tourId: 9,
    tourName: "Tour Nord",
    tourColor: "#225588",
    customer: {
      id: 5,
      customerNumber: "K-100",
      fullName: "Kunde Nord",
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
    employees: [{ id: 11, fullName: "Mitarbeiter, Mia" }],
    isLocked: false,
    isCancelled: false,
    ...overrides,
  };
}

describe("employee appointments utilization board wiring", () => {
  beforeEach(() => {
    buttonCalls.length = 0;
    useCalendarAppointmentsMock.mockReset();
    Object.assign(globalThis, { React });
  });

  it("renders an explicit empty state when no appointments exist in the visible range", async () => {
    useCalendarAppointmentsMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    const { EmployeeAppointmentsUtilizationBoard } = await import(
      "../../../client/src/components/EmployeeAppointmentsUtilizationBoard"
    );
    const markup = renderToStaticMarkup(
      <EmployeeAppointmentsUtilizationBoard employeeId={17} userRole="DISPATCHER" />,
    );

    expect(markup).toContain("employee-appointments-utilization-board");
    expect(markup).toContain("employee-appointments-utilization-empty");
    expect(markup).toContain("In den nächsten 6 Wochen sind aktuell keine Termine");
  });

  it("renders visible board structure and keeps appointment cards wired to onOpenAppointment", async () => {
    const onOpenAppointment = vi.fn();
    useCalendarAppointmentsMock.mockReturnValue({
      data: [
        createAppointment({
          id: 41,
          startDate: "2026-04-15",
          startTime: "13:00:00",
          projectName: "Projekt Sichtbar",
        }),
      ],
      isLoading: false,
      error: null,
    });

    const { EmployeeAppointmentsUtilizationBoard } = await import(
      "../../../client/src/components/EmployeeAppointmentsUtilizationBoard"
    );
    const markup = renderToStaticMarkup(
      <EmployeeAppointmentsUtilizationBoard
        employeeId={17}
        userRole="DISPATCHER"
        onOpenAppointment={onOpenAppointment}
      />,
    );

    expect(markup).toContain("employee-appointments-utilization-range");
    expect(markup).toContain("13.04.26 - 24.05.26");
    expect(markup).toContain("employee-appointments-utilization-month-2026-04");
    expect(markup).toContain("April 2026");
    expect(markup).toContain("employee-appointments-utilization-week-2026-04-13");
    expect(markup).toContain("KW 16 / 2026");
    expect(markup).toContain("employee-appointments-utilization-day-2026-04-15");
    expect(markup).toContain("1 Termin");
    expect(markup).toContain("Projekt Sichtbar");
    expect(markup).toContain("Tour Nord");

    const openButton = buttonCalls.find(
      (entry) => entry["data-testid"] === "button-employee-utilization-appointment-41-2026-04-15",
    );
    expect(openButton).toBeDefined();
    expect(typeof openButton?.onClick).toBe("function");

    (openButton?.onClick as (() => void))();
    expect(onOpenAppointment).toHaveBeenCalledWith(41);
  });
});
