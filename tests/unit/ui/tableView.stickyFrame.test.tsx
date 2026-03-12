/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TableView rendert Sticky-Header nur im aktivierten Modus.
 * - TableView zeigt den persistenten Footer-Bereich nur bei Footer-Inhalt oder horizontalem Overflow.
 * - Die horizontale Scrollposition bleibt zwischen Tabellenkoerper und Footer-Scrollbar synchron.
 *
 * Fehlerfaelle:
 * - Sticky-Klassen gehen beim TableView-Refactor verloren.
 * - Footer-Bar verschwindet trotz Footer-Inhalt oder horizontalem Overflow.
 * - Body- und Footer-Scroll laufen auseinander.
 *
 * Ziel:
 * Die gemeinsame Sticky-Tabellenhuelle fuer Listen und Reports regressionssicher absichern.
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TableView, type TableViewColumnDef } from "../../../client/src/components/ui/table-view";

type ResizeObserverCallbackLike = ConstructorParameters<typeof ResizeObserver>[0];

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];

  constructor(private readonly callback: ResizeObserverCallbackLike) {
    MockResizeObserver.instances.push(this);
  }

  observe() {}

  disconnect() {}

  trigger() {
    this.callback([] as ResizeObserverEntry[], this as unknown as ResizeObserver);
  }
}

type Row = {
  id: number;
  name: string;
};

const columns: TableViewColumnDef<Row>[] = [
  {
    id: "name",
    header: "Name",
    accessor: (row) => row.name,
    minWidth: 600,
  },
];

describe("FT-UI table view sticky frame", () => {
  beforeEach(() => {
    MockResizeObserver.instances = [];
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders sticky header classes only when stickyHeader is enabled", () => {
    const { rerender } = render(
      <TableView
        columns={columns}
        rows={[{ id: 1, name: "Alpha" }]}
        rowKey={(row) => row.id}
        testId="table-sticky-header"
      />,
    );

    const headerCell = screen.getByText("Name").closest("th");
    expect(headerCell?.className).not.toContain("sticky");

    rerender(
      <TableView
        columns={columns}
        rows={[{ id: 1, name: "Alpha" }]}
        rowKey={(row) => row.id}
        stickyHeader
        testId="table-sticky-header"
      />,
    );

    expect(screen.getByText("Name").closest("th")?.className).toContain("sticky");
  });

  it("renders the footer bar only when footer content is present", () => {
    const { rerender } = render(
      <TableView
        columns={columns}
        rows={[{ id: 1, name: "Alpha" }]}
        rowKey={(row) => row.id}
        testId="table-footer"
      />,
    );

    expect(screen.queryByText("Seite 1 von 1")).toBeNull();

    rerender(
      <TableView
        columns={columns}
        rows={[{ id: 1, name: "Alpha" }]}
        rowKey={(row) => row.id}
        footerSlot={<div>Seite 1 von 1</div>}
        testId="table-footer"
      />,
    );

    expect(screen.getByText("Seite 1 von 1")).not.toBeNull();
  });

  it("keeps horizontal footer scrollbar and body scroll in sync", () => {
    render(
      <TableView
        columns={columns}
        rows={[{ id: 1, name: "Alpha" }]}
        rowKey={(row) => row.id}
        footerSlot={<div>Footer</div>}
        testId="table-sync"
      />,
    );

    const root = screen.getByTestId("table-sync");
    const bodyScroll = root.firstElementChild as HTMLDivElement;

    Object.defineProperty(bodyScroll, "clientWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(bodyScroll, "scrollWidth", {
      configurable: true,
      value: 960,
    });

    act(() => {
      MockResizeObserver.instances.forEach((observer) => observer.trigger());
    });

    const footerScroll = screen.getByTestId("table-sync-footer-scrollbar") as HTMLDivElement;

    footerScroll.scrollLeft = 240;
    fireEvent.scroll(footerScroll);
    expect(bodyScroll.scrollLeft).toBe(240);

    bodyScroll.scrollLeft = 120;
    fireEvent.scroll(bodyScroll);
    expect(footerScroll.scrollLeft).toBe(120);
  });
});
