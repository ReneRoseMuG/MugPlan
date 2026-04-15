import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Component, ComponentCategory, Product, ProductCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyMiningResult,
  mergeMiningAnalyzeResponses,
  partitionMiningFiles,
  type MiningAnalyzeResponse,
  type MiningArticleItem,
  type MiningLimits,
} from "@/lib/masterDataPdfMining";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ActiveScope = "all";
const MINING_RESULT_STORAGE_KEY = "master-data-pdf-mining-result";
type AnalyzeProgress = {
  totalBatches: number;
  currentBatch: number;
  processedFiles: number;
  totalFiles: number;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  const payload = await parseJsonResponse<T>(response, url);
  if (!response.ok) {
    throw new Error(extractResponseMessage(payload, `Request failed for ${url}`));
  }
  return payload;
}

async function parseJsonResponse<T>(response: Response, context: string): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`Leere Antwort für ${context}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Ungültige Serverantwort für ${context}`);
  }
}

function extractResponseMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

async function invalidateMasterDataQueries(activeScope: ActiveScope): Promise<void> {
  const urls = [
    `/api/admin/master-data/product-categories?active=${activeScope}`,
    `/api/admin/master-data/component-categories?active=${activeScope}`,
    `/api/admin/master-data/products?active=${activeScope}`,
    `/api/admin/master-data/components?active=${activeScope}`,
    "/api/admin/master-data/products?active=all",
    "/api/admin/master-data/components?active=all",
  ];
  await Promise.all(urls.map((url) => queryClient.invalidateQueries({ queryKey: [url] })));
}

function extractApiCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const start = error.message.indexOf("{");
  if (start < 0) return null;
  try {
    const payload = JSON.parse(error.message.slice(start)) as { code?: unknown };
    return typeof payload.code === "string" ? payload.code : null;
  } catch {
    return null;
  }
}

