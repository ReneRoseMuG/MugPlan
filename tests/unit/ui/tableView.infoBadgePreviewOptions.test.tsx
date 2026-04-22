/**
 * Test Scope:
 *
 * Feature: FT03 - TableView Preview-Optionen
 *
 * Abgedeckte Regeln:
 * - `TableView` erkennt `InfoBadgePreview` als Preview-Rueckgabe.
 * - Preview-Optionen werden sichtbar an `HoverPreview` weitergereicht.
 * - `scrollY: auto` mappt auf einen overflow-scrollenden Preview-Container.
 *
 * Fehlerfaelle:
 * - Weekly-Preview-Optionen gehen beim Tabellenrendern verloren.
 *
 * Ziel:
 * Die Preview-Verdrahtung von `TableView` ueber gerenderte Props statt ueber Quelltextstrings absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoverPreviewCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: (props: Record<string, unknown> & { children?: React.ReactNode; preview?: React.ReactNode }) => {
    hoverPreviewCalls.push(props);
    return <div data-testid="hover-preview">{props.children}{props.preview}</div>;
  },
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

type Row = { id: number; name: string };

describe("FT03 table view preview options behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    hoverPreviewCalls.length = 0;
  });

  it("forwards InfoBadgePreview options into HoverPreview", () => {
    const columns: TableViewColumnDef<Row>[] = [{ id: "name", header: "Name", accessor: (row) => row.name }];
    renderToStaticMarkup(
      <TableView<Row>
        columns={columns}
        rows={[{ id: 1, name: "Alpha" }]}
        rowKey={(row) => row.id}
        rowPreviewRenderer={() => ({
          content: <div>preview-content</div>,
          options: {
            openDelayMs: 120,
            mode: "cursor",
            side: "left",
            align: "end",
            maxWidth: 420,
            maxHeight: 300,
            scrollY: "auto",
            cursorOffsetX: 22,
            cursorOffsetY: 24,
            viewportPadding: 16,
          },
        })}
      />,
    );

    expect(hoverPreviewCalls).toHaveLength(1);
    expect(hoverPreviewCalls[0]).toMatchObject({
      mode: "cursor",
      openDelay: 120,
      side: "left",
      align: "end",
      maxWidth: 420,
      maxHeight: 300,
      cursorOffsetX: 22,
      cursorOffsetY: 24,
      viewportPadding: 16,
      className: "overflow-y-auto",
    });
  });
});
