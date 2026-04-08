/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Tourenplan-Druckseite rendert pro Kalenderwoche genau einen Rail-Marker.
 * - Die reduzierte Seitenchrome enthaelt oben nur den Tournamen und unten nur die Seitennummer.
 *
 * Fehlerfaelle:
 * - Wochenmarker fehlen oder werden nicht pro Woche gerendert.
 * - Header oder Footer enthalten wieder zusaetzlichen Kontexttext.
 *
 * Ziel:
 * Die neue Tourenplan-Druckseite mitsamt schmaler Seitenchrome regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TourenplanPrintPage } from "../../../client/src/components/reports/TourenplanPrintPage";
import type { TourenplanPrintPageData } from "../../../client/src/components/reports/tourenplan-model";

const page: TourenplanPrintPageData = {
  pageNumber: 1,
  tourName: "Tour Alpha",
  weeks: [
    {
      weekStart: "2026-04-13",
      weekEnd: "2026-04-19",
      weekNumber: 16,
      markerTopPx: 4,
      appointments: [{
        id: 1,
        projectId: 10,
        projectName: "Projekt 1",
        startDate: "2026-04-14",
        endDate: "2026-04-15",
        startTime: null,
        durationDays: 2,
        saunaModel: null,
        customer: {
          id: 100,
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
        projectArticleItems: [],
        projectDescription: null,
      }],
    },
    {
      weekStart: "2026-04-20",
      weekEnd: "2026-04-26",
      weekNumber: 17,
      markerTopPx: 120,
      appointments: [{
        id: 2,
        projectId: 11,
        projectName: "Projekt 2",
        startDate: "2026-04-22",
        endDate: "2026-04-22",
        startTime: null,
        durationDays: 1,
        saunaModel: null,
        customer: {
          id: 101,
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
        appointmentTags: [],
        customerTags: [],
        projectTags: [],
        projectArticleItems: [],
        projectDescription: null,
      }],
    },
  ],
};

describe("UI: TourenplanPrintPage", () => {
  it("renders a kw marker per week and keeps the chrome minimal", () => {
    const html = renderToStaticMarkup(
      <TourenplanPrintPage
        page={page}
        printMode="farbdruck"
        orientation="landscape"
        useShortCodes={false}
        testId="tourenplan-page"
      />,
    );

    expect(html.match(/tourenplan-page-kw-marker-/g)?.length).toBe(2);
    expect(html).toContain("Tour Alpha");
    expect(html).toContain("Seite 1");
    expect(html).not.toContain("Tourenplan");
    expect(html).not.toContain("bis");
  });
});
