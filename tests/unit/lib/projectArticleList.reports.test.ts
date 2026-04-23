/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Report-Sauna erkennt Produktkategorien ueber den gemeinsamen Alias-Helper.
 * - Report-Komponentenspalten nutzen die bestehende Kategorie-Aliaslogik fuer Ofen, Tuer und Dach.
 *
 * Fehlerfaelle:
 * - Fass-Sauna-Kategorien werden fuer den Report nicht erkannt.
 * - Aliasnamen wie Tuer oder Dachvarianten werden keiner Reportspalte zugeordnet.
 *
 * Ziel:
 * Die gemeinsame Mapping-Basis fuer die Vorlaufliste regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";

import { getProjectArticleFieldByCategoryName, isReportSaunaProductCategoryName } from "../../../shared/projectArticleList";

describe("FT26 unit: project article report mappings", () => {
  it("recognizes sauna product category aliases for reports", () => {
    expect(isReportSaunaProductCategoryName("Fass Saunen")).toBe(true);
    expect(isReportSaunaProductCategoryName("Fasssaunen")).toBe(true);
    expect(isReportSaunaProductCategoryName("Sauna Modell")).toBe(true);
    expect(isReportSaunaProductCategoryName("Andere Kategorie")).toBe(false);
  });

  it("keeps component category aliases compatible with report columns", () => {
    expect(getProjectArticleFieldByCategoryName("Ofen")).toBe("oven");
    expect(getProjectArticleFieldByCategoryName("Tuer")).toBe("door");
    expect(getProjectArticleFieldByCategoryName("Dachvarianten")).toBe("roof");
  });
});
