/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Artikellistenzeilen werden aus den gepflegten Produktslots in stabiler Reihenfolge erzeugt.
 * - Zusätzliche Slots für Tür, Vorderwand, Rückwand und Inneneinrichtung werden mitgeführt.
 * - Persistierte Projektbeschreibung trennt Artikelliste und Beschreibung ueber sichtbare H2-Abschnitte.
 * - Beim Oeffnen des Formulars wird nur der Beschreibungsteil in den Editor zurueckgefuehrt.
 * - Kategorien werden über robuste Alias-Namen den Artikelslots zugeordnet.
 * - Saunamodell wird aus Produkt-Referenzen statt Komponenten gelesen.
 *
 * Fehlerfälle:
 * - Artikelliste wird leer oder in falscher Reihenfolge gespeichert.
 * - Editor liest beim Oeffnen den Artikellistenblock erneut mit ein.
 * - Komponentenlisten bleiben leer, weil Singular/Plural oder Leerzeichen in Kategorien nicht gematcht werden.
 * - Produktbasierte Saunamodelle landen nicht im Artikelslot.
 *
 * Ziel:
 * Die Trennung zwischen Artikelliste und Beschreibungseditor sowie die Zuordnung von Produkt-/Komponentenslots absichern.
 */
import { describe, expect, it } from "vitest";
import {
  buildPersistedProjectDescription,
  buildProjectArticleLines,
  createEmptyProjectProductSelections,
  extractEditorDescriptionHtml,
  findProjectProductCategory,
  getProjectProductFieldByCategoryName,
  mapProjectOrderItemsToSelections,
} from "../../../client/src/lib/project-product-form";

describe("project product form helpers", () => {
  it("builds article lines in slot order", () => {
    const selections = createEmptyProjectProductSelections();
    selections.saunaModel.componentName = "Modell S";
    selections.oven.componentName = "Ofen X";
    selections.door.componentName = "Ganzglastür";
    selections.frontWall.componentName = "Frontglas";
    selections.rearWallWindow.componentName = "Rueckwand doppelt";
    selections.interior.componentName = "Espenholz";
    selections.window.componentName = "Panoramafenster";

    expect(buildProjectArticleLines(selections)).toEqual([
      "Saunamodell: Modell S",
      "Ofen: Ofen X",
      "Fenster: Panoramafenster",
      "Tür: Ganzglastür",
      "Vorderwand: Frontglas",
      "Rückwand: Rueckwand doppelt",
      "Inneneinrichtung: Espenholz",
    ]);
  });

  it("persists article list and description with visible section headings", () => {
    const selections = createEmptyProjectProductSelections();
    selections.saunaModel.componentName = "Modell S";

    const persisted = buildPersistedProjectDescription(selections, "<p>Freie Beschreibung</p>");

    expect(persisted).toContain("<h2>Artikelliste</h2>");
    expect(persisted).toContain("Saunamodell: Modell S");
    expect(persisted).toContain("<h2>Beschreibung</h2><p>Freie Beschreibung</p>");
  });

  it("extracts only the description section back into the editor", () => {
    const persisted = "<h2>Artikelliste</h2><ul><li>Ofen: X</li></ul><h2>Beschreibung</h2><p>Nur Editor</p>";
    expect(extractEditorDescriptionHtml(persisted)).toBe("<p>Nur Editor</p>");
  });

  it("matches project component fields through normalized category aliases", () => {
    expect(getProjectProductFieldByCategoryName("Öfen")).toBe("oven");
    expect(getProjectProductFieldByCategoryName("Steuerung")).toBe("control");
    expect(getProjectProductFieldByCategoryName("Dachvarianten")).toBe("roof");
    expect(getProjectProductFieldByCategoryName("Türen")).toBe("door");
    expect(getProjectProductFieldByCategoryName("Vorderwände")).toBe("frontWall");
    expect(getProjectProductFieldByCategoryName("Rückwand")).toBe("rearWallWindow");
    expect(getProjectProductFieldByCategoryName("Inneneinrichtung")).toBe("interior");

    const category = findProjectProductCategory(
      [
        { id: 10, name: "Dachvarianten", isActive: true, version: 1, createdAt: new Date(), updatedAt: new Date() },
      ],
      "roof",
    );

    expect(category?.id).toBe(10);
  });

  it("maps product and component order items into the article slots", () => {
    const selections = mapProjectOrderItemsToSelections(
      [
        { id: 1, projectId: 1, orderNumber: "ORD-1", productId: 201, componentId: null, specificationId: null, description: null, quantity: 1, version: 1, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, projectId: 1, orderNumber: "ORD-1", productId: null, componentId: 101, specificationId: null, description: null, quantity: 1, version: 1, createdAt: new Date(), updatedAt: new Date() },
        { id: 3, projectId: 1, orderNumber: "ORD-1", productId: null, componentId: 102, specificationId: null, description: null, quantity: 1, version: 1, createdAt: new Date(), updatedAt: new Date() },
      ],
      [
        { id: 201, name: "Modell A", categoryId: 1, description: null, isActive: true, version: 1, createdAt: new Date(), updatedAt: new Date() },
      ],
      [
        { id: 101, name: "Ofen XL", categoryId: 11, description: null, isActive: true, version: 1, createdAt: new Date(), updatedAt: new Date() },
        { id: 102, name: "Espenholz", categoryId: 12, description: null, isActive: true, version: 1, createdAt: new Date(), updatedAt: new Date() },
      ],
      [
        { id: 11, name: "Öfen", isActive: true, version: 1, createdAt: new Date(), updatedAt: new Date() },
        { id: 12, name: "Inneneinrichtung", isActive: true, version: 1, createdAt: new Date(), updatedAt: new Date() },
      ],
    );

    expect(selections.saunaModel.productId).toBe(201);
    expect(selections.saunaModel.componentName).toBe("Modell A");
    expect(selections.oven.componentName).toBe("Ofen XL");
    expect(selections.interior.componentName).toBe("Espenholz");
  });
});
