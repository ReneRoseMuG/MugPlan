import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SeedPanel } from "@/components/ui/seed-panel";
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
  "/api/project-status?active=all",
  "/api/note-templates?active=false",
  "/api/help-texts",
  "/api/employees?scope=inactive",
  "/api/employees?scope=active",
];

const SEED_STATUS_QUERY_KEYS = [
  "/api/admin/master-data/seed/employees",
  "/api/admin/master-data/seed/help-texts",
  "/api/admin/master-data/seed/product-management",
  "/api/admin/master-data/seed/project-status",
  "/api/admin/master-data/seed/note-templates",
];

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
  const employeesStatusQuery = useQuery<SeedStatusResponse>({ queryKey: ["/api/admin/master-data/seed/employees"], queryFn: () => fetchJson("/api/admin/master-data/seed/employees") });
  const helpTextsStatusQuery = useQuery<SeedStatusResponse>({ queryKey: ["/api/admin/master-data/seed/help-texts"], queryFn: () => fetchJson("/api/admin/master-data/seed/help-texts") });
  const productManagementStatusQuery = useQuery<SeedStatusResponse>({ queryKey: ["/api/admin/master-data/seed/product-management"], queryFn: () => fetchJson("/api/admin/master-data/seed/product-management") });
  const projectStatusStatusQuery = useQuery<SeedStatusResponse>({ queryKey: ["/api/admin/master-data/seed/project-status"], queryFn: () => fetchJson("/api/admin/master-data/seed/project-status") });
  const noteTemplatesStatusQuery = useQuery<SeedStatusResponse>({ queryKey: ["/api/admin/master-data/seed/note-templates"], queryFn: () => fetchJson("/api/admin/master-data/seed/note-templates") });

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
  const projectStatusApplyMutation = useSeedMutation("project-status", "Projekt Status", "/api/admin/master-data/seed/project-status/apply", "importiert");
  const projectStatusExportMutation = useSeedMutation("project-status", "Projekt Status", "/api/admin/master-data/seed/project-status/export", "exportiert");
  const noteTemplatesApplyMutation = useSeedMutation("note-templates", "Notiz Vorlagen", "/api/admin/master-data/seed/note-templates/apply", "importiert");
  const noteTemplatesExportMutation = useSeedMutation("note-templates", "Notiz Vorlagen", "/api/admin/master-data/seed/note-templates/export", "exportiert");

  const panelDefinitions = [
    { key: "employees", title: "Mitarbeiter", description: "Verwaltet employees.csv mit Vorname, Nachname und IsActive.", status: employeesStatusQuery.data, applyMutation: employeesApplyMutation, exportMutation: employeesExportMutation },
    { key: "help-texts", title: "Hilfetexte", description: "Verwaltet helptexts.yaml im bestehenden Hilfetext-Import/Export-Format.", status: helpTextsStatusQuery.data, applyMutation: helpTextsApplyMutation, exportMutation: helpTextsExportMutation },
    { key: "product-management", title: "Produktverwaltung", description: "Verwaltet products.csv und components.csv und stellt Standardkategorien sicher.", status: productManagementStatusQuery.data, applyMutation: productManagementApplyMutation, exportMutation: productManagementExportMutation },
    { key: "project-status", title: "Projekt Status", description: "Verwaltet projectstates.csv mit Name, Farbe und Status.", status: projectStatusStatusQuery.data, applyMutation: projectStatusApplyMutation, exportMutation: projectStatusExportMutation },
    { key: "note-templates", title: "Notiz Vorlagen", description: "Verwaltet notetemplates.csv mit Inhalt, Farbe, Drucken, Sortierung und Status.", status: noteTemplatesStatusQuery.data, applyMutation: noteTemplatesApplyMutation, exportMutation: noteTemplatesExportMutation },
  ] as const;

  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="master-data-seed-page">
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
            logLines={logLines}
            testId={`master-data-seed-${panel.key}`}
          />
        );
      })}
    </div>
  );
}
