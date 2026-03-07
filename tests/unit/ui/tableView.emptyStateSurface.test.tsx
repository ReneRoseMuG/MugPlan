/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TableView behaelt im Leerzustand den Tabellenkopf.
 * - Der Empty-State belegt eine definierte Grundflaeche im Tabellenbereich.
 * - Die leere Tabellenzeile verwendet keinen Hover-Hintergrund.
 *
 * Fehlerfaelle:
 * - Leere Tabellen kollabieren weiter auf eine schmale Einzelzeile.
 * - Leerzustaende reagieren weiterhin auf Zeilen-Hover.
 *
 * Ziel:
 * Die neue Leerdarstellung der TableView gegen Rueckfall auf das alte Zeilenlayout absichern.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TableView, type TableViewColumnDef } from "../../../client/src/components/ui/table-view";

type Row = {
  id: number;
  name: string;
};

const columns: TableViewColumnDef<Row>[] = [
  {
    id: "name",
    header: "Name",
    accessor: (row) => row.name,
  },
];

describe("PKG-08 TableView empty state surface", () => {
  it("keeps the table header and renders a minimum-height empty surface", () => {
    const html = renderToStaticMarkup(
      createElement(TableView<Row>, {
        columns,
        rows: [],
        rowKey: (row) => row.id,
        emptyState: createElement("p", null, "Keine Daten"),
      }),
    );

    expect(html).toContain("<th");
    expect(html).toContain("min-h-[18rem]");
    expect(html).toContain("Keine Daten");
    expect(html).toContain("hover:bg-transparent");
  });
});
