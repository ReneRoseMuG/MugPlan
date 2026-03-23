/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Produktliste waehlt beim ersten Rendern automatisch die erste verfuegbare Produktkategorie vor.
 * - Produkt hinzufuegen und Produktliste loeschen bleiben dadurch auch ohne vorherige Produktauswahl nutzbar.
 *
 * Fehlerfaelle:
 * - Die Aktionen bleiben deaktiviert, bis man manuell eine Kategorie oder ein Produkt auswaehlt.
 * - Das Plus-Dialogziel oder das Kategorie-Loeschen arbeitet mit keiner oder der falschen Kategorie.
 *
 * Ziel:
 * Die sichtbare Produktlisten-Bedienung ueber die initial verdrahteten Auswahl- und Disabled-Props absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type EntitySelectionRowProps = {
  categoryValue: string;
  addDisabled?: boolean;
  deleteAllDisabled?: boolean;
};

const entitySelectionRowMock = vi.fn();

vi.mock("@/components/ui/entity-selection-row", () => ({
  EntitySelectionRow: (props: EntitySelectionRowProps) => {
    entitySelectionRowMock(props);
    return <div data-selected-category={props.categoryValue} />;
  },
}));

vi.mock("@/components/ui/product-create-dialog", () => ({
  ProductCreateDialog: () => null,
}));

import { ProductDropDown } from "../../../client/src/components/ui/product-drop-down";

describe("FT27 UI: ProductDropDown behavior", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    entitySelectionRowMock.mockReset();
  });

  it("preselects the first category so add and delete-all stay available without product selection", async () => {
    const html = renderToStaticMarkup(
      <ProductDropDown
        products={[]}
        categories={[
          { id: 7, name: "Fass", isDefault: true, isActive: true, version: 1 },
          { id: 9, name: "Sauna", isDefault: false, isActive: true, version: 1 },
        ]}
        selectedProductId=""
        onSelectProduct={vi.fn()}
        onCreateProduct={vi.fn()}
        onDeleteAllInCategory={vi.fn()}
        isAdmin
      />,
    );

    expect(html).toContain("data-selected-category=\"7\"");

    expect(entitySelectionRowMock).toHaveBeenCalledTimes(1);
    expect(entitySelectionRowMock.mock.calls[0]?.[0]).toMatchObject({
      categoryValue: "7",
      addDisabled: false,
      deleteAllDisabled: false,
    });
  });
});
