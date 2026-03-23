/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Komponentenliste zeigt Shortcodes als `Name - Shortcode`.
 * - Komponenten ohne Shortcode bleiben beim reinen Namen.
 * Fehlerfaelle:
 * - Der Shortcode wird in der Auswahlliste nicht angezeigt.
 * - Ein fehlender Shortcode fuehrt zu einem falschen Trennzeichen.
 *
 * Ziel:
 * Die sichtbare Labelbildung der Komponenten-Auswahlliste im Stammdatenbereich regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type EntitySelectionRowProps = {
  itemOptions?: Array<{ value: string; label: string }>;
};

const entitySelectionRowMock = vi.fn();

vi.mock("@/components/ui/entity-selection-row", () => ({
  EntitySelectionRow: (props: EntitySelectionRowProps) => {
    entitySelectionRowMock(props);
    return <div />;
  },
}));

vi.mock("@/components/ui/component-create-dialog", () => ({
  ComponentCreateDialog: () => null,
}));

vi.mock("@/components/ui/component-details", () => ({
  ComponentDetails: () => null,
}));

import { AllComponentList } from "../../../client/src/components/ui/all-component-list";

describe("FT27 UI: AllComponentList shortcode labels", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    entitySelectionRowMock.mockReset();
  });

  it("renders shortcode labels for components with and without shortcode", () => {
    renderToStaticMarkup(
      <AllComponentList
        components={[
          { id: 1, categoryId: 11, name: "Aufguss", shortCode: "AU", description: null, isActive: true, version: 1 },
          { id: 3, categoryId: 11, name: "Blende", shortCode: null, description: null, isActive: true, version: 1 },
          { id: 2, categoryId: 11, name: "Zarge", shortCode: "ZG", description: null, isActive: true, version: 1 },
        ]}
        categories={[{ id: 11, name: "Ofen", isDefault: true, isActive: true, version: 1 }]}
        isAdmin
        onCreateComponent={vi.fn()}
        onUpdateComponent={vi.fn()}
        onDeleteComponent={vi.fn()}
      />,
    );

    expect(entitySelectionRowMock.mock.calls[0]?.[0]?.itemOptions).toEqual([
      { value: "1", label: "Aufguss - AU" },
      { value: "3", label: "Blende" },
      { value: "2", label: "Zarge - ZG" },
    ]);
  });
});
