/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Druckvorschau zeigt immer genau eine aktive Seite und blendet einen separaten Druck-Stack fuer print ein.
 * - Navigation links/rechts ist an den Seitenraendern verdrahtet und deaktiviert sich an Anfang/Ende.
 * - Der Seitenzaehler referenziert das flache Seitenmodell aus Summary- und Wochenblaettern.
 *
 * Fehlerfaelle:
 * - Der Dialog rendert wieder alle Seiten nur als langen Scrollblock ohne aktive Seite.
 * - Navigationsflaechen reagieren nicht mehr auf die Seitenanzahl.
 *
 * Ziel:
 * Die Shell-Logik der Druckvorschau ueber DOM-freies Markup und Quelltext-Assertions regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "fs";
import path from "path";
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
  DialogDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
  ChevronLeft: () => <span>prev-icon</span>,
  ChevronRight: () => <span>next-icon</span>,
  Calendar: () => <span>cal-icon</span>,
  Clock: () => <span>clock-icon</span>,
}));

import { CalendarTourPrintPreviewDialog } from "../../../client/src/components/calendar/CalendarTourPrintPreviewDialog";

const fixture = {
  fromDate: "2099-06-15",
  toDate: "2099-06-28",
  weeks: [
    { weekStart: "2099-06-15", weekEnd: "2099-06-21" },
    { weekStart: "2099-06-22", weekEnd: "2099-06-28" },
  ],
  tour: {
    id: 7,
    name: "Alpha",
    color: "#225588",
  },
  members: [{ id: 11, fullName: "Muster, Mia" }],
  appointments: [
    {
      id: 101,
      projectId: 501,
      projectName: "Projekt Alpha",
      startDate: "2099-06-16",
      endDate: null,
      startTime: "08:00:00",
      durationDays: 1,
      saunaModel: "Panorama",
      customer: {
        id: 301,
        customerNumber: "K-301",
        fullName: "Alpha GmbH",
        addressLine1: null,
        addressLine2: null,
        postalCode: "12345",
        city: "Berlin",
      },
      employees: [{ id: 11, fullName: "Muster, Mia" }],
      printNotes: [],
    },
  ],
};

describe("FT31 UI: calendar tour print preview dialog navigation", () => {
  const dialogSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/calendar/CalendarTourPrintPreviewDialog.tsx"),
    "utf8",
  );

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
  });

  it("keeps navigation and active page state wired in the dialog source", () => {
    expect(dialogSource).toContain("const [activePageIndex, setActivePageIndex] = useState(0);");
    expect(dialogSource).toContain('data-testid="button-tour-print-preview-prev"');
    expect(dialogSource).toContain('data-testid="button-tour-print-preview-next"');
    expect(dialogSource).toContain('data-testid="tour-print-preview-page-indicator"');
    expect(dialogSource).toContain('data-testid="tour-print-preview-active-page-shell"');
    expect(dialogSource).toContain('data-testid="tour-print-preview-print-stack"');
    expect(dialogSource).toContain('activePage?.kind === "summary"');
    expect(dialogSource).toContain('activePage?.kind === "week"');
    expect(dialogSource).toContain("Math.max(0, current - 1)");
    expect(dialogSource).toContain("Math.min(pages.length - 1, current + 1)");
  });
});
