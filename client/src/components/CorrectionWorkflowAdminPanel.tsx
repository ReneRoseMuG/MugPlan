import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { formatDisplayTimestamp } from "@/lib/date-display-format";

type WorkflowCandidateStatus = "actionable" | "already_ok" | "ambiguous" | "blocked";
type WorkflowApplyStatus =
  | "applied"
  | "skipped_non_actionable"
  | "skipped_due_to_drift"
  | "failed_verification"
  | "failed";

type WorkflowCandidateRow = {
  candidateId: string;
  status: WorkflowCandidateStatus;
  label: string;
  message: string | null;
  projectId: number | null;
  orderNumber: string | null;
  currentName: string | null;
  targetName: string | null;
  saunaModel: string | null;
};

type WorkflowPreviewResponse = {
  workflowId: string;
  workflowTitle: string;
  runtimeMode: "development" | "test" | "production";
  target: { dbName: string; host: string; port: number };
  createdAt: string;
  runId: string;
  manifestPath: string;
  previewReportPath: string;
  manifestHash: string;
  summary: Record<WorkflowCandidateStatus, number>;
  sourceCount: number;
  resultCount: number;
  candidates: WorkflowCandidateRow[];
};

type WorkflowApplyResponse = {
  workflowId: string;
  workflowTitle: string;
  createdAt: string;
  verificationPassed: boolean;
  summary: {
    actionableCandidates: number;
    applied: number;
    skippedNonActionable: number;
    skippedDueToDrift: number;
    failedVerification: number;
    failed: number;
  };
  candidateResults: Array<{
    candidateId: string;
    label: string;
    status: WorkflowApplyStatus;
    detail: string | null;
  }>;
};

function workflowStatusLabel(status: WorkflowCandidateStatus): string {
  if (status === "actionable") return "Änderbar";
  if (status === "already_ok") return "Bereits passend";
  if (status === "ambiguous") return "Mehrdeutig";
  return "Blockiert";
}

function applyStatusLabel(status: WorkflowApplyStatus): string {
  if (status === "applied") return "Angewendet";
  if (status === "skipped_non_actionable") return "Übersprungen";
  if (status === "skipped_due_to_drift") return "Drift";
  if (status === "failed_verification") return "Verifikation fehlgeschlagen";
  return "Fehler";
}

function invalidateProjectMigrationQueries(): Promise<unknown[]> {
  return Promise.all([
    queryClient.invalidateQueries({
      predicate: (query) => Array.isArray(query.queryKey) && String(query.queryKey[0]).startsWith("/api/projects"),
    }),
    queryClient.invalidateQueries({
      predicate: (query) => Array.isArray(query.queryKey) && String(query.queryKey[0]).startsWith("/api/appointments"),
    }),
    queryClient.invalidateQueries({
      predicate: (query) => Array.isArray(query.queryKey) && String(query.queryKey[0]).startsWith("/api/reports"),
    }),
  ]);
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const text = await response.text();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text) as { message?: string; code?: string };
    return parsed.message ?? parsed.code ?? fallback;
  } catch {
    return text;
  }
}

