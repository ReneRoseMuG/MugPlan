import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { SeedPanel } from "@/components/ui/seed-panel";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SeedRunResponse = {
  logLines: string[];
};

const PRODUCT_SEED_QUERY_KEYS = [
  "/api/admin/master-data/product-categories?active=all",
  "/api/admin/master-data/component-categories?active=all",
  "/api/admin/master-data/products?active=all",
  "/api/admin/master-data/components?active=all",
];

async function invalidateSeedQueries() {
  await Promise.all(
    PRODUCT_SEED_QUERY_KEYS.map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
  );
}

export function MasterDataSeedPage() {
  const { toast } = useToast();
  const [productManagementLogLines, setProductManagementLogLines] = useState<string[]>([]);

  const productManagementSeedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/master-data/seed/product-management", {});
      return response.json() as Promise<SeedRunResponse>;
    },
    onSuccess: async (result) => {
      setProductManagementLogLines(result.logLines);
      await invalidateSeedQueries();
      toast({ title: "Produktverwaltung Seed ausgefuehrt" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Produktverwaltung Seed fehlgeschlagen.";
      setProductManagementLogLines((current) => [...current, `Fehler: ${message}`]);
      toast({
        title: "Produktverwaltung Seed fehlgeschlagen",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="master-data-seed-page">
      <SeedPanel
        title="Mitarbeiter"
        description="Noch nicht implementiert."
        isRunning={false}
        logLines={[]}
        disabled
        testId="master-data-seed-employees"
      />
      <SeedPanel
        title="Hilfetexte"
        description="Noch nicht implementiert."
        isRunning={false}
        logLines={[]}
        disabled
        testId="master-data-seed-help-texts"
      />
      <SeedPanel
        title="Produktverwaltung"
        description="Erzeugt die Standard-Produkt- und Komponenten-Kategorien idempotent."
        onRun={async () => {
          await productManagementSeedMutation.mutateAsync();
        }}
        isRunning={productManagementSeedMutation.isPending}
        logLines={productManagementLogLines}
        testId="master-data-seed-product-management"
      />
      <SeedPanel
        title="Projekt Status"
        description="Noch nicht implementiert."
        isRunning={false}
        logLines={[]}
        disabled
        testId="master-data-seed-project-status"
      />
      <SeedPanel
        title="Notiz Vorlagen"
        description="Noch nicht implementiert."
        isRunning={false}
        logLines={[]}
        disabled
        testId="master-data-seed-note-templates"
      />
    </div>
  );
}
