import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { api, type MonitoringConfigResponse, type MonitoringListResponse } from "@shared/routes";
import type { Tour } from "@shared/schema";
import { ListLayout } from "@/components/ui/list-layout";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { Input } from "@/components/ui/input";
import { MonitoringFilterPanel } from "@/components/ui/filter-panels/monitoring-filter-panel";
import {
  applyMonitoringFilters,
  defaultMonitoringFilters,
  formatMonitoringCustomerName,
  type MonitoringFilters,
} from "@/lib/monitoring-filters";
import { formatListDate, formatListTime } from "@/lib/list-display-format";
import { getMonitoringTriggerColor, toAlphaColor } from "@/lib/monitoring-ui";
import {
  AppointmentWeeklyPanelPreview,
  appointmentWeeklyPanelPreviewOptions,
  resolveAppointmentWeeklyPanelPreviewWidthPx,
} from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import type { InfoBadgePreview } from "@/components/ui/info-badge";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

type MonitoringPageProps = {
  isAdmin: boolean;
  initialItems?: MonitoringListResponse;
  isInitialLoading?: boolean;
  onOpenAppointment?: (appointmentId: number) => void;
};

type MonitoringConfigDraft = {
  allAppointments: boolean;
  horizonDays: string;
  minimumEmployees: string;
};

function toDraftConfig(config: MonitoringConfigResponse["tr01"] | MonitoringConfigDraft): MonitoringConfigDraft {
  return {
    allAppointments: config.allAppointments,
    horizonDays: String(config.horizonDays),
    minimumEmployees: String(config.minimumEmployees),
  };
}

