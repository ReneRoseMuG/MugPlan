/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die exklusive Tourenplan-Tagprioritaet bleibt Reklamation vor Sondermass vor Messe vor Neutral.
 * - Die Druckseiten werden nach Kalenderwochen strukturiert und behalten pro Woche einen Marker-Eintrag.
 * - Eine neue Kalenderwoche startet auf einer neuen Seite, wenn sie am Seitenende nicht mehr sauber Platz hat.
 *
 * Fehlerfaelle:
 * - Messe oder Sondermass ueberschreiben faelschlich Reklamationen.
 * - Wochenabschnitte werden beim Seitenmodell nicht getrennt abgebildet.
 * - Die naechste KW wird am Seitenende angekuendigt, obwohl ihre Termine erst auf der Folgeseite sichtbar sind.
 *
 * Ziel:
 * Die reine Tourenplan-Logik fuer Tagaufloesung und Seitenmodell isoliert absichern.
 */
import { describe, expect, it } from "vitest";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import type { Tag } from "@shared/schema";
import {
  buildTourenplanPrintPages,
  resolveTourenplanTagKind,
  type TourenplanAppointmentListItem,
  type TourenplanPreviewResponse,
} from "../../../client/src/components/reports/tourenplan-model";

function createTag(id: number, name: string): Tag {
  return { id, name, color: "#2563eb", isDefault: false, version: 1 };
}

function createAppointmentListItem(id: number, tourId: number | null, projectArticleItems: ProjectArticleItem[]): TourenplanAppointmentListItem {
  return {
    id,
    version: 1,
    projectId: 10 + id,
    projectName: `Projekt ${id}`,
    projectVersion: 1,
    projectOrderNumber: `ORD-${id}`,
    projectArticleItems,
    projectDescription: `<p>Projektbeschreibung ${id}</p>`,
    startDate: id === 1 ? "2026-04-14" : "2026-04-22",
    endDate: id === 1 ? "2026-04-15" : "2026-04-22",
    startTime: null,
    startTimeHour: null,
    tourId,
    tourName: tourId ? "Tour Alpha" : null,
    tourColor: "#2266aa",
    customer: {
      id: 100 + id,
      customerNumber: `C-${id}`,
      fullName: `Kunde ${id}`,
      company: null,
      phone: `0123-${id}`,
      email: null,
      addressLine1: null,
      addressLine2: null,
      postalCode: "26135",
      city: "Oldenburg",
      country: "Deutschland",
    },
    employees: [],
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
    isLocked: false,
    isCancelled: false,
    allDay: true,
    singleEmployee: false,
  };
}

function createDetailedAppointmentListItem(params: {
  id: number;
  tourId: number | null;
  startDate: string;
  endDate: string;
  projectDescription: string;
  projectArticleItems: ProjectArticleItem[];
}): TourenplanAppointmentListItem {
  return {
    id: params.id,
    version: 1,
    projectId: 10 + params.id,
    projectName: `Projekt ${params.id}`,
    projectVersion: 1,
    projectOrderNumber: `ORD-${params.id}`,
    projectArticleItems: params.projectArticleItems,
    projectDescription: params.projectDescription,
    startDate: params.startDate,
    endDate: params.endDate,
    startTime: null,
    startTimeHour: null,
    tourId: params.tourId,
    tourName: params.tourId ? "Tour Alpha" : null,
    tourColor: "#2266aa",
    customer: {
      id: 200 + params.id,
      customerNumber: `C-${params.id}`,
      fullName: `Kunde ${params.id}`,
      company: null,
      phone: `0123-${params.id}`,
      email: null,
      addressLine1: null,
      addressLine2: null,
      postalCode: "26135",
      city: "Oldenburg",
      country: "Deutschland",
    },
    employees: [],
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
    isLocked: false,
    isCancelled: false,
    allDay: true,
    singleEmployee: false,
  };
}

