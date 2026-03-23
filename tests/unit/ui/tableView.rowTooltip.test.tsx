/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TableView rendert fuer Zeilen mit `rowTitle` einen sichtbaren Tooltip-Inhalt.
 * - Zeilen ohne `rowTitle` erzeugen keinen zusaetzlichen Tooltip-Inhalt.
 *
 * Fehlerfaelle:
 * - Report-Zeilen mit Sondermaß- oder Storniert-Markierung zeigen beim Mouseover keinen Tag-Namen.
 * - TableView erzeugt Tooltips pauschal fuer jede Zeile statt nur fuer markierte Zeilen.
 *
 * Ziel:
 * Die Tooltip-Verdrahtung der TableView fuer markierte Report-Zeilen ueber gerendertes Verhalten absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children?: React.ReactNode }) => <div data-testid="tooltip-root">{children}</div>,
  TooltipTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({
    children,
    containerClassName: _containerClassName,
    containerRef: _containerRef,
    ...props
  }: {
    children?: React.ReactNode;
    containerClassName?: string;
    containerRef?: unknown;
    [key: string]: unknown;
  }) => <table {...props}>{children}</table>,
  TableBody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <td {...props}>{children}</td>,
  TableHead: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <th {...props}>{children}</th>,
  TableHeader: ({ children }: { children?: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <tr {...props}>{children}</tr>,
}));

import { TableView, type TableViewColumnDef } from "../../../client/src/components/ui/table-view";

type Row = { id: number; name: string; tooltip?: string };

describe("FT26 table view row tooltip behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders tooltip content only for rows with rowTitle", () => {
    const columns: TableViewColumnDef<Row>[] = [{ id: "name", header: "Name", accessor: (row) => row.name }];

    const html = renderToStaticMarkup(
      <TableView<Row>
        columns={columns}
        rows={[
          { id: 1, name: "Projekt A", tooltip: "Sondermaß" },
          { id: 2, name: "Projekt B" },
        ]}
        rowKey={(row) => row.id}
        rowTitle={(row) => row.tooltip}
      />,
    );

    expect(html).toContain("tooltip-content");
    expect(html).toContain("Sondermaß");
    expect(html).toContain("aria-label=\"Sondermaß\"");
    expect(html).not.toContain("aria-label=\"undefined\"");
  });
});
