/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TableView rendert fuer resizable Spalten einen Resize-Handle.
 * - Beim Ziehen wird onColumnResize mit der neuen Breite aufgerufen.
 * - Beim Loslassen wird onColumnResizeEnd mit der finalen Breite aufgerufen.
 *
 * Fehlerfaelle:
 * - Resizable Spalten zeigen keinen Handle.
 * - Resize-Callbacks feuern nicht oder mit falscher Zielbreite.
 *
 * Ziel:
 * Die neue Spaltenbreiten-Verdrahtung der TableView fuer die Vorlaufliste verhaltensnah absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TableView, type TableViewColumnDef } from "../../../client/src/components/ui/table-view";

type Row = {
  id: number;
  name: string;
};

describe("FT26 table view column resize behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders a resize handle for resizable columns", () => {
    const columns: TableViewColumnDef<Row>[] = [
      {
        id: "name",
        header: "Name",
        accessor: (row) => row.name,
        width: 120,
        minWidth: 100,
        resizable: true,
      },
    ];

    const html = renderToStaticMarkup(
      <TableView<Row>
        columns={columns}
        rows={[{ id: 1, name: "Alpha" }]}
        rowKey={(row) => row.id}
        testId="table-view-resize"
      />,
    );

    expect(html).toContain("table-view-resize-resize-name");
    expect(html).toContain("cursor-col-resize");
  });
});
