/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Speichern-Prüfung meldet offene Artikellisten-Auswahlen erst, wenn die Artikelliste fachlich im Spiel ist.
 * - Gewählte Sauna-Modelle lösen nur dann einen Titelvorschlag aus, wenn Projektname und Modell abweichen.
 * - Dynamische Artikellisten-Slots werden in die Prüfung einbezogen.
 *
 * Ziel:
 * Die reine Review-Logik des Projekt-Speichern-Flows ohne React- oder API-Abhängigkeiten absichern.
 */
import { describe, expect, it } from "vitest";
import {
  PROJECT_PRODUCT_FIELDS,
  createEmptyDynamicProjectProductSelections,
  createEmptyProjectProductSelections,
} from "../../../client/src/lib/project-product-form";
import {
  collectMissingProjectArticleLabels,
  resolveSaunaTitleSuggestion,
} from "../../../client/src/lib/project-save-review";

describe("project save review logic", () => {
  it("does not report empty article fields before article context exists", () => {
    const selections = createEmptyProjectProductSelections();

    expect(collectMissingProjectArticleLabels({
      productSelections: selections,
      dynamicSelections: {},
      dynamicSlots: [],
      extractedArticleListHtml: "",
    })).toEqual([]);
  });

  it("reports static and dynamic missing labels once an article was selected", () => {
    const selections = createEmptyProjectProductSelections();
    selections.saunaModel = {
      ...selections.saunaModel,
      productId: 17,
      componentName: "Sauna Modell A",
    };
    const dynamicSlots = [{
      slotId: "product-category-99",
      categoryId: 99,
      categoryName: "Zubehör",
      label: "Zubehör",
      source: "product" as const,
    }];
    const missingLabels = collectMissingProjectArticleLabels({
      productSelections: selections,
      dynamicSelections: createEmptyDynamicProjectProductSelections(dynamicSlots),
      dynamicSlots,
      extractedArticleListHtml: "",
    });

    expect(missingLabels).not.toContain(PROJECT_PRODUCT_FIELDS.find((field) => field.key === "saunaModel")?.label);
    expect(missingLabels).toContain(PROJECT_PRODUCT_FIELDS.find((field) => field.key === "oven")?.label);
    expect(missingLabels).toContain("Zubehör");
  });

  it("uses extracted article HTML as review context even without structured selections", () => {
    const selections = createEmptyProjectProductSelections();
    const missingLabels = collectMissingProjectArticleLabels({
      productSelections: selections,
      dynamicSelections: {},
      dynamicSlots: [],
      extractedArticleListHtml: "<p>Positionen aus PDF</p>",
    });

    expect(missingLabels).toContain(PROJECT_PRODUCT_FIELDS.find((field) => field.key === "saunaModel")?.label);
    expect(missingLabels).not.toContain(PROJECT_PRODUCT_FIELDS.find((field) => field.key === "window")?.label);
    expect(missingLabels.length).toBe(PROJECT_PRODUCT_FIELDS.filter((field) => field.key !== "window").length);
  });

  it("reports missing selections after the article list was touched and cleared", () => {
    const selections = createEmptyProjectProductSelections();
    const missingLabels = collectMissingProjectArticleLabels({
      productSelections: selections,
      dynamicSelections: {},
      dynamicSlots: [],
      articleListTouched: true,
      extractedArticleListHtml: "",
    });

    expect(missingLabels).not.toContain(PROJECT_PRODUCT_FIELDS.find((field) => field.key === "window")?.label);
    expect(missingLabels.length).toBe(PROJECT_PRODUCT_FIELDS.filter((field) => field.key !== "window").length);
  });

  it("suggests the sauna model as project title only for differing titles", () => {
    const selections = createEmptyProjectProductSelections();
    selections.saunaModel = {
      ...selections.saunaModel,
      productId: 19,
      componentName: "Sauna Modell B",
    };

    expect(resolveSaunaTitleSuggestion({
      projectName: "Manueller Titel",
      productSelections: selections,
    })).toBe("Sauna Modell B");
    expect(resolveSaunaTitleSuggestion({
      projectName: "Sauna Modell B",
      productSelections: selections,
    })).toBeNull();
  });
});
