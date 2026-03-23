/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TableView rendert für Zeilen mit `rowTitle` einen sichtbaren Hover-Inhalt.
 * - Zeilen ohne `rowTitle` erzeugen keinen zusätzlichen Hover-Inhalt.
 *
 * Fehlerfälle:
 * - Report-Zeilen mit Sondermaß- oder Storniert-Markierung zeigen beim Hover keinen Tag-Namen.
 * - TableView erzeugt Hover-Previews pauschal für jede Zeile statt nur für markierte Zeilen.
 *
 * Ziel:
 * Die cursorbasierte Hover-Verdrahtung der TableView für markierte Report-Zeilen über gerendertes Verhalten absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({ children, preview }: { children?: React.ReactNode; preview?: React.ReactNode }) => (
    <div data-testid="hover-preview">
      {children}
      <div data-testid="hover-preview-content">{preview}</div>
    </div>
  ),
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

describe("FT26 table view row hover behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders hover preview content only for rows with rowTitle", () => {
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

    expect(html).toContain("hover-preview-content");
    expect(html).toContain("Sondermaß");
    expect(html).toContain("aria-label=\"Sondermaß\"");
    expect(html).not.toContain("aria-label=\"undefined\"");
  });
});
