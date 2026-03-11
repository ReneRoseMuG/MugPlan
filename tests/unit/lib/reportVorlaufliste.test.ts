/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - HTML-Projektbeschreibungen werden fuer die Vorlaufliste zu lesbarem Klartext normalisiert.
 * - Nur die fuer den Report relevanten Komponenten-Kategorien werden auf Spalten gemappt.
 *
 * Fehlerfaelle:
 * - HTML-Tags oder Entities bleiben roh in der Reportausgabe stehen.
 * - Nicht relevante Kategorien landen in einer Reportspalte.
 *
 * Ziel:
 * Die textuelle und kategorische Aufbereitung der Vorlaufliste gezielt isoliert absichern.
 */
import { describe, expect, it } from "vitest";

import { resolveReportComponentSlot, stripReportHtmlToText } from "../../../server/lib/reportVorlaufliste";

describe("FT26 unit: report vorlaufliste helpers", () => {
  it("strips html descriptions down to normalized text", () => {
    expect(stripReportHtmlToText("<p>Alpha &amp; <strong>Beta</strong></p>")).toBe("Alpha & Beta");
    expect(stripReportHtmlToText("")).toBeNull();
    expect(stripReportHtmlToText(null)).toBeNull();
  });

  it("maps only report-relevant component categories to slots", () => {
    expect(resolveReportComponentSlot("Ofen")).toBe("oven");
    expect(resolveReportComponentSlot("Steuerung")).toBe("control");
    expect(resolveReportComponentSlot("Inneneinrichtung")).toBeNull();
  });
});
