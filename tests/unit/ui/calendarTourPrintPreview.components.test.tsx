/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CalendarTourPrintListPage rendert eine physische A4-Quer-Seite.
 * - Wochensektionen zeigen Tournotiz, Tabellenkopf und Terminzeilen mit zentralen Spaltenbreiten.
 * - Reklamationen bleiben visuell hervorgehoben.
 * - Zusatzinformationen werden aus paginierten Karten gerendert.
 *
 * Fehlerfälle:
 * - Die Druckseite fällt auf einen langen Scrollblock ohne feste Seitengröße zurück.
 * - Zusatzinformationen erscheinen nicht mehr in der Seite.
 *
 * Ziel:
 * Den sichtbaren Seiten-Renderer der paginierten Tour-Druckvorschau absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarTourPrintListPage } from "../../../client/src/components/calendar/CalendarTourPrintListPage";
import type {
  TourPrintPreviewPage,
  TourPrintWeekChunk,
} from "../../../client/src/lib/tour-print-preview";

const emptyTagBase = { color: "#000000", createdAt: "", updatedAt: "" };

function makeTag(id: number, name: string) {
  return { ...emptyTagBase, id, name };
}

const weekNote = {
  id: 99,
  sourceType: "appointment" as const,
  title: "Tournotiz",
  body: "<p>Wichtig</p>",
  cardColor: null,
  updatedAt: "",
};

const regularAppointment = {
  id: 101,
  projectId: 501,
  projectName: "Projekt Alpha",
  startDate: "2099-06-16",
  endDate: null,
  startTime: "10:00:00",
  durationDays: 1,
  saunaModel: null,
  customer: {
    id: 301,
    customerNumber: "K-301",
    fullName: "Alpha GmbH",
    addressLine1: null,
    addressLine2: null,
    postalCode: "12345",
    city: "Berlin",
    country: "Deutschland",
  },
  employees: [{ id: 11, fullName: "Gering, Herbert" }],
  printNotes: [],
  appointmentTags: [makeTag(1, "Sondermaß")],
  customerTags: [],
  projectTags: [],
};

const reklamationAppointment = {
  id: 102,
  projectId: null,
  projectName: "",
  startDate: "2099-06-16",
  endDate: null,
  startTime: "11:00:00",
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
    country: "Luxemburg",
  },
  employees: [],
  printNotes: [{ id: 803, sourceType: "appointment" as const, title: "Reklamation", body: "<p>Rek</p>", cardColor: null, updatedAt: "" }],
  appointmentTags: [makeTag(2, "Reklamation")],
  customerTags: [],
  projectTags: [],
};

const weekChunk: TourPrintWeekChunk = {
  weekStart: "2099-06-15",
  weekEnd: "2099-06-21",
  weekNotes: [weekNote],
  appointments: [regularAppointment, reklamationAppointment],
  continuedFromPrevious: false,
  continuesOnNext: true,
  showWeekNotes: true,
};

function makePage(overrides: Partial<Extract<TourPrintPreviewPage, { kind: "list" }>> = {}): Extract<TourPrintPreviewPage, { kind: "list" }> {
  return {
    kind: "list",
    pageIndex: 0,
    pageNumber: 1,
    title: "Tour Alpha - Seite 1",
    orientation: "landscape",
    tourName: "Tour Alpha",
    fromDate: "2099-06-15",
    toDate: "2099-06-21",
    rangeLabel: "15.06.2099 bis 21.06.2099",
    weeks: [weekChunk],
    additionalInfoCards: [{ appointment: reklamationAppointment, weekStart: "2099-06-15" }],
    showAdditionalInfoHeading: true,
    additionalInfoContinued: false,
    ...overrides,
  };
}

describe("CalendarTourPrintListPage", () => {
  it("rendert eine A4-Quer-Seite mit Tourtitel und Seitenzahl", () => {
    const html = renderToStaticMarkup(<CalendarTourPrintListPage page={makePage()} />);

    expect(html).toContain("tour-print-list-page");
    expect(html).toContain("297mm");
    expect(html).toContain("210mm");
    expect(html).toContain("Tour Alpha");
    expect(html).toContain("Seite 1");
  });

  it("rendert Wochensektion, Tournotiz und Tabellenkopf", () => {
    const html = renderToStaticMarkup(<CalendarTourPrintListPage page={makePage()} />);

    expect(html).toContain("tour-print-week-2099-06-15");
    expect(html).toContain("Tournotiz");
    expect(html).toContain("Datum/Zeit");
    expect(html).toContain("Kunde");
    expect(html).toContain("Projekt");
    expect(html).toContain("Mitarbeiter");
    expect(html).toContain("Info");
  });

  it("zeigt Fortsetzungsbadge und Reklamationshervorhebung", () => {
    const html = renderToStaticMarkup(
      <CalendarTourPrintListPage page={makePage({ weeks: [{ ...weekChunk, continuedFromPrevious: true }] })} />,
    );

    expect(html).toContain("Fortsetzung");
    expect(html).toContain("bg-red-50");
    expect(html).toContain("Reklamation");
  });

  it("rendert Zusatzinformationen und die chronologisch vorbereitete Karte", () => {
    const html = renderToStaticMarkup(<CalendarTourPrintListPage page={makePage()} />);

    expect(html).toContain("Zusatzinformationen");
    expect(html).toContain("tour-print-note-card-102");
  });

  it("rendert keine Zusatzinformationssektion wenn keine Karten vorhanden sind", () => {
    const html = renderToStaticMarkup(
      <CalendarTourPrintListPage page={makePage({ additionalInfoCards: [], showAdditionalInfoHeading: false })} />,
    );

    expect(html).not.toContain("tour-print-zusatzinformationen");
  });
});
