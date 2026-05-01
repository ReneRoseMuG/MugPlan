/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Kalendermarker zeigen kompakte Labels ohne Terminbedienung zu ersetzen.
 * - Sichtbare Datumsangaben im Tooltip nutzen das Kurzformat `dd.MM.yy`.
 *
 * Aussagekraft-Nachweis:
 * - Zielobjekt: `CalendarMarkerBadges` mit einem mehrtägigen Betriebsferien-Marker.
 * - Eindeutiger Nachweis: Marker-ID `admin:test` und Name `Betriebsferien Jahreswechsel`.
 * - Realistische Daten: Zeitraum, Admin-Quelle, Firmen-Scope, aktive Version und Notiz sind vollständig gesetzt.
 * - Kritische Assertion: das kompakte Label `BF` und der Tooltip-Zeitraum `24.12.26 bis 31.12.26` werden gerendert.
 * - False-Positive-Schutz: der Test prüft zusätzlich, dass der Tooltip nicht auf das technische ISO-Datum im sichtbaren Text zurückfällt.
 */
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { CalendarMarkerBadges } from "../../../client/src/components/calendar/CalendarMarkerBadges";
import type { CalendarMarker } from "../../../client/src/lib/calendar-markers";

describe("CalendarMarkerBadges", () => {
  it("rendert kompakte Marker mit deutschem Kurzdatum im Tooltip", () => {
    const marker: CalendarMarker = {
      id: "admin:test",
      date: "2026-12-24",
      endDate: "2026-12-31",
      name: "Betriebsferien Jahreswechsel",
      type: "company_vacation",
      source: "admin",
      scope: "company",
      states: [],
      active: true,
      note: "Testdaten",
      version: 1,
    };

    const html = renderToStaticMarkup(<CalendarMarkerBadges markers={[marker]} compact />);

    expect(html).toContain("BF");
    expect(html).toContain("24.12.26 bis 31.12.26");
    expect(html).not.toContain("Betriebsferien Jahreswechsel, 2026-12-24");
  });
});
