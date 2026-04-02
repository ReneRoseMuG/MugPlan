import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Component, ComponentCategory, Product, ProductCategory } from "@shared/schema";
import { ListLayout } from "@/components/ui/list-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AllComponentList, type ComponentEditorInput } from "@/components/ui/all-component-list";
import { ProductDetails, type ProductDetailsDraft } from "@/components/ui/product-details";
import { ProductDropDown } from "@/components/ui/product-drop-down";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ActiveScope = "active" | "inactive" | "all";
type CategoryImportResponse = { summary: { totalRows: number; createdRows: number; updatedRows: number; reactivatedRows: number; invalidRows: number; errorRows: number } };
type VersionedRow = { id: number; version: number; name: string; isDefault?: boolean };
type ApiErrorPayload = {
  code?: string;
  projectOrderItemCount?: number;
  productCount?: number;
  componentCount?: number;
};

function extractApiPayload(error: unknown): ApiErrorPayload | null {
  if (!(error instanceof Error)) return null;
  const start = error.message.indexOf("{");
  if (start < 0) return null;
  try {
    return JSON.parse(error.message.slice(start)) as ApiErrorPayload;
  } catch {
    return null;
  }
}

function extractApiCode(error: unknown): string | null {
  const payload = extractApiPayload(error);
  return typeof payload?.code === "string" ? payload.code : null;
}

function resolveComponentDeleteError(error: unknown): string {
  const payload = extractApiPayload(error);
  if (payload?.code !== "BUSINESS_CONFLICT") {
    return "Komponente konnte nicht geloescht werden.";
  }

  const projectOrderItemCount = typeof payload.projectOrderItemCount === "number"
    ? payload.projectOrderItemCount
    : 0;

  if (projectOrderItemCount > 0) {
    return "Komponente wird noch in Projektauftragspositionen verwendet.";
  }
  return "Komponente wird noch verwendet.";
}

function resolveCategoryDeleteError(error: unknown, entityLabel: "Produktkategorie" | "Komponentenkategorie"): string {
  const payload = extractApiPayload(error);
  if (payload?.code !== "BUSINESS_CONFLICT") {
    return `${entityLabel} konnte nicht geloescht werden.`;
  }

  if (entityLabel === "Produktkategorie") {
    const productCount = typeof payload.productCount === "number" ? payload.productCount : 0;
    if (productCount > 0) {
      return productCount === 1
        ? "Produktkategorie wird noch von 1 Produkt verwendet."
        : `Produktkategorie wird noch von ${productCount} Produkten verwendet.`;
    }
  }

  const componentCount = typeof payload.componentCount === "number" ? payload.componentCount : 0;
  if (componentCount > 0) {
    return componentCount === 1
      ? "Komponentenkategorie wird noch von 1 Komponente verwendet."
      : `Komponentenkategorie wird noch von ${componentCount} Komponenten verwendet.`;
  }

  return `${entityLabel} wird noch verwendet.`;
}

function resolveCategoryImportError(code: string | null, entityLabel: "Produkte" | "Komponenten"): { title: string; description?: string } {
  if (code === "INVALID_CSV_HEADER") return { title: `CSV-Header fuer ${entityLabel.toLocaleLowerCase("de")} ungueltig`, description: 'Erwartet wird mindestens eine Spalte "Name". Optional sind "Beschreibung" und "IsActive".' };
  if (code === "INVALID_CSV_FORMAT") return { title: `CSV-Datei fuer ${entityLabel.toLocaleLowerCase("de")} ist formal ungueltig`, description: "Bitte Trennzeichen, Quotes und Dateiformat pruefen." };
  if (code === "INVALID_CSV_CONTENT") return { title: `CSV-Datei fuer ${entityLabel.toLocaleLowerCase("de")} enthaelt keine gueltigen Daten`, description: "Nach dem Header muss mindestens eine verwertbare Zeile mit Name vorhanden sein." };
  if (code === "NOT_FOUND") return { title: `${entityLabel} konnten nicht importiert werden`, description: "Die gewaehlte Kategorie wurde nicht gefunden." };
  if (code === "FORBIDDEN") return { title: `${entityLabel} konnten nicht importiert werden`, description: "Der Import ist nur fuer Admins erlaubt." };
  return { title: `${entityLabel}import fehlgeschlagen`, description: code ? `Servercode: ${code}` : "Die genaue Ursache konnte nicht aufgeloest werden." };
}

