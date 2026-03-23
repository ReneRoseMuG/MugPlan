/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Projekt-Artikelliste zeigt Produkt- und Komponentenoptionen mit `Name - Shortcode`, wenn ein Shortcode vorhanden ist.
 * - Eintraege ohne Shortcode bleiben beim reinen Namen.
 * - Die Sortierung der Optionen bleibt rein namensbasiert.
 *
 * Fehlerfaelle:
 * - Die Projekt-Artikelliste rendert weiterhin nur den Namen.
 * - Das sichtbare Label beeinflusst die Reihenfolge der Optionen.
 * - Produkt- und Komponenten-Slots verhalten sich uneinheitlich.
 *
 * Ziel:
 * Die sichtbare Labelbildung der Projekt-Artikellisten-Slots regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/input", () => ({
  Input: () => null,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: { children?: React.ReactNode; htmlFor?: string }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/component-create-dialog", () => ({
  ComponentCreateDialog: () => null,
}));

vi.mock("@/components/ui/product-create-dialog", () => ({
  ProductCreateDialog: () => null,
}));

vi.mock("@/lib/project-product-form", () => ({
  PROJECT_PRODUCT_FIELDS: [
    { key: "saunaModel", label: "Saunamodell" },
    { key: "oven", label: "Ofen" },
    { key: "control", label: "Steuerung" },
    { key: "roof", label: "Dach" },
    { key: "door", label: "Tuer" },
    { key: "window", label: "Fenster" },
    { key: "frontWall", label: "Frontwand" },
    { key: "rearWallWindow", label: "Rueckwandfenster" },
    { key: "interior", label: "Innenraum" },
  ],
  findProjectProductCategory: vi.fn((categories: Array<{ id: number; name: string }>, fieldKey: string) =>
    fieldKey === "oven" ? categories.find((category) => category.name === "Ofen") ?? null : null,
  ),
  isProductSelectionField: vi.fn((fieldKey: string) => fieldKey === "saunaModel"),
}));

import { ProjectProductFields } from "../../../client/src/components/ProjectOrderForm";

describe("FT02 UI: ProjectOrderForm shortcode labels", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
  });

  it("renders product and component select labels with shortcode suffix while keeping name sort", () => {
    const emptySelection = { productId: null, componentId: null, componentName: "" };

    const html = renderToStaticMarkup(
      <ProjectProductFields
        productSelections={{
          saunaModel: emptySelection,
          oven: emptySelection,
          control: emptySelection,
          roof: emptySelection,
          door: emptySelection,
          window: emptySelection,
          frontWall: emptySelection,
          rearWallWindow: emptySelection,
          interior: emptySelection,
        } as never}
        dynamicSlots={[
          { slotId: "dynamic-product", label: "Extra Produkt", source: "product", categoryId: 5 },
          { slotId: "dynamic-component", label: "Extra Komponente", source: "component", categoryId: 7 },
        ]}
        dynamicSelections={{
          "dynamic-product": { productId: null, componentId: null, componentName: "" },
          "dynamic-component": { productId: null, componentId: null, componentName: "" },
        }}
        products={[
          { id: 2, categoryId: 5, name: "Zeta", shortCode: "Z9", description: null, isActive: true, version: 1 },
          { id: 1, categoryId: 5, name: "Alpha", shortCode: "A1", description: null, isActive: true, version: 1 },
          { id: 3, categoryId: 5, name: "Beta", shortCode: null, description: null, isActive: true, version: 1 },
        ]}
        components={[
          { id: 12, categoryId: 7, name: "Zulu", shortCode: "ZU", description: null, isActive: true, version: 1 },
          { id: 11, categoryId: 7, name: "Anton", shortCode: "AN", description: null, isActive: true, version: 1 },
          { id: 13, categoryId: 7, name: "Berta", shortCode: null, description: null, isActive: true, version: 1 },
        ]}
        componentCategories={[{ id: 7, name: "Ofen", isDefault: true, isActive: true, version: 1 }]}
        productCategories={[{ id: 5, name: "Sauna", isDefault: true, isActive: true, version: 1 }]}
        isAdmin={false}
        onSelectField={vi.fn()}
        onSelectDynamic={vi.fn()}
        onCreateForField={vi.fn()}
        onCreateForSlot={vi.fn()}
      />,
    );

    expect(html).toContain("<option value=\"1\">Alpha - A1</option>");
    expect(html).toContain("<option value=\"3\">Beta</option>");
    expect(html).toContain("<option value=\"2\">Zeta - Z9</option>");
    expect(html.indexOf("Alpha - A1")).toBeLessThan(html.indexOf("Beta"));
    expect(html.indexOf("Beta")).toBeLessThan(html.indexOf("Zeta - Z9"));

    expect(html).toContain("<option value=\"11\">Anton - AN</option>");
    expect(html).toContain("<option value=\"13\">Berta</option>");
    expect(html).toContain("<option value=\"12\">Zulu - ZU</option>");
    expect(html.indexOf("Anton - AN")).toBeLessThan(html.indexOf("Berta"));
    expect(html.indexOf("Berta")).toBeLessThan(html.indexOf("Zulu - ZU"));
  });
});