describe("Tourenplan model", () => {
  it("resolves tags with the required priority order", () => {
    expect(resolveTourenplanTagKind({
      appointmentTags: [createTag(1, "Messe Aufbau/Abbau"), createTag(2, "Reklamation")],
      customerTags: [createTag(3, "Sondermaß")],
      projectTags: [],
    })).toBe("reklamation");

    expect(resolveTourenplanTagKind({
      appointmentTags: [createTag(4, "Messe Aufbau/Abbau")],
      customerTags: [createTag(5, "Sondermaß")],
      projectTags: [],
    })).toBe("sondermass");

    expect(resolveTourenplanTagKind({
      appointmentTags: [],
      customerTags: [createTag(6, "Messe Aufbau/Abbau")],
      projectTags: [],
    })).toBe("messe");

    expect(resolveTourenplanTagKind({
      appointmentTags: [],
      customerTags: [],
      projectTags: [createTag(7, "Beliebig")],
    })).toBe("neutral");
  });

  it("builds week-based print pages with a marker entry per week", () => {
    const previewData: TourenplanPreviewResponse = {
      fromDate: "2026-04-13",
      toDate: "2026-04-26",
      weeks: [
        { weekStart: "2026-04-13", weekEnd: "2026-04-19", weekNotes: [] },
        { weekStart: "2026-04-20", weekEnd: "2026-04-26", weekNotes: [] },
      ],
      tour: { id: 5, name: "Tour Alpha", color: "#2266aa" },
      appointments: [
        {
          id: 1,
          projectId: 11,
          projectName: "Projekt 1",
          startDate: "2026-04-14",
          endDate: "2026-04-15",
          startTime: null,
          durationDays: 2,
          saunaModel: "Sauna 1",
          customer: {
            id: 101,
            customerNumber: "C-1",
            fullName: "Kunde 1",
            phone: "0123-1",
            addressLine1: null,
            addressLine2: null,
            postalCode: "26135",
            city: "Oldenburg",
            country: "Deutschland",
          },
          employees: [],
          printNotes: [],
          appointmentTags: [],
          customerTags: [],
          projectTags: [],
        },
        {
          id: 2,
          projectId: 12,
          projectName: "Projekt 2",
          startDate: "2026-04-22",
          endDate: "2026-04-22",
          startTime: null,
          durationDays: 1,
          saunaModel: "Sauna 2",
          customer: {
            id: 102,
            customerNumber: "C-2",
            fullName: "Kunde 2",
            phone: "0123-2",
            addressLine1: null,
            addressLine2: null,
            postalCode: "26135",
            city: "Oldenburg",
            country: "Deutschland",
          },
          employees: [],
          printNotes: [],
          appointmentTags: [createTag(8, "Messe Aufbau/Abbau")],
          customerTags: [],
          projectTags: [],
        },
      ],
    };

    const pages = buildTourenplanPrintPages(previewData, [
      createAppointmentListItem(1, 5, [{ label: "Ofen", value: "Harvia 20", source: "component", shortCode: "H20" }]),
      createAppointmentListItem(2, 5, [{ label: "Steuerung", value: "Xenio 3", source: "component", shortCode: "X3" }]),
    ]);

    expect(pages).toHaveLength(1);
    expect(pages[0]?.weeks).toHaveLength(2);
    expect(pages[0]?.weeks.map((week) => week.weekNumber)).toEqual([16, 17]);
    expect(pages[0]?.weeks.every((week) => week.markerTopPx >= 4)).toBe(true);
  });

  it("moves the next calendar week to a new page when the current page is already filled", () => {
    const longArticleItems: ProjectArticleItem[] = Array.from({ length: 7 }, (_, index) => ({
      label: `Komponente ${index + 1}`,
      value: "Sehr langer Ausstattungseintrag fuer den Tourenplan Report",
      source: "component",
      shortCode: `K${index + 1}`,
    }));
    const longBody = "<p>Zusatzhinweis fuer die Tourenplan-Karte mit mehreren Details und Montageangaben.</p>";

    const previewData: TourenplanPreviewResponse = {
      fromDate: "2026-04-20",
      toDate: "2026-05-03",
      weeks: [
        { weekStart: "2026-04-20", weekEnd: "2026-04-26", weekNotes: [] },
        { weekStart: "2026-04-27", weekEnd: "2026-05-03", weekNotes: [] },
      ],
      tour: { id: 5, name: "Tour Alpha", color: "#2266aa" },
      appointments: [
        {
          id: 10,
          projectId: 20,
          projectName: "Projekt 10",
          startDate: "2026-04-20",
          endDate: "2026-04-21",
          startTime: null,
          durationDays: 2,
          saunaModel: null,
          customer: { id: 110, customerNumber: "C-10", fullName: "Kunde 10", phone: "0123-10", addressLine1: null, addressLine2: null, postalCode: "26135", city: "Oldenburg", country: "Deutschland" },
          employees: [{ id: 1, fullName: "Herold, Roy" }, { id: 2, fullName: "Winter, Dirk" }],
          printNotes: [{ id: 100, sourceType: "appointment", title: "Hinweis 10", body: longBody, cardColor: "#f97316", updatedAt: "2026-04-20T08:00:00.000Z" }],
          appointmentTags: [],
          customerTags: [],
          projectTags: [],
        },
        {
          id: 11,
          projectId: 21,
          projectName: "Projekt 11",
          startDate: "2026-04-21",
          endDate: "2026-04-22",
          startTime: null,
          durationDays: 2,
          saunaModel: null,
          customer: { id: 111, customerNumber: "C-11", fullName: "Kunde 11", phone: "0123-11", addressLine1: null, addressLine2: null, postalCode: "26135", city: "Oldenburg", country: "Deutschland" },
          employees: [{ id: 1, fullName: "Herold, Roy" }, { id: 2, fullName: "Winter, Dirk" }],
          printNotes: [{ id: 101, sourceType: "appointment", title: "Hinweis 11", body: longBody, cardColor: "#f97316", updatedAt: "2026-04-21T08:00:00.000Z" }],
          appointmentTags: [],
          customerTags: [],
          projectTags: [],
        },
        {
          id: 12,
          projectId: 22,
          projectName: "Projekt 12",
          startDate: "2026-04-22",
          endDate: "2026-04-23",
          startTime: null,
          durationDays: 2,
          saunaModel: null,
          customer: { id: 112, customerNumber: "C-12", fullName: "Kunde 12", phone: "0123-12", addressLine1: null, addressLine2: null, postalCode: "26135", city: "Oldenburg", country: "Deutschland" },
          employees: [{ id: 1, fullName: "Herold, Roy" }, { id: 2, fullName: "Winter, Dirk" }],
          printNotes: [{ id: 102, sourceType: "appointment", title: "Hinweis 12", body: longBody, cardColor: "#f97316", updatedAt: "2026-04-22T08:00:00.000Z" }],
          appointmentTags: [],
          customerTags: [],
          projectTags: [],
        },
        {
          id: 13,
          projectId: 23,
          projectName: "Projekt 13",
          startDate: "2026-04-23",
          endDate: "2026-04-24",
          startTime: null,
          durationDays: 2,
          saunaModel: null,
          customer: { id: 113, customerNumber: "C-13", fullName: "Kunde 13", phone: "0123-13", addressLine1: null, addressLine2: null, postalCode: "26135", city: "Oldenburg", country: "Deutschland" },
          employees: [{ id: 1, fullName: "Herold, Roy" }, { id: 2, fullName: "Winter, Dirk" }],
          printNotes: [{ id: 103, sourceType: "appointment", title: "Hinweis 13", body: longBody, cardColor: "#f97316", updatedAt: "2026-04-23T08:00:00.000Z" }],
          appointmentTags: [],
          customerTags: [],
          projectTags: [],
        },
        {
          id: 14,
          projectId: 24,
          projectName: "Projekt 14",
          startDate: "2026-04-27",
          endDate: "2026-04-27",
          startTime: null,
          durationDays: 1,
          saunaModel: null,
          customer: { id: 114, customerNumber: "C-14", fullName: "Kunde 14", phone: "0123-14", addressLine1: null, addressLine2: null, postalCode: "26135", city: "Oldenburg", country: "Deutschland" },
          employees: [{ id: 1, fullName: "Herold, Roy" }],
          printNotes: [],
          appointmentTags: [],
          customerTags: [],
          projectTags: [],
        },
      ],
    };

    const pages = buildTourenplanPrintPages(previewData, [
      createDetailedAppointmentListItem({
        id: 10,
        tourId: 5,
        startDate: "2026-04-20",
        endDate: "2026-04-21",
        projectDescription: "<p>Langer Beschreibungstext fuer die erste Karte.</p>",
        projectArticleItems: longArticleItems,
      }),
      createDetailedAppointmentListItem({
        id: 11,
        tourId: 5,
        startDate: "2026-04-21",
        endDate: "2026-04-22",
        projectDescription: "<p>Langer Beschreibungstext fuer die zweite Karte.</p>",
        projectArticleItems: longArticleItems,
      }),
      createDetailedAppointmentListItem({
        id: 12,
        tourId: 5,
        startDate: "2026-04-22",
        endDate: "2026-04-23",
        projectDescription: "<p>Langer Beschreibungstext fuer die dritte Karte.</p>",
        projectArticleItems: longArticleItems,
      }),
      createDetailedAppointmentListItem({
        id: 13,
        tourId: 5,
        startDate: "2026-04-23",
        endDate: "2026-04-24",
        projectDescription: "<p>Langer Beschreibungstext fuer die vierte Karte.</p>",
        projectArticleItems: longArticleItems,
      }),
      createDetailedAppointmentListItem({
        id: 14,
        tourId: 5,
        startDate: "2026-04-27",
        endDate: "2026-04-27",
        projectDescription: "<p>Knappe Beschreibung fuer die naechste Woche.</p>",
        projectArticleItems: [{ label: "Ofen", value: "Harvia 20", source: "component", shortCode: "H20" }],
      }),
    ]);

    expect(pages).toHaveLength(2);
    expect(pages[0]?.weeks.map((week) => week.weekNumber)).toEqual([17]);
    expect(pages[1]?.weeks.map((week) => week.weekNumber)).toEqual([18]);
  });
});