export function MasterDataPdfMiningPage() {
  const { toast } = useToast();
  const activeScope: ActiveScope = "all";
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<MiningAnalyzeResponse | null>(null);
  const [selectedProductName, setSelectedProductName] = useState("");
  const [selectedDbProductId, setSelectedDbProductId] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productDraft, setProductDraft] = useState({ name: "", description: "", categoryId: "" });
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [componentDialogOpen, setComponentDialogOpen] = useState(false);
  const [componentDraft, setComponentDraft] = useState({ name: "", description: "", categoryId: "" });
  const [selectedExtractComponent, setSelectedExtractComponent] = useState<MiningArticleItem | null>(null);
  const [componentSubmitting, setComponentSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(MINING_RESULT_STORAGE_KEY);
    if (!raw) return;
    try {
      const persisted = JSON.parse(raw) as {
        result?: MiningAnalyzeResponse | null;
        selectedProductName?: string;
        selectedDbProductId?: string;
      };
      setResult(persisted.result ?? null);
      setSelectedProductName(persisted.selectedProductName ?? "");
      setSelectedDbProductId(persisted.selectedDbProductId ?? "");
    } catch {
      window.sessionStorage.removeItem(MINING_RESULT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!result && !selectedProductName && !selectedDbProductId) {
      window.sessionStorage.removeItem(MINING_RESULT_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(
      MINING_RESULT_STORAGE_KEY,
      JSON.stringify({
        result,
        selectedProductName,
        selectedDbProductId,
      }),
    );
  }, [result, selectedProductName, selectedDbProductId]);

  const productCategoriesUrl = `/api/admin/master-data/product-categories?active=${activeScope}`;
  const componentCategoriesUrl = `/api/admin/master-data/component-categories?active=${activeScope}`;
  const productsUrl = `/api/admin/master-data/products?active=${activeScope}`;
  const componentsUrl = `/api/admin/master-data/components?active=${activeScope}`;
  const miningLimitsUrl = "/api/admin/master-data/pdf-mining/limits";

  const productCategoriesQuery = useQuery<ProductCategory[]>({
    queryKey: [productCategoriesUrl],
    queryFn: () => fetchJson(productCategoriesUrl),
  });
  const componentCategoriesQuery = useQuery<ComponentCategory[]>({
    queryKey: [componentCategoriesUrl],
    queryFn: () => fetchJson(componentCategoriesUrl),
  });
  const productsQuery = useQuery<Product[]>({
    queryKey: [productsUrl],
    queryFn: () => fetchJson(productsUrl),
  });
  const componentsQuery = useQuery<Component[]>({
    queryKey: [componentsUrl],
    queryFn: () => fetchJson(componentsUrl),
  });
  const miningLimitsQuery = useQuery<MiningLimits>({
    queryKey: [miningLimitsUrl],
    queryFn: () => fetchJson(miningLimitsUrl),
  });

  const productCategories = productCategoriesQuery.data ?? [];
  const componentCategories = componentCategoriesQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const components = componentsQuery.data ?? [];
  const miningLimits = miningLimitsQuery.data ?? result?.limits ?? null;

  useEffect(() => {
    if (!selectedDbProductId && products.length > 0) {
      setSelectedDbProductId(String(products[0].id));
    }
  }, [products, selectedDbProductId]);

  const selectedGroup = useMemo(
    () => result?.productGroups.find((group) => group.productName === selectedProductName) ?? null,
    [result, selectedProductName],
  );

  useEffect(() => {
    if (!result) {
      setSelectedProductName("");
      return;
    }
    if (!selectedProductName && result.productGroups.length > 0) {
      setSelectedProductName(result.productGroups[0].productName);
    }
  }, [result, selectedProductName]);

  const dbComponents = useMemo(() => {
    return components;
  }, [components]);

  const fetchMiningLimits = async () => {
    return miningLimits ?? fetchJson<MiningLimits>(miningLimitsUrl);
  };

  const analyzeBatch = async (batchFiles: File[]): Promise<MiningAnalyzeResponse> => {
    const body = new FormData();
    for (const file of batchFiles) {
      body.append("files", file);
    }
    const response = await fetch("/api/admin/master-data/pdf-mining/analyze", {
      method: "POST",
      credentials: "include",
      body,
    });
    const payload = await parseJsonResponse<MiningAnalyzeResponse | { message?: string }>(
      response,
      "/api/admin/master-data/pdf-mining/analyze",
    );
    if (!response.ok) {
      throw new Error(extractResponseMessage(payload, "Analyse fehlgeschlagen"));
    }
    return payload as MiningAnalyzeResponse;
  };

  const runAnalyze = async () => {
    if (files.length === 0) return;
    setAnalyzing(true);
    setError(null);
    setProgress(null);
    try {
      const limits = await fetchMiningLimits();
      const { batches, rejected } = partitionMiningFiles(files, limits);
      let aggregatedResult = createEmptyMiningResult(limits);

      if (rejected.length > 0) {
        aggregatedResult = mergeMiningAnalyzeResponses(aggregatedResult, {
          documents: [],
          productGroups: [],
          skipped: [],
          errors: rejected,
        });
      }

      let processedFiles = rejected.length;
      setProgress({
        totalBatches: batches.length,
        currentBatch: batches.length > 0 ? 1 : 0,
        processedFiles,
        totalFiles: files.length,
      });
      setResult(aggregatedResult);

      for (let index = 0; index < batches.length; index += 1) {
        const batch = batches[index] ?? [];
        setProgress({
          totalBatches: batches.length,
          currentBatch: index + 1,
          processedFiles,
          totalFiles: files.length,
        });

        try {
          const batchResult = await analyzeBatch(batch);
          aggregatedResult = mergeMiningAnalyzeResponses(aggregatedResult, batchResult);
        } catch (batchError) {
          aggregatedResult = mergeMiningAnalyzeResponses(aggregatedResult, {
            documents: [],
            productGroups: [],
            skipped: [],
            errors: batch.map((file) => ({
              fileName: file.name,
              reason: `Batch ${index + 1}/${batches.length}: ${
                batchError instanceof Error ? batchError.message : "Analyse fehlgeschlagen"
              }`,
            })),
          });
        }

        processedFiles += batch.length;
        setResult(aggregatedResult);
        setProgress({
          totalBatches: batches.length,
          currentBatch: index + 1,
          processedFiles,
          totalFiles: files.length,
        });
      }

      setSelectedProductName((current) => current || aggregatedResult.productGroups[0]?.productName || "");
      toast({
        title: "PDF-Mining abgeschlossen",
        description: `Produkte: ${aggregatedResult.productGroups.length}, ausgelassen: ${aggregatedResult.skipped.length}, Fehler: ${aggregatedResult.errors.length}`,
      });
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : "Analyse fehlgeschlagen");
    } finally {
      setAnalyzing(false);
    }
  };

  const openProductDialog = () => {
    if (!selectedGroup) return;
    setProductDraft({
      name: selectedGroup.productName,
      description: selectedGroup.productDescription ?? "",
      categoryId: "",
    });
    setProductDialogOpen(true);
  };

  const submitProduct = async () => {
    if (!productDraft.name.trim() || !productDraft.categoryId) return;
    setProductSubmitting(true);
    setError(null);
    try {
      const response = await apiRequest("POST", "/api/admin/master-data/products", {
        name: productDraft.name.trim(),
        categoryId: Number(productDraft.categoryId),
        description: productDraft.description.trim() || null,
        isActive: true,
        version: 1,
      });
      const createdProduct = await response.json() as Product;
      await invalidateMasterDataQueries(activeScope);
      setSelectedDbProductId(String(createdProduct.id));
      setProductDialogOpen(false);
      toast({ title: "Produkt übernommen" });
    } catch (submitError) {
      const code = extractApiCode(submitError);
      setError(code === "BUSINESS_CONFLICT" ? "Produktname existiert bereits." : "Produkt konnte nicht angelegt werden.");
    } finally {
      setProductSubmitting(false);
    }
  };

  const openComponentDialog = (item: MiningArticleItem) => {
    setSelectedExtractComponent(item);
    setComponentDraft({
      name: item.name,
      description: item.description ?? "",
      categoryId: "",
    });
    setComponentDialogOpen(true);
  };

  const submitComponent = async () => {
    if (!selectedExtractComponent) return;
    if (!componentDraft.name.trim() || !componentDraft.categoryId) return;

    setComponentSubmitting(true);
    setError(null);
    try {
      const componentResponse = await apiRequest("POST", "/api/admin/master-data/components", {
        name: componentDraft.name.trim(),
        categoryId: Number(componentDraft.categoryId),
        description: componentDraft.description.trim() || null,
        isActive: true,
        version: 1,
      });
      await componentResponse.json() as Component;
      await invalidateMasterDataQueries(activeScope);
      setComponentDialogOpen(false);
      toast({ title: "Komponente übernommen" });
    } catch (submitError) {
      const code = extractApiCode(submitError);
      setError(code === "BUSINESS_CONFLICT" ? "Komponentenname existiert bereits." : "Komponente konnte nicht angelegt werden.");
    } finally {
      setComponentSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4" data-testid="master-data-pdf-mining">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h4 className="font-bold text-slate-900">PDF Bulk Import Stammdaten Mining</h4>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="master-data-pdf-mining-files">PDF-Dateien</Label>
            <Input
              id="master-data-pdf-mining-files"
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
          </div>
          <Button onClick={() => void runAnalyze()} disabled={files.length === 0 || analyzing} data-testid="button-run-master-data-pdf-mining">
            {analyzing ? "Analysiere..." : "Analyse starten"}
          </Button>
        </div>
        {miningLimits ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Limits: max {miningLimits.maxFiles} Dateien pro Batch, max {(miningLimits.maxFileSizeBytes / (1024 * 1024)).toFixed(0)} MB pro Datei, max {(miningLimits.maxTotalBytes / (1024 * 1024)).toFixed(0)} MB pro Batch
          </p>
        ) : null}
        {progress ? (
          <p className="mt-2 text-xs text-muted-foreground" data-testid="master-data-pdf-mining-progress">
            Fortschritt: Batch {progress.currentBatch}/{progress.totalBatches || 0}, Dateien {progress.processedFiles}/{progress.totalFiles}
          </p>
        ) : null}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <section className="flex min-h-0 flex-col rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-mining-extract-panel">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-bold text-slate-900">Extrakt Resultat</h4>
            <select
              value={selectedProductName}
              onChange={(event) => setSelectedProductName(event.target.value)}
              className="h-10 min-w-[220px] rounded border border-slate-300 bg-white px-2 text-sm"
              data-testid="select-mining-product-group"
            >
              <option value="">Extrakt-Produkt wählen</option>
              {(result?.productGroups ?? []).map((group) => (
                <option key={group.productName} value={group.productName}>{group.productName}</option>
              ))}
            </select>
          </div>
          <div className="mt-3 text-sm text-slate-600">
            {selectedGroup?.productDescription ?? "Keine Produktbeschreibung erkannt."}
          </div>
          <div className="mt-4 min-h-0 flex-1 overflow-auto rounded border border-slate-100">
            <ul className="divide-y divide-slate-100">
              {(selectedGroup?.articleItems ?? []).map((item, index) => (
                <li key={`${item.kind}-${item.name}-${index}`} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <span>{item.name}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-500">{item.kind}</span>
                    </div>
                    <div className="text-xs text-slate-500">Menge: {item.quantity}{item.articleNumber ? ` | Art.-Nr.: ${item.articleNumber}` : ""}</div>
                    <div className="mt-1 text-sm text-slate-600">{item.description ?? "-"}</div>
                  </div>
                  {item.kind === "component" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openComponentDialog(item)}
                      data-testid={`button-adopt-component-${index}`}
                    >
                      Komponente übernehmen
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          {result ? (
            <div className="mt-4 space-y-2 text-sm">
              <h5 className="font-semibold text-slate-900">Ausgeklammerte Dokumente</h5>
              {result.skipped.length === 0 ? (
                <p className="text-muted-foreground">Keine</p>
              ) : (
                result.skipped.map((row) => <p key={`${row.fileName}-${row.reason}`}>{row.fileName}: {row.reason}</p>)
              )}
              <h5 className="pt-2 font-semibold text-slate-900">Fehler</h5>
              {result.errors.length === 0 ? (
                <p className="text-muted-foreground">Keine</p>
              ) : (
                result.errors.map((row) => <p key={`${row.fileName}-${row.reason}`}>{row.fileName}: {row.reason}</p>)
              )}
            </div>
          ) : null}
        </section>

        <div className="flex items-center justify-center">
          <Button
            variant="outline"
            onClick={openProductDialog}
            disabled={!selectedGroup}
            data-testid="button-adopt-mining-product"
          >
            Produkt übernehmen
          </Button>
        </div>

        <section className="flex min-h-0 flex-col rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-mining-database-panel">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-bold text-slate-900">Komponenten Datenbank</h4>
            <select
              value={selectedDbProductId}
              onChange={(event) => setSelectedDbProductId(event.target.value)}
              className="h-10 min-w-[220px] rounded border border-slate-300 bg-white px-2 text-sm"
              data-testid="select-database-product"
            >
              <option value="">DB-Produkt wählen</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 min-h-0 flex-1 overflow-auto rounded border border-slate-100">
            <ul className="divide-y divide-slate-100">
              {dbComponents.length === 0 ? (
                <li className="p-3 text-sm text-muted-foreground">Keine Komponenten vorhanden.</li>
              ) : (
                dbComponents.map((component) => (
                  <li key={component.id} className="p-3">
                    <div className="text-sm font-medium text-slate-900">{component.name}</div>
                    <div className="mt-1 text-sm text-slate-600">{component.description ?? "-"}</div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      </div>

      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Produktvorschlag übernehmen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="mining-product-name">Name</Label>
              <Input id="mining-product-name" value={productDraft.name} onChange={(event) => setProductDraft((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mining-product-description">Beschreibung</Label>
              <Textarea id="mining-product-description" value={productDraft.description} onChange={(event) => setProductDraft((current) => ({ ...current, description: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mining-product-category">Produkt Kategorie</Label>
              <select
                id="mining-product-category"
                value={productDraft.categoryId}
                onChange={(event) => setProductDraft((current) => ({ ...current, categoryId: event.target.value }))}
                className="h-10 w-full rounded border border-slate-300 bg-white px-2 text-sm"
              >
                <option value="">Kategorie wählen</option>
                {productCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={() => void submitProduct()} disabled={productSubmitting || !productDraft.name.trim() || !productDraft.categoryId}>
              {productSubmitting ? "Übernehme..." : "Übernehmen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={componentDialogOpen} onOpenChange={setComponentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Komponente übernehmen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="mining-component-product">Produkt</Label>
              <Input
                id="mining-component-product"
                value={products.find((product) => String(product.id) === selectedDbProductId)?.name ?? ""}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mining-component-name">Komponente</Label>
              <Input id="mining-component-name" value={componentDraft.name} onChange={(event) => setComponentDraft((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mining-component-category">Komponentenkategorie</Label>
              <select
                id="mining-component-category"
                value={componentDraft.categoryId}
                onChange={(event) => setComponentDraft((current) => ({ ...current, categoryId: event.target.value }))}
                className="h-10 w-full rounded border border-slate-300 bg-white px-2 text-sm"
              >
                <option value="">Kategorie wählen</option>
                {componentCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mining-component-description">Beschreibung</Label>
              <Textarea id="mining-component-description" value={componentDraft.description} onChange={(event) => setComponentDraft((current) => ({ ...current, description: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComponentDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={() => void submitComponent()} disabled={componentSubmitting || !componentDraft.name.trim() || !componentDraft.categoryId}>
              {componentSubmitting ? "Übernehme..." : "Übernehmen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


