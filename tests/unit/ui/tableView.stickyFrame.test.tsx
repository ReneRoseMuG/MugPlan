/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - `footerSlot` rendert einen sichtbaren Footer-Bereich.
 * - Bei horizontalem Overflow erscheint die gemeinsame Footer-Scrollbar.
 * - Kompakte Zellpadding- und Row-Klassen bleiben im gerenderten Tabellenmarkup sichtbar.
 *
 * Fehlerfaelle:
 * - Footer oder Footer-Scrollbar verschwinden trotz aktivem Zustand.
 * - Kompaktes Tabellenlayout driftet im Shared-Primitive weg.
 *
 * Ziel:
 * Die gemeinsame TableView-Huelle ueber sichtbares Markup und State statt ueber Quelltextsuche absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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

async function loadTableViewWithOverflow() {
  vi.resetModules();

  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    return {
      ...actual,
      useState: vi
        .fn()
        .mockImplementationOnce(() => [{
          hasOverflow: true,
          scrollWidth: 600,
        }, vi.fn()]),
      useEffect: vi.fn(),
    };
  });

  return import("../../../client/src/components/ui/table-view");
}

type Row = { id: number; name: string };

describe("FT-UI table view sticky frame behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders footer content and shared footer scrollbar when overflow is active", async () => {
    const { TableView } = await loadTableViewWithOverflow();
    const columns = [{ id: "name", header: "Name", accessor: (row: Row) => row.name }];
    const html = renderToStaticMarkup(
      <TableView<Row>
        testId="table-sample"
        columns={columns}
        rows={[{ id: 1, name: "Alpha" }]}
        rowKey={(row) => row.id}
        footerSlot={<div>Footer Inhalt</div>}
      />,
    );

    expect(html).toContain("Footer Inhalt");
    expect(html).toContain("table-sample-footer-scrollbar");
    expect(html).toContain("visible-horizontal-scrollbar");
  });

  it("keeps compact cell padding and row class names in the rendered table", async () => {
    const { TableView } = await loadTableViewWithOverflow();
    const columns = [{ id: "name", header: "Name", accessor: (row: Row) => row.name }];
    const html = renderToStaticMarkup(
      <TableView<Row>
        columns={columns}
        rows={[{ id: 1, name: "Alpha" }]}
        rowKey={(row) => row.id}
        density="compact"
        rowClassName={() => "custom-row"}
      />,
    );

    expect(html).toContain("py-1.5");
    expect(html).toContain("custom-row");
  });
});
