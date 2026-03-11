/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Wochenzahl wird auf den erlaubten Bereich fuer die Druckvorschau begrenzt.
 * - Wochenseiten werden anhand der gelieferten Wochenintervalle und Terminueberlappung aufgebaut.
 *
 * Fehlerfaelle:
 * - Ungueltige oder zu grosse Wochenangaben fuehren zu instabilen Seitenmodellen.
 * - Mehrtages-Termine fehlen auf Folgetagen der Wochenvorschau.
 *
 * Ziel:
 * Das reine Seitenmodell der Tour-Druckvorschau fuer Zusammenfassung und Wochenraster deterministisch absichern.
 */
import { describe, expect, it } from "vitest";
import {
  buildTourPrintSummaryRows,
  buildTourPrintWeekPages,
  normalizeTourPrintWeekCount,
  type TourPrintPreviewResponse,
} from "../../../client/src/lib/tour-print-preview";

const fixture: TourPrintPreviewResponse = {
  fromDate: "2099-06-15",
  toDate: "2099-06-28",
  weeks: [
    { weekStart: "2099-06-15", weekEnd: "2099-06-21" },
    { weekStart: "2099-06-22", weekEnd: "2099-06-28" },
  ],
  tour: {
    id: 7,
    name: "Tour 7",
    color: "#225588",
  },
  members: [{ id: 11, fullName: "Muster, Mia" }],
  appointments: [
    {
      id: 101,
      projectId: 501,
      projectName: "Projekt Alpha",
      startDate: "2099-06-16",
      endDate: "2099-06-17",
      startTime: null,
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
      printNotes: [],
    },
    {
      id: 102,
      projectId: 502,
      projectName: "Projekt Beta",
      startDate: "2099-06-24",
      endDate: null,
      startTime: "08:00:00",
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
      employees: [],
      printNotes: [],
    },
  ],
};

describe("FT31 UI model: tour print preview page builder", () => {
  it("clamps week count into the supported range", () => {
    expect(normalizeTourPrintWeekCount(Number.NaN)).toBe(1);
    expect(normalizeTourPrintWeekCount(0)).toBe(1);
    expect(normalizeTourPrintWeekCount(2.8)).toBe(2);
    expect(normalizeTourPrintWeekCount(20)).toBe(12);
  });

  it("builds summary rows with duration and postal code", () => {
    expect(buildTourPrintSummaryRows(fixture)).toEqual([
      expect.objectContaining({ id: 101, durationDays: 2, saunaModel: "Panorama", postalCode: "12345" }),
      expect.objectContaining({ id: 102, durationDays: 1, saunaModel: "-", postalCode: "54321" }),
    ]);
  });

  it("keeps multi-day appointments on each overlapping day column", () => {
    const pages = buildTourPrintWeekPages(fixture);

    expect(pages).toHaveLength(2);
    expect(pages[0].days.find((day) => day.dateKey === "2099-06-16")?.appointments.map((item) => item.id)).toContain(101);
    expect(pages[0].days.find((day) => day.dateKey === "2099-06-17")?.appointments.map((item) => item.id)).toContain(101);
    expect(pages[1].days.find((day) => day.dateKey === "2099-06-24")?.appointments.map((item) => item.id)).toContain(102);
  });
});
