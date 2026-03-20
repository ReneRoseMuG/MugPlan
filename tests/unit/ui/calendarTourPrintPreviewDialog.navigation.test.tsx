/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Druckvorschau zeigt genau eine aktive Seite und einen separaten Print-Stack.
 * - Navigation links/rechts ist sichtbar und an den Seitenraendern deaktiviert.
 * - Der Seitenzaehler basiert auf dem flachen Seitenmodell.
 *
 * Fehlerfaelle:
 * - Der Dialog rendert wieder nur einen Scrollblock ohne aktive Seite.
 * - Navigationsflaechen reagieren nicht mehr auf die Seitenanzahl.
 *
 * Ziel:
 * Sichtbares Shell-Verhalten der Tour-Druckvorschau ohne Source-Assertions absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

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

vi.mock("@/lib/tour-print-preview", () => ({
  normalizeTourPrintWeekCount: (value: number) => value,
  buildTourPrintPages: () => [
    { kind: "summary", pageNumber: 1, title: "Summary" },
    { kind: "week", pageNumber: 2, title: "Woche 1" },
    { kind: "week", pageNumber: 3, title: "Woche 2" },
  ],
}));

vi.mock("../../../client/src/components/calendar/CalendarTourPrintSummaryPage", () => ({
  CalendarTourPrintSummaryPage: ({ page }: { page: { pageNumber: number } }) => (
    <div data-testid="tour-print-summary-page">{`summary-${page.pageNumber}`}</div>
  ),
}));

vi.mock("../../../client/src/components/calendar/CalendarTourPrintWeekPage", () => ({
  CalendarTourPrintWeekPage: ({ page }: { page: { pageNumber: number } }) => (
    <div data-testid={`tour-print-week-page-${page.pageNumber - 1}`}>{`week-${page.pageNumber}`}</div>
  ),
}));

import { CalendarTourPrintPreviewDialog } from "../../../client/src/components/calendar/CalendarTourPrintPreviewDialog";

const fixture = {
  fromDate: "2099-06-15",
  toDate: "2099-06-28",
  weeks: [
    { weekStart: "2099-06-15", weekEnd: "2099-06-21" },
    { weekStart: "2099-06-22", weekEnd: "2099-06-28" },
  ],
  tour: { id: 7, name: "Alpha", color: "#225588" },
  members: [],
  appointments: [],
};

describe("FT31 UI: calendar tour print preview dialog navigation", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      data: fixture,
      isLoading: false,
      isError: false,
    });
  });

  it("renders a single active summary page with page indicator and boundary button states", () => {
    const html = renderToStaticMarkup(
      <CalendarTourPrintPreviewDialog
        open
        onOpenChange={() => undefined}
        tourId={7}
        weekCount={2}
        fromDate="2099-06-15"
        weekendColumnPercent={33}
      />,
    );

    expect(html).toContain("tour-print-preview-page-indicator");
    expect(html).toContain("Seite 1 von 3");
    expect(html).toContain("tour-print-summary-page");
    expect(html).toContain("button-tour-print-preview-prev");
    expect(html).toContain("button-tour-print-preview-next");
    expect(html).toContain("disabled");
    expect(html).toContain("tour-print-preview-print-stack");
    expect(html).toContain("tour-print-preview-active-page-shell");
  });

  it("renders loading and error surfaces when no active pages are available", () => {
    useQueryMock.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    const loadingHtml = renderToStaticMarkup(
      <CalendarTourPrintPreviewDialog
        open
        onOpenChange={() => undefined}
        tourId={7}
        weekCount={2}
        fromDate="2099-06-15"
        weekendColumnPercent={33}
      />,
    );

    useQueryMock.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    const errorHtml = renderToStaticMarkup(
      <CalendarTourPrintPreviewDialog
        open
        onOpenChange={() => undefined}
        tourId={7}
        weekCount={2}
        fromDate="2099-06-15"
        weekendColumnPercent={33}
      />,
    );

    expect(loadingHtml).toContain("Druckdaten werden geladen");
    expect(errorHtml).toContain("Druckvorschau konnte nicht geladen werden");
  });
});
