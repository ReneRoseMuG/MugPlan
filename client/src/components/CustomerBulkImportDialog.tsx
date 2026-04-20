import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type CustomerAnalyzeItem = {
  id: string;
  fileName: string;
  customerNumber: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  city: string | null;
};

type CustomerAnalyzeDuplicateItem = CustomerAnalyzeItem & {
  existingCustomerId: number;
};

type CustomerAnalyzeResponse = {
  bulkImportSessionId: string;
  newCustomers: CustomerAnalyzeItem[];
  duplicates: CustomerAnalyzeDuplicateItem[];
  errors: Array<{ fileName: string; reason: string }>;
  log: Array<{ fileName: string; status: string }>;
  limits: {
    maxFiles: number;
    maxFileSizeBytes: number;
    maxTotalBytes: number;
  };
};

interface CustomerBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerBulkImportDialog({ open, onOpenChange }: CustomerBulkImportDialogProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CustomerAnalyzeResponse | null>(null);
  const [selectedNewIds, setSelectedNewIds] = useState<string[]>([]);
  const [selectedDuplicateIds, setSelectedDuplicateIds] = useState<string[]>([]);
  const [applyingNew, setApplyingNew] = useState(false);
  const [applyingDuplicates, setApplyingDuplicates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setAnalyzing(false);
      setResult(null);
      setSelectedNewIds([]);
      setSelectedDuplicateIds([]);
      setApplyingNew(false);
      setApplyingDuplicates(false);
      setError(null);
    }
  }, [open]);

  const selectedFileCount = useMemo(() => files.length, [files]);

  const runAnalyze = async () => {
    if (files.length === 0) return;
    setAnalyzing(true);
    setError(null);
    try {
      const body = new FormData();
      for (const file of files) {
        body.append("files", file);
      }
      const response = await fetch("/api/admin/customers/bulk-import/analyze", {
        method: "POST",
        credentials: "include",
        body,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Analyse fehlgeschlagen");
      }
      const analyzeResult = payload as CustomerAnalyzeResponse;
      setResult(analyzeResult);
      setSelectedNewIds(analyzeResult.newCustomers.map((row) => row.id));
      setSelectedDuplicateIds(analyzeResult.duplicates.map((row) => row.id));
      toast({
        title: "Analyse abgeschlossen",
        description: `Neu: ${analyzeResult.newCustomers.length}, Duplikate: ${analyzeResult.duplicates.length}, Fehler: ${analyzeResult.errors.length}`,
      });
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : "Analyse fehlgeschlagen");
    } finally {
      setAnalyzing(false);
    }
  };

  const applyNew = async () => {
    if (!result || selectedNewIds.length === 0) return;
    setApplyingNew(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/customers/bulk-import/apply-new", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bulkImportSessionId: result.bulkImportSessionId,
          selectedIds: selectedNewIds,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Übernahme fehlgeschlagen");
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/customers/list"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/customers", { scope: "active" }] });
      await queryClient.invalidateQueries({ queryKey: ["/api/customers", { scope: "inactive" }] });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects?filter=all&scope=all"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects/list"] });
      toast({ title: "Kundenimport übernommen" });
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Übernahme fehlgeschlagen");
    } finally {
      setApplyingNew(false);
    }
  };

  const applyDuplicates = async () => {
    if (!result || selectedDuplicateIds.length === 0) return;
    setApplyingDuplicates(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/customers/bulk-import/apply-duplicates", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bulkImportSessionId: result.bulkImportSessionId,
          selectedIds: selectedDuplicateIds,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Duplikat-Update fehlgeschlagen");
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/customers/list"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/customers", { scope: "active" }] });
      await queryClient.invalidateQueries({ queryKey: ["/api/customers", { scope: "inactive" }] });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects?filter=all&scope=all"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects/list"] });
      toast({ title: "Duplikatdaten aktualisiert" });
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Duplikat-Update fehlgeschlagen");
    } finally {
      setApplyingDuplicates(false);
    }
  };

  const toggle = (collection: string[], id: string, setter: (next: string[]) => void) => {
    setter(collection.includes(id) ? collection.filter((item) => item !== id) : [...collection, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Kunden</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 rounded-md border border-border p-3">
          <Label htmlFor="customer-bulk-files">PDF-Ordner/Dateien</Label>
          <Input
            id="customer-bulk-files"
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          <div className="text-xs text-muted-foreground">Ausgewählte Dateien: {selectedFileCount}</div>
          {result ? (
            <div className="text-xs text-muted-foreground">
              Limits: max {result.limits.maxFiles} Dateien, max {(result.limits.maxFileSizeBytes / (1024 * 1024)).toFixed(0)} MB pro Datei
            </div>
          ) : null}
          <Button onClick={() => void runAnalyze()} disabled={files.length === 0 || analyzing}>
            {analyzing ? "Analysiere..." : "Analyse starten"}
          </Button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {result ? (
          <div className="space-y-4">
            <section className="rounded-md border border-border p-3 space-y-2">
              <h3 className="text-sm font-semibold">A - Neu importierte Kunden</h3>
              {result.newCustomers.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedNewIds.includes(row.id)}
                    onChange={() => toggle(selectedNewIds, row.id, setSelectedNewIds)}
                  />
                  <span>{row.customerNumber} - {row.lastName ?? row.company ?? "Unbekannt"} ({row.fileName})</span>
                </label>
              ))}
              <Button onClick={() => void applyNew()} disabled={selectedNewIds.length === 0 || applyingNew}>
                {applyingNew ? "Übernehme..." : "Kundenimport übernehmen"}
              </Button>
            </section>

            <section className="rounded-md border border-border p-3 space-y-2">
              <h3 className="text-sm font-semibold">B - Duplikate</h3>
              {result.duplicates.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedDuplicateIds.includes(row.id)}
                    onChange={() => toggle(selectedDuplicateIds, row.id, setSelectedDuplicateIds)}
                  />
                  <span>{row.customerNumber} (Bestand #{row.existingCustomerId}) - {row.fileName}</span>
                </label>
              ))}
              <Button onClick={() => void applyDuplicates()} disabled={selectedDuplicateIds.length === 0 || applyingDuplicates}>
                {applyingDuplicates ? "Aktualisiere..." : "Duplikate aktualisieren"}
              </Button>
            </section>

            <section className="rounded-md border border-border p-3 space-y-2">
              <h3 className="text-sm font-semibold">C - Extraktionsfehler</h3>
              {result.errors.length === 0 ? <p className="text-sm text-muted-foreground">Keine</p> : result.errors.map((row) => (
                <p key={`${row.fileName}-${row.reason}`} className="text-sm">{row.fileName}: {row.reason}</p>
              ))}
            </section>

            <section className="rounded-md border border-border p-3 space-y-2">
              <h3 className="text-sm font-semibold">D - Log</h3>
              {result.log.map((row) => (
                <p key={`${row.fileName}-${row.status}`} className="text-sm">{row.fileName}: {row.status}</p>
              ))}
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
