/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CalendarTourPrintAppointmentRow rendert fehlerfrei und gibt tour-print-appointment-row-{id} aus.
 * - Die Info-Spalte zeigt nur die druckrelevanten System-Tags an.
 * - CalendarTourPrintWeekTable rendert fehlerfrei und gibt tour-print-week-table aus.
 * - CalendarTourPrintTourNoteBlock rendert fehlerfrei und gibt tour-print-week-note-block aus.
 * - CalendarTourPrintNoteCard rendert fehlerfrei und gibt tour-print-note-card-{id} aus.
 * - CalendarTourPrintZusatzinformationen rendert fehlerfrei und gibt tour-print-zusatzinformationen aus.
 *
 * Fehlerfälle:
 * - Keine der Komponenten darf bei minimalen Mock-Daten einen Render-Fehler werfen.
 * - Irrelevante Tags wie "Fix" dürfen in der Druckspalte nicht erscheinen.
 *
 * Ziel:
 * Smoke-Tests für die extrahierten paginierten Print-Subkomponenten absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarTourPrintAppointmentRow } from "../../../client/src/components/calendar/CalendarTourPrintAppointmentRow";
import { CalendarTourPrintWeekTable } from "../../../client/src/components/calendar/CalendarTourPrintWeekTable";
import { CalendarTourPrintTourNoteBlock } from "../../../client/src/components/calendar/CalendarTourPrintTourNoteBlock";
import { CalendarTourPrintNoteCard } from "../../../client/src/components/calendar/CalendarTourPrintNoteCard";
import { CalendarTourPrintZusatzinformationen } from "../../../client/src/components/calendar/CalendarTourPrintZusatzinformationen";
import type {
  TourPrintAdditionalInfoCard,
  TourPrintPreviewAppointment,
  TourPrintWeekChunk,
} from "../../../client/src/lib/tour-print-preview";

const emptyTagBase = { color: "#000000", createdAt: "", updatedAt: "" };

function makeTag(id: number, name: string) {
  return { ...emptyTagBase, id, name };
}

const baseAppointment: TourPrintPreviewAppointment = {
  id: 1,
  projectId: 10,
  projectName: "Projekt X",
  startDate: "2099-06-16",
  endDate: null,
  startTime: "09:00:00",
  durationDays: 1,
  saunaModel: null,
  customer: {
    id: 1,
    customerNumber: "K-001",
    fullName: "Test GmbH",
    addressLine1: null,
    addressLine2: null,
    postalCode: "12345",
    city: "Berlin",
  },
  employees: [{ id: 11, fullName: "Muster, Max" }],
  printNotes: [],
  appointmentTags: [],
  customerTags: [],
  projectTags: [],
};

const noteFixture = {
  id: 99,
  sourceType: "appointment" as const,
  title: "Hinweis",
  body: "<p>Info</p>",
  cardColor: null,
  updatedAt: "",
};

const weekFixture: TourPrintWeekChunk = {
  weekStart: "2099-06-15",
  weekEnd: "2099-06-21",
  weekNotes: [],
  appointments: [baseAppointment],
  continuedFromPrevious: false,
  continuesOnNext: false,
  showWeekNotes: false,
};

describe("CalendarTourPrintAppointmentRow - Smoke", () => {
  it("rendert fehlerfrei und enthält data-testid", () => {
    const html = renderToStaticMarkup(
      <table><tbody><CalendarTourPrintAppointmentRow appointment={baseAppointment} /></tbody></table>,
    );
    expect(html).toContain("tour-print-appointment-row-1");
  });

  it("zeigt nur Sondermaß- und Reklamations-Tags in der Info-Spalte", () => {
    const appointment: TourPrintPreviewAppointment = {
      ...baseAppointment,
      appointmentTags: [makeTag(1, "Sondermaß"), makeTag(2, "Fix")],
      customerTags: [makeTag(3, "Reklamation")],
      projectTags: [makeTag(4, "Montage")],
    };

    const html = renderToStaticMarkup(
      <table><tbody><CalendarTourPrintAppointmentRow appointment={appointment} /></tbody></table>,
    );

    expect(html).toContain("Sond.");
    expect(html).toContain("Rekl.");
    expect(html).not.toContain("Fix");
    expect(html).not.toContain("Mont.");
  });
});

describe("CalendarTourPrintWeekTable - Smoke", () => {
  it("rendert fehlerfrei und enthält data-testid", () => {
    const html = renderToStaticMarkup(<CalendarTourPrintWeekTable week={weekFixture} />);
    expect(html).toContain("tour-print-week-table");
  });

  it("gibt null zurück bei leerer Terminliste", () => {
    const html = renderToStaticMarkup(<CalendarTourPrintWeekTable week={{ ...weekFixture, appointments: [] }} />);
    expect(html).toBe("");
  });
});

describe("CalendarTourPrintTourNoteBlock - Smoke", () => {
  it("rendert fehlerfrei und enthält data-testid wenn Notizen vorhanden", () => {
    const html = renderToStaticMarkup(<CalendarTourPrintTourNoteBlock notes={[noteFixture]} />);
    expect(html).toContain("tour-print-week-note-block");
  });

  it("gibt null zurück bei leeren Notizen", () => {
    const html = renderToStaticMarkup(<CalendarTourPrintTourNoteBlock notes={[]} />);
    expect(html).toBe("");
  });
});

describe("CalendarTourPrintNoteCard - Smoke", () => {
  it("rendert fehlerfrei und enthält data-testid", () => {
    const appointment: TourPrintPreviewAppointment = { ...baseAppointment, printNotes: [noteFixture] };
    const html = renderToStaticMarkup(<CalendarTourPrintNoteCard appointment={appointment} weekStart="2099-06-15" />);
    expect(html).toContain("tour-print-note-card-1");
  });
});

describe("CalendarTourPrintZusatzinformationen - Smoke", () => {
  it("rendert fehlerfrei und enthält data-testid wenn Karten vorhanden sind", () => {
    const cards: TourPrintAdditionalInfoCard[] = [{ appointment: { ...baseAppointment, printNotes: [noteFixture] }, weekStart: "2099-06-15" }];
    const html = renderToStaticMarkup(
      <CalendarTourPrintZusatzinformationen cards={cards} showHeading continued={false} />,
    );
    expect(html).toContain("tour-print-zusatzinformationen");
  });

  it("gibt null zurück wenn keine Karten vorhanden sind", () => {
    const html = renderToStaticMarkup(
      <CalendarTourPrintZusatzinformationen cards={[]} showHeading={false} continued={false} />,
    );
    expect(html).toBe("");
  });
});
