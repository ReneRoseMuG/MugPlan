import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { api, type MonitoringConfigResponse, type MonitoringListResponse } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ListLayout } from "@/components/ui/list-layout";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type MonitoringPageProps = {
  isAdmin: boolean;
  initialItems?: MonitoringListResponse;
  isInitialLoading?: boolean;
};

export function MonitoringPage({ isAdmin, initialItems, isInitialLoading = false }: MonitoringPageProps) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [horizonDays, setHorizonDays] = useState("14");
  const [minimumEmployees, setMinimumEmployees] = useState("1");

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

  useEffect(() => {
    if (!configQuery.data) return;
    setEnabled(configQuery.data.tr01.enabled);
    setHorizonDays(String(configQuery.data.tr01.horizonDays));
    setMinimumEmployees(String(configQuery.data.tr01.minimumEmployees));
  }, [configQuery.data]);

  const saveConfigMutation = useMutation({
    mutationFn: async (payload: MonitoringConfigResponse) => {
      const response = await apiRequest("PUT", api.monitoring.adminConfigSet.path, payload);
      return (await response.json()) as MonitoringConfigResponse;
    },
    onSuccess: async (config) => {
      queryClient.setQueryData([api.monitoring.adminConfigGet.path], config);
      await queryClient.invalidateQueries({ queryKey: [api.monitoring.list.path] });
      toast({ title: "Monitoring-Konfiguration gespeichert" });
    },
    onError: (error) => {
      toast({
        title: "Monitoring-Konfiguration konnte nicht gespeichert werden",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const columns = useMemo<TableViewColumnDef<MonitoringListResponse[number]>[]>(() => [
    {
      id: "startDate",
      header: "Startdatum",
      accessor: (row) => row.startDate,
      minWidth: 140,
    },
    {
      id: "endDate",
      header: "Enddatum",
      accessor: (row) => row.endDate ?? "-",
      minWidth: 140,
    },
    {
      id: "tourName",
      header: "Tour",
      accessor: (row) => row.tourName ?? "-",
      minWidth: 180,
    },
    {
      id: "employeeCount",
      header: "Mitarbeiter",
      accessor: (row) => row.employeeCount,
      minWidth: 120,
      align: "right",
    },
    {
      id: "triggerName",
      header: "Trigger",
      accessor: (row) => row.triggerName,
      minWidth: 220,
    },
    {
      id: "problemDescription",
      header: "Problem",
      accessor: (row) => row.problemDescription,
      minWidth: 320,
    },
  ], []);

  const handleSaveConfig = async () => {
    const parsedHorizonDays = Number(horizonDays);
    const parsedMinimumEmployees = Number(minimumEmployees);
    if (!Number.isInteger(parsedHorizonDays) || parsedHorizonDays < 1) {
      toast({ title: "Vorlaufhorizont muss mindestens 1 Tag sein", variant: "destructive" });
      return;
    }
    if (!Number.isInteger(parsedMinimumEmployees) || parsedMinimumEmployees < 1) {
      toast({ title: "Mindestzahl Mitarbeiter muss mindestens 1 sein", variant: "destructive" });
      return;
    }

    await saveConfigMutation.mutateAsync({
      tr01: {
        enabled,
        horizonDays: parsedHorizonDays,
        minimumEmployees: parsedMinimumEmployees,
      },
    });
  };

  const content = (
    <div className="flex h-full min-h-0 flex-col gap-4 p-6">
      {isAdmin ? (
        <section className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="monitoring-config-panel">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[180px_180px_180px_auto]">
            <div className="flex items-center gap-3">
              <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="switch-monitoring-enabled" />
              <span className="text-sm text-slate-700">{enabled ? "TR-01 aktiv" : "TR-01 deaktiviert"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Vorlaufhorizont</span>
              <Input
                type="number"
                min={1}
                value={horizonDays}
                onChange={(event) => setHorizonDays(event.target.value)}
                data-testid="input-monitoring-horizon-days"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Mindestzahl Mitarbeiter</span>
              <Input
                type="number"
                min={1}
                value={minimumEmployees}
                onChange={(event) => setMinimumEmployees(event.target.value)}
                data-testid="input-monitoring-minimum-employees"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => void handleSaveConfig()}
                disabled={saveConfigMutation.isPending || configQuery.isLoading}
                data-testid="button-monitoring-save-config"
              >
                Speichern
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="min-h-0 flex-1">
        <TableView
          columns={columns}
          rows={monitoringQuery.data ?? []}
          rowKey={(row) => `${row.appointmentId}-${row.triggerName}`}
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
    </div>
  );

  return (
    <ListLayout
      title="Monitoring"
      icon={<AlertTriangle className="h-5 w-5" />}
      isLoading={isInitialLoading && !initialItems}
      headerActions={(
        <Button
          variant="outline"
          onClick={() => void monitoringQuery.refetch()}
          data-testid="button-monitoring-refresh"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Aktualisieren
        </Button>
      )}
      contentSlot={content}
    />
  );
}