function MonitoringAppointmentRowPreview({
  appointmentId,
  startDate,
  widthPx,
}: {
  appointmentId: number;
  startDate: string;
  widthPx: number;
}) {
  const previewQuery = useQuery<CalendarAppointment | null>({
    queryKey: ["monitoring-row-preview", appointmentId, startDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        fromDate: startDate,
        toDate: startDate,
        detail: "full",
      });
      const response = await fetch(`/api/calendar/appointments?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Termin-Preview konnte nicht geladen werden");
      }
      const payload = (await response.json()) as unknown;
      const appointments = Array.isArray(payload) ? (payload as CalendarAppointment[]) : [];
      return appointments.find((appointment) => appointment.id === appointmentId) ?? null;
    },
  });

  if (!previewQuery.data) {
    return (
      <div className="rounded-lg bg-white px-4 py-3 text-sm text-slate-500" style={{ width: widthPx }}>
        Termin-Preview wird geladen...
      </div>
    );
  }

  return <AppointmentWeeklyPanelPreview appointment={previewQuery.data} widthPx={widthPx} />;
}

function createMonitoringAppointmentRowPreview(appointmentId: number, startDate: string): InfoBadgePreview {
  const previewWidthPx = resolveAppointmentWeeklyPanelPreviewWidthPx("sidebarTable");

  return {
    content: (
      <MonitoringAppointmentRowPreview
        appointmentId={appointmentId}
        startDate={startDate}
        widthPx={previewWidthPx}
      />
    ),
    options: {
      ...appointmentWeeklyPanelPreviewOptions,
      maxWidth: previewWidthPx,
    },
  };
}

export function MonitoringPage({ isAdmin, initialItems, isInitialLoading = false, onOpenAppointment }: MonitoringPageProps) {
  const [draftConfig, setDraftConfig] = useState<MonitoringConfigDraft | null>(null);
  const [filters, setFilters] = useState<MonitoringFilters>(defaultMonitoringFilters);

  const monitoringQuery = useQuery<MonitoringListResponse>({
    queryKey: [api.monitoring.list.path],
    initialData: initialItems,
    queryFn: async () => {
      const response = await fetch(api.monitoring.list.path, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Monitoring konnte nicht geladen werden");
      }
      return (await response.json()) as MonitoringListResponse;
    },
  });

  const configQuery = useQuery<MonitoringConfigResponse>({
    queryKey: [api.monitoring.adminConfigGet.path],
    enabled: isAdmin,
    queryFn: async () => {
      const response = await fetch(api.monitoring.adminConfigGet.path, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Monitoring-Konfiguration konnte nicht geladen werden");
      }
      return (await response.json()) as MonitoringConfigResponse;
    },
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: [api.tours.list.path],
  });

  const resolvedConfig = draftConfig ?? (configQuery.data
    ? toDraftConfig(configQuery.data.tr01)
    : {
        allAppointments: true,
        horizonDays: "14",
        minimumEmployees: "1",
      });
  const minimumEmployees = resolvedConfig.minimumEmployees;

  const columns = useMemo<TableViewColumnDef<MonitoringListResponse[number]>[]>(() => [
    {
      id: "startTime",
      header: "Uhrzeit",
      accessor: (row) => formatListTime(row.startTime) || null,
      minWidth: 80,
    },
    {
      id: "startDate",
      header: "Datum",
      accessor: (row) => formatListDate(row.startDate),
      minWidth: 100,
    },
    {
      id: "orderNumber",
      header: "Auftrag Nr.",
      accessor: (row) => row.orderNumber ?? null,
      minWidth: 120,
    },
    {
      id: "projectTitle",
      header: "Projekt",
      accessor: (row) => row.projectTitle ?? row.projectName ?? null,
      minWidth: 180,
    },
    {
      id: "customerNumber",
      header: "Kunde Nr.",
      accessor: (row) => row.customerNumber ?? null,
      minWidth: 120,
    },
    {
      id: "customerName",
      header: "Kunde",
      accessor: (row) => formatMonitoringCustomerName(row) || null,
      minWidth: 180,
    },
    {
      id: "tourName",
      header: "Tour",
      accessor: (row) => row.tourName ?? null,
      minWidth: 120,
    },
    {
      id: "triggerName",
      header: "Trigger",
      accessor: (row) => row.triggerName,
      minWidth: 220,
    },
  ], []);

  const filteredRows = useMemo(
    () => applyMonitoringFilters(monitoringQuery.data, filters),
    [filters, monitoringQuery.data],
  );

  const filterPanel = (
    <MonitoringFilterPanel
      filters={filters}
      onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      tours={tours}
    />
  );

  const configPanel = isAdmin ? (
    <div className="flex flex-wrap items-end gap-4" data-testid="monitoring-config-panel">
      <div className="h-0 overflow-hidden opacity-0 pointer-events-none" aria-hidden="true">
        <span className="whitespace-nowrap text-sm font-medium text-slate-700">Mindestzahl Mitarbeiter</span>
        <Input
          type="number"
          min={1}
          value={minimumEmployees}
          onChange={(event) => {
            setDraftConfig((current) => ({
              ...toDraftConfig(current ?? configQuery.data?.tr01 ?? resolvedConfig),
              minimumEmployees: event.target.value,
            }));
          }}
          data-testid="input-monitoring-minimum-employees"
        />
      </div>
    </div>
  ) : null;

  const footerPanel = (
    <div className="flex flex-col gap-4">
      {configPanel}
      {filterPanel}
    </div>
  );

  const content = (
    <div className="flex h-full min-h-0 flex-col p-6">
      <TableView
        columns={columns}
        rows={filteredRows}
        rowKey={(row) => row.appointmentId}
        onRowDoubleClick={(row) => onOpenAppointment?.(row.appointmentId)}
        rowPreviewRenderer={(row) => createMonitoringAppointmentRowPreview(row.appointmentId, row.startDate)}
        rowStyle={(row) => ({
          backgroundColor: toAlphaColor(getMonitoringTriggerColor(row.triggerCode), 0.14),
        })}
        testId="table-monitoring"
        stickyHeader
        emptyState={(
          <ListEmptyState
            fallbackTitle="Keine problematischen Termine gefunden."
            fallbackBody="Derzeit liegen keine aktiven Monitoring-Treffer vor."
          />
        )}
      />
    </div>
  );

  return (
    <ListLayout
      title="Monitoring"
      icon={<AlertTriangle className="h-5 w-5" />}
      helpKey="monitoring"
      isLoading={isInitialLoading && !initialItems}
      contentSlot={content}
      footerSlot={footerPanel}
    />
  );
}
