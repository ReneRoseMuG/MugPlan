/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - PrintPageShell rendert konsistente A4-Maße für portrait und landscape.
 * - PrintDayColumn rendert einen domainblinden Spaltenkopf.
 * - PrintAppointmentSlot rendert header, body und optionalen footer-Slot.
 * - PrintDocumentRoot erzeugt einen dedizierten Print-Root mit mehreren Seiten.
 * - PrintPreviewDialog zeigt Seitenzähler, Navigation und aktive Seite.
 *
 * Fehlerfälle:
 * - Die generische Seitenschale fällt auf pixelbasierte Altklassen zurück.
 * - Der Print-Root rendert keine getrennten Druckseiten.
 * - Die generische Vorschau verliert Navigation oder aktive Seite.
 *
 * Ziel:
 * Das generische Print-System in Isolation absichern, unabhängig vom Tour-Druckfall.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PrintAppointmentSlot } from "../../../client/src/components/print/PrintAppointmentSlot";
import { PrintDayColumn } from "../../../client/src/components/print/PrintDayColumn";
import { PrintDocumentRoot } from "../../../client/src/components/print/PrintDocumentRoot";
import { PrintPageShell } from "../../../client/src/components/print/PrintPageShell";
import { PrintPreviewDialog } from "../../../client/src/components/print/PrintPreviewDialog";

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  DialogHeader: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
  ChevronLeft: () => <span>prev-icon</span>,
  ChevronRight: () => <span>next-icon</span>,
}));

describe("generisches Print-System", () => {
  it("PrintPageShell portrait und landscape nutzen echte A4-Maße", () => {
    const portraitHtml = renderToStaticMarkup(
      React.createElement(PrintPageShell, { orientation: "portrait" }, "inhalt"),
    );
    const landscapeHtml = renderToStaticMarkup(
      React.createElement(PrintPageShell, { orientation: "landscape" }, "inhalt"),
    );

    expect(portraitHtml).toContain('data-print-orientation="portrait"');
    expect(portraitHtml).toContain("210mm");
    expect(portraitHtml).toContain("297mm");
    expect(landscapeHtml).toContain('data-print-orientation="landscape"');
    expect(landscapeHtml).toContain("297mm");
    expect(landscapeHtml).toContain("210mm");
  });

  it("PrintDayColumn rendert label im generischen Spaltenkopf", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrintDayColumn, { label: "Mo, 01.01.", dateKey: "2099-01-01" }),
    );

    expect(html).toContain('data-testid="print-day-column-2099-01-01"');
    expect(html).toContain("Mo, 01.01.");
  });

  it("PrintAppointmentSlot rendert header, body und footer wenn übergeben", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrintAppointmentSlot, {
        header: React.createElement("span", null, "kopf"),
        body: React.createElement("span", null, "inhalt"),
        footer: React.createElement("span", null, "fussnote"),
      }),
    );

    expect(html).toContain("kopf");
    expect(html).toContain("inhalt");
    expect(html).toContain("fussnote");
  });

  it("PrintDocumentRoot erzeugt einen dedizierten Print-Root mit mehreren Seiten", () => {
    vi.stubGlobal("document", { body: {} });

    const html = renderToStaticMarkup(
      <PrintDocumentRoot
        pages={[{ id: "a" }, { id: "b" }]}
        getPageKey={(page) => page.id}
        renderPage={(page) => <div>{page.id}</div>}
      />,
    );

    expect(html).toContain("print-document-root");
    expect(html).toContain("@page");
    expect(html).toContain("A4 landscape");
    expect(html.match(/print-document-page/g)?.length).toBe(2);
    expect(html).toContain(">a<");
    expect(html).toContain(">b<");
  });

  it("PrintPreviewDialog zeigt Seitenzähler, Titel und aktive Seite", () => {
    vi.stubGlobal("document", { body: {} });

    const html = renderToStaticMarkup(
      <PrintPreviewDialog
        open
        onOpenChange={() => undefined}
        title="Print Vorschau"
        pages={[{ pageNumber: 1, title: "Seite 1" }, { pageNumber: 2, title: "Seite 2" }]}
        activePageIndex={0}
        onPageChange={() => undefined}
        getPageKey={(page) => page.pageNumber}
        getPageTitle={(page) => page.title}
        renderPage={(page) => <div>{`page-${page.pageNumber}`}</div>}
      />,
    );

    expect(html).toContain("Seite 1 von 2");
    expect(html).toContain("print-preview-page-title");
    expect(html).toContain("Seite 1");
    expect(html).toContain("page-1");
    expect(html).toContain("button-print-preview-prev");
    expect(html).toContain("button-print-preview-next");
  });
});
