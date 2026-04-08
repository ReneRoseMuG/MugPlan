/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das Tourenplan-Panel zeigt den neuen vierten Reportblock mit Shortcode-Option und Admin-Druckmodus.
 * - Die Verdrahtung uebergibt bei geoeffneter Vorschau dieselbe Orientierung an Dialog und Druckseite.
 *
 * Fehlerfaelle:
 * - Der neue Reportblock fehlt in der Reports-Seite oder blendet die Admin-Optionen nicht ein.
 * - Die Vorschau uebergibt unterschiedliche Orientierungen an Dialog und Druckseite.
 *
 * Ziel:
 * Die sichtbare Verdrahtung des neuen Tourenplan-Reportpanels in der Node-Testumgebung regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useSettingMock = vi.fn();
const setSettingMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: (key: string) => useSettingMock(key),
  useSettings: () => ({ setSetting: setSettingMock }),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children?: React.ReactNode;
  }) => (
    <select data-testid="mock-tourenplan-select" value={value} onChange={(event) => onValueChange(event.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="none">{placeholder ?? "Tour"}</option>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value: string }) => <option value={value}>{children}</option>,
}));

vi.mock("@/components/print/PrintPreviewDialog", () => ({
  PrintPreviewDialog: ({
    open,
    pageOrientation,
    pages,
    renderPage,
    headerActions,
  }: {
    open: boolean;
    pageOrientation: string;
    pages: unknown[];
    renderPage: (page: unknown, index: number) => React.ReactNode;
    headerActions?: React.ReactNode;
  }) => (
    open ? (
      <div data-testid="print-preview-dialog-marker" data-page-orientation={pageOrientation}>
        {headerActions}
        {pages[0] ? renderPage(pages[0], 0) : null}
      </div>
    ) : null
  ),
}));

vi.mock("@/components/reports/TourenplanPrintPage", () => ({
  TourenplanPrintPage: ({
    orientation,
    testId,
  }: {
    orientation: string;
    testId?: string;
  }) => (
    <div
      data-testid={testId}
      data-print-orientation={orientation}
    />
  ),
}));

import { TourenplanReportPanel } from "../../../client/src/components/reports/TourenplanReportPanel";

