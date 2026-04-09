/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Tourenplan-Karte unterscheidet Farb- und Sparmodus sichtbar.
 * - Der Komponentenfilter blendet Sauna-Produkte aus.
 * - Der Shortcode-Modus ersetzt Artikelnamen nur bei vorhandenen Shortcodes.
 * - Reklamation erscheint nicht mehr als Headertext, bleibt aber als Kartenmarkierung sichtbar.
 * - Farbdruck markiert farbige Flächen explizit für den Browser-Print und Mitarbeiterbadges bleiben fett.
 *
 * Fehlerfaelle:
 * - Der Kartenmodus rendert denselben Header fuer beide Druckvarianten.
 * - Sauna-Eintraege aus der Produktkategorie erscheinen in der Tourenplan-Artikelliste.
 * - Shortcodes werden ignoriert oder ersetzen leere Codes.
 * - Reklamation wird im Datumsheader statt nur im Karteninhalt dargestellt.
 *
 * Ziel:
 * Die neue Tourenplan-Karte in Isolation regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TourenplanAppointmentCard } from "../../../client/src/components/reports/TourenplanAppointmentCard";
import type { TourenplanResolvedAppointment } from "../../../client/src/components/reports/tourenplan-model";

const appointment: TourenplanResolvedAppointment = {
  id: 7,
  projectId: 17,
  projectName: "Premium IV",
  startDate: "2026-04-14",
  endDate: "2026-04-15",
  startTime: null,
  durationDays: 2,
  saunaModel: "Panorama Sauna",
  customer: {
    id: 33,
    customerNumber: "C-33",
    fullName: "Syring, Rene",
    phone: "+49 340 123456",
    addressLine1: null,
    addressLine2: null,
    postalCode: "06842",
    city: "Dessau-Rosslau",
    country: "Deutschland",
  },
  employees: [
    { id: 1, fullName: "Herold, Roy" },
    { id: 2, fullName: "Winter, Dirk" },
  ],
  printNotes: [
    {
      id: 99,
      sourceType: "appointment",
      title: "Vorbesprechung Kunde",
      body: "<p>Kran&nbsp; erforderlich.</p>",
      cardColor: "#f97316",
      updatedAt: "2026-04-14T08:00:00.000Z",
    },
  ],
  appointmentTags: [],
  customerTags: [],
  projectTags: [{ id: 5, name: "Sondermaß", color: "#1e3a8a", isDefault: false, version: 1 }],
  projectArticleItems: [
    { label: "Sauna", value: "Panorama Sauna", source: "product", shortCode: "PS" },
    { label: "Ofen", value: "Harvia 20", source: "component", shortCode: "H20" },
    { label: "Steuerung", value: "Xenio 3", source: "component", shortCode: "X3" },
    { label: "Dach", value: "Flachdach", source: "component", shortCode: null },
  ],
  projectDescription: "<p>Bitte <strong>Einfahrt</strong> freihalten.</p>",
};

describe("UI: TourenplanAppointmentCard", () => {
  it("renders component-only article items and employee badges in farbdruck mode", () => {
    const html = renderToStaticMarkup(
      <TourenplanAppointmentCard
        appointment={appointment}
        printMode="farbdruck"
        fontSize="medium"
        useShortCodes={false}
        testId="tourenplan-card"
      />,
    );

    expect(html).toContain('data-tourenplan-print-mode="farbdruck"');
    expect(html).toContain("14.04.26 | 2 Tage");
    expect(html).toContain("Sondermaß");
    expect(html).toContain("Harvia 20");
    expect(html).toContain("Xenio 3");
    expect(html).toContain("Flachdach");
    expect(html).not.toContain("Panorama Sauna");
    expect(html).toContain("Roy H.");
    expect(html).toContain("Dirk W.");
    expect(html).toContain("Bitte Einfahrt freihalten.");
    expect(html).toContain("Kran erforderlich.");
    expect(html).not.toContain("<strong>");
    expect(html).not.toContain("&nbsp;");
    expect(html).not.toContain("tourenplan-card-header-separator");
    expect(html).toContain('data-tourenplan-font-size="medium"');
    expect(html).toContain("print-color-adjust:exact");
    expect(html).toContain("font-weight:700");
  });

  it("uses shortcodes and the spar header separator in spardruck mode", () => {
    const html = renderToStaticMarkup(
      <TourenplanAppointmentCard
        appointment={appointment}
        printMode="spardruck"
        fontSize="small"
        useShortCodes
        testId="tourenplan-card"
      />,
    );

    expect(html).toContain('data-tourenplan-print-mode="spardruck"');
    expect(html).toContain('data-tourenplan-font-size="small"');
    expect(html).toContain("tourenplan-card-header-separator");
    expect(html).toContain("H20");
    expect(html).toContain("X3");
    expect(html).toContain("Flachdach");
    expect(html).not.toContain("Harvia 20");
    expect(html).not.toContain("Xenio 3");
    expect(html).not.toContain("Panorama Sauna");
  });

  it("keeps Reklamation out of the header while showing the note content", () => {
    const html = renderToStaticMarkup(
      <TourenplanAppointmentCard
        appointment={{
          ...appointment,
          durationDays: 1,
          appointmentTags: [{ id: 8, name: "Reklamation", color: "#f97316", isDefault: false, version: 1 }],
          customerTags: [],
          projectTags: [],
          projectDescription: null,
        }}
        printMode="farbdruck"
        fontSize="large"
        useShortCodes={false}
        testId="tourenplan-card"
      />,
    );

    expect(html).toContain("14.04.26 | 1 Tag");
    expect(html).not.toContain("| Reklamation");
    expect(html).toContain(">Reklamation<");
    expect(html).toContain("Vorbesprechung Kunde");
    expect(html).toContain("Kran erforderlich.");
  });

  it("renders a fallback dash when description and visible notes are empty after normalization", () => {
    const html = renderToStaticMarkup(
      <TourenplanAppointmentCard
        appointment={{
          ...appointment,
          printNotes: [{
            id: 100,
            sourceType: "appointment",
            title: "",
            body: "<p>&nbsp;</p>",
            cardColor: null,
            updatedAt: "2026-04-14T08:00:00.000Z",
          }],
          projectDescription: "<p> &nbsp; </p>",
        }}
        printMode="spardruck"
        fontSize="medium"
        useShortCodes={false}
        testId="tourenplan-card"
      />,
    );

    expect(html).toContain(">-<");
    expect(html).not.toContain("tourenplan-card-note-");
  });
});
