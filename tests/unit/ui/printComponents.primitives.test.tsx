/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - PrintPageShell rendert konsistente A4-Maße für portrait und landscape.
 * - PrintDayColumn rendert einen domainblinden Spaltenkopf.
 * - PrintAppointmentSlot rendert header, body und optionalen footer-Slot.
 * - PrintDocumentRoot erzeugt einen dedizierten, offscreen layoutbaren Print-Root mit mehreren Seiten.
 * - PrintPreviewDialog zeigt Seitenzähler, Navigation, aktive Seite und optionale Header-Aktionen.
 * - PrintPreviewDialog aktiviert den dedizierten Print-Root im echten Print-CSS-Pfad.
 *
 * Fehlerfälle:
 * - Die generische Seitenschale fällt auf pixelbasierte Altklassen zurück.
 * - Der Print-Root rendert keine getrennten Druckseiten.
 * - Die generische Vorschau verliert Navigation, aktive Seite oder Header-Aktionen.
 *
 * Ziel:
 * Das generische Print-System in Isolation absichern, unabhängig vom Tour-Druckfall.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PrintAppointmentSlot } from "../../../client/src/components/print/PrintAppointmentSlot";
import { PrintDayColumn } from "../../../client/src/components/print/PrintDayColumn";
import { MeasuredPrintCardMeasurement } from "../../../client/src/components/print/MeasuredPrintCardMeasurement";
import { PrintDocumentRoot } from "../../../client/src/components/print/PrintDocumentRoot";
import { PrintPageShell } from "../../../client/src/components/print/PrintPageShell";
import { PrintPreviewDialog } from "../../../client/src/components/print/PrintPreviewDialog";
import { ReportPrintPreviewDialog } from "../../../client/src/components/print/ReportPrintPreviewDialog";

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
  Printer: () => <span>print-icon</span>,
  RefreshCw: () => <span>refresh-icon</span>,
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

  it("PrintPageShell rendert einen optionalen Footer-Slot", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        PrintPageShell,
        {
          orientation: "landscape",
          footer: React.createElement("div", { "data-testid": "print-shell-footer" }, "footer"),
        },
        React.createElement("div", null, "inhalt"),
      ),
    );

    expect(html).toContain("inhalt");
    expect(html).toContain('data-testid="print-shell-footer"');
    expect(html).toContain("footer");
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
    expect(html).toContain("position:fixed");
    expect(html).toContain("left:-200vw");
    expect(html).not.toContain('class="hidden"');
    expect(html.match(/print-document-page/g)?.length).toBe(2);
    expect(html).toContain(">a<");
    expect(html).toContain(">b<");
  });

  it("PrintDocumentRoot übernimmt bei Bedarf Hochformat", () => {
    vi.stubGlobal("document", { body: {} });

    const html = renderToStaticMarkup(
      <PrintDocumentRoot
        pages={[{ id: "a" }]}
        pageOrientation="portrait"
        getPageKey={(page) => page.id}
        renderPage={(page) => <div>{page.id}</div>}
      />,
    );

    expect(html).toContain("A4 portrait");
    expect(html).not.toContain("A4 landscape");
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

  it("PrintPreviewDialog rendert optionale Header-Aktionen", () => {
    vi.stubGlobal("document", { body: {} });

    const html = renderToStaticMarkup(
      <PrintPreviewDialog
        open
        onOpenChange={() => undefined}
        title="Print Vorschau"
        pages={[{ pageNumber: 1, title: "Seite 1" }]}
        activePageIndex={0}
        onPageChange={() => undefined}
        getPageKey={(page) => page.pageNumber}
        getPageTitle={(page) => page.title}
        renderPage={(page) => <div>{`page-${page.pageNumber}`}</div>}
        headerActions={<button type="button">Drucken</button>}
      />,
    );

    expect(html).toContain("Drucken");
  });

  it("ReportPrintPreviewDialog rendert die einheitlichen Refresh- und Druck-Aktionen", () => {
    vi.stubGlobal("document", { body: {} });

    const html = renderToStaticMarkup(
      <ReportPrintPreviewDialog
        open
        onOpenChange={() => undefined}
        title="Print Vorschau"
        pages={[{ pageNumber: 1, title: "Seite 1" }]}
        activePageIndex={0}
        onPageChange={() => undefined}
        getPageKey={(page) => page.pageNumber}
        getPageTitle={(page) => page.title}
        renderPage={(page) => <div>{`page-${page.pageNumber}`}</div>}
        onRefresh={() => undefined}
        onPrint={() => undefined}
        pageOrientation="landscape"
        onPageOrientationChange={() => undefined}
        orientationTestIdPrefix="button-report-orientation"
        refreshTestId="button-report-print-refresh"
        printTestId="button-report-print"
        extraActions={<button type="button" data-testid="button-report-extra">Extra</button>}
      />,
    );

    expect(html).toContain("button-report-print-refresh");
    expect(html).toContain("Aktualisieren");
    expect(html).toContain("button-report-orientation-landscape");
    expect(html).toContain("button-report-orientation-portrait");
    expect(html).toContain("Querformat");
    expect(html).toContain("Hochformat");
    expect(html).toContain("button-report-extra");
    expect(html).toContain("button-report-print");
    expect(html).toContain("Drucken");
  });

  it("ReportPrintPreviewDialog sperrt Drucken während der Messung", () => {
    vi.stubGlobal("document", { body: {} });

    const html = renderToStaticMarkup(
      <ReportPrintPreviewDialog
        open
        onOpenChange={() => undefined}
        title="Print Vorschau"
        pages={[{ pageNumber: 1, title: "Seite 1" }]}
        activePageIndex={0}
        onPageChange={() => undefined}
        getPageKey={(page) => page.pageNumber}
        getPageTitle={(page) => page.title}
        renderPage={(page) => <div>{`page-${page.pageNumber}`}</div>}
        onRefresh={() => undefined}
        onPrint={() => undefined}
        refreshTestId="button-report-print-refresh"
        printTestId="button-report-print"
        isRefreshing
        printDisabled
      />,
    );

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-testid="button-report-print-refresh"/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-testid="button-report-print"/);
  });

  it("PrintPreviewDialog reicht die Seitenausrichtung an den Druckroot weiter", () => {
    vi.stubGlobal("document", { body: {} });

    const html = renderToStaticMarkup(
      <PrintPreviewDialog
        open
        onOpenChange={() => undefined}
        title="Print Vorschau"
        pages={[{ pageNumber: 1, title: "Seite 1" }]}
        activePageIndex={0}
        onPageChange={() => undefined}
        pageOrientation="portrait"
        getPageKey={(page) => page.pageNumber}
        getPageTitle={(page) => page.title}
        renderPage={(page) => <div>{`page-${page.pageNumber}`}</div>}
      />,
    );

    expect(html).toContain("A4 portrait");
    expect(html).not.toContain("A4 landscape");
  });

  it("PrintPreviewDialog rendert keinen dedizierten Druckroot, solange die Vorschau geschlossen ist", () => {
    vi.stubGlobal("document", { body: {} });

    const html = renderToStaticMarkup(
      <PrintPreviewDialog
        open={false}
        onOpenChange={() => undefined}
        title="Print Vorschau"
        pages={[{ pageNumber: 1, title: "Seite 1" }]}
        activePageIndex={0}
        onPageChange={() => undefined}
        getPageKey={(page) => page.pageNumber}
        getPageTitle={(page) => page.title}
        renderPage={(page) => <div>{`page-${page.pageNumber}`}</div>}
      />,
    );

    expect(html).not.toContain('aria-hidden="true" data-testid="print-document-root"');
    expect(html).not.toContain("A4 landscape");
  });

  it("MeasuredPrintCardMeasurement rendert eine offscreen Messansicht mit stabilen Karten-Keys", () => {
    const html = renderToStaticMarkup(
      <MeasuredPrintCardMeasurement
        items={[{ id: 1, title: "Karte Alpha" }]}
        getItemKey={(item) => item.id}
        renderCard={(item) => <div>{item.title}</div>}
        onMeasured={() => undefined}
        renderMeasurementLayout={({ contentRef, cards }) => (
          <PrintPageShell orientation="portrait">
            <div ref={contentRef}>
              {cards}
            </div>
          </PrintPageShell>
        )}
      />,
    );

    expect(html).toContain("measured-print-card-measurement");
    expect(html).toContain("left-[-10000px]");
    expect(html).toContain('data-print-card-measurement-key="1"');
    expect(html).toContain("Karte Alpha");
  });

  it("PrintPreviewDialog hebt den dedizierten Druckroot im Print-CSS aus dem Offscreen-Modus", () => {
    vi.stubGlobal("document", { body: {} });

    const html = renderToStaticMarkup(
      <PrintPreviewDialog
        open
        onOpenChange={() => undefined}
        title="Print Vorschau"
        pages={[{ pageNumber: 1, title: "Seite 1" }]}
        activePageIndex={0}
        onPageChange={() => undefined}
        getPageKey={(page) => page.pageNumber}
        getPageTitle={(page) => page.title}
        renderPage={(page) => <div>{`page-${page.pageNumber}`}</div>}
      />,
    );

    expect(html).toContain("body &gt; [data-testid=&quot;print-document-root&quot;]");
    expect(html).toContain("position: static !important");
    expect(html).toContain("opacity: 1 !important");
    expect(html).toContain("pointer-events: auto !important");
  });
});
