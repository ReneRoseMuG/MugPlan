import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogBaseFooter, DialogBaseInlineMessage, DialogBaseShell } from "@/components/ui/dialog-base";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download } from "lucide-react";

type ConflictDecision = "OVERWRITE" | "SKIP";

type ImportPreviewResponse = {
  fileHash: string;
  summary: {
    totalItems: number;
    createCount: number;
    silentOverwriteCount: number;
    conflictCount: number;
  };
  conflicts: Array<{
    helpKey: string;
    existingTitle: string;
    existingBody: string | null;
    importedTitle: string;
    importedBody: string | null;
  }>;
};

type ImportApplyResponse = {
  createdCount: number;
  silentOverwrittenCount: number;
  decisionOverwrittenCount: number;
  skippedCount: number;
};

type ResultReport = {
  createdCount: number;
  silentOverwrittenCount: number;
  decisionOverwrittenCount: number;
  skippedCount: number;
  mode: "import" | "export";
  exportedCount?: number;
};

type HelpTextsImportExportDialogProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  totalHelpTextsCount: number;
  onImportApplied: () => void;
};

function toErrorCode(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "UNKNOWN";
  const code = (payload as Record<string, unknown>).code;
  return typeof code === "string" ? code : "UNKNOWN";
}

function mapCodeToMessage(code: string): string {
  if (code === "FORBIDDEN") return "Nur Admin darf Import/Export ausführen.";
  if (code === "INVALID_IMPORT_FILE") return "Datei konnte nicht gelesen werden.";
  if (code === "INVALID_IMPORT_FORMAT") return "YAML-Format ist ungültig.";
  if (code === "VALIDATION_ERROR") return "Importdatei ist ungültig oder unvollständig.";
  if (code === "FILE_HASH_MISMATCH") return "Datei wurde geändert. Bitte Vorschau neu laden.";
  if (code === "PAYLOAD_TOO_LARGE") return "Datei ist zu groß.";
  return `Aktion fehlgeschlagen (${code})`;
}

