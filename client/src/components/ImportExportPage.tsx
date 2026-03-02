import { useMemo, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  if (status === "INVALID") return "Ungueltig";
  return "Fehler";
}

export function ImportExportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);

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
      const message = uploadError instanceof Error ? uploadError.message : "Unbekannter Fehler";
      setError(`Import fehlgeschlagen: ${message}`);
      setResult(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="h-full min-h-0 rounded-lg border-2 border-foreground bg-white p-6 flex flex-col gap-6" data-testid="import-export-page">
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Import/Export</h2>
      </div>

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
          {isUploading ? "Import laeuft..." : "CSV importieren"}
        </Button>

        {error && (
          <p className="text-sm text-red-600" data-testid="text-employee-import-error">
            {error}
          </p>
        )}
      </section>

      <section className="rounded-md border border-border p-4 bg-slate-50 space-y-2" data-testid="export-section">
        <h3 className="text-sm font-semibold tracking-wide text-slate-600">Export</h3>
        <p className="text-sm text-slate-500">Noch nicht implementiert.</p>
      </section>

      {result && (
        <section className="rounded-md border border-border p-4 bg-white min-h-0 flex flex-col gap-3" data-testid="import-report-section">
          <h3 className="text-sm font-semibold tracking-wide text-slate-600">Import-Report</h3>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div>Gesamt: {result.summary.totalRows}</div>
            <div>Importiert: {result.summary.importedRows}</div>
            <div>Duplikate: {result.summary.duplicateRows}</div>
            <div>Ungueltig: {result.summary.invalidRows}</div>
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
