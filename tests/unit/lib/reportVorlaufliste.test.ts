/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - HTML-Projektbeschreibungen werden fuer die Vorlaufliste zu lesbarem Klartext normalisiert.
 *
 * Fehlerfaelle:
 * - HTML-Tags oder Entities bleiben roh in der Reportausgabe stehen.
 *
 * Ziel:
 * Die textuelle Aufbereitung der Vorlaufliste gezielt isoliert absichern.
 */
import { describe, expect, it } from "vitest";

import { stripReportHtmlToText } from "../../../server/lib/reportVorlaufliste";

describe("FT26 unit: report vorlaufliste helpers", () => {
  it("strips html descriptions down to normalized text", () => {
    expect(stripReportHtmlToText("<p>Alpha &amp; <strong>Beta</strong></p>")).toBe("Alpha & Beta");
    expect(stripReportHtmlToText("")).toBeNull();
    expect(stripReportHtmlToText(null)).toBeNull();
  });
});
