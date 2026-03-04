import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ProjectAnalyzeItem = {
  id: string;
  fileName: string;
  orderNumber: string;
  title: string;
  customerNumber: string;
  customerName: string | null;
  articleListHtml: string;
};

type ProjectAnalyzeDuplicateItem = ProjectAnalyzeItem & {
  existingProjectId: number;
};

type ProjectAnalyzeSpecialItem = ProjectAnalyzeItem & {
  extractedCustomer: {
    customerNumber: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
    city: string | null;
  };
};

type ProjectAnalyzeResponse = {
  bulkImportSessionId: string;
  newProjects: ProjectAnalyzeItem[];
  duplicates: ProjectAnalyzeDuplicateItem[];
  specialCases: ProjectAnalyzeSpecialItem[];
  errors: Array<{ fileName: string; reason: string }>;
  log: Array<{ fileName: string; status: string }>;
  limits: {
    maxFiles: number;
    maxFileSizeBytes: number;
    maxTotalBytes: number;
  };
};

interface ProjectBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectBulkImportDialog({ open, onOpenChange }: ProjectBulkImportDialogProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ProjectAnalyzeResponse | null>(null);
  const [selectedNewIds, setSelectedNewIds] = useState<string[]>([]);
  const [applyingNew, setApplyingNew] = useState(false);
  const [applyingSpecialId, setApplyingSpecialId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setAnalyzing(false);
      setResult(null);
      setSelectedNewIds([]);
      setApplyingNew(false);
      setApplyingSpecialId(null);
      setError(null);
    }
  }, [open]);

  const selectedFileCount = useMemo(() => files.length, [files]);

  const invalidateQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/projects?filter=all&scope=all"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/customers", { scope: "active" }] });
    await queryClient.invalidateQueries({ queryKey: ["/api/customers", { scope: "inactive" }] });
  };

  const runAnalyze = async () => {
    if (files.length === 0) return;
    setAnalyzing(true);
    setError(null);
    try {
      const body = new FormData();
      for (const file of files) {
        body.append("files", file);
      }
      const response = await fetch("/api/admin/projects/bulk-import/analyze", {
        method: "POST",
        credentials: "include",
        body,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Analyse fehlgeschlagen");
      }
      const analyzeResult = payload as ProjectAnalyzeResponse;
      setResult(analyzeResult);
      setSelectedNewIds(analyzeResult.newProjects.map((row) => row.id));
      toast({
        title: "Analyse abgeschlossen",
        description: `Neu: ${analyzeResult.newProjects.length}, Duplikate: ${analyzeResult.duplicates.length}, Sonderfaelle: ${analyzeResult.specialCases.length}, Fehler: ${analyzeResult.errors.length}`,
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
      const response = await fetch("/api/admin/projects/bulk-import/apply-new", {
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
        throw new Error(payload?.message ?? "Uebernahme fehlgeschlagen");
      }
      await invalidateQueries();
      toast({ title: "Neue Projekte uebernommen" });
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Uebernahme fehlgeschlagen");
    } finally {
      setApplyingNew(false);
    }
  };

  const applySpecialCase = async (id: string) => {
    if (!result) return;
    setApplyingSpecialId(id);
    setError(null);
    try {
      const response = await fetch("/api/admin/projects/bulk-import/apply-special-case", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bulkImportSessionId: result.bulkImportSessionId,
          id,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Sonderfall konnte nicht uebernommen werden");
      }
      await invalidateQueries();
      toast({ title: "Sonderfall uebernommen" });
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Sonderfall konnte nicht uebernommen werden");
    } finally {
      setApplyingSpecialId(null);
    }
  };

  const toggleNewId = (id: string) => {
    setSelectedNewIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Projekte</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 rounded-md border border-border p-3">
          <Label htmlFor="project-bulk-files">PDF-Ordner/Dateien</Label>
          <Input
            id="project-bulk-files"
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          <div className="text-xs text-muted-foreground">Ausgewaehlte Dateien: {selectedFileCount}</div>
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
              <h3 className="text-sm font-semibold">A - Neue Projekte</h3>
              {result.newProjects.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedNewIds.includes(row.id)}
                    onChange={() => toggleNewId(row.id)}
                  />
                  <span>{row.orderNumber} - {row.title} ({row.fileName})</span>
                </label>
              ))}
              <Button onClick={() => void applyNew()} disabled={selectedNewIds.length === 0 || applyingNew}>
                {applyingNew ? "Uebernehme..." : "Neue Projekte uebernehmen"}
              </Button>
            </section>

            <section className="rounded-md border border-border p-3 space-y-2">
              <h3 className="text-sm font-semibold">B - Duplikate</h3>
              {result.duplicates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine</p>
              ) : (
                result.duplicates.map((row) => (
                  <p key={row.id} className="text-sm">
                    {row.orderNumber} (Bestandsprojekt #{row.existingProjectId}) - {row.fileName}
                  </p>
                ))
              )}
            </section>

            <section className="rounded-md border border-border p-3 space-y-2">
              <h3 className="text-sm font-semibold">C - Sonderfaelle (Kunde fehlt)</h3>
              {result.specialCases.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine</p>
              ) : (
                result.specialCases.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>{row.customerNumber} / {row.orderNumber} - {row.title} ({row.fileName})</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void applySpecialCase(row.id)}
                      disabled={applyingSpecialId !== null}
                    >
                      {applyingSpecialId === row.id ? "Uebernehme..." : "Sonderfall uebernehmen"}
                    </Button>
                  </div>
                ))
              )}
            </section>

            <section className="rounded-md border border-border p-3 space-y-2">
              <h3 className="text-sm font-semibold">D - Extraktionsfehler</h3>
              {result.errors.length === 0 ? <p className="text-sm text-muted-foreground">Keine</p> : result.errors.map((row) => (
                <p key={`${row.fileName}-${row.reason}`} className="text-sm">{row.fileName}: {row.reason}</p>
              ))}
            </section>

            <section className="rounded-md border border-border p-3 space-y-2">
              <h3 className="text-sm font-semibold">E - Log</h3>
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
