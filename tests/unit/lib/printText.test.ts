/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - stripHtmlToText entfernt HTML-Tags, `&nbsp;` und überzählige Leerzeichen deterministisch.
 * - formatEmployeeShortName liefert weiterhin dieselbe Kurzform wie vor dem Legacy-Cleanup.
 *
 * Fehlerfälle:
 * - HTML bleibt als Markup im neuen Tourenplan-Report sichtbar.
 * - Mitarbeitenden-Kurzformen ändern sich unbeabsichtigt durch die Helper-Auslagerung.
 *
 * Ziel:
 * Die ausgelagerten Shared-Helper für den Tourenplan-Report regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";
import { formatEmployeeShortName, stripHtmlToText } from "../../../client/src/lib/printText";

describe("printText helpers", () => {
  it("normalizes HTML text into plain text", () => {
    expect(stripHtmlToText("<p>Bitte&nbsp; Einfahrt <strong>freihalten</strong>.</p>")).toBe("Bitte Einfahrt freihalten .");
    expect(stripHtmlToText("   <div>\n  Hinweis \n</div>  ")).toBe("Hinweis");
    expect(stripHtmlToText(null)).toBe("");
  });

  it("keeps employee short names stable", () => {
    expect(formatEmployeeShortName("Herold, Roy")).toBe("Roy H.");
    expect(formatEmployeeShortName("Madonna")).toBe("Madonna");
    expect(formatEmployeeShortName("Muster, ")).toBe("Muster");
    expect(formatEmployeeShortName("")).toBe("");
  });
});
