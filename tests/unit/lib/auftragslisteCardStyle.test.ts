/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Auftragsliste priorisiert Highlight-Tags als Sondermaß > Gespiegelt > Messe Aufbau/Abbau > Anmerkungen.
 * - Die dominante Tag-Farbe steuert Kartenrand und Hintergrundtönung.
 *
 * Fehlerfaelle:
 * - Messe bleibt hinter Anmerkungen.
 * - Die Kartenhervorhebung verliert die Farbverdrahtung des Gewinner-Tags.
 *
 * Ziel:
 * Die reine clientseitige Highlight-Logik der Auftragsliste ohne Render-Kontext regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";
import { resolveAuftragslisteHighlightStyles } from "../../../client/src/components/reports/auftragslisteCardStyle";

describe("auftragslisteCardStyle", () => {
  it("prioritizes Messe before Anmerkungen while Sondermaß and Gespiegelt stay ahead", () => {
    const messe = { id: 1, name: "Messe Aufbau/Abbau", color: "#3465A4", isDefault: false, version: 1 };
    const remarks = { id: 2, name: "Anmerkungen", color: "#888780", isDefault: false, version: 1 };
    const mirrored = { id: 3, name: "Gespiegelt", color: "#0891b2", isDefault: false, version: 1 };
    const specialMeasure = { id: 4, name: "Sondermaß", color: "#BA7517", isDefault: false, version: 1 };

    expect(resolveAuftragslisteHighlightStyles([remarks, messe]).dominantTag).toEqual(messe);
    expect(resolveAuftragslisteHighlightStyles([messe, mirrored]).dominantTag).toEqual(mirrored);
    expect(resolveAuftragslisteHighlightStyles([messe, mirrored, specialMeasure]).dominantTag).toEqual(specialMeasure);
  });

  it("keeps Gespiegelt ahead of Messe and Anmerkungen in mixed combinations", () => {
    const messe = { id: 1, name: "Messe Aufbau/Abbau", color: "#3465A4", isDefault: false, version: 1 };
    const remarks = { id: 2, name: "Anmerkungen", color: "#888780", isDefault: false, version: 1 };
    const mirrored = { id: 3, name: "Gespiegelt", color: "#0891b2", isDefault: false, version: 1 };

    expect(resolveAuftragslisteHighlightStyles([remarks, mirrored, messe]).dominantTag).toEqual(mirrored);
  });

  it("uses the dominant tag color for card border and tinted surfaces", () => {
    const result = resolveAuftragslisteHighlightStyles([
      { id: 7, name: "Messe Aufbau/Abbau", color: "#3465A4", isDefault: false, version: 1 },
    ]);

    expect(result.articleStyle).toMatchObject({
      borderColor: "#3465A4",
      backgroundColor: "rgba(52, 101, 164, 0.05)",
    });
    expect(result.headerStyle).toMatchObject({
      backgroundColor: "rgba(52, 101, 164, 0.14)",
    });
    expect(result.footerStyle).toMatchObject({
      backgroundColor: "rgba(52, 101, 164, 0.1)",
    });
  });
});
