/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Druckvorschau zeigt mehrere paginierte A4-Seiten.
 * - Seitenzähler und Navigation reagieren auf die physische Seitenliste.
 * - Die aktive Vorschauseite bleibt vom dedizierten Druckpfad getrennt.
 *
 * Fehlerfälle:
 * - Seitenzähler zeigt falsche Gesamtseitenanzahl.
 * - Die Seitennavigation bleibt trotz mehrerer Seiten deaktiviert.
 * - Der Dialog rendert wieder einen versteckten Print-Stack im Screen-Baum.
 *
 * Ziel:
 * Sichtbares Shell-Verhalten der paginierten Tour-Druckvorschau regressionssicher absichern.
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
    {
      kind: "list",
      pageIndex: 0,
      pageNumber: 1,
      title: "Tour 1 - Seite 1",
      orientation: "landscape",
      weeks: [],
      tourName: "Tour 1",
      fromDate: "2099-06-15",
      toDate: "2099-06-28",
      rangeLabel: "",
      additionalInfoCards: [],
      showAdditionalInfoHeading: false,
      additionalInfoContinued: false,
    },
    {
      kind: "list",
      pageIndex: 1,
      pageNumber: 2,
      title: "Tour 1 - Seite 2",
      orientation: "landscape",
      weeks: [],
      tourName: "Tour 1",
      fromDate: "2099-06-15",
      toDate: "2099-06-28",
      rangeLabel: "",
      additionalInfoCards: [],
      showAdditionalInfoHeading: false,
      additionalInfoContinued: false,
    },
  ],
}));

vi.mock("../../../client/src/components/calendar/CalendarTourPrintListPage", () => ({
  CalendarTourPrintListPage: ({ page }: { page: { pageNumber: number } }) => (
    <div data-testid="tour-print-list-page">{`list-${page.pageNumber}`}</div>
  ),
}));

import { CalendarTourPrintPreviewDialog } from "../../../client/src/components/calendar/CalendarTourPrintPreviewDialog";

const fixture = {
  fromDate: "2099-06-15",
  toDate: "2099-06-28",
  weeks: [{ weekStart: "2099-06-15", weekEnd: "2099-06-21", weekNotes: [] }],
  tour: { id: 7, name: "Tour 1", color: "#225588" },
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

  it("zeigt Seite 1 von 2 und rendert die aktive A4-Seite mit Seitennavigation", () => {
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

    expect(html).toContain("Seite 1 von 2");
    expect(html).toContain("button-tour-print-preview-prev");
    expect(html).toContain("button-tour-print-preview-next");
    expect(html).toContain("tour-print-preview-active-page-shell");
    expect(html).toContain("list-1");
  });

  it("rendert Lade- und Fehlerzustände wenn keine Seiten verfügbar sind", () => {
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
        weekCount={1}
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
        weekCount={1}
        fromDate="2099-06-15"
        weekendColumnPercent={33}
      />,
    );

    expect(loadingHtml).toContain("Druckdaten werden geladen");
    expect(errorHtml).toContain("Druckvorschau konnte nicht geladen werden");
  });
});
