/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Startseite rendert im Querformat mit Tour-Headline, Zeitraum-Subline und Mitarbeiterliste.
 * - Wochenseiten rendern sieben Tagesspalten mit Terminkacheln nach Typ (Uhrzeit, Tagestermin, Mehrtagestermin).
 * - Mehrtagestermin-Folgetage werden als Sperrkacheln mit Tag-Nummer gerendert.
 * - Notizfarben werden im Druckpfad dezent ueber Rand und Hintergrundtoenung uebernommen.
 *
 * Fehlerfaelle:
 * - Die Druckseiten fallen auf monolithisches Dialog-Markup ohne wiederverwendbare Bereichskomponenten zurueck.
 * - Terminkacheln zeigen Saunamodell oder falsche Felder statt Kundenname und Wohnort.
 * - Folgetage eines Mehrtagestermins erscheinen als normale Terminkachel statt als Sperrkachel.
 *
 * Ziel:
 * Die druckspezifischen Presentational Components in Isolation regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildTourPrintPages, type TourPrintPreviewResponse } from "../../../client/src/lib/tour-print-preview";
import { CalendarTourPrintSummaryPage } from "../../../client/src/components/calendar/CalendarTourPrintSummaryPage";
import { CalendarTourPrintWeekPage } from "../../../client/src/components/calendar/CalendarTourPrintWeekPage";
import { CalendarTourPrintNoteBlock } from "../../../client/src/components/calendar/CalendarTourPrintNoteBlock";

const fixture: TourPrintPreviewResponse = {
  fromDate: "2099-06-15",
  toDate: "2099-06-28",
  weeks: [
    { weekStart: "2099-06-15", weekEnd: "2099-06-21" },
    { weekStart: "2099-06-22", weekEnd: "2099-06-28" },
  ],
  tour: {
    id: 7,
    name: "Alpha",
    color: "#225588",
  },
  members: [
    { id: 11, fullName: "Muster, Mia" },
    { id: 12, fullName: "Beispiel, Theo" },
  ],
  appointments: [
    {
      id: 101,
      projectId: 501,
      projectName: "Projekt Alpha",
      startDate: "2099-06-16",
      endDate: "2099-06-17",
      startTime: "08:00:00",
      durationDays: 2,
      saunaModel: "Panorama",
      customer: {
        id: 301,
        customerNumber: "K-301",
        fullName: "Alpha GmbH",
        addressLine1: null,
        addressLine2: null,
        postalCode: "12345",
        city: "Berlin",
      },
      employees: [{ id: 11, fullName: "Muster, Mia" }],
      printNotes: [
        {
          id: 801,
          sourceType: "appointment",
          title: "Hinweis",
          body: "<p>Termininfo fuer den Druck</p>",
          cardColor: "#ffcc66",
          updatedAt: "2099-06-14T10:00:00.000Z",
        },
      ],
    },
    {
      id: 102,
      projectId: 502,
      projectName: "Projekt Beta",
      startDate: "2099-06-18",
      endDate: null,
      startTime: null,
      durationDays: 1,
      saunaModel: null,
      customer: {
        id: 302,
        customerNumber: "K-302",
        fullName: "Beta GmbH",
        addressLine1: null,
        addressLine2: null,
        postalCode: "54321",
        city: "Hamburg",
      },
      employees: [{ id: 12, fullName: "Beispiel, Theo" }],
      printNotes: [],
    },
  ],
};

describe("FT31 UI: calendar tour print preview components", () => {
  it("renders the summary page in landscape with tour headline, date subline and member section", () => {
    const summaryPage = buildTourPrintPages(fixture)[0];
    if (summaryPage.kind !== "summary") {
      throw new Error("expected summary page fixture");
    }

    const html = renderToStaticMarkup(React.createElement(CalendarTourPrintSummaryPage, { page: summaryPage }));

    expect(html).toContain("tour-print-summary-page");
    expect(html).toContain("tour-print-page--landscape");
    expect(html).toContain("Alpha");
    expect(html).toContain("Zeitraum:");
    expect(html).toContain("Geplante Mitarbeiter");
    expect(html).toContain("Muster, Mia");
    expect(html).toContain("Beispiel, Theo");
    expect(html).not.toContain("Dauer in Tagen");
  });

  it("renders the week page with day columns, appointment cards and continuation cards", () => {
    const weekPage = buildTourPrintPages(fixture)[1];
    if (weekPage.kind !== "week") {
      throw new Error("expected week page fixture");
    }

    const html = renderToStaticMarkup(
      React.createElement(CalendarTourPrintWeekPage, {
        page: weekPage,
        weekendColumnPercent: 33,
      }),
    );

    expect(html).toContain("tour-print-week-page-1");
    expect(html).toContain("tour-print-week-grid-1");
    expect(html).toContain("tour-print-day-column-2099-06-16");
    // Termin 101: Starttag (mit Uhrzeit) – AppointmentCard
    expect(html).toContain("tour-print-appointment-card-101");
    expect(html).toContain("08:00");
    expect(html).toContain("Projekt Alpha");
    expect(html).toContain("Alpha GmbH");
    expect(html).toContain("Berlin");
    expect(html).toContain("Termininfo fuer den Druck");
    // Termin 101: Folgetag – ContinuationCard
    expect(html).toContain("tour-print-continuation-card-101-2099-06-17");
    expect(html).toContain("Tag 2");
    // Kein Saunamodell mehr
    expect(html).not.toContain("Saunamodell");
    expect(html).not.toContain("Projektstatus");
  });

  it("renders note colors as subtle border and tint styling", () => {
    const note = fixture.appointments[0].printNotes[0];

    const html = renderToStaticMarkup(
      React.createElement(CalendarTourPrintNoteBlock, {
        note,
        appointmentId: 101,
        noteIndex: 0,
      }),
    );

    expect(html).toContain("border-color:#ffcc66");
    expect(html).toContain("background-color:#ffcc661a");
    expect(html).toContain("Hinweis");
    expect(html).toContain("Termininfo fuer den Druck");
  });
});
