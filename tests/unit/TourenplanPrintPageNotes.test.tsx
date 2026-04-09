/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Eine Woche mit print=true-Notizen rendert TourenplanWeekNoteStrip-Instanzen vor den Terminkarten
 * - Eine Woche ohne print=true-Notizen rendert keinen Notizblock
 * - Notizen mit print=false werden nicht gerendert (client-seitiger Schutzfilter)
 *
 * Fehlerfälle:
 * - weekNotes mit gemischten print-Flags geben nur die print=true-Notizen aus
 *
 * Ziel:
 * Die Integration von TourenplanWeekNoteStrip in TourenplanPrintPage auf sichtbares Rendering absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../client/src/components/print/PrintPageShell", () => ({
  PrintPageShell: ({ children }: { children: React.ReactNode }) => React.createElement("div", { "data-testid": "shell" }, children),
}));

vi.mock("../../client/src/components/print/PrintSlimFooter", () => ({
  PrintSlimFooter: () => null,
}));

vi.mock("../../client/src/components/reports/TourenplanAppointmentCard", () => ({
  TourenplanAppointmentCard: ({ appointment, testId }: { appointment: { id: number }; testId?: string }) =>
    React.createElement("div", { "data-testid": testId ?? `appointment-${appointment.id}` }),
}));

import { TourenplanPrintPage } from "../../client/src/components/reports/TourenplanPrintPage";
import type { TourenplanPrintPageData } from "../../client/src/components/reports/tourenplan-model";
import type { TourenplanWeekNote } from "../../client/src/components/reports/tourenplan-model";

function makeNote(id: number, print: boolean, title = "Notiz"): TourenplanWeekNote {
  return {
    id,
    sourceType: "appointment",
    title,
    body: null,
    cardColor: "#3b82f6",
    print,
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

function makeMinimalAppointment(id: number) {
  return {
    id,
    projectId: null,
    projectName: "",
    startDate: "2024-01-01",
    endDate: "2024-01-01",
    durationDays: 1,
    startTime: null,
    customer: { id: 1, name: "Kunde", postalCode: null, city: null, country: null, phone: null },
    employees: [],
    printNotes: [],
    appointmentTags: [],
    customerTags: [],
    projectTags: [],
    projectArticleItems: [],
    projectDescription: null,
  };
}

function makePage(weekNotes: TourenplanWeekNote[]): TourenplanPrintPageData {
  return {
    pageNumber: 1,
    tourName: "Tour A",
    weeks: [
      {
        weekStart: "2024-01-01",
        weekEnd: "2024-01-07",
        weekNumber: 1,
        markerTopPx: 4,
        appointments: [makeMinimalAppointment(1) as any],
        weekNotes,
      },
    ],
  };
}

describe("TourenplanPrintPage – weekNotes Integration", () => {
  it("rendert zwei Strip-Instanzen wenn zwei print=true-Notizen vorhanden", () => {
    const page = makePage([makeNote(1, true, "Notiz A"), makeNote(2, true, "Notiz B")]);
    const html = renderToStaticMarkup(
      <TourenplanPrintPage
        page={page}
        printMode="farbdruck"
        fontSize="medium"
        orientation="portrait"
        useShortCodes={false}
        testId="page"
      />,
    );
    expect(html).toContain("Notiz A");
    expect(html).toContain("Notiz B");
    expect(html).toContain("data-testid=\"page-week-notes-2024-01-01\"");
  });

  it("rendert keinen Notizblock wenn keine print=true-Notizen vorhanden", () => {
    const page = makePage([]);
    const html = renderToStaticMarkup(
      <TourenplanPrintPage
        page={page}
        printMode="farbdruck"
        fontSize="medium"
        orientation="portrait"
        useShortCodes={false}
        testId="page"
      />,
    );
    expect(html).not.toContain("page-week-notes-");
  });

  it("filtert print=false-Notizen heraus", () => {
    const page = makePage([makeNote(1, false, "Verborgene Notiz"), makeNote(2, true, "Sichtbare Notiz")]);
    const html = renderToStaticMarkup(
      <TourenplanPrintPage
        page={page}
        printMode="farbdruck"
        fontSize="medium"
        orientation="portrait"
        useShortCodes={false}
        testId="page"
      />,
    );
    expect(html).not.toContain("Verborgene Notiz");
    expect(html).toContain("Sichtbare Notiz");
  });
});
