/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - formatEmployeeShortName wandelt "Nachname, Vorname" korrekt um.
 * - isReklamationAppointment erkennt Reklamation über Tags und Notizen.
 * - buildTourPrintPages verteilt Inhalte auf physische A4-Seiten.
 * - Wochen dürfen über Seiten fortgesetzt werden; Zusatzinformationen werden chronologisch sortiert.
 * - projectName bleibt leer wenn kein Projekt vorhanden ist.
 *
 * Fehlerfälle:
 * - Kein Komma im Namen darf nicht abstürzen.
 * - Leerer Vorname nach Komma gibt nur Nachname zurück.
 * - Zusatzinformationen dürfen nicht in API-Reihenfolge hängen bleiben.
 *
 * Ziel:
 * Das Seitenmodell der Tour-Druckvorschau für paginierte A4-Blätter deterministisch absichern.
 */
import { describe, expect, it } from "vitest";
import {
  TOUR_PRINT_TABLE_COLUMN_WIDTHS,
  buildTourPrintPages,
  formatEmployeeShortName,
  isReklamationAppointment,
  type TourPrintPreviewResponse,
} from "../../../client/src/lib/tour-print-preview";

const emptyTag = {
  id: 0,
  name: "",
  color: "#000000",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function makeTag(id: number, name: string) {
  return { ...emptyTag, id, name };
}

function makeAppointment(overrides: Partial<TourPrintPreviewResponse["appointments"][number]> = {}): TourPrintPreviewResponse["appointments"][number] {
  return {
    id: 1,
    projectId: 1,
    projectName: "Projekt",
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
    employees: [],
    printNotes: [],
    appointmentTags: [],
    customerTags: [],
    projectTags: [],
    ...overrides,
  };
}

const baseFixture: TourPrintPreviewResponse = {
  fromDate: "2099-06-15",
  toDate: "2099-06-28",
  weeks: [
    { weekStart: "2099-06-15", weekEnd: "2099-06-21", weekNotes: [] },
    { weekStart: "2099-06-22", weekEnd: "2099-06-28", weekNotes: [] },
  ],
  tour: { id: 7, name: "Tour 7", color: "#225588" },
  members: [{ id: 11, fullName: "Muster, Mia" }],
  appointments: [],
};

describe("formatEmployeeShortName", () => {
  it('"Gering, Herbert" → "Herbert G."', () => {
    expect(formatEmployeeShortName("Gering, Herbert")).toBe("Herbert G.");
  });

  it('"Chaduneir, Enveri" → "Enveri C."', () => {
    expect(formatEmployeeShortName("Chaduneir, Enveri")).toBe("Enveri C.");
  });

  it('"Muster, Mia" → "Mia M."', () => {
    expect(formatEmployeeShortName("Muster, Mia")).toBe("Mia M.");
  });

  it("kein Komma → unverändert zurückgeben", () => {
    expect(formatEmployeeShortName("Madonna")).toBe("Madonna");
  });

  it("leerer Vorname nach Komma → nur Nachname", () => {
    expect(formatEmployeeShortName("Muster, ")).toBe("Muster");
  });

  it("leerer String → leerer String", () => {
    expect(formatEmployeeShortName("")).toBe("");
  });
});

describe("isReklamationAppointment", () => {
  it("appointmentTags enthält 'Reklamation' → true", () => {
    expect(isReklamationAppointment(makeAppointment({ appointmentTags: [makeTag(1, "Reklamation")] }))).toBe(true);
  });

  it("customerTags enthält 'Reklamation' → true", () => {
    expect(isReklamationAppointment(makeAppointment({ customerTags: [makeTag(2, "Reklamation")] }))).toBe(true);
  });

  it("projectTags enthält 'Reklamation' → true", () => {
    expect(isReklamationAppointment(makeAppointment({ projectTags: [makeTag(3, "Reklamation")] }))).toBe(true);
  });

  it("printNotes enthält title 'Reklamation' → true", () => {
    const appointment = makeAppointment({
      printNotes: [{ id: 1, sourceType: "appointment", title: "Reklamation", body: null, cardColor: null, updatedAt: "" }],
    });
    expect(isReklamationAppointment(appointment)).toBe(true);
  });

  it("alle Arrays leer, keine passende Note → false", () => {
    expect(isReklamationAppointment(makeAppointment())).toBe(false);
  });
});

describe("buildTourPrintPages", () => {
  it("liefert für kleine Datenmengen genau eine List-Seite im Querformat", () => {
    const [page] = buildTourPrintPages({
      ...baseFixture,
      appointments: [makeAppointment({ id: 1 })],
    });

    expect(page.kind).toBe("list");
    expect(page.orientation).toBe("landscape");
    expect(page.pageNumber).toBe(1);
    expect(page.additionalInfoCards).toEqual([]);
  });

  it("verteilt viele Termine auf mehrere Seiten und setzt Fortsetzungsmarker", () => {
    const appointments = Array.from({ length: 16 }, (_, index) => makeAppointment({
      id: index + 1,
      startDate: "2099-06-16",
      startTime: `${String(8 + (index % 10)).padStart(2, "0")}:00:00`,
      employees: [
        { id: 10, fullName: "Muster, Mia" },
        { id: 11, fullName: "Gering, Herbert" },
      ],
      appointmentTags: [makeTag(100 + index, `Sondermaß ${index}`)],
    }));

    const pages = buildTourPrintPages({
      ...baseFixture,
      appointments,
    });

    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0].weeks[0]?.appointments.length).toBeGreaterThan(0);
    expect(pages.some((page) => page.weeks.some((week) => week.continuedFromPrevious))).toBe(true);
    expect(pages.some((page) => page.weeks.some((week) => week.continuesOnNext))).toBe(true);
  });

  it("ordnet Reklamationen ans Tagesende", () => {
    const pages = buildTourPrintPages({
      ...baseFixture,
      weeks: [{ weekStart: "2099-06-15", weekEnd: "2099-06-21", weekNotes: [] }],
      appointments: [
        makeAppointment({ id: 2, startDate: "2099-06-16", appointmentTags: [makeTag(2, "Reklamation")] }),
        makeAppointment({ id: 1, startDate: "2099-06-16", startTime: "08:00:00" }),
      ],
    });

    expect(pages[0].weeks[0].appointments[0].id).toBe(1);
    expect(pages[0].weeks[0].appointments[1].id).toBe(2);
  });

  it("sortiert Zusatzinformationen chronologisch statt nach Eingabereihenfolge", () => {
    const pages = buildTourPrintPages({
      ...baseFixture,
      weeks: [{ weekStart: "2099-06-15", weekEnd: "2099-06-21", weekNotes: [] }],
      appointments: [
        makeAppointment({
          id: 2,
          startDate: "2099-06-17",
          printNotes: [{ id: 20, sourceType: "appointment", title: "", body: "<p>Zweiter</p>", cardColor: null, updatedAt: "" }],
        }),
        makeAppointment({
          id: 1,
          startDate: "2099-06-16",
          printNotes: [{ id: 10, sourceType: "appointment", title: "", body: "<p>Erster</p>", cardColor: null, updatedAt: "" }],
        }),
      ],
    });

    expect(pages[0].additionalInfoCards[0].appointment.id).toBe(1);
    expect(pages[0].additionalInfoCards[1].appointment.id).toBe(2);
  });

  it("verschiebt Zusatzinformationen auf eine neue Seite wenn die Resthoehe der aktuellen Seite nicht mehr ausreicht", () => {
    const pages = buildTourPrintPages({
      ...baseFixture,
      weeks: [{ weekStart: "2099-06-15", weekEnd: "2099-06-21", weekNotes: [] }],
      appointments: Array.from({ length: 14 }, (_, index) => makeAppointment({
        id: index + 1,
        startDate: "2099-06-16",
        endDate: "2099-06-17",
        printNotes: [{
          id: index + 1,
          sourceType: "appointment",
          title: `Hinweis ${index + 1}`,
          body: `<p>${"Zusatzinformation ".repeat(40)}</p>`,
          cardColor: null,
          updatedAt: "",
        }],
      })),
    });

    expect(pages.length).toBeGreaterThan(1);
    expect(pages.some((page) => page.additionalInfoCards.length > 0)).toBe(true);
    expect(pages.flatMap((page) => page.additionalInfoCards).length).toBe(14);
  });

  it("übernimmt weekNotes in die erste Chunk-Seite einer Woche", () => {
    const pages = buildTourPrintPages({
      ...baseFixture,
      weeks: [
        {
          weekStart: "2099-06-15",
          weekEnd: "2099-06-21",
          weekNotes: [{ id: 77, sourceType: "appointment", title: "", body: "<p>Hinweis</p>", cardColor: null, updatedAt: "" }],
        },
      ],
    });

    expect(pages[0].weeks[0].showWeekNotes).toBe(true);
    expect(pages[0].weeks[0].weekNotes[0]?.id).toBe(77);
  });

  it("lässt projectName leer wenn kein Projekt vorhanden ist", () => {
    const pages = buildTourPrintPages({
      ...baseFixture,
      weeks: [{ weekStart: "2099-06-15", weekEnd: "2099-06-21", weekNotes: [] }],
      appointments: [makeAppointment({ projectId: null, projectName: "" })],
    });

    expect(pages[0].weeks[0].appointments[0].projectName).toBe("");
  });

  it("stellt zentrale Tabellenbreiten bereit", () => {
    expect(TOUR_PRINT_TABLE_COLUMN_WIDTHS).toEqual(["17%", "26%", "22%", "16%", "19%"]);
  });
});
