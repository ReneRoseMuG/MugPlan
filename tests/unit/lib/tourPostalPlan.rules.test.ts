/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die PLZ-Vorschlagslogik priorisiert gleiche 5/4/3/2/1 Stellen.
 * - Bei gleicher Präfixlänge gewinnt die Gruppe mit mehr passenden Terminen.
 * - Termine ohne explizite Tour werden nicht als Vorschlag gruppiert.
 *
 * Fehlerfälle:
 * - Schwächere Präfixe sortieren fälschlich vor stärkeren Treffern.
 * - Tie-Breaker über die Trefferzahl greift nicht.
 * - Termine ohne Tour erscheinen als Vorschlag.
 *
 * Ziel:
 * Die fachliche Ranking- und Gruppierungslogik des Tour-PLZ-Plans isoliert absichern.
 */
import { describe, expect, it } from "vitest";

import { buildTourPostalPlanMatches } from "../../../server/lib/tourPostalPlan";

describe("tourPostalPlan ranking rules", () => {
  it("priorisiert stärkere PLZ-Präfixe vor schwächeren", () => {
    const matches = buildTourPostalPlanMatches({
      postalCode: "26135",
      rows: [
        {
          appointment: { id: 1, startDate: "2099-04-06" },
          project: { id: 11, name: "Projekt exakt" },
          customer: { id: 21, fullName: "Kunde Exakt", postalCode: "26135" },
          tour: { id: 101, name: "Tour 1", color: "#111111" },
        },
        {
          appointment: { id: 2, startDate: "2099-04-06" },
          project: { id: 12, name: "Projekt nah" },
          customer: { id: 22, fullName: "Kunde Nah", postalCode: "26199" },
          tour: { id: 102, name: "Tour 2", color: "#222222" },
        },
      ],
    });

    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({
      tourId: 101,
      score: 5,
      scoreLabel: "exakt",
      matchedAppointmentCount: 1,
    });
    expect(matches[1]).toMatchObject({
      tourId: 102,
      score: 3,
      scoreLabel: "nah",
      matchedAppointmentCount: 1,
    });
  });

  it("nutzt die Trefferzahl als Tie-Breaker innerhalb derselben Woche", () => {
    const matches = buildTourPostalPlanMatches({
      postalCode: "26135",
      rows: [
        {
          appointment: { id: 3, startDate: "2099-04-06" },
          project: { id: 13, name: "Projekt A1" },
          customer: { id: 23, fullName: "Kunde A1", postalCode: "26139" },
          tour: { id: 103, name: "Tour 1", color: "#333333" },
        },
        {
          appointment: { id: 4, startDate: "2099-04-07" },
          project: { id: 14, name: "Projekt A2" },
          customer: { id: 24, fullName: "Kunde A2", postalCode: "26137" },
          tour: { id: 103, name: "Tour 1", color: "#333333" },
        },
        {
          appointment: { id: 5, startDate: "2099-04-06" },
          project: { id: 15, name: "Projekt B1" },
          customer: { id: 25, fullName: "Kunde B1", postalCode: "26132" },
          tour: { id: 104, name: "Tour 2", color: "#444444" },
        },
      ],
    });

    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({
      tourId: 103,
      score: 4,
      matchedAppointmentCount: 2,
    });
    expect(matches[1]).toMatchObject({
      tourId: 104,
      score: 4,
      matchedAppointmentCount: 1,
    });
  });

  it("ignoriert Termine ohne explizite Tour", () => {
    const matches = buildTourPostalPlanMatches({
      postalCode: "26135",
      rows: [
        {
          appointment: { id: 6, startDate: "2099-04-06" },
          project: { id: 16, name: "Projekt ohne Tour" },
          customer: { id: 26, fullName: "Kunde Ohne Tour", postalCode: "26135" },
          tour: null,
        },
      ],
    });

    expect(matches).toEqual([]);
  });

  it("ignoriert Touren ausserhalb des Musters Tour Zahl", () => {
    const matches = buildTourPostalPlanMatches({
      postalCode: "26135",
      rows: [
        {
          appointment: { id: 7, startDate: "2099-04-06" },
          project: { id: 17, name: "Projekt Sondertour" },
          customer: { id: 27, fullName: "Kunde Sondertour", postalCode: "26135" },
          tour: { id: 105, name: "Parkplatz", color: "#555555" },
        },
      ],
    });

    expect(matches).toEqual([]);
  });
});