export function HelpTextsImportExportDialog({
  open,
  onOpenChange,
  totalHelpTextsCount,
  onImportApplied,
}: HelpTextsImportExportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isApplyingImport, setIsApplyingImport] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [resultReport, setResultReport] = useState<ResultReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decisionsByHelpKey, setDecisionsByHelpKey] = useState<Record<string, ConflictDecision>>({});

  const sortedConflicts = useMemo(() => {
    if (!preview) return [];
    return [...preview.conflicts].sort((a, b) => a.helpKey.localeCompare(b.helpKey, "de"));
  }, [preview]);

  const resetState = () => {
    setSelectedFile(null);
    setIsExporting(false);
    setIsPreviewLoading(false);
    setIsApplyingImport(false);
    setPreview(null);
    setResultReport(null);
    setError(null);
    setDecisionsByHelpKey({});
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetState();
    }
    onOpenChange(next);
  };

  const handleExport = async () => {
    setError(null);
    setIsExporting(true);
    try {
      const response = await fetch("/api/help-texts/export-yaml", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(toErrorCode(payload));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "helptexts.yaml";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setResultReport({
        mode: "export",
        createdCount: 0,
        silentOverwrittenCount: 0,
        decisionOverwrittenCount: 0,
        skippedCount: 0,
        exportedCount: totalHelpTextsCount,
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : "UNKNOWN";
      setError(mapCodeToMessage(code));
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) return;
    setError(null);
    setIsPreviewLoading(true);
    try {
      const body = new FormData();
      body.append("file", selectedFile);
      const response = await fetch("/api/help-texts/import-yaml/preview", {
        method: "POST",
        credentials: "include",
        body,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(toErrorCode(payload));
      }

      const payload = (await response.json()) as ImportPreviewResponse;
      setPreview(payload);
      const defaults: Record<string, ConflictDecision> = {};
      for (const conflict of payload.conflicts) {
        defaults[conflict.helpKey] = "SKIP";
      }
      setDecisionsByHelpKey(defaults);
    } catch (err) {
      const code = err instanceof Error ? err.message : "UNKNOWN";
      setError(mapCodeToMessage(code));
      setPreview(null);
      setDecisionsByHelpKey({});
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleApplyImport = async () => {
    if (!selectedFile || !preview) return;
    setError(null);
    setIsApplyingImport(true);
    try {
      const body = new FormData();
      body.append("file", selectedFile);
      body.append("fileHash", preview.fileHash);
      body.append(
        "decisions",
        JSON.stringify(
          sortedConflicts.map((conflict) => ({
            helpKey: conflict.helpKey,
            decision: decisionsByHelpKey[conflict.helpKey] ?? "SKIP",
          })),
        ),
      );

      const response = await fetch("/api/help-texts/import-yaml/apply", {
        method: "POST",
        credentials: "include",
        body,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(toErrorCode(payload));
      }
      const payload = (await response.json()) as ImportApplyResponse;
      setResultReport({
        mode: "import",
        createdCount: payload.createdCount,
        silentOverwrittenCount: payload.silentOverwrittenCount,
        decisionOverwrittenCount: payload.decisionOverwrittenCount,
        skippedCount: payload.skippedCount,
      });
      onImportApplied();
    } catch (err) {
      const code = err instanceof Error ? err.message : "UNKNOWN";
      setError(mapCodeToMessage(code));
    } finally {
      setIsApplyingImport(false);
    }
  };

  return (
    <DialogBaseShell
      open={open}
      onOpenChange={handleOpenChange}
      size="xl"
      testId="helptexts-import-export-dialog"
      title="Import/Export Hilfetexte"
      closeDisabled={isExporting || isPreviewLoading || isApplyingImport}
      footer={
        resultReport ? (
          <DialogBaseFooter
            primaryAction={{
              label: "OK",
              onClick: () => handleOpenChange(false),
              testId: "button-helptexts-import-export-report-confirm",
            }}
          />
        ) : (
          <DialogBaseFooter
            secondaryAction={{
              label: "Schließen",
              onClick: () => handleOpenChange(false),
              disabled: isExporting || isPreviewLoading || isApplyingImport,
              testId: "button-helptexts-import-export-close",
            }}
          />
        )
      }
    >

        {resultReport ? (
          <div className="space-y-4" data-testid="helptexts-import-export-report">
            <div className="rounded-md border border-border p-4 bg-white">
              <h3 className="text-sm font-semibold tracking-wide text-slate-600">
                Ergebnis-Report ({resultReport.mode === "import" ? "Import" : "Export"})
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>Neu angelegt: {resultReport.createdCount}</div>
                <div>Still überschrieben: {resultReport.silentOverwrittenCount}</div>
                <div>Per Entscheidung überschrieben: {resultReport.decisionOverwrittenCount}</div>
                <div>Übersprungen: {resultReport.skippedCount}</div>
                {resultReport.mode === "export" && (
                  <div className="col-span-2">Exportierte Einträge: {resultReport.exportedCount ?? 0}</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="rounded-md border border-border p-4 bg-slate-50 space-y-3" data-testid="helptexts-export-section">
              <h3 className="text-sm font-semibold tracking-wide text-slate-600">Export</h3>
              <p className="text-sm text-muted-foreground">
                Exportiert alle Hilfetexte als YAML-Datei (<code>helptexts.yaml</code>).
              </p>
              <Button
                type="button"
                onClick={() => void handleExport()}
                disabled={isExporting || isPreviewLoading || isApplyingImport}
                className="inline-flex items-center gap-2"
                data-testid="button-helptexts-export"
              >
                <Download className="w-4 h-4" />
                {isExporting ? "Export läuft..." : "Export"}
              </Button>
            </section>

            <section className="rounded-md border border-border p-4 bg-slate-50 space-y-3" data-testid="helptexts-import-section">
              <h3 className="text-sm font-semibold tracking-wide text-slate-600">Import</h3>
              <div className="space-y-2">
                <Label htmlFor="helptexts-import-file">YAML-Datei</Label>
                <Input
                  id="helptexts-import-file"
                  type="file"
                  accept=".yaml,.yml,text/yaml,text/x-yaml,application/x-yaml"
                  onChange={(event) => {
                    setSelectedFile(event.target.files?.[0] ?? null);
                    setPreview(null);
                    setDecisionsByHelpKey({});
                    setError(null);
                  }}
                  data-testid="input-helptexts-import-file"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handlePreview()}
                  disabled={!selectedFile || isPreviewLoading || isApplyingImport || isExporting}
                  data-testid="button-helptexts-import-preview"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isPreviewLoading ? "Vorschau läuft..." : "Vorschau laden"}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleApplyImport()}
                  disabled={!preview || isApplyingImport || isPreviewLoading || isExporting}
                  data-testid="button-helptexts-import-apply"
                >
                  {isApplyingImport ? "Import anwenden..." : "Import anwenden"}
                </Button>
              </div>
            </section>

            {preview && (
              <section className="rounded-md border border-border p-4 bg-white min-h-0 flex flex-col gap-3" data-testid="helptexts-import-preview-report">
                <h3 className="text-sm font-semibold tracking-wide text-slate-600">Import-Vorschau</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Gesamt Items: {preview.summary.totalItems}</div>
                  <div>Neu anzulegen: {preview.summary.createCount}</div>
                  <div>Still zu überschreiben: {preview.summary.silentOverwriteCount}</div>
                  <div>Konflikte mit Entscheidung: {preview.summary.conflictCount}</div>
                </div>

                {sortedConflicts.length > 0 && (
                  <div className="overflow-auto border border-border rounded">
                    <table className="w-full text-sm" data-testid="table-helptexts-import-conflicts">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left px-2 py-1">help_key</th>
                          <th className="text-left px-2 py-1">Bestehender Titel</th>
                          <th className="text-left px-2 py-1">Import Titel</th>
                          <th className="text-left px-2 py-1">Entscheidung</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedConflicts.map((conflict) => (
                          <tr key={conflict.helpKey} className="border-t border-border">
                            <td className="px-2 py-1">{conflict.helpKey}</td>
                            <td className="px-2 py-1">{conflict.existingTitle}</td>
                            <td className="px-2 py-1">{conflict.importedTitle}</td>
                            <td className="px-2 py-1">
                              <select
                                value={decisionsByHelpKey[conflict.helpKey] ?? "SKIP"}
                                onChange={(event) =>
                                  setDecisionsByHelpKey((current) => ({
                                    ...current,
                                    [conflict.helpKey]: event.target.value as ConflictDecision,
                                  }))
                                }
                                data-testid={`select-helptexts-conflict-${conflict.helpKey}`}
                                className="border rounded px-2 py-1 bg-white"
                              >
                                <option value="SKIP">Überspringen</option>
                                <option value="OVERWRITE">Überschreiben</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {error && (
              <div data-testid="text-helptexts-import-export-error">
                <DialogBaseInlineMessage
                  title="Aktion fehlgeschlagen"
                  description={error}
                  tone="error"
                />
              </div>
            )}

          </div>
        )}
    </DialogBaseShell>
  );
}
