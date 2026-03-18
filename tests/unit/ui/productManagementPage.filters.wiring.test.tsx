/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Produktverwaltung verwendet wiederverwendbare UI-Bausteine fuer Auswahl, Stammdaten und Komponenteneditor.
 * - Produktauswahl reduziert die Anzeige auf den Namen und bietet Delete- und Update-Pfade.
 * - Komponentenbereich nutzt synchronisierte Komponenten- und Kategorien-Dropdowns plus Detailformular.
 * - Komponenten-Loeschfehler unterscheiden Produktzuordnung und Projektverwendung ueber API-Konfliktdetails.
 * - Kategorie-Bereiche bleiben als eigene Bereiche erhalten.
 *
 * Fehlerfaelle:
 * - ProductManagementPage rendert die neue Komponentenstruktur nicht.
 * - Produkt- und Komponenten-Shortcodes fehlen im Verdrahtungszustand.
 *
 * Ziel:
 * Sicherstellen, dass die Produktverwaltung auf die neue Komponentenarchitektur umgestellt ist.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT27 UI: product management component architecture wiring", () => {
  it("uses the new reusable product management UI components", () => {
    const source = readFileSync(path.resolve(process.cwd(), "client/src/components/ProductManagementPage.tsx"), "utf8");
    const allComponentListSource = readFileSync(path.resolve(process.cwd(), "client/src/components/ui/all-component-list.tsx"), "utf8");

    expect(source).toContain("import { AllComponentList, type ComponentEditorInput }");
    expect(source).toContain("import { ProductDetails, type ProductDetailsDraft }");
    expect(source).toContain("import { ProductDropDown }");
    expect(source).toContain("<ProductDropDown");
    expect(source).toContain("<ProductDetails");
    expect(source).toContain("<AllComponentList");
    expect(source).toContain("onDeleteProduct={() => void deleteSelectedProduct()}");
    expect(source).toContain("components={components}");
    expect(source).toContain("async function createStandaloneComponent");
    expect(source).toContain("async function updateComponentData");
    expect(source).toContain("const deleteSelectedComponentWithConflictDetails = async");
    expect(source).toContain("function resolveComponentDeleteError");
    expect(source).toContain("deleteSelectedComponentWithConflictDetails");
    expect(source).toContain("assignedProductCount");
    expect(source).toContain("projectOrderItemCount");
    expect(source).toContain("Komponente ist noch Produkten zugeordnet.");
    expect(source).toContain("Komponente wird noch in Projektauftragspositionen verwendet.");
    expect(source).toContain("onCreateComponent={createStandaloneComponent}");
    expect(source).toContain("onUpdateComponent={updateComponentData}");
    expect(source).toContain("onDeleteComponent={deleteSelectedComponentWithConflictDetails}");
    expect(allComponentListSource).toContain("select-component-record");
    expect(allComponentListSource).toContain("select-component-category-record");
    expect(allComponentListSource).toContain("Komponenten Stammdaten");
    expect(allComponentListSource).toContain("shortCode: input.shortCode");
  });

  it("keeps category panels and removes the old inline component management table", () => {
    const source = readFileSync(path.resolve(process.cwd(), "client/src/components/ProductManagementPage.tsx"), "utf8");

    expect(source).toContain("\"master-data-product-categories\"");
    expect(source).toContain("\"master-data-component-categories\"");
    expect(source).not.toContain("<ProductComponentList");
    expect(source).not.toContain("TableHead>Produkte</TableHead>");
    expect(source).not.toContain("<h4 className=\"font-bold text-slate-900\">Produkte</h4>");
  });
});
