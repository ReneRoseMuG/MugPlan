/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Wochenkalender rendert die Drucksteuerung inline im Kalenderfilter.
 * - Footer-Bereich bleibt zweispaltig; die Druck-UI sitzt vollstaendig rechts.
 * - Tour-Auswahl, Wochenzahl und Drucken bleiben als kompakter Block zusammen.
 *
 * Fehlerfaelle:
 * - Die Wochenansicht faellt auf einen separaten Druckpfad zurueck.
 * - Druck-Controls verteilen sich wieder ungeordnet ueber mehrere Layoutbereiche.
 *
 * Ziel:
 * Die Drucksteuerung im Wochenkalender ueber gerendertes Filter-Markup und Workspace-Verdrahtung absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const setSettingMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ setSetting: setSettingMock }),
  useSetting: () => "standard",
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/components/calendar/CalendarEmployeeFilter", () => ({
  CalendarEmployeeFilter: () => <div data-testid="calendar-employee-filter">employee-filter</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    ...props
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    [key: string]: unknown;
  }) => <button type="button" disabled={disabled} {...props}>{children}</button>,
}));

vi.mock("@/components/ui/filter-panels/filter-panel", () => ({
  FilterPanel: ({ children }: { children?: React.ReactNode }) => <section data-testid="calendar-filter-panel">{children}</section>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, className }: { children?: React.ReactNode; className?: string }) => <label className={className}>{children}</label>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value: string }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children, className, ...props }: { children?: React.ReactNode; className?: string; [key: string]: unknown }) => (
    <button type="button" className={className} {...props}>{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

import { CalendarFilterPanel } from "../../../client/src/components/ui/filter-panels/calendar-filter-panel";

describe("FT31 UI: CalendarWorkspace tour print preview wiring", () => {
  const workspaceSource = readFileSync(path.resolve(process.cwd(), "client/src/components/CalendarWorkspace.tsx"), "utf8");

  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders two footer columns with the print controls grouped on the right", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "ADMIN",
      },
    });
    useQueryMock.mockReturnValue({
      data: [{ id: 1, name: "Tour A" }],
    });

    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        employeeId={null}
        onEmployeeIdChange={() => undefined}
        showWeekDisplayMode
        selectedPrintTourId={1}
        onSelectedPrintTourIdChange={() => undefined}
        printWeekCount={2}
        onPrintWeekCountChange={() => undefined}
        onOpenPrintPreview={() => undefined}
      />,
    );

    expect(html).toContain("grid gap-4 lg:grid-cols-2");
    expect(html).toContain("lg:justify-self-end");
    expect(html).toContain("Wochenplanung drucken");
    expect(html).toContain("select-tour-print-preview");
    expect(html).toContain("input-tour-print-week-count");
    expect(html).toContain("Drucken");
    expect(html.indexOf("select-tour-print-preview")).toBeLessThan(html.indexOf("input-tour-print-week-count"));
    expect(html.indexOf("input-tour-print-week-count")).toBeLessThan(html.indexOf("Drucken"));
  });

  it("keeps the print controls wired through the shared calendar filter panel", () => {
    expect(workspaceSource).toContain("<CalendarFilterPanel");
    expect(workspaceSource).toContain('showWeekDisplayMode={activeView === "week"}');
    expect(workspaceSource).toContain("selectedPrintTourId={selectedPrintTourId}");
    expect(workspaceSource).toContain("onSelectedPrintTourIdChange={setSelectedPrintTourId}");
    expect(workspaceSource).toContain("printWeekCount={printWeekCount}");
    expect(workspaceSource).toContain("onOpenPrintPreview={() => setIsPrintPreviewOpen(true)}");
    expect(workspaceSource).toContain("const printFromDate = getBerlinTodayDateString();");
  });
});