function toProductDraft(product: Product | null): ProductDetailsDraft {
  return product ? {
    name: product.name,
    shortCode: product.shortCode ?? "",
    description: product.description ?? "",
    isActive: product.isActive,
  } : {
    name: "",
    shortCode: "",
    description: "",
    isActive: true,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error((await response.text()) || `Request failed for ${url}`);
  }
  return response.json() as Promise<T>;
}

async function invalidateMasterDataQueries(activeScope: ActiveScope): Promise<void> {
  const urls = [
    `/api/admin/master-data/product-categories?active=${activeScope}`,
    `/api/admin/master-data/component-categories?active=${activeScope}`,
    `/api/admin/master-data/products?active=${activeScope}`,
    `/api/admin/master-data/components?active=${activeScope}`,
    "/api/admin/master-data/product-categories?active=all",
    "/api/admin/master-data/component-categories?active=all",
    "/api/admin/master-data/products?active=all",
    "/api/admin/master-data/components?active=all",
  ];
  await Promise.all(urls.map((url) => queryClient.invalidateQueries({ queryKey: [url] })));
}

export function ProductManagementPage() {
  const { toast } = useToast();
  const activeScope: ActiveScope = "all";
  const [newProductCategoryName, setNewProductCategoryName] = useState("");
  const [newComponentCategoryName, setNewComponentCategoryName] = useState("");
  const [editProductCategory, setEditProductCategory] = useState<ProductCategory | null>(null);
  const [editComponentCategory, setEditComponentCategory] = useState<ComponentCategory | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productDraft, setProductDraft] = useState<ProductDetailsDraft>(toProductDraft(null));
  const [pendingProductCategoryImportId, setPendingProductCategoryImportId] = useState<number | null>(null);
  const [pendingComponentCategoryImportId, setPendingComponentCategoryImportId] = useState<number | null>(null);
  const productCategoryImportInputRef = useRef<HTMLInputElement | null>(null);
  const componentCategoryImportInputRef = useRef<HTMLInputElement | null>(null);
  const isAdmin = (window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER") === "ADMIN";

  const productCategoriesUrl = `/api/admin/master-data/product-categories?active=${activeScope}`;
  const componentCategoriesUrl = `/api/admin/master-data/component-categories?active=${activeScope}`;
  const productsUrl = `/api/admin/master-data/products?active=${activeScope}`;
  const componentsUrl = `/api/admin/master-data/components?active=${activeScope}`;

  const productCategoriesQuery = useQuery<ProductCategory[]>({ queryKey: [productCategoriesUrl], queryFn: () => fetchJson(productCategoriesUrl) });
  const componentCategoriesQuery = useQuery<ComponentCategory[]>({ queryKey: [componentCategoriesUrl], queryFn: () => fetchJson(componentCategoriesUrl) });
  const productsQuery = useQuery<Product[]>({ queryKey: [productsUrl], queryFn: () => fetchJson(productsUrl) });
  const componentsQuery = useQuery<Component[]>({ queryKey: [componentsUrl], queryFn: () => fetchJson(componentsUrl) });

  const productCategories = productCategoriesQuery.data ?? [];
  const componentCategories = componentCategoriesQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const components = componentsQuery.data ?? [];
  const filteredProducts = products.slice().sort((a, b) => a.name.localeCompare(b.name, "de"));
  const selectedProduct = products.find((row) => String(row.id) === selectedProductId) ?? null;
  const isLoading = productCategoriesQuery.isLoading || componentCategoriesQuery.isLoading || productsQuery.isLoading || componentsQuery.isLoading;

  useEffect(() => {
    setProductDraft(toProductDraft(selectedProduct));
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedProductId) return;
    if (products.some((row) => String(row.id) === selectedProductId)) return;
    setSelectedProductId("");
    setProductDraft(toProductDraft(null));
  }, [products, selectedProductId]);

  const createProductMutation = useMutation({
    mutationFn: async (input: { name: string; categoryId: number }) => {
      const response = await apiRequest("POST", "/api/admin/master-data/products", { name: input.name.trim(), shortCode: null, categoryId: input.categoryId, description: null, isActive: true, version: 1 });
      return response.json() as Promise<Product>;
    },
    onSuccess: async (createdProduct) => {
      await invalidateMasterDataQueries(activeScope);
      setSelectedProductId(String(createdProduct.id));
    },
  });
  const updateProductMutation = useMutation({
    mutationFn: async (input: { id: number; version: number; name: string; shortCode: string | null; categoryId: number; description: string | null; isActive: boolean }) => {
      const { id, ...body } = input;
      const response = await apiRequest("PUT", `/api/admin/master-data/products/${id}`, body);
      return response.json() as Promise<Product>;
    },
    onSuccess: async () => { await invalidateMasterDataQueries(activeScope); },
  });
  const deleteProductMutation = useMutation({
    mutationFn: async (input: { id: number; version: number }) => apiRequest("DELETE", `/api/admin/master-data/products/${input.id}`, { version: input.version }),
    onSuccess: async () => {
      await invalidateMasterDataQueries(activeScope);
      setSelectedProductId("");
      setProductDraft(toProductDraft(null));
    },
  });
  const createComponentMutation = useMutation({
    mutationFn: async (input: ComponentEditorInput) => {
      const response = await apiRequest("POST", "/api/admin/master-data/components", { name: input.name.trim(), shortCode: input.shortCode.trim() || null, categoryId: input.categoryId, description: input.description, isActive: input.isActive, version: 1 });
      return response.json() as Promise<Component>;
    },
    onSuccess: async () => { await invalidateMasterDataQueries(activeScope); },
  });
  const updateComponentMutation = useMutation({
    mutationFn: async (input: { id: number; version: number; name: string; shortCode: string | null; categoryId: number; description: string | null; isActive: boolean }) => {
      const { id, ...body } = input;
      const response = await apiRequest("PUT", `/api/admin/master-data/components/${id}`, body);
      return response.json() as Promise<Component>;
    },
    onSuccess: async () => { await invalidateMasterDataQueries(activeScope); },
  });
  const deleteComponentMutation = useMutation({
    mutationFn: async (input: { id: number; version: number }) => apiRequest("DELETE", `/api/admin/master-data/components/${input.id}`, { version: input.version }),
    onSuccess: async () => { await invalidateMasterDataQueries(activeScope); },
  });
  const deleteAllProductsInCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/master-data/product-categories/${categoryId}/products`, {});
      return response.json() as Promise<{ deletedCount: number; skippedCount: number }>;
    },
    onSuccess: async () => { await invalidateMasterDataQueries(activeScope); },
  });
  const deleteAllComponentsInCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/master-data/component-categories/${categoryId}/components`, {});
      return response.json() as Promise<{ deletedCount: number; skippedCount: number }>;
    },
    onSuccess: async () => { await invalidateMasterDataQueries(activeScope); },
  });
  const deleteSelectedComponentWithConflictDetails = async (component: Component): Promise<void> => {
    try {
      await deleteComponentMutation.mutateAsync({ id: component.id, version: component.version });
      toast({ title: "Komponente geloescht" });
    } catch (error) {
      throw new Error(resolveComponentDeleteError(error));
    }
  };

  const productCategoryImportMutation = useMutation({
    mutationFn: async (input: { categoryId: number; file: File }) => {
      const body = new FormData();
      body.append("file", input.file);
      const response = await fetch(`/api/admin/master-data/product-categories/${input.categoryId}/import-csv`, { method: "POST", body, credentials: "include" });
      if (!response.ok) throw new Error((await response.text()) || "Produktimport fehlgeschlagen");
      return response.json() as Promise<CategoryImportResponse>;
    },
    onSuccess: async (result) => {
      await invalidateMasterDataQueries(activeScope);
      toast({ title: `Produktimport: ${result.summary.createdRows} neu, ${result.summary.updatedRows} aktualisiert, ${result.summary.reactivatedRows} reaktiviert` });
    },
    onError: (error) => {
      const message = resolveCategoryImportError(extractApiCode(error), "Produkte");
      toast({ title: message.title, description: message.description, variant: "destructive" });
    },
    onSettled: () => {
      setPendingProductCategoryImportId(null);
      if (productCategoryImportInputRef.current) productCategoryImportInputRef.current.value = "";
    },
  });
  const componentCategoryImportMutation = useMutation({
    mutationFn: async (input: { categoryId: number; file: File }) => {
      const body = new FormData();
      body.append("file", input.file);
      const response = await fetch(`/api/admin/master-data/component-categories/${input.categoryId}/import-csv`, { method: "POST", body, credentials: "include" });
      if (!response.ok) throw new Error((await response.text()) || "Komponentenimport fehlgeschlagen");
      return response.json() as Promise<CategoryImportResponse>;
    },
    onSuccess: async (result) => {
      await invalidateMasterDataQueries(activeScope);
      toast({ title: `Komponentenimport: ${result.summary.createdRows} neu, ${result.summary.updatedRows} aktualisiert, ${result.summary.reactivatedRows} reaktiviert` });
    },
    onError: (error) => {
      const message = resolveCategoryImportError(extractApiCode(error), "Komponenten");
      toast({ title: message.title, description: message.description, variant: "destructive" });
    },
    onSettled: () => {
      setPendingComponentCategoryImportId(null);
      if (componentCategoryImportInputRef.current) componentCategoryImportInputRef.current.value = "";
    },
  });

  const categoryMutations = {
    createProduct: useMutation({ mutationFn: async () => apiRequest("POST", "/api/admin/master-data/product-categories", { name: newProductCategoryName.trim(), isDefault: false, isActive: true, version: 1 }), onSuccess: async () => { setNewProductCategoryName(""); await invalidateMasterDataQueries(activeScope); } }),
    updateProduct: useMutation({ mutationFn: async (input: { id: number; version: number; name: string; isDefault: boolean }) => apiRequest("PUT", `/api/admin/master-data/product-categories/${input.id}`, input), onSuccess: async () => { setEditProductCategory(null); await invalidateMasterDataQueries(activeScope); } }),
    deleteProduct: useMutation({ mutationFn: async (input: { id: number; version: number }) => apiRequest("DELETE", `/api/admin/master-data/product-categories/${input.id}`, { version: input.version }), onSuccess: async () => { await invalidateMasterDataQueries(activeScope); } }),
    createComponent: useMutation({ mutationFn: async () => apiRequest("POST", "/api/admin/master-data/component-categories", { name: newComponentCategoryName.trim(), isDefault: false, isActive: true, version: 1 }), onSuccess: async () => { setNewComponentCategoryName(""); await invalidateMasterDataQueries(activeScope); } }),
    updateComponent: useMutation({ mutationFn: async (input: { id: number; version: number; name: string; isDefault: boolean }) => apiRequest("PUT", `/api/admin/master-data/component-categories/${input.id}`, input), onSuccess: async () => { setEditComponentCategory(null); await invalidateMasterDataQueries(activeScope); } }),
    deleteComponent: useMutation({ mutationFn: async (input: { id: number; version: number }) => apiRequest("DELETE", `/api/admin/master-data/component-categories/${input.id}`, { version: input.version }), onSuccess: async () => { await invalidateMasterDataQueries(activeScope); } }),
  };

  const handleCategoryMutationError = (error: unknown, duplicateTitle: string, defaultTitle: string) => {
    toast({ title: extractApiCode(error) === "BUSINESS_CONFLICT" ? duplicateTitle : defaultTitle, variant: "destructive" });
  };

  async function createProductFromDropDown(input: { name: string; shortCode: string | null; description: string | null; categoryId: number }): Promise<Product> {
    try {
      return await createProductMutation.mutateAsync({ name: input.name, categoryId: input.categoryId });
    } catch (error) {
      throw new Error(extractApiCode(error) === "BUSINESS_CONFLICT" ? "Produktname existiert bereits." : "Produkt konnte nicht angelegt werden.");
    }
  }
  async function updateSelectedProduct(): Promise<void> {
    if (!selectedProduct || !productDraft.name.trim()) return;
    try {
      await updateProductMutation.mutateAsync({ id: selectedProduct.id, version: selectedProduct.version, name: productDraft.name.trim(), shortCode: productDraft.shortCode.trim() || null, categoryId: selectedProduct.categoryId, description: productDraft.description.trim() || null, isActive: productDraft.isActive });
      toast({ title: "Produkt aktualisiert" });
    } catch (error) {
      toast({ title: extractApiCode(error) === "BUSINESS_CONFLICT" ? "Produktname existiert bereits" : "Produkt konnte nicht aktualisiert werden", variant: "destructive" });
    }
  }
  async function deleteSelectedProduct(): Promise<void> {
    if (!selectedProduct || !window.confirm(`Produkt "${selectedProduct.name}" loeschen?`)) return;
    try {
      await deleteProductMutation.mutateAsync({ id: selectedProduct.id, version: selectedProduct.version });
      toast({ title: "Produkt geloescht" });
    } catch (error) {
      toast({ title: extractApiCode(error) === "BUSINESS_CONFLICT" ? "Produkt wird noch verwendet" : "Produkt konnte nicht geloescht werden", variant: "destructive" });
    }
  }
  async function deleteAllProductsInCategory(categoryId: string): Promise<void> {
    const category = productCategories.find((c) => String(c.id) === categoryId);
    const count = products.filter((p) => String(p.categoryId) === categoryId).length;
    if (!window.confirm(`Alle Produkte der Kategorie "${category?.name ?? categoryId}" löschen? ${count} Einträge betroffen.`)) return;
    try {
      const result = await deleteAllProductsInCategoryMutation.mutateAsync(Number(categoryId));
      if (result.skippedCount > 0) {
        toast({ title: `${result.deletedCount} Produkte gelöscht, ${result.skippedCount} noch in Verwendung` });
      } else {
        toast({ title: `${result.deletedCount} Produkte gelöscht` });
      }
    } catch {
      toast({ title: "Produkte konnten nicht gelöscht werden", variant: "destructive" });
    }
  }
  async function deleteAllComponentsInCategory(categoryId: string): Promise<void> {
    const category = componentCategories.find((c) => String(c.id) === categoryId);
    const count = components.filter((c) => String(c.categoryId) === categoryId).length;
    if (!window.confirm(`Alle Komponenten der Kategorie "${category?.name ?? categoryId}" löschen? ${count} Einträge betroffen.`)) return;
    try {
      const result = await deleteAllComponentsInCategoryMutation.mutateAsync(Number(categoryId));
      if (result.skippedCount > 0) {
        toast({ title: `${result.deletedCount} Komponenten gelöscht, ${result.skippedCount} noch in Verwendung` });
      } else {
        toast({ title: `${result.deletedCount} Komponenten gelöscht` });
      }
    } catch {
      toast({ title: "Komponenten konnten nicht gelöscht werden", variant: "destructive" });
    }
  }
  async function createStandaloneComponent(input: ComponentEditorInput): Promise<Component> {
    try {
      const created = await createComponentMutation.mutateAsync(input);
      toast({ title: "Komponente angelegt" });
      return created;
    } catch (error) {
      throw new Error(extractApiCode(error) === "BUSINESS_CONFLICT" ? "Komponentenname existiert bereits." : "Komponente konnte nicht angelegt werden.");
    }
  }
  async function updateComponentData(component: Component, input: ComponentEditorInput): Promise<Component> {
    try {
      const updated = await updateComponentMutation.mutateAsync({ id: component.id, version: component.version, name: input.name.trim(), shortCode: input.shortCode.trim() || null, categoryId: input.categoryId, description: input.description, isActive: input.isActive });
      toast({ title: "Komponente aktualisiert" });
      return updated;
    } catch (error) {
      throw new Error(extractApiCode(error) === "BUSINESS_CONFLICT" ? "Komponentenname existiert bereits." : "Komponente konnte nicht aktualisiert werden.");
    }
  }

  const renderCategorySection = (
    title: string,
    rows: Array<ProductCategory | ComponentCategory>,
    editRow: VersionedRow | null,
    setEditRow: (row: any) => void,
    draftValue: string,
    setDraftValue: (value: string) => void,
    onSave: () => void,
    onDelete: (row: any) => void,
    onImport: (row: any) => void,
    testId: string,
    inputTestId: string,
    buttonTestId: string,
  ) => (
    <section className="flex flex-col rounded-md border border-slate-200 bg-slate-50 p-3" data-testid={testId}>
      <h4 className="font-bold text-slate-900">{title}</h4>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Input
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          placeholder={editRow ? `${title.slice(0, -1)} bearbeiten` : `Neue ${title.slice(0, -1)}`}
          data-testid={inputTestId}
          className="min-w-[220px] flex-1"
        />
        {editRow ? (
          <label className="flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(editRow.isDefault)}
              onChange={(event) => setEditRow({ ...editRow, isDefault: event.target.checked })}
              data-testid={`${testId}-checkbox-default`}
            />
            <span>Default</span>
          </label>
        ) : null}
        <Button variant="outline" onClick={onSave} data-testid={buttonTestId}>{editRow ? "Speichern" : "Neu"}</Button>
        {editRow ? <Button variant="outline" onClick={() => setEditRow(null)}>Abbrechen</Button> : null}
      </div>
      <div className="mt-4">
        <Table className="min-w-[520px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="w-[220px] text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className={editRow?.id === row.id ? "bg-slate-50" : undefined} onClick={() => { setEditRow(editRow?.id === row.id ? null : { ...row }); }}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.isDefault ? "Ja" : "Nein"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditRow(editRow?.id === row.id ? null : { ...row });
                      }}
                    >
                      {editRow?.id === row.id ? "Aktiv" : "Bearb."}
                    </Button>
                    <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); onImport(row); }} data-testid={`${title === "Produktkategorien" ? "button-product-category-import" : "button-component-category-import"}-${row.id}`}>Import</Button>
                    <Button size="sm" variant="destructive" onClick={(event) => { event.stopPropagation(); onDelete(row); }}>x</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );

  return (
    <ListLayout
      title="Produkte"
      icon={null}
      isLoading={isLoading}
      hideHeader
      contentSlot={(
        <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(420px,1fr)]">
          <input ref={productCategoryImportInputRef} type="file" accept=".csv,text/csv" className="hidden" data-testid="input-product-category-import-file" onChange={(event) => { const file = event.target.files?.[0]; if (file && pendingProductCategoryImportId) productCategoryImportMutation.mutate({ categoryId: pendingProductCategoryImportId, file }); }} />
          <input ref={componentCategoryImportInputRef} type="file" accept=".csv,text/csv" className="hidden" data-testid="input-component-category-import-file" onChange={(event) => { const file = event.target.files?.[0]; if (file && pendingComponentCategoryImportId) componentCategoryImportMutation.mutate({ categoryId: pendingComponentCategoryImportId, file }); }} />

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-2">
            <ProductDropDown products={filteredProducts} categories={productCategories} selectedProductId={selectedProductId} onSelectProduct={setSelectedProductId} onCreateProduct={createProductFromDropDown} onDeleteProduct={() => void deleteSelectedProduct()} onDeleteAllInCategory={(categoryId) => void deleteAllProductsInCategory(categoryId)} isAdmin={isAdmin} />
            <section className="rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-products">
              <ProductDetails draft={productDraft} disabled={!selectedProduct} isAdmin={isAdmin} onDraftChange={setProductDraft} onSubmit={() => void updateSelectedProduct()} />
            </section>
            <AllComponentList components={components} categories={componentCategories} isAdmin={isAdmin} onCreateComponent={createStandaloneComponent} onUpdateComponent={updateComponentData} onDeleteComponent={deleteSelectedComponentWithConflictDetails} onDeleteAllComponentsInCategory={(categoryId) => void deleteAllComponentsInCategory(categoryId)} />
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
            {renderCategorySection("Produktkategorien", productCategories, editProductCategory, setEditProductCategory, editProductCategory ? editProductCategory.name : newProductCategoryName, editProductCategory ? (value) => setEditProductCategory({ ...editProductCategory, name: value }) : setNewProductCategoryName, () => {
              if (editProductCategory) {
                if (!editProductCategory.name.trim()) return;
                categoryMutations.updateProduct.mutate({ id: editProductCategory.id, version: editProductCategory.version, name: editProductCategory.name.trim(), isDefault: Boolean(editProductCategory.isDefault) }, { onError: (error) => handleCategoryMutationError(error, "Produktkategorie existiert bereits", "Produktkategorie konnte nicht aktualisiert werden") });
                return;
              }
              if (!newProductCategoryName.trim()) return;
              categoryMutations.createProduct.mutate(undefined, { onError: (error) => handleCategoryMutationError(error, "Produktkategorie existiert bereits", "Produktkategorie konnte nicht angelegt werden") });
            }, (row) => { if (!window.confirm(`Produktkategorie "${row.name}" loeschen?`)) return; categoryMutations.deleteProduct.mutate({ id: row.id, version: row.version }, { onError: (error) => toast({ title: resolveCategoryDeleteError(error, "Produktkategorie"), variant: "destructive" }) }); }, (row) => { setPendingProductCategoryImportId(row.id); productCategoryImportInputRef.current?.click(); }, "master-data-product-categories", "input-new-product-category", "button-create-product-category")}
            {renderCategorySection("Komponentenkategorien", componentCategories, editComponentCategory, setEditComponentCategory, editComponentCategory ? editComponentCategory.name : newComponentCategoryName, editComponentCategory ? (value) => setEditComponentCategory({ ...editComponentCategory, name: value }) : setNewComponentCategoryName, () => {
              if (editComponentCategory) {
                if (!editComponentCategory.name.trim()) return;
                categoryMutations.updateComponent.mutate({ id: editComponentCategory.id, version: editComponentCategory.version, name: editComponentCategory.name.trim(), isDefault: Boolean(editComponentCategory.isDefault) }, { onError: (error) => handleCategoryMutationError(error, "Komponentenkategorie existiert bereits", "Komponentenkategorie konnte nicht aktualisiert werden") });
                return;
              }
              if (!newComponentCategoryName.trim()) return;
              categoryMutations.createComponent.mutate(undefined, { onError: (error) => handleCategoryMutationError(error, "Komponentenkategorie existiert bereits", "Komponentenkategorie konnte nicht angelegt werden") });
            }, (row) => { if (!window.confirm(`Komponentenkategorie "${row.name}" loeschen?`)) return; categoryMutations.deleteComponent.mutate({ id: row.id, version: row.version }, { onError: (error) => toast({ title: resolveCategoryDeleteError(error, "Komponentenkategorie"), variant: "destructive" }) }); }, (row) => { setPendingComponentCategoryImportId(row.id); componentCategoryImportInputRef.current?.click(); }, "master-data-component-categories", "input-new-component-category", "button-create-component-category")}
          </div>
        </div>
      )}
    />
  );
}

