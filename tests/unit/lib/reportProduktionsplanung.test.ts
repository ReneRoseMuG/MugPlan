/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Produktionsplanung fasst Mengen je Kategorie ueber identische Shortcodes zusammen, wenn Shortcodes aktiv sind.
 * - Ohne Shortcode oder bei deaktivierter Option bleiben Artikel getrennt.
 * - Jede Item-Gruppe fuehrt die beitragenden Produkt-/Komponenten-IDs (itemIds) mit; bei Verdichtung mehrere IDs.
 * - reportCardReasonTags enthalten ausschliesslich die managed Gruende "Sondermaß", "Anmerkungen" und "Gespiegelt".
 *
 * Fehlerfaelle:
 * - Shortcodes verdichten Mengen nicht stabil.
 * - Reklamation oder Storniert landen faelschlich in den Karten-Gruenden.
 *
 * Ziel:
 * Die reine FT26-Hilfslogik der Produktionsplanung ohne DB-Abhaengigkeit regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";

import {
  buildGroupedProduktionsplanungCategoryGroups,
  collectManagedReportCardReasonTags,
} from "../../../server/lib/reportProduktionsplanung";

describe("reportProduktionsplanung helpers", () => {
  it("merges quantities by shortcode when enabled", () => {
    const result = buildGroupedProduktionsplanungCategoryGroups([
      { categoryId: 1, categoryName: "Produkte", itemId: 11, itemName: "Sauna Alpha", shortCode: "SA", quantity: 2 },
      { categoryId: 1, categoryName: "Produkte", itemId: 12, itemName: "Sauna Beta", shortCode: "SA", quantity: 3 },
      { categoryId: 1, categoryName: "Produkte", itemId: 13, itemName: "Sauna Gamma", shortCode: null, quantity: 1 },
    ], true);

    expect(result).toEqual([
      {
        categoryId: 1,
        categoryName: "Produkte",
        items: [
          { itemName: "SA", totalQuantity: 5, itemIds: [11, 12] },
          { itemName: "Sauna Gamma", totalQuantity: 1, itemIds: [13] },
        ],
      },
    ]);
  });

  it("keeps items separate when shortcodes are disabled", () => {
    const result = buildGroupedProduktionsplanungCategoryGroups([
      { categoryId: 1, categoryName: "Produkte", itemId: 21, itemName: "Sauna Alpha", shortCode: "SA", quantity: 2 },
      { categoryId: 1, categoryName: "Produkte", itemId: 22, itemName: "Sauna Beta", shortCode: "SA", quantity: 3 },
    ], false);

    expect(result[0]?.items).toEqual([
      { itemName: "Sauna Alpha", totalQuantity: 2, itemIds: [21] },
      { itemName: "Sauna Beta", totalQuantity: 3, itemIds: [22] },
    ]);
  });

  it("collects only managed card reason tags from project and appointment tags", () => {
    const result = collectManagedReportCardReasonTags({
      projectTags: [
        { id: 1, name: "Reklamation", color: "#f97316", isDefault: false, version: 1 },
        { id: 2, name: "Anmerkungen", color: "#2563eb", isDefault: false, version: 1 },
        { id: 5, name: "Gespiegelt", color: "#0891b2", isDefault: false, version: 1 },
      ],
      appointmentTags: [
        { id: 3, name: "Sondermaß", color: "#1e3a8a", isDefault: false, version: 1 },
        { id: 4, name: "Storniert", color: "#ef4444", isDefault: false, version: 1 },
        { id: 2, name: "Anmerkungen", color: "#2563eb", isDefault: false, version: 1 },
        { id: 5, name: "Gespiegelt", color: "#0891b2", isDefault: false, version: 1 },
      ],
    });

    expect(result).toEqual([
      { id: 3, name: "Sondermaß", color: "#1e3a8a", isDefault: false, version: 1 },
    ]);
  });
});
