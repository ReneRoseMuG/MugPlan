import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SeedPanel } from "@/components/ui/seed-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SeedRunResponse = {
  sourceFile: string;
  exists: boolean;
  logLines: string[];
};

type SeedStatusResponse = {
  sourceFile: string;
  exists: boolean;
  extraFiles?: Array<{
    sourceFile: string;
    exists: boolean;
  }>;
};

const MASTER_DATA_QUERY_KEYS = [
  "/api/admin/master-data/product-categories?active=all",
  "/api/admin/master-data/component-categories?active=all",
  "/api/admin/master-data/products?active=all",
  "/api/admin/master-data/components?active=all",
  "/api/admin/master-data/tags",
  "/api/note-templates",
  "/api/note-templates?active=false",
  "/api/help-texts",
  "/api/employees?scope=inactive",
  "/api/employees?scope=active",
  "/api/tours",
];

const SEED_STATUS_QUERY_KEYS = [
  "/api/admin/master-data/seed/employees",
  "/api/admin/master-data/seed/help-texts",
  "/api/admin/master-data/seed/product-management",
  "/api/admin/master-data/seed/note-templates",
  "/api/admin/master-data/seed/tags",
  "/api/admin/master-data/seed/tours",
  "/api/admin/master-data/seed/users",
];

