/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Render-Optionen der Projekt-Artikelliste filtern optional nur Komponenten.
 * - Shortcodes ersetzen Namen nur wenn explizit aktiviert und nicht leer.
 * - Leere Labels/Werte und unvollstaendige Metadaten werden robust behandelt.
 *
 * Fehlerfaelle:
 * - Komponentenfilter laesst Produkte oder Metadaten-lose Eintraege durch.
 * - Shortcode-Modus liefert leere Werte statt sauber auf den Namen zurueckzufallen.
 *
 * Ziel:
 * Die additive Filter- und Anzeigevorbereitung der Projekt-Artikelliste isoliert regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";

import {
  normalizeRenderableProjectArticleItems,
  resolveProjectArticleItemDisplayValue,
} from "../../../shared/projectArticleList";

describe("projectArticleList render options", () => {
  it("keeps all valid items by default", () => {
    expect(normalizeRenderableProjectArticleItems([
      { label: "Saunamodell", value: "Nord Premium", source: "product", shortCode: "NP" },
      { label: "Ofen", value: "HUUM Core", source: "component", shortCode: "HC" },
    ])).toEqual([
      { label: "Saunamodell", value: "Nord Premium", source: "product", shortCode: "NP" },
      { label: "Ofen", value: "HUUM Core", source: "component", shortCode: "HC" },
    ]);
  });

  it("filters to components only when requested", () => {
    expect(normalizeRenderableProjectArticleItems([
      { label: "Saunamodell", value: "Nord Premium", source: "product", shortCode: "NP" },
      { label: "Ofen", value: "HUUM Core", source: "component", shortCode: "HC" },
      { label: "Fenster", value: "Panorama", source: "component", shortCode: "PAN" },
    ], { filter: "components" })).toEqual([
      { label: "Ofen", value: "HUUM Core", source: "component", shortCode: "HC" },
      { label: "Fenster", value: "Panorama", source: "component", shortCode: "PAN" },
    ]);
  });

  it("drops entries without explicit component source in components-only mode", () => {
    expect(normalizeRenderableProjectArticleItems([
      { label: "Saunamodell", value: "Nord Premium", source: "product", shortCode: "NP" },
      { label: "Ofen", value: "HUUM Core" },
      { label: "Fenster", value: "Panorama", source: "component" },
    ], { filter: "components" })).toEqual([
      { label: "Fenster", value: "Panorama", source: "component" },
    ]);
  });

  it("uses shortcodes when enabled and present", () => {
    expect(normalizeRenderableProjectArticleItems([
      { label: "Ofen", value: "HUUM Core", source: "component", shortCode: "HC" },
    ], { useShortCodes: true })).toEqual([
      { label: "Ofen", value: "HC", source: "component", shortCode: "HC" },
    ]);
  });

  it("falls back to item names when shortcodes are missing, null or blank", () => {
    expect(normalizeRenderableProjectArticleItems([
      { label: "Saunamodell", value: "Nord Premium", source: "product", shortCode: null },
      { label: "Ofen", value: "HUUM Core", source: "component", shortCode: "   " },
      { label: "Fenster", value: "Panorama", source: "component" },
    ], { useShortCodes: true })).toEqual([
      { label: "Saunamodell", value: "Nord Premium", source: "product", shortCode: null },
      { label: "Ofen", value: "HUUM Core", source: "component", shortCode: "   " },
      { label: "Fenster", value: "Panorama", source: "component" },
    ]);
  });

  it("trims labels and resolved values and removes empty rows after resolution", () => {
    expect(normalizeRenderableProjectArticleItems([
      { label: "  Saunamodell ", value: " Nord Premium ", source: "product", shortCode: " NP " },
      { label: "Ofen", value: "HUUM Core", source: "component", shortCode: "   " },
      { label: "   ", value: "Ignorieren", source: "component", shortCode: "IG" },
      { label: "Fenster", value: "   ", source: "component", shortCode: null },
    ], { useShortCodes: true })).toEqual([
      { label: "Saunamodell", value: "NP", source: "product", shortCode: " NP " },
      { label: "Ofen", value: "HUUM Core", source: "component", shortCode: "   " },
    ]);
  });

  it("returns an empty list for nullish inputs", () => {
    expect(normalizeRenderableProjectArticleItems(null, { filter: "components", useShortCodes: true })).toEqual([]);
    expect(normalizeRenderableProjectArticleItems(undefined)).toEqual([]);
  });

  it("resolves single display values with safe fallback semantics", () => {
    expect(resolveProjectArticleItemDisplayValue({ value: "Name", shortCode: "SC" }, true)).toBe("SC");
    expect(resolveProjectArticleItemDisplayValue({ value: "Name", shortCode: "   " }, true)).toBe("Name");
    expect(resolveProjectArticleItemDisplayValue({ value: "Name", shortCode: "SC" }, false)).toBe("Name");
  });
});
