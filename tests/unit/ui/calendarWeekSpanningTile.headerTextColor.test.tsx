/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ist eine Benutzerfarbe für die tourId in calendar.tourHeaderTextColors gesetzt,
 *   übernimmt der SpanningTile-Header genau diese Farbe.
 * - Fehlt eine Benutzerfarbe, greift der Fallback auf #ffffff.
 * - tourId null: kein Benutzerfarb-Lookup; Fallback auf #ffffff.
 *
 * Fehlerfälle:
 * - Benutzerfarbe wird ignoriert und immer #ffffff gerendert.
 * - tourId null löst einen Fehler aus statt sauber auf #ffffff zu fallen.
 *
 * Ziel:
 * Die textColor-Logik des CalendarWeekSpanningTile (Wochenkalender-Mehrtagestermin)
 * gegen Regression absichern.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";

let useSettingReturnValue: Record<string, string> = {};

vi.mock("@/hooks/useSettings", () => ({
  useSetting: () => useSettingReturnValue,
  useSettings: () => ({ setSetting: vi.fn() }),
}));

vi.mock("../../../client/src/components/calendar/CalendarWeekAppointmentPanelCustomer", () => ({
  CalendarWeekAppointmentPanelCustomer: () => <div data-testid="mock-customer" />,
}));

vi.mock("../../../client/src/components/calendar/CalendarWeekAppointmentPanelProject", () => ({
  CalendarWeekAppointmentPanelProject: () => <div data-testid="mock-project" />,
}));

vi.mock("../../../client/src/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: () => <div data-testid="mock-employee" />,
}));

vi.mock("../../../client/src/components/calendar/CalendarWeekAppointmentNotesHover", () => ({
  CalendarWeekAppointmentNotesHover: () => <div data-testid="mock-notes-hover" />,
}));

vi.mock("../../../client/src/components/calendar/CalendarWeekAppointmentAttachmentsHover", () => ({
  CalendarWeekAppointmentAttachmentsHover: () => <div data-testid="mock-attachments-hover" />,
}));

vi.mock("../../../client/src/components/calendar/CalendarWeekAppointmentTagPicker", () => ({
  CalendarWeekAppointmentTagPicker: () => <div data-testid="mock-tag-picker" />,
}));

vi.mock("../../../client/src/components/calendar/CalendarWeekInlineNotes", () => ({
  CalendarWeekInlineNotes: () => null,
}));

vi.mock("../../../client/src/components/AppointmentCancelConfirmDialog", () => ({
  AppointmentCancelConfirmDialog: () => null,
}));

vi.mock("../../../client/src/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: () => null,
  DropdownMenuItem: () => null,
}));

vi.mock("../../../client/src/components/ui/alert-dialog", () => ({
  AlertDialog: () => null,
  AlertDialogContent: () => null,
  AlertDialogHeader: () => null,
  AlertDialogTitle: () => null,
  AlertDialogDescription: () => null,
  AlertDialogFooter: () => null,
  AlertDialogCancel: () => null,
  AlertDialogAction: () => null,
}));

import { CalendarWeekSpanningTile } from "../../../client/src/components/calendar/CalendarWeekSpanningTile";

function makeAppointment(overrides: Partial<CalendarAppointment> = {}): CalendarAppointment {
  return {
    id: 11,
    version: 1,
    projectId: 3,
    projectName: "Projekt Alpha",
    projectVersion: 1,
    projectOrderNumber: "B-300",
    projectArticleItems: [],
    projectDescription: null,
    project: null,
    startDate: "2099-04-01",
    endDate: "2099-04-03",
    startTime: null,
    tourId: 5,
    tourName: "Südtour",
    tourColor: "#225577",
    customer: {
      id: 2,
      customerNumber: "K-22",
      fullName: "Muster GmbH",
      postalCode: "70173",
      city: "Stuttgart",
      addressLine1: "Bahnhofstr. 1",
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

function render(node: React.ReactNode): string {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>,
  );
}

describe("CalendarWeekSpanningTile textColor (Kopfzeilen-Textfarbe)", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    useSettingReturnValue = {};
  });

  it("übernimmt die Benutzerfarbe im Header wenn eine für die tourId gesetzt ist", () => {
    useSettingReturnValue = { "5": "#ee4400" };
    const html = render(
      <CalendarWeekSpanningTile
        appointment={makeAppointment({ tourId: 5 })}
        spanColumns={3}
        visibleStartDate="2099-04-01"
        visibleDayNumberStart={1}
      />,
    );
    expect(html).toContain("#ee4400");
  });

  it("fällt auf #ffffff zurück wenn keine Benutzerfarbe für die tourId gesetzt ist", () => {
    useSettingReturnValue = {};
    const html = render(
      <CalendarWeekSpanningTile
        appointment={makeAppointment({ tourId: 5 })}
        spanColumns={2}
        visibleStartDate="2099-04-01"
        visibleDayNumberStart={1}
      />,
    );
    expect(html).toContain("color:#ffffff");
  });

  it("fällt auf #ffffff zurück wenn tourId null ist", () => {
    useSettingReturnValue = { "5": "#ee4400" };
    const html = render(
      <CalendarWeekSpanningTile
        appointment={makeAppointment({ tourId: null })}
        spanColumns={2}
        visibleStartDate="2099-04-01"
        visibleDayNumberStart={1}
      />,
    );
    expect(html).not.toContain("#ee4400");
    expect(html).toContain("color:#ffffff");
  });
});
