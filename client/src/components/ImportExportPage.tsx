import { useEffect, useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogBaseInlineMessage } from "@/components/ui/dialog-base";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeServerError } from "@/lib/error-normalization";
import { queryClient } from "@/lib/queryClient";

type ImportRowStatus = "IMPORTED" | "DUPLICATE" | "INVALID" | "ERROR";

type ImportRow = {
  lineNumber: number;
  firstName: string;
  lastName: string;
  status: ImportRowStatus;
  message: string;
};

type ImportResponse = {
  summary: {
    totalRows: number;
    importedRows: number;
    duplicateRows: number;
    invalidRows: number;
    errorRows: number;
  };
  rows: ImportRow[];
};

function statusLabel(status: ImportRowStatus): string {
  if (status === "IMPORTED") return "Importiert";
  if (status === "DUPLICATE") return "Duplikat";
  if (status === "INVALID") return "Ungültig";
  return "Fehler";
}

type EmployeeImportPanelProps = {
  resetSignal?: number;
};

export function EmployeeImportPanel({ resetSignal = 0 }: EmployeeImportPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);

  useEffect(() => {
    setSelectedFile(null);
    setError(null);
    setResult(null);
    setIsUploading(false);
  }, [resetSignal]);

  const sortedRows = useMemo(() => {
    if (!result) return [];
    return [...result.rows].sort((a, b) => a.lineNumber - b.lineNumber);
  }, [result]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("file", selectedFile);

      const response = await fetch("/api/employees/import-csv", {
        method: "POST",
        body,
        credentials: "include",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const code = typeof payload?.code === "string" ? payload.code : "UNKNOWN";
        throw new Error(code);
      }

      const payload = (await response.json()) as ImportResponse;
      setResult(payload);
      await queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/employees",
      });
      await queryClient.refetchQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/employees",
        type: "active",
      });
    } catch (uploadError) {
      const normalized = normalizeServerError(uploadError, {
        title: "Import fehlgeschlagen",
      });
      setError(normalized.description);
      setResult(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4" data-testid="employee-import-panel">
      <section className="rounded-md border border-border p-4 bg-slate-50 space-y-3" data-testid="import-section">
        <h3 className="text-sm font-semibold tracking-wide text-slate-600">CSV-Import Mitarbeiter</h3>
        <div className="space-y-2">
          <Label htmlFor="employee-import-file">CSV-Datei</Label>
          <Input
            id="employee-import-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            data-testid="input-employee-import-file"
          />
        </div>
        <Button
          type="button"
          onClick={() => void handleUpload()}
          disabled={!selectedFile || isUploading}
          className="inline-flex items-center gap-2"
          data-testid="button-employee-import-upload"
        >
          <Upload className="w-4 h-4" />
          {isUploading ? "Import läuft..." : "CSV importieren"}
        </Button>

        {error && (
          <div data-testid="text-employee-import-error">
            <DialogBaseInlineMessage title="Import fehlgeschlagen" description={error} tone="error" />
          </div>
        )}
      </section>

      {result && (
        <section className="rounded-md border border-border p-4 bg-white min-h-0 flex flex-col gap-3" data-testid="import-report-section">
          <h3 className="text-sm font-semibold tracking-wide text-slate-600">Import-Report</h3>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div>Gesamt: {result.summary.totalRows}</div>
            <div>Importiert: {result.summary.importedRows}</div>
            <div>Duplikate: {result.summary.duplicateRows}</div>
            <div>Ungültig: {result.summary.invalidRows}</div>
            <div>Fehler: {result.summary.errorRows}</div>
          </div>
          <div className="overflow-auto border border-border rounded">
            <table className="w-full text-sm" data-testid="table-import-report">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-2 py-1">Zeile</th>
                  <th className="text-left px-2 py-1">Vorname</th>
                  <th className="text-left px-2 py-1">Nachname</th>
                  <th className="text-left px-2 py-1">Status</th>
                  <th className="text-left px-2 py-1">Meldung</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={`${row.lineNumber}-${row.firstName}-${row.lastName}-${row.status}`} className="border-t border-border">
                    <td className="px-2 py-1">{row.lineNumber}</td>
                    <td className="px-2 py-1">{row.firstName}</td>
                    <td className="px-2 py-1">{row.lastName}</td>
                    <td className="px-2 py-1">{statusLabel(row.status)}</td>
                    <td className="px-2 py-1">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