export function CorrectionWorkflowAdminPanel() {
  const [preview, setPreview] = useState<WorkflowPreviewResponse | null>(null);
  const [applyResult, setApplyResult] = useState<WorkflowApplyResponse | null>(null);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(api.admin.saunaProjectTitleMigrationPreview.path, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Migrationsvorschau konnte nicht erzeugt werden."));
      }
      return response.json() as Promise<WorkflowPreviewResponse>;
    },
    onSuccess: (payload) => {
      setPreview(payload);
      setApplyResult(null);
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (input: { manifestPath: string; manifestHash: string }) => {
      const response = await fetch(api.admin.saunaProjectTitleMigrationApply.path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Migration konnte nicht ausgeführt werden."));
      }
      return response.json() as Promise<WorkflowApplyResponse>;
    },
    onSuccess: async (payload) => {
      setApplyResult(payload);
      await invalidateProjectMigrationQueries();
    },
  });

  const canApply = Boolean(preview && preview.summary.actionable > 0 && !applyMutation.isPending);

  return (
    <div className="space-y-5" data-testid="correction-workflow-admin-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Projekt-Titel aus Sauna-Modell</h3>
          <p className="mt-1 text-xs text-slate-500">
            Einmalige Korrektur auf Basis der Sauna-Positionen in der Artikelliste.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => previewMutation.mutate()}
            disabled={previewMutation.isPending || applyMutation.isPending}
            data-testid="button-preview-sauna-project-title-migration"
          >
            {previewMutation.isPending ? "Vorschau läuft..." : "Vorschau erzeugen"}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (!preview) return;
              applyMutation.mutate({
                manifestPath: preview.manifestPath,
                manifestHash: preview.manifestHash,
              });
            }}
            disabled={!canApply}
            data-testid="button-apply-sauna-project-title-migration"
          >
            {applyMutation.isPending ? "Migration läuft..." : "Migration anwenden"}
          </Button>
        </div>
      </div>

      {previewMutation.error instanceof Error ? (
        <p className="text-xs text-destructive" data-testid="sauna-project-title-migration-preview-error">
          {previewMutation.error.message}
        </p>
      ) : null}
      {applyMutation.error instanceof Error ? (
        <p className="text-xs text-destructive" data-testid="sauna-project-title-migration-apply-error">
          {applyMutation.error.message}
        </p>
      ) : null}

      {preview ? (
        <div className="space-y-4" data-testid="sauna-project-title-migration-preview">
          <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Ausgangsmenge</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{preview.sourceCount}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Ergebnismenge</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{preview.resultCount}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Bereits passend</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{preview.summary.already_ok}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Offen prüfen</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {preview.summary.ambiguous + preview.summary.blocked}
              </p>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600">
            <p>
              Ziel: {preview.target.dbName} ({preview.target.host}:{preview.target.port})
            </p>
            <p>Erzeugt: {formatDisplayTimestamp(preview.createdAt, preview.createdAt)}</p>
          </div>

          <div className="overflow-auto rounded-md border border-slate-200 bg-white" data-testid="sauna-project-title-migration-table">
            <table className="min-w-full text-sm">
              <thead className="bg-white">
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-3 py-2 text-xs font-medium text-slate-500">Status</th>
                  <th className="px-3 py-2 text-xs font-medium text-slate-500">Auftrag</th>
                  <th className="px-3 py-2 text-xs font-medium text-slate-500">Projekt</th>
                  <th className="px-3 py-2 text-xs font-medium text-slate-500">Aktuell</th>
                  <th className="px-3 py-2 text-xs font-medium text-slate-500">Ziel</th>
                </tr>
              </thead>
              <tbody>
                {preview.candidates.map((candidate) => (
                  <tr key={candidate.candidateId} className="border-b border-slate-100">
                    <td className="px-3 py-2">{workflowStatusLabel(candidate.status)}</td>
                    <td className="px-3 py-2">{candidate.orderNumber ?? "-"}</td>
                    <td className="px-3 py-2">{candidate.projectId ?? "-"}</td>
                    <td className="px-3 py-2">{candidate.currentName ?? "-"}</td>
                    <td className="px-3 py-2">{candidate.targetName ?? candidate.message ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Noch keine Vorschau vorhanden.
        </p>
      )}

      {applyResult ? (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-xs text-slate-600" data-testid="sauna-project-title-migration-apply-result">
          <p className="font-semibold text-slate-900">
            Ergebnis: {applyResult.verificationPassed ? "Verifikation bestanden" : "Verifikation fehlgeschlagen"}
          </p>
          <p className="mt-1">
            Angewendet: {applyResult.summary.applied} von {applyResult.summary.actionableCandidates}
          </p>
          <p>Drift: {applyResult.summary.skippedDueToDrift}</p>
          <p>Fehler: {applyResult.summary.failed + applyResult.summary.failedVerification}</p>
          {applyResult.candidateResults.some((candidate) => candidate.status !== "applied" && candidate.status !== "skipped_non_actionable") ? (
            <div className="mt-3 space-y-1">
              {applyResult.candidateResults
                .filter((candidate) => candidate.status !== "applied" && candidate.status !== "skipped_non_actionable")
                .map((candidate) => (
                  <p key={candidate.candidateId} className="text-destructive">
                    {applyStatusLabel(candidate.status)}: {candidate.label}
                    {candidate.detail ? ` - ${candidate.detail}` : ""}
                  </p>
                ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
