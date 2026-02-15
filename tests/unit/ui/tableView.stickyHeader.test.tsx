import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
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
    width: 120,
    minWidth: 200,
  },
];

const rows: Row[] = [{ id: 1, name: "Alpha" }];

describe("PKG-08 TableLayout: TableView sticky header", () => {
  it("applies sticky header classes on header cells when stickyHeader=true", () => {
    const html = renderToStaticMarkup(
      createElement(TableView<Row>, {
        columns,
        rows,
        rowKey: (row) => row.id,
        stickyHeader: true,
      }),
    );

    expect(html).toContain("<th");
    expect(html).toContain("sticky top-0 z-10 bg-card border-b");
  });

  it("does not apply sticky header classes when stickyHeader=false", () => {
    const html = renderToStaticMarkup(
      createElement(TableView<Row>, {
        columns,
        rows,
        rowKey: (row) => row.id,
        stickyHeader: false,
      }),
    );

    expect(html).not.toContain("sticky top-0 z-10 bg-card border-b");
  });

  it("keeps header alignment/base classes while sticky header is enabled", () => {
    const html = renderToStaticMarkup(
      createElement(TableView<Row>, {
        columns,
        rows,
        rowKey: (row) => row.id,
        stickyHeader: true,
      }),
    );

    expect(html).toContain("text-left");
    expect(html).toContain("text-muted-foreground");
  });

  it("keeps width and minWidth styles on header cells with sticky header", () => {
    const html = renderToStaticMarkup(
      createElement(TableView<Row>, {
        columns,
        rows,
        rowKey: (row) => row.id,
        stickyHeader: true,
      }),
    );

    expect(html).toContain("style=\"width:120px;min-width:200px\"");
  });
});
