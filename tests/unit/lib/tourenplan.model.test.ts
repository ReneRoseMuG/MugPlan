/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die exklusive Tourenplan-Tagprioritaet bleibt Reklamation vor Sondermass vor Messe vor Neutral.
 * - Die Druckseiten werden nach Kalenderwochen strukturiert und behalten pro Woche einen Marker-Eintrag.
 *
 * Fehlerfaelle:
 * - Messe oder Sondermass ueberschreiben faelschlich Reklamationen.
 * - Wochenabschnitte werden beim Seitenmodell nicht getrennt abgebildet.
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
});
