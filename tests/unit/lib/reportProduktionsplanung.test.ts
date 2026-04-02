/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Produktionsplanung fasst Mengen je Kategorie ueber identische Shortcodes zusammen, wenn Shortcodes aktiv sind.
 * - Ohne Shortcode oder bei deaktivierter Option bleiben Artikel getrennt.
 * - Sonderblock-Treffer ignorieren Reklamation und Storniert selbst dann, wenn sie in der Auswahl enthalten sind.
 *
 * Fehlerfaelle:
 * - Shortcodes verdichten Mengen nicht stabil.
 * - Nicht erlaubte Sonderblock-Tags landen in matchedSonderblockTagIds.
 *
 * Ziel:
 * Die reine Produktionsplanung-Hilfslogik ohne DB-Abhaengigkeiten regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";

import {
  buildGroupedProduktionsplanungCategoryGroups,
  collectMatchedSonderblockTagIds,
} from "../../../server/lib/reportProduktionsplanung";

describe("reportProduktionsplanung helpers", () => {
  it("merges quantities by shortcode when enabled", () => {
    const result = buildGroupedProduktionsplanungCategoryGroups([
      { categoryId: 1, categoryName: "Produkte", itemName: "Sauna Alpha", shortCode: "SA", quantity: 2 },
      { categoryId: 1, categoryName: "Produkte", itemName: "Sauna Beta", shortCode: "SA", quantity: 3 },
      { categoryId: 1, categoryName: "Produkte", itemName: "Sauna Gamma", shortCode: null, quantity: 1 },
    ], true);

    expect(result).toEqual([
      {
        categoryId: 1,
        categoryName: "Produkte",
        items: [
          { itemName: "SA", totalQuantity: 5 },
          { itemName: "Sauna Gamma", totalQuantity: 1 },
        ],
      },
    ]);
  });

  it("keeps items separate when shortcodes are disabled", () => {
    const result = buildGroupedProduktionsplanungCategoryGroups([
      { categoryId: 1, categoryName: "Produkte", itemName: "Sauna Alpha", shortCode: "SA", quantity: 2 },
      { categoryId: 1, categoryName: "Produkte", itemName: "Sauna Beta", shortCode: "SA", quantity: 3 },
    ], false);

    expect(result[0]?.items).toEqual([
      { itemName: "Sauna Alpha", totalQuantity: 2 },
      { itemName: "Sauna Beta", totalQuantity: 3 },
    ]);
  });

  it("ignores reclamation and cancellation tags in sonderblock matches", () => {
    const result = collectMatchedSonderblockTagIds({
      selectedTags: [
        { id: 1, name: "Reklamation", color: "#f97316", isDefault: false, version: 1 },
        { id: 2, name: "Storniert", color: "#ef4444", isDefault: false, version: 1 },
        { id: 3, name: "Baustellenstopp", color: "#2563eb", isDefault: false, version: 1 },
      ],
      projectTags: [
        { id: 1, name: "Reklamation", color: "#f97316", isDefault: false, version: 1 },
        { id: 3, name: "Baustellenstopp", color: "#2563eb", isDefault: false, version: 1 },
      ],
      appointmentTags: [
        { id: 2, name: "Storniert", color: "#ef4444", isDefault: false, version: 1 },
        { id: 3, name: "Baustellenstopp", color: "#2563eb", isDefault: false, version: 1 },
      ],
    });

    expect(result).toEqual([3]);
  });
});