describe("UI: TourenplanReportPanel wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    useQueryMock.mockReset();
    useSettingMock.mockReset();
    setSettingMock.mockReset();
    useSettingMock.mockImplementation((key: string) => {
      if (key === "reports.tourenplan.rangeConfig") {
        return {
          activeTab: "date",
          fromDate: "2026-04-14",
          toDate: "2026-04-20",
          kwStart: 16,
          weekCount: 1,
        };
      }
      if (key === "reports.tourenplan.printMode") {
        return "farbdruck";
      }
      return undefined;
    });
    useQueryMock.mockImplementation((options: { queryKey?: unknown[] }) => {
      const key = options.queryKey?.[0];
      if (key === "/api/tours") {
        return {
          data: [{ id: 7, name: "Tour Alpha", color: "#2266aa", isActive: true, version: 1 }],
          isLoading: false,
        };
      }
      if (key === "reports-tourenplan-preview") {
        return {
          data: {
            fromDate: "2026-04-14",
            toDate: "2026-04-20",
            weeks: [{ weekStart: "2026-04-14", weekEnd: "2026-04-20", weekNotes: [] }],
            tour: { id: 7, name: "Tour Alpha", color: "#2266aa" },
            appointments: [{
              id: 11,
              projectId: 21,
              projectName: "Projekt Alpha",
              startDate: "2026-04-14",
              endDate: "2026-04-15",
              startTime: null,
              durationDays: 2,
              saunaModel: null,
              customer: {
                id: 31,
                customerNumber: "C-31",
                fullName: "Kunde Alpha",
                phone: "01234",
                addressLine1: null,
                addressLine2: null,
                postalCode: "26135",
                city: "Oldenburg",
                country: "Deutschland",
              },
              employees: [],
              printNotes: [],
              appointmentTags: [],
              customerTags: [],
              projectTags: [],
            }],
          },
          isLoading: false,
          isError: false,
        };
      }
      if (key === "reports-tourenplan-appointments") {
        return {
          data: [{
            id: 11,
            version: 1,
            projectId: 21,
            projectName: "Projekt Alpha",
            projectVersion: 1,
            projectOrderNumber: "ORD-21",
            projectArticleItems: [],
            projectDescription: null,
            startDate: "2026-04-14",
            endDate: "2026-04-15",
            startTime: null,
            startTimeHour: null,
            tourId: 7,
            tourName: "Tour Alpha",
            tourColor: "#2266aa",
            customer: {
              id: 31,
              customerNumber: "C-31",
              fullName: "Kunde Alpha",
              company: null,
              phone: "01234",
              email: null,
              addressLine1: null,
              addressLine2: null,
              postalCode: "26135",
              city: "Oldenburg",
              country: "Deutschland",
            },
            employees: [],
            customerNotesCount: 0,
            projectNotesCount: 0,
            appointmentNotesCount: 0,
            customerAttachmentsCount: 0,
            projectAttachmentsCount: 0,
            appointmentAttachmentsCount: 0,
            totalAttachmentsCount: 0,
            appointmentTags: [],
            customerTags: [],
            projectTags: [],
            displayMode: "standard",
            isLocked: false,
            isCancelled: false,
            allDay: true,
            singleEmployee: false,
          }],
          isLoading: false,
          isError: false,
        };
      }
      return { data: undefined, isLoading: false, isError: false };
    });
  });

  function installUseStateSequence(orientation: "landscape" | "portrait") {
    const useStateSpy = vi.spyOn(React, "useState");
    useStateSpy
      .mockImplementationOnce(() => [7, vi.fn()])
      .mockImplementationOnce(() => ["date", vi.fn()])
      .mockImplementationOnce(() => ["2026-04-14", vi.fn()])
      .mockImplementationOnce(() => ["2026-04-20", vi.fn()])
      .mockImplementationOnce(() => [16, vi.fn()])
      .mockImplementationOnce(() => [1, vi.fn()])
      .mockImplementationOnce(() => [false, vi.fn()])
      .mockImplementationOnce(() => ["farbdruck", vi.fn()])
      .mockImplementationOnce(() => [orientation, vi.fn()])
      .mockImplementationOnce(() => [true, vi.fn()])
      .mockImplementationOnce(() => [0, vi.fn()]);
    return useStateSpy;
  }

  it("shows the panel options and forwards the same orientation to dialog and print page", () => {
    const landscapeSpy = installUseStateSequence("landscape");
    const landscapeHtml = renderToStaticMarkup(
      <TourenplanReportPanel
        defaultReportRange={{
          fromDate: "2026-04-14",
          toDate: "2026-04-20",
          weekCount: 1,
          referenceDate: new Date("2026-04-14T00:00:00"),
        }}
        defaultIsoWeek={16}
        defaultIsoWeekYear={2026}
        isAdmin
      />,
    );
    landscapeSpy.mockRestore();

    expect(landscapeHtml).toContain("reports-tourenplan-config-panel");
    expect(landscapeHtml).toContain("checkbox-reports-tourenplan-use-shortcodes");
    expect(landscapeHtml).toContain("button-reports-tourenplan-print-mode-farbdruck");
    expect(landscapeHtml).toContain("button-reports-tourenplan-print-mode-spardruck");
    expect(landscapeHtml).toContain('data-page-orientation="landscape"');
    expect(landscapeHtml).toContain('data-print-orientation="landscape"');

    const portraitSpy = installUseStateSequence("portrait");
    const portraitHtml = renderToStaticMarkup(
      <TourenplanReportPanel
        defaultReportRange={{
          fromDate: "2026-04-14",
          toDate: "2026-04-20",
          weekCount: 1,
          referenceDate: new Date("2026-04-14T00:00:00"),
        }}
        defaultIsoWeek={16}
        defaultIsoWeekYear={2026}
        isAdmin
      />,
    );
    portraitSpy.mockRestore();

    expect(portraitHtml).toContain('data-page-orientation="portrait"');
    expect(portraitHtml).toContain('data-print-orientation="portrait"');
  });
});
