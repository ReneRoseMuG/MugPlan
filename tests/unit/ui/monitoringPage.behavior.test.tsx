/**
 * Test Scope:
 *
 * Feature: FT31 - MonitoringPage
 *
 * Abgedeckte Regeln:
 * - Admins sehen den sichtbaren Konfigurationsbereich mit Toggle und Eingabefeldern.
 * - Die Tabellenansicht leitet Row-Doppelklicks in den Termin-Open-Flow weiter.
 *
 * Fehlerfaelle:
 * - Die Konfigurationsoberflaeche verschwindet fuer Admins.
 * - Monitoring-Zeilen verlieren ihre Oeffnen-Aktion.
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

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: {
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ contentSlot }: { contentSlot?: React.ReactNode }) => <section>{contentSlot}</section>,
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
  Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input data-testid={String(props["data-testid"] ?? "")} value={String(props.value ?? "")} readOnly />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: (props: Record<string, unknown>) => <input type="checkbox" data-testid={String(props["data-testid"] ?? "")} checked={Boolean(props.checked)} readOnly />,
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
      return {
        data: [
          {
            appointmentId: 77,
            startDate: "2099-01-01",
            endDate: null,
            tourName: "Tour 7",
            employeeCount: 1,
            triggerName: "TR01",
            problemDescription: "Zu wenig Mitarbeiter",
          },
        ],
        isLoading: false,
      };
    });
  });

  it("renders the admin config panel and forwards monitoring row opens", () => {
    const onOpenAppointment = vi.fn();
    const html = renderToStaticMarkup(
      <MonitoringPage isAdmin initialItems={[]} onOpenAppointment={onOpenAppointment} />,
    );

    expect(html).toContain("monitoring-config-panel");
    expect(html).toContain("switch-monitoring-all-appointments");
    expect(html).toContain("alle Termine");
    expect(html).toContain("table-monitoring");

    (tableViewCalls[0].onRowDoubleClick as ((row: { appointmentId: number }) => void) | undefined)?.({ appointmentId: 77 });
    expect(onOpenAppointment).toHaveBeenCalledWith(77);
  });
});
