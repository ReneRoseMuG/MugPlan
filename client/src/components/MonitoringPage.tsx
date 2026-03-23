import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
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
  onOpenAppointment?: (appointmentId: number) => void;
};

type MonitoringConfigDraft = {
  allAppointments: boolean;
  horizonDays: string;
  minimumEmployees: string;
};

type MonitoringConfigSaveOptions = {
  showSuccessToast: boolean;
};

function toDraftConfig(config: MonitoringConfigResponse["tr01"] | MonitoringConfigDraft): MonitoringConfigDraft {
  return {
    allAppointments: config.allAppointments,
    horizonDays: String(config.horizonDays),
    minimumEmployees: String(config.minimumEmployees),
  };
}

export function MonitoringPage({ isAdmin, initialItems, isInitialLoading = false, onOpenAppointment }: MonitoringPageProps) {
  const { toast } = useToast();
  const [draftConfig, setDraftConfig] = useState<MonitoringConfigDraft | null>(null);

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

  const resolvedConfig = draftConfig ?? (configQuery.data
    ? toDraftConfig(configQuery.data.tr01)
    : {
        allAppointments: false,
        horizonDays: "14",
        minimumEmployees: "1",
      });
  const allAppointments = resolvedConfig.allAppointments;
  const horizonDays = resolvedConfig.horizonDays;
  const minimumEmployees = resolvedConfig.minimumEmployees;

  const saveConfigMutation = useMutation({
    mutationFn: async ({ payload }: { payload: MonitoringConfigResponse; options: MonitoringConfigSaveOptions }) => {
      const response = await apiRequest("PUT", api.monitoring.adminConfigSet.path, payload);
      return (await response.json()) as MonitoringConfigResponse;
    },
    onSuccess: async (config, variables) => {
      queryClient.setQueryData([api.monitoring.adminConfigGet.path], config);
      setDraftConfig(null);
      await queryClient.invalidateQueries({ queryKey: [api.monitoring.list.path] });
      if (variables.options.showSuccessToast) {
        toast({ title: "Monitoring-Konfiguration gespeichert" });
      }
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
      payload: {
        tr01: {
          allAppointments,
          horizonDays: parsedHorizonDays,
          minimumEmployees: parsedMinimumEmployees,
        },
      },
      options: {
        showSuccessToast: true,
      },
    });
  };

  const handleToggleAllAppointments = async (checked: boolean) => {
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

    const nextDraft = {
      allAppointments: checked,
      horizonDays,
      minimumEmployees,
    };
    setDraftConfig(nextDraft);

    try {
      await saveConfigMutation.mutateAsync({
        payload: {
          tr01: {
            allAppointments: checked,
            horizonDays: parsedHorizonDays,
            minimumEmployees: parsedMinimumEmployees,
          },
        },
        options: {
          showSuccessToast: false,
        },
      });
    } catch {
      setDraftConfig((current) => current ?? nextDraft);
    }
  };

  const content = (
    <div className="flex h-full min-h-0 flex-col gap-4 p-6">
      {isAdmin ? (
        <section className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="monitoring-config-panel">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={allAppointments}
                onCheckedChange={(checked) => {
                  void handleToggleAllAppointments(checked);
                }}
                disabled={(configQuery.isLoading && !configQuery.data) || saveConfigMutation.isPending}
                data-testid="switch-monitoring-all-appointments"
              />
              <span className="text-sm text-slate-700">alle Termine</span>
            </div>
            {!allAppointments ? (
              <div className="flex w-28 flex-col gap-1">
                <span className="text-sm font-medium text-slate-700">Vorlaufhorizont</span>
                <Input
                  type="number"
                  min={1}
                  value={horizonDays}
                  onChange={(event) => {
                    setDraftConfig((current) => ({
                      ...toDraftConfig(current ?? configQuery.data?.tr01 ?? resolvedConfig),
                      horizonDays: event.target.value,
                    }));
                  }}
                  data-testid="input-monitoring-horizon-days"
                />
              </div>
            ) : null}
            <div className="flex w-24 flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Mindestzahl Mitarbeiter</span>
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
            <div className="ml-auto flex items-end">
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
          onRowDoubleClick={(row) => onOpenAppointment?.(row.appointmentId)}
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
      helpKey="monitoring"
      isLoading={isInitialLoading && !initialItems}
      contentSlot={content}
    />
  );
}
