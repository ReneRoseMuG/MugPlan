/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das Tourenplan-Panel zeigt den neuen vierten Reportblock mit CheckedList, Shortcode-Option und Admin-Druckmodus.
 * - Die Verdrahtung uebergibt bei geoeffneter Vorschau dieselbe Orientierung und Schriftgröße an Dialog und Druckseite.
 *
 * Fehlerfaelle:
 * - Der neue Reportblock fehlt in der Reports-Seite oder blendet die Admin-Optionen nicht ein.
 * - Die Vorschau uebergibt unterschiedliche Orientierungen an Dialog und Druckseite.
 *
 * Ziel:
 * Einen Smoke-Test fuer sichtbare Panel-Optionen und Vorschau-Prop-Weitergabe
 * in der Node-Testumgebung absichern, nicht die fachliche Reportwirkung.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useSettingMock = vi.fn();
const setSettingMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
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
    fontSize,
    testId,
  }: {
    orientation: string;
    fontSize: string;
    testId?: string;
  }) => (
    <div
      data-testid={testId}
      data-print-orientation={orientation}
      data-tourenplan-font-size={fontSize}
    />
  ),
}));

import { TourenplanReportPanel } from "../../../client/src/components/reports/TourenplanReportPanel";

describe("UI: TourenplanReportPanel smoke", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    useQueryMock.mockReset();
    useSettingMock.mockReset();
    setSettingMock.mockReset();
    useSettingMock.mockReturnValue(undefined);
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
          data: [{
            sectionKey: "tour-7",
            previewData: {
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
            appointmentItems: [{
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
          }],
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
      .mockImplementationOnce(() => [true, vi.fn()])
      .mockImplementationOnce(() => [[], vi.fn()])
      .mockImplementationOnce(() => [false, vi.fn()])
      .mockImplementationOnce(() => ["date", vi.fn()])
      .mockImplementationOnce(() => ["2026-04-14", vi.fn()])
      .mockImplementationOnce(() => ["2026-04-20", vi.fn()])
      .mockImplementationOnce(() => [16, vi.fn()])
      .mockImplementationOnce(() => [1, vi.fn()])
      .mockImplementationOnce(() => [false, vi.fn()])
      .mockImplementationOnce(() => ["farbdruck", vi.fn()])
      .mockImplementationOnce(() => ["medium", vi.fn()])
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
    expect(landscapeHtml).toContain("reports-tourenplan-tour-list");
    expect(landscapeHtml).toContain("checkbox-reports-tourenplan-all-tours");
    expect(landscapeHtml).toContain("checkbox-reports-tourenplan-tour-7");
    expect(landscapeHtml).toContain("checkbox-reports-tourenplan-without-tour");
    expect(landscapeHtml).toContain("button-reports-tourenplan-preview");
    expect(landscapeHtml).toContain("checkbox-reports-tourenplan-use-shortcodes");
    expect(landscapeHtml).toContain("reports-tourenplan-font-size-option");
    expect(landscapeHtml).toContain("button-reports-tourenplan-print-mode-farbdruck");
    expect(landscapeHtml).toContain("button-reports-tourenplan-print-mode-spardruck");
    expect(landscapeHtml).toContain("print-preview-dialog-marker");
    expect(landscapeHtml).toContain("tourenplan-print-page-1");
    expect(landscapeHtml).toContain('data-page-orientation="landscape"');
    expect(landscapeHtml).toContain('data-print-orientation="landscape"');
    expect(landscapeHtml).toContain('data-tourenplan-font-size="medium"');

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
    expect(portraitHtml).toContain('data-tourenplan-font-size="medium"');
    expect(portraitHtml).toContain("tourenplan-print-page-1");
  });
});