const GLOBAL_SEED_SEQUENCE = [
  { name: "Tags", applyUrl: "/api/admin/master-data/seed/tags/apply", exportUrl: "/api/admin/master-data/seed/tags/export" },
  { name: "Touren", applyUrl: "/api/admin/master-data/seed/tours/apply", exportUrl: "/api/admin/master-data/seed/tours/export" },
  { name: "Mitarbeiter", applyUrl: "/api/admin/master-data/seed/employees/apply", exportUrl: "/api/admin/master-data/seed/employees/export" },
  { name: "Hilfetexte", applyUrl: "/api/admin/master-data/seed/help-texts/apply", exportUrl: "/api/admin/master-data/seed/help-texts/export" },
  { name: "Notiz Vorlagen", applyUrl: "/api/admin/master-data/seed/note-templates/apply", exportUrl: "/api/admin/master-data/seed/note-templates/export" },
  { name: "Produktverwaltung", applyUrl: "/api/admin/master-data/seed/product-management/apply", exportUrl: "/api/admin/master-data/seed/product-management/export" },
  { name: "Users", applyUrl: "/api/admin/master-data/seed/users/apply", exportUrl: "/api/admin/master-data/seed/users/export" },
] as const;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed for ${url}`);
  }
  return response.json() as Promise<T>;
}

async function invalidateSeedQueries() {
  await Promise.all(
    [...MASTER_DATA_QUERY_KEYS, ...SEED_STATUS_QUERY_KEYS].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
  );
}

export function MasterDataSeedPage() {
  const { toast } = useToast();
  const [logLinesByPanel, setLogLinesByPanel] = useState<Record<string, string[]>>({});
  const [globalIsRunning, setGlobalIsRunning] = useState(false);
  const [globalIsExporting, setGlobalIsExporting] = useState(false);
  const [globalLogLines, setGlobalLogLines] = useState<string[]>([]);

  const employeesStatusQuery = useQuery<SeedStatusResponse>({ queryKey: ["/api/admin/master-data/seed/employees"], queryFn: () => fetchJson("/api/admin/master-data/seed/employees") });
  const helpTextsStatusQuery = useQuery<SeedStatusResponse>({ queryKey: ["/api/admin/master-data/seed/help-texts"], queryFn: () => fetchJson("/api/admin/master-data/seed/help-texts") });
  const productManagementStatusQuery = useQuery<SeedStatusResponse>({ queryKey: ["/api/admin/master-data/seed/product-management"], queryFn: () => fetchJson("/api/admin/master-data/seed/product-management") });
  const noteTemplatesStatusQuery = useQuery<SeedStatusResponse>({ queryKey: ["/api/admin/master-data/seed/note-templates"], queryFn: () => fetchJson("/api/admin/master-data/seed/note-templates") });
  const tagsStatusQuery = useQuery<SeedStatusResponse>({ queryKey: ["/api/admin/master-data/seed/tags"], queryFn: () => fetchJson("/api/admin/master-data/seed/tags") });
  const toursStatusQuery = useQuery<SeedStatusResponse>({ queryKey: ["/api/admin/master-data/seed/tours"], queryFn: () => fetchJson("/api/admin/master-data/seed/tours") });
  const usersStatusQuery = useQuery<SeedStatusResponse>({ queryKey: ["/api/admin/master-data/seed/users"], queryFn: () => fetchJson("/api/admin/master-data/seed/users") });

  function useSeedMutation(panelKey: string, title: string, url: string, successTitle: string) {
    return useMutation({
      mutationFn: async () => {
        const response = await apiRequest("POST", url, {});
        return response.json() as Promise<SeedRunResponse>;
      },
      onSuccess: async (result) => {
        setLogLinesByPanel((current) => ({ ...current, [panelKey]: result.logLines }));
        await invalidateSeedQueries();
        toast({ title: `${title} ${successTitle}` });
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : `${title} fehlgeschlagen.`;
        setLogLinesByPanel((current) => ({ ...current, [panelKey]: [...(current[panelKey] ?? []), `Fehler: ${message}`] }));
        toast({ title: `${title} fehlgeschlagen`, variant: "destructive" });
      },
    });
  }

  const employeesApplyMutation = useSeedMutation("employees", "Mitarbeiter", "/api/admin/master-data/seed/employees/apply", "importiert");
  const employeesExportMutation = useSeedMutation("employees", "Mitarbeiter", "/api/admin/master-data/seed/employees/export", "exportiert");
  const helpTextsApplyMutation = useSeedMutation("help-texts", "Hilfetexte", "/api/admin/master-data/seed/help-texts/apply", "importiert");
  const helpTextsExportMutation = useSeedMutation("help-texts", "Hilfetexte", "/api/admin/master-data/seed/help-texts/export", "exportiert");
  const productManagementApplyMutation = useSeedMutation("product-management", "Produktverwaltung", "/api/admin/master-data/seed/product-management/apply", "importiert");
  const productManagementExportMutation = useSeedMutation("product-management", "Produktverwaltung", "/api/admin/master-data/seed/product-management/export", "exportiert");
  const noteTemplatesApplyMutation = useSeedMutation("note-templates", "Notiz Vorlagen", "/api/admin/master-data/seed/note-templates/apply", "importiert");
  const noteTemplatesExportMutation = useSeedMutation("note-templates", "Notiz Vorlagen", "/api/admin/master-data/seed/note-templates/export", "exportiert");
  const tagsApplyMutation = useSeedMutation("tags", "Tags", "/api/admin/master-data/seed/tags/apply", "importiert");
  const tagsExportMutation = useSeedMutation("tags", "Tags", "/api/admin/master-data/seed/tags/export", "exportiert");
  const toursApplyMutation = useSeedMutation("tours", "Touren", "/api/admin/master-data/seed/tours/apply", "importiert");
  const toursExportMutation = useSeedMutation("tours", "Touren", "/api/admin/master-data/seed/tours/export", "exportiert");
  const usersApplyMutation = useSeedMutation("users", "Users", "/api/admin/master-data/seed/users/apply", "importiert");
  const usersExportMutation = useSeedMutation("users", "Users", "/api/admin/master-data/seed/users/export", "exportiert");

  async function runGlobalImport() {
    setGlobalIsRunning(true);
    setGlobalLogLines([]);
    const log: string[] = [];
    for (const step of GLOBAL_SEED_SEQUENCE) {
      log.push(`[START] Import: ${step.name}`);
      setGlobalLogLines([...log]);
      try {
        await apiRequest("POST", step.applyUrl, {});
        log.push(`[OK]    Import: ${step.name}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
        log.push(`[FEHLER] Import: ${step.name} \u2013 ${msg}`);
      }
      setGlobalLogLines([...log]);
    }
    log.push("[FERTIG] Globaler Import abgeschlossen.");
    setGlobalLogLines([...log]);
    await invalidateSeedQueries();
    setGlobalIsRunning(false);
  }

  async function runGlobalExport() {
    setGlobalIsExporting(true);
    setGlobalLogLines([]);
    const log: string[] = [];
    for (const step of GLOBAL_SEED_SEQUENCE) {
      log.push(`[START] Export: ${step.name}`);
      setGlobalLogLines([...log]);
      try {
        await apiRequest("POST", step.exportUrl, {});
        log.push(`[OK]    Export: ${step.name}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
        log.push(`[FEHLER] Export: ${step.name} \u2013 ${msg}`);
      }
      setGlobalLogLines([...log]);
    }
    log.push("[FERTIG] Globaler Export abgeschlossen.");
    setGlobalLogLines([...log]);
    await invalidateSeedQueries();
    setGlobalIsExporting(false);
  }

  const panelDefinitions = [
    { key: "employees", title: "Mitarbeiter", description: "Verwaltet employees.csv mit Vorname, Nachname und IsActive.", status: employeesStatusQuery.data, applyMutation: employeesApplyMutation, exportMutation: employeesExportMutation },
    { key: "help-texts", title: "Hilfetexte", description: "Verwaltet helptexts.yaml im bestehenden Hilfetext-Import/Export-Format.", status: helpTextsStatusQuery.data, applyMutation: helpTextsApplyMutation, exportMutation: helpTextsExportMutation },
    { key: "product-management", title: "Produktverwaltung", description: "Verwaltet product-categories.csv, component-categories.csv, products.csv und components.csv fuer Kategorien, Produkte und Komponenten.", status: productManagementStatusQuery.data, applyMutation: productManagementApplyMutation, exportMutation: productManagementExportMutation },
    { key: "note-templates", title: "Notiz Vorlagen", description: "Verwaltet notetemplates.csv mit Inhalt, Farbe, Drucken, Sortierung und Status.", status: noteTemplatesStatusQuery.data, applyMutation: noteTemplatesApplyMutation, exportMutation: noteTemplatesExportMutation },
    { key: "tags", title: "Tags", description: "Verwaltet tags.csv mit Name und Farbe fuer den Tag-Stammdatenbestand.", status: tagsStatusQuery.data, applyMutation: tagsApplyMutation, exportMutation: tagsExportMutation },
    { key: "tours", title: "Touren", description: "Verwaltet tours.csv mit Name und Farbe fuer den Touren-Stammdatenbestand.", status: toursStatusQuery.data, applyMutation: toursApplyMutation, exportMutation: toursExportMutation },
    { key: "users", title: "Users", description: "Verwaltet users.csv mit Username, E-Mail, Vor-/Nachname, Rolle und Passwort. Passwort wird beim Export leer gelassen.", status: usersStatusQuery.data, applyMutation: usersApplyMutation, exportMutation: usersExportMutation },
  ] as const;

  const globalBusy = globalIsRunning || globalIsExporting;

  return (
    <div className="flex flex-col gap-6" data-testid="master-data-seed-page">
      <section className="sub-panel flex flex-col gap-4" data-testid="master-data-seed-global">
        <h3 className="text-sm font-bold tracking-wider text-primary">Globaler Seed</h3>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => void runGlobalImport()}
            disabled={globalBusy}
            data-testid="button-global-import"
          >
            {globalIsRunning ? "Import laeuft..." : "Alle importieren"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void runGlobalExport()}
            disabled={globalBusy}
            data-testid="button-global-export"
          >
            {globalIsExporting ? "Export laeuft..." : "Alle exportieren"}
          </Button>
        </div>
        <Textarea
          readOnly
          value={globalLogLines.join("\n")}
          className="max-h-[200px] resize-none bg-white font-mono text-xs"
          data-testid="textarea-global-seed"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {panelDefinitions.map((panel) => {
          const status = panel.status;
          const extraFiles = status?.extraFiles ?? [];
          const logLines = [
            ...(extraFiles.map((file) => `Zusatzdatei ${file.sourceFile}: ${file.exists ? "vorhanden" : "fehlt"}`)),
            ...(logLinesByPanel[panel.key] ?? []),
          ];
          return (
            <SeedPanel
              key={panel.key}
              title={panel.title}
              description={panel.description}
              sourceFile={status?.sourceFile ?? "-"}
              sourceExists={status?.exists ?? false}
              onRun={async () => {
                await panel.applyMutation.mutateAsync();
              }}
              onExport={async () => {
                await panel.exportMutation.mutateAsync();
              }}
              isRunning={panel.applyMutation.isPending}
              isExporting={panel.exportMutation.isPending}
              disabled={globalBusy}
              logLines={logLines}
              testId={`master-data-seed-${panel.key}`}
            />
          );
        })}
      </div>
    </div>
  );
}
