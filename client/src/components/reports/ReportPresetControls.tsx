import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Save, Trash2 } from "lucide-react";

import type {
  ReportConfigReportKey,
  ReportPreset,
  ReportPresetAction,
  ReportPresetConfig,
  ReportPresetScope,
} from "@shared/routes";

import { Button } from "@/components/ui/button";
import { DialogBaseInlineMessage } from "@/components/ui/dialog-base";
import { normalizeServerError } from "@/lib/error-normalization";

type ReportPresetControlsProps = {
  reportKey: ReportConfigReportKey;
  isAdmin: boolean;
  currentConfig: ReportPresetConfig;
  defaultName: string;
  onApplyPreset: (preset: ReportPreset) => void;
  testIdPrefix: string;
  disabled?: boolean;
};

type ReportPresetListResponse = {
  reportKey: ReportConfigReportKey;
  presets: ReportPreset[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`${response.status}: ${bodyText || `Request failed for ${url}`}`);
  }
  return response.json() as Promise<T>;
}

function buildPresetId(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return normalized.length > 0 ? normalized : `preset-${Date.now()}`;
}

export function ReportPresetControls({
  reportKey,
  isAdmin,
  currentConfig,
  defaultName,
  onApplyPreset,
  testIdPrefix,
  disabled = false,
}: ReportPresetControlsProps) {
  const queryClient = useQueryClient();
  const [presetName, setPresetName] = React.useState(defaultName);
  const [scope, setScope] = React.useState<ReportPresetScope>("USER");
  const [selectedPresetId, setSelectedPresetId] = React.useState("");
  const [actions, setActions] = React.useState<ReportPresetAction[]>(["GENERATE_REPORT"]);
  const queryKey = ["report-configs", reportKey];
  const { data, error: presetsError, isError: isPresetsError } = useQuery<ReportPresetListResponse>({
    queryKey,
    queryFn: () => fetchJson(`/api/report-configs/${reportKey}`),
  });
  const presets = data?.presets ?? [];
  const selectedPreset = presets.find((preset) => `${preset.scope}:${preset.id}` === selectedPresetId) ?? null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const presetId = buildPresetId(presetName);
      return fetchJson<ReportPreset>(`/api/report-configs/${reportKey}/presets/${presetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: presetName.trim() || defaultName,
          scope,
          config: currentConfig,
          actions,
        }),
      });
    },
    onSuccess: async (preset) => {
      setSelectedPresetId(`${preset.scope}:${preset.id}`);
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPreset) return null;
      return fetchJson<{ ok: true }>(`/api/report-configs/${reportKey}/presets/${selectedPreset.id}?scope=${selectedPreset.scope}`, {
        method: "DELETE",
      });
    },
    onSuccess: async () => {
      setSelectedPresetId("");
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const canDeleteSelected = Boolean(selectedPreset && (selectedPreset.scope === "USER" || isAdmin));
  const isSaving = saveMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const inlineError =
    isPresetsError
      ? normalizeServerError(presetsError, { title: "Presets konnten nicht geladen werden" })
      : saveMutation.error
        ? normalizeServerError(saveMutation.error, { title: "Preset konnte nicht gespeichert werden" })
        : deleteMutation.error
          ? normalizeServerError(deleteMutation.error, { title: "Preset konnte nicht gelöscht werden" })
          : null;

  return (
    <div
      className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700"
      data-testid={`${testIdPrefix}-preset-controls`}
    >
      {inlineError ? (
        <DialogBaseInlineMessage className="text-sm" error={inlineError} />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedPresetId}
          onChange={(event) => setSelectedPresetId(event.target.value)}
          disabled={disabled}
          className="h-8 min-w-[180px] rounded-md border border-slate-200 bg-white px-2 text-xs"
          data-testid={`${testIdPrefix}-preset-select`}
        >
          <option value="">Preset wählen</option>
          {presets.map((preset) => (
            <option key={`${preset.scope}:${preset.id}`} value={`${preset.scope}:${preset.id}`}>
              {preset.scope === "GLOBAL" ? "Global" : "Meine"}: {preset.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !selectedPreset}
          onClick={() => selectedPreset && onApplyPreset(selectedPreset)}
          data-testid={`${testIdPrefix}-preset-apply`}
        >
          <Play className="h-3.5 w-3.5" />
          Anwenden
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canDeleteSelected || isDeleting}
          onClick={() => deleteMutation.mutate()}
          data-testid={`${testIdPrefix}-preset-delete`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Löschen
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={presetName}
          onChange={(event) => setPresetName(event.target.value)}
          disabled={disabled}
          className="h-8 min-w-[180px] rounded-md border border-slate-200 bg-white px-2 text-xs"
          data-testid={`${testIdPrefix}-preset-name`}
        />
        {isAdmin ? (
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value === "GLOBAL" ? "GLOBAL" : "USER")}
            disabled={disabled}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
            data-testid={`${testIdPrefix}-preset-scope`}
          >
            <option value="USER">Mein Preset</option>
            <option value="GLOBAL">Global</option>
          </select>
        ) : null}
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={actions.includes("GENERATE_REPORT")}
            onChange={(event) => setActions(event.target.checked ? ["GENERATE_REPORT"] : [])}
            disabled={disabled}
            data-testid={`${testIdPrefix}-preset-action-generate`}
          />
          Öffnen
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isSaving}
          onClick={() => saveMutation.mutate()}
          data-testid={`${testIdPrefix}-preset-save`}
        >
          <Save className="h-3.5 w-3.5" />
          Speichern
        </Button>
      </div>
    </div>
  );
}
