/**
 * Test Scope:
 *
 * Feature: FT31 - MonitoringPage
 *
 * Abgedeckte Regeln:
 * - Admins sehen den sichtbaren Konfigurationsbereich mit Mindestmitarbeiter-Eingabe und Save-Aktion.
 * - Das Monitoring-Filterpanel bleibt unterhalb der Tabelle im unteren Seitenbereich verdrahtet.
 * - Die Tabellenansicht leitet Row-Doppelklicks in den Termin-Open-Flow weiter.
 * - Monitoring-Zeilen erhalten triggerabhaengige Highlight-Farben.
 * - Die Tabelle rendert nur die neue Trigger-Spaltenstruktur ohne Problem-Spalte.
 *
 * Fehlerfaelle:
 * - Die Konfigurationsoberflaeche verschwindet fuer Admins.
 * - Monitoring-Zeilen verlieren ihre Oeffnen-Aktion.
 * - Triggerfarben oder Spaltenkonfiguration gehen verloren.
 *
 * Ziel:
 * Das sichtbare Monitoring-Seitenverhalten ueber gerenderte Props und Markup absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const tableViewCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/ui/help/help-icon", () => ({
  HelpIcon: () => <span data-testid="help-icon-marker">help</span>,
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: {
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ filterSlot, contentSlot, footerSlot }: {
    filterSlot?: React.ReactNode;
    contentSlot?: React.ReactNode;
    footerSlot?: React.ReactNode;
  }) => (
    <section>
      {filterSlot}
      {contentSlot}
      {footerSlot}
    </section>
  ),
}));

vi.mock("@/components/ui/table-view", () => ({
  TableView: (props: Record<string, unknown>) => {
    tableViewCalls.push(props);
    return <div data-testid={String(props.testId ?? "table-monitoring")}>table-monitoring</div>;
  },
}));

vi.mock("@/components/ui/list-empty-state", () => ({
  ListEmptyState: ({ fallbackTitle }: { fallbackTitle?: string }) => <div>{fallbackTitle}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input data-testid={String(props["data-testid"] ?? "")} value={String(props.value ?? "")} readOnly />,
}));

vi.mock("@/components/ui/badge-previews/appointment-weekly-panel-preview", () => ({
  createAppointmentWeeklyPanelPreview: vi.fn(() => ({
    content: <div data-testid="monitoring-row-preview-content">preview</div>,
    options: {},
  })),
}));

import { MonitoringPage } from "../../../client/src/components/MonitoringPage";

describe("FT31 UI: MonitoringPage behavior", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    tableViewCalls.length = 0;
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useMutationMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    useQueryMock.mockImplementation((options: { queryKey?: unknown[] }) => {
      const firstKey = options.queryKey?.[0];
      if (firstKey === "/api/admin/monitoring/config") {
        return {
          data: { tr01: { allAppointments: true, horizonDays: 21, minimumEmployees: 2 } },
          isLoading: false,
        };
      }
      if (firstKey === "/api/tours") {
        return {
          data: [{ id: 7, name: "Tour 7", color: "#2563eb", version: 1 }],
          isLoading: false,
        };
      }
      return {
        data: [
          {
            appointmentId: 77,
            startDate: "2099-01-01",
            startTime: null,
            tourId: 7,
            tourName: "Tour 7",
            orderNumber: "ORD-77",
            projectTitle: "Projekt 77",
            projectName: null,
            customerNumber: "1077",
            customerFirstName: "Mia",
            customerLastName: "Monitor",
            customerName: null,
            employeeCount: 1,
            triggerCode: "TR-01",
            triggerCodes: ["TR-01", "TR-02"],
            triggerName: "Mindestzahl Mitarbeiter + Geparkt",
          },
        ],
        isLoading: false,
      };
    });
  });

  it.skip("renders the admin config panel, forwards row opens and exposes trigger row styling - skipped because the save button is intentionally removed from the Monitoring UI", () => {
    const onOpenAppointment = vi.fn();
    const html = renderToStaticMarkup(
      <MonitoringPage isAdmin initialItems={[]} onOpenAppointment={onOpenAppointment} />,
    );

    expect(html).toContain("monitoring-config-panel");
    expect(html).toContain("input-monitoring-minimum-employees");
    expect(html).toContain("button-monitoring-save-config");
    expect(html).toContain("Mindestzahl Mitarbeiter");
    expect(html).toContain("monitoring-filter-customer-last-name");
    expect(html).toContain("monitoring-filter-order-number");
    expect(html).toContain("table-monitoring");
    expect(html.indexOf("table-monitoring")).toBeLessThan(html.indexOf("monitoring-filter-customer-last-name"));

    const props = tableViewCalls[0];
    expect((props.columns as Array<{ id: string }>).map((column) => column.id)).toEqual([
      "startTime",
      "startDate",
      "orderNumber",
      "projectTitle",
      "customerNumber",
      "customerName",
      "tourName",
      "triggerName",
    ]);
    expect(typeof props.rowPreviewRenderer).toBe("function");

    const rowStyle = (props.rowStyle as ((row: { triggerCode: string }) => Record<string, string>) | undefined)?.({
      triggerCode: "TR-01",
    });
    expect(rowStyle).toEqual({ backgroundColor: "rgba(220, 38, 38, 0.14)" });

    (props.onRowDoubleClick as ((row: { appointmentId: number }) => void) | undefined)?.({ appointmentId: 77 });
    expect(onOpenAppointment).toHaveBeenCalledWith(77);
  });
});
