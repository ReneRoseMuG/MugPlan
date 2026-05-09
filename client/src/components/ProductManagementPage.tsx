import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Boxes, Package } from "lucide-react";
import type { Component, ComponentCategory, Product, ProductCategory } from "@shared/schema";
import { ListLayout } from "@/components/ui/list-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AllComponentList, type ComponentEditorInput } from "@/components/ui/all-component-list";
import { ConfirmDialogBase, DialogBaseInlineMessage } from "@/components/ui/dialog-base";
import type { ProductCreateInput } from "@/components/ui/product-create-dialog";
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
type ProductManagementConfirmTarget =
  | { kind: "product"; product: Product }
  | { kind: "products-in-category"; category: ProductCategory; count: number }
  | { kind: "product-category"; category: ProductCategory }
  | { kind: "components-in-category"; category: ComponentCategory; count: number }
  | { kind: "component-category"; category: ComponentCategory };
type ActionErrorMessage = { title: string; description?: string };

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
    return "Komponente konnte nicht gelöscht werden.";
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
    return `${entityLabel} konnte nicht gelöscht werden.`;
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
  if (code === "INVALID_CSV_HEADER") return { title: `CSV-Header für ${entityLabel.toLocaleLowerCase("de")} ungültig`, description: 'Erwartet wird mindestens eine Spalte "Name". Optional sind "Beschreibung" und "IsActive".' };
  if (code === "INVALID_CSV_FORMAT") return { title: `CSV-Datei für ${entityLabel.toLocaleLowerCase("de")} ist formal ungültig`, description: "Bitte Trennzeichen, Quotes und Dateiformat prüfen." };
  if (code === "INVALID_CSV_CONTENT") return { title: `CSV-Datei für ${entityLabel.toLocaleLowerCase("de")} enthält keine gültigen Daten`, description: "Nach dem Header muss mindestens eine verwertbare Zeile mit Name vorhanden sein." };
  if (code === "NOT_FOUND") return { title: `${entityLabel} konnten nicht importiert werden`, description: "Die gewählte Kategorie wurde nicht gefunden." };
  if (code === "FORBIDDEN") return { title: `${entityLabel} konnten nicht importiert werden`, description: "Der Import ist nur für Admins erlaubt." };
  return { title: `${entityLabel}import fehlgeschlagen`, description: code ? `Servercode: ${code}` : "Der konkrete Grund konnte nicht aufgelöst werden." };
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
  const [confirmTarget, setConfirmTarget] = useState<ProductManagementConfirmTarget | null>(null);
  const [actionError, setActionError] = useState<ActionErrorMessage | null>(null);
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

  const showActionError = (title: string, description?: string) => {
    setActionError({ title, description });
    toast({ title, description, variant: "destructive" });
  };

  const clearActionError = () => setActionError(null);

  const createProductMutation = useMutation({
    mutationFn: async (input: ProductCreateInput) => {
      const response = await apiRequest("POST", "/api/admin/master-data/products", {
        name: input.name.trim(),
        shortCode: input.shortCode?.trim() || null,
        categoryId: input.categoryId,
        description: input.description?.trim() || null,
        isActive: true,
        version: 1,
      });
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
      clearActionError();
      await deleteComponentMutation.mutateAsync({ id: component.id, version: component.version });
      toast({ title: "Komponente gelöscht" });
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
      clearActionError();
      toast({ title: `Produktimport: ${result.summary.createdRows} neu, ${result.summary.updatedRows} aktualisiert, ${result.summary.reactivatedRows} reaktiviert` });
    },
    onError: (error) => {
      const message = resolveCategoryImportError(extractApiCode(error), "Produkte");
      showActionError(message.title, message.description);
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
      clearActionError();
      toast({ title: `Komponentenimport: ${result.summary.createdRows} neu, ${result.summary.updatedRows} aktualisiert, ${result.summary.reactivatedRows} reaktiviert` });
    },
    onError: (error) => {
      const message = resolveCategoryImportError(extractApiCode(error), "Komponenten");
      showActionError(message.title, message.description);
    },
    onSettled: () => {
      setPendingComponentCategoryImportId(null);
      if (componentCategoryImportInputRef.current) componentCategoryImportInputRef.current.value = "";
    },
  });

  const categoryMutations = {
    createProduct: useMutation({ mutationFn: async () => apiRequest("POST", "/api/admin/master-data/product-categories", { name: newProductCategoryName.trim(), isDefault: false, isActive: true, version: 1 }), onSuccess: async () => { setNewProductCategoryName(""); clearActionError(); await invalidateMasterDataQueries(activeScope); } }),
    updateProduct: useMutation({ mutationFn: async (input: { id: number; version: number; name: string; isDefault: boolean }) => apiRequest("PUT", `/api/admin/master-data/product-categories/${input.id}`, input), onSuccess: async () => { setEditProductCategory(null); clearActionError(); await invalidateMasterDataQueries(activeScope); } }),
    deleteProduct: useMutation({ mutationFn: async (input: { id: number; version: number }) => apiRequest("DELETE", `/api/admin/master-data/product-categories/${input.id}`, { version: input.version }), onSuccess: async () => { clearActionError(); await invalidateMasterDataQueries(activeScope); } }),
    createComponent: useMutation({ mutationFn: async () => apiRequest("POST", "/api/admin/master-data/component-categories", { name: newComponentCategoryName.trim(), isDefault: false, isActive: true, version: 1 }), onSuccess: async () => { setNewComponentCategoryName(""); clearActionError(); await invalidateMasterDataQueries(activeScope); } }),
    updateComponent: useMutation({ mutationFn: async (input: { id: number; version: number; name: string; isDefault: boolean }) => apiRequest("PUT", `/api/admin/master-data/component-categories/${input.id}`, input), onSuccess: async () => { setEditComponentCategory(null); clearActionError(); await invalidateMasterDataQueries(activeScope); } }),
    deleteComponent: useMutation({ mutationFn: async (input: { id: number; version: number }) => apiRequest("DELETE", `/api/admin/master-data/component-categories/${input.id}`, { version: input.version }), onSuccess: async () => { clearActionError(); await invalidateMasterDataQueries(activeScope); } }),
  };

  const handleCategoryMutationError = (error: unknown, duplicateTitle: string, defaultTitle: string) => {
    showActionError(extractApiCode(error) === "BUSINESS_CONFLICT" ? duplicateTitle : defaultTitle);
  };

  async function createProductFromDropDown(input: ProductCreateInput): Promise<Product> {
    try {
      clearActionError();
      return await createProductMutation.mutateAsync(input);
    } catch (error) {
      throw new Error(extractApiCode(error) === "BUSINESS_CONFLICT" ? "Produktname existiert bereits." : "Produkt konnte nicht angelegt werden.");
    }
  }
  async function updateSelectedProduct(): Promise<void> {
    if (!selectedProduct || !productDraft.name.trim()) return;
    try {
      clearActionError();
      await updateProductMutation.mutateAsync({ id: selectedProduct.id, version: selectedProduct.version, name: productDraft.name.trim(), shortCode: productDraft.shortCode.trim() || null, categoryId: selectedProduct.categoryId, description: productDraft.description.trim() || null, isActive: productDraft.isActive });
      toast({ title: "Produkt aktualisiert" });
    } catch (error) {
      showActionError(extractApiCode(error) === "BUSINESS_CONFLICT" ? "Produktname existiert bereits" : "Produkt konnte nicht aktualisiert werden");
    }
  }
  function requestDeleteProduct(product: Product): void {
    clearActionError();
    setConfirmTarget({ kind: "product", product });
  }

  function requestDeleteAllProductsInCategory(categoryId: string): void {
    const category = productCategories.find((c) => String(c.id) === categoryId);
    if (!category) return;
    const count = products.filter((p) => String(p.categoryId) === categoryId).length;
    clearActionError();
    setConfirmTarget({ kind: "products-in-category", category, count });
  }

  function requestDeleteAllComponentsInCategory(categoryId: string): void {
    const category = componentCategories.find((c) => String(c.id) === categoryId);
    if (!category) return;
    const count = components.filter((c) => String(c.categoryId) === categoryId).length;
    clearActionError();
    setConfirmTarget({ kind: "components-in-category", category, count });
  }
  async function createStandaloneComponent(input: ComponentEditorInput): Promise<Component> {
    try {
      clearActionError();
      const created = await createComponentMutation.mutateAsync(input);
      toast({ title: "Komponente angelegt" });
      return created;
    } catch (error) {
      throw new Error(extractApiCode(error) === "BUSINESS_CONFLICT" ? "Komponentenname existiert bereits." : "Komponente konnte nicht angelegt werden.");
    }
  }
  async function updateComponentData(component: Component, input: ComponentEditorInput): Promise<Component> {
    try {
      clearActionError();
      const updated = await updateComponentMutation.mutateAsync({ id: component.id, version: component.version, name: input.name.trim(), shortCode: input.shortCode.trim() || null, categoryId: input.categoryId, description: input.description, isActive: input.isActive });
      toast({ title: "Komponente aktualisiert" });
      return updated;
    } catch (error) {
      throw new Error(extractApiCode(error) === "BUSINESS_CONFLICT" ? "Komponentenname existiert bereits." : "Komponente konnte nicht aktualisiert werden.");
    }
  }

  const confirmDialogContent = (() => {
    if (!confirmTarget) return null;

    switch (confirmTarget.kind) {
      case "product":
        return {
          confirmLabel: "Produkt löschen",
          description: `Produkt "${confirmTarget.product.name}" wird gelöscht.`,
          icon: <Package className="h-5 w-5 text-primary" />,
          testId: "dialog-confirm-delete-product",
          title: "Produkt wirklich löschen?",
        };
      case "products-in-category":
        return {
          confirmLabel: "Produkte löschen",
          description: `Kategorie "${confirmTarget.category.name}" enthält ${confirmTarget.count} Produkte. Nicht referenzierte Produkte werden gelöscht.`,
          icon: <Package className="h-5 w-5 text-primary" />,
          testId: "dialog-confirm-delete-products-in-category",
          title: "Alle Produkte dieser Kategorie löschen?",
        };
      case "product-category":
        return {
          confirmLabel: "Produktkategorie löschen",
          description: `Produktkategorie "${confirmTarget.category.name}" wird gelöscht.`,
          icon: <Package className="h-5 w-5 text-primary" />,
          testId: "dialog-confirm-delete-product-category",
          title: "Produktkategorie wirklich löschen?",
        };
      case "components-in-category":
        return {
          confirmLabel: "Komponenten löschen",
          description: `Kategorie "${confirmTarget.category.name}" enthält ${confirmTarget.count} Komponenten. Nicht referenzierte Komponenten werden gelöscht.`,
          icon: <Boxes className="h-5 w-5 text-primary" />,
          testId: "dialog-confirm-delete-components-in-category",
          title: "Alle Komponenten dieser Kategorie löschen?",
        };
      case "component-category":
        return {
          confirmLabel: "Komponentenkategorie löschen",
          description: `Komponentenkategorie "${confirmTarget.category.name}" wird gelöscht.`,
          icon: <Boxes className="h-5 w-5 text-primary" />,
          testId: "dialog-confirm-delete-component-category",
          title: "Komponentenkategorie wirklich löschen?",
        };
      default:
        return null;
    }
  })();

  const isConfirmPending = deleteProductMutation.isPending
    || deleteAllProductsInCategoryMutation.isPending
    || deleteAllComponentsInCategoryMutation.isPending
    || categoryMutations.deleteProduct.isPending
    || categoryMutations.deleteComponent.isPending;

  const handleConfirmTarget = () => {
    if (!confirmTarget) return;
    clearActionError();

    switch (confirmTarget.kind) {
      case "product": {
        const currentProduct = products.find((product) => product.id === confirmTarget.product.id) ?? confirmTarget.product;
        deleteProductMutation.mutate(
          { id: currentProduct.id, version: currentProduct.version },
          {
            onSuccess: () => {
              toast({ title: "Produkt gelöscht" });
              setConfirmTarget(null);
            },
            onError: (error) => {
              showActionError(extractApiCode(error) === "BUSINESS_CONFLICT" ? "Produkt wird noch verwendet" : "Produkt konnte nicht gelöscht werden");
            },
          },
        );
        return;
      }
      case "products-in-category":
        deleteAllProductsInCategoryMutation.mutate(confirmTarget.category.id, {
          onSuccess: (result) => {
            toast({
              title: result.skippedCount > 0
                ? `${result.deletedCount} Produkte gelöscht, ${result.skippedCount} noch in Verwendung`
                : `${result.deletedCount} Produkte gelöscht`,
            });
            setConfirmTarget(null);
          },
          onError: () => showActionError("Produkte konnten nicht gelöscht werden"),
        });
        return;
      case "product-category":
        categoryMutations.deleteProduct.mutate(
          { id: confirmTarget.category.id, version: confirmTarget.category.version },
          {
            onSuccess: () => {
              toast({ title: "Produktkategorie gelöscht" });
              setConfirmTarget(null);
            },
            onError: (error) => showActionError(resolveCategoryDeleteError(error, "Produktkategorie")),
          },
        );
        return;
      case "components-in-category":
        deleteAllComponentsInCategoryMutation.mutate(confirmTarget.category.id, {
          onSuccess: (result) => {
            toast({
              title: result.skippedCount > 0
                ? `${result.deletedCount} Komponenten gelöscht, ${result.skippedCount} noch in Verwendung`
                : `${result.deletedCount} Komponenten gelöscht`,
            });
            setConfirmTarget(null);
          },
          onError: () => showActionError("Komponenten konnten nicht gelöscht werden"),
        });
        return;
      case "component-category":
        categoryMutations.deleteComponent.mutate(
          { id: confirmTarget.category.id, version: confirmTarget.category.version },
          {
            onSuccess: () => {
              toast({ title: "Komponentenkategorie gelöscht" });
              setConfirmTarget(null);
            },
            onError: (error) => showActionError(resolveCategoryDeleteError(error, "Komponentenkategorie")),
          },
        );
    }
  };

  const renderCategorySection = (
    title: string,
    rows: Array<ProductCategory | ComponentCategory>,
    editRow: VersionedRow | null,
    setEditRow: (row: any) => void,
    draftValue: string,
    setDraftValue: (value: string) => void,
    onSave: () => void,
    onDelete: (row: any) => void,
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
              <TableHead className="w-px whitespace-nowrap">Default</TableHead>
              <TableHead className="w-[220px] text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className={editRow?.id === row.id ? "bg-slate-50" : undefined} onClick={() => { setEditRow(editRow?.id === row.id ? null : { ...row }); }}>
                <TableCell>{row.name}</TableCell>
                <TableCell className="w-px whitespace-nowrap">{row.isDefault ? "Ja" : "Nein"}</TableCell>
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
    <>
      <ListLayout
      title="Produkte"
      icon={null}
      isLoading={isLoading}
      hideHeader
      contentSlot={(
        <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(420px,1fr)]">
          <input ref={productCategoryImportInputRef} type="file" accept=".csv,text/csv" className="hidden" data-testid="input-product-category-import-file" onChange={(event) => { const file = event.target.files?.[0]; if (file && pendingProductCategoryImportId) productCategoryImportMutation.mutate({ categoryId: pendingProductCategoryImportId, file }); }} />
          <input ref={componentCategoryImportInputRef} type="file" accept=".csv,text/csv" className="hidden" data-testid="input-component-category-import-file" onChange={(event) => { const file = event.target.files?.[0]; if (file && pendingComponentCategoryImportId) componentCategoryImportMutation.mutate({ categoryId: pendingComponentCategoryImportId, file }); }} />
          {actionError ? (
            <div className="xl:col-span-2">
              <DialogBaseInlineMessage
                title={actionError.title}
                description={actionError.description}
                tone="error"
              />
            </div>
          ) : null}

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-2">
            <ProductDropDown products={filteredProducts} categories={productCategories} selectedProductId={selectedProductId} onSelectProduct={setSelectedProductId} onCreateProduct={createProductFromDropDown} onDeleteProduct={requestDeleteProduct} onDeleteAllInCategory={requestDeleteAllProductsInCategory} isAdmin={isAdmin} />
            <section className="rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-products">
              <ProductDetails draft={productDraft} disabled={!selectedProduct} isAdmin={isAdmin} onDraftChange={setProductDraft} onSubmit={() => void updateSelectedProduct()} />
            </section>
            <AllComponentList components={components} categories={componentCategories} isAdmin={isAdmin} onCreateComponent={createStandaloneComponent} onUpdateComponent={updateComponentData} onDeleteComponent={deleteSelectedComponentWithConflictDetails} onDeleteAllComponentsInCategory={requestDeleteAllComponentsInCategory} />
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
            }, (row) => { clearActionError(); setConfirmTarget({ kind: "product-category", category: row }); }, "master-data-product-categories", "input-new-product-category", "button-create-product-category")}
            {renderCategorySection("Komponentenkategorien", componentCategories, editComponentCategory, setEditComponentCategory, editComponentCategory ? editComponentCategory.name : newComponentCategoryName, editComponentCategory ? (value) => setEditComponentCategory({ ...editComponentCategory, name: value }) : setNewComponentCategoryName, () => {
              if (editComponentCategory) {
                if (!editComponentCategory.name.trim()) return;
                categoryMutations.updateComponent.mutate({ id: editComponentCategory.id, version: editComponentCategory.version, name: editComponentCategory.name.trim(), isDefault: Boolean(editComponentCategory.isDefault) }, { onError: (error) => handleCategoryMutationError(error, "Komponentenkategorie existiert bereits", "Komponentenkategorie konnte nicht aktualisiert werden") });
                return;
              }
              if (!newComponentCategoryName.trim()) return;
              categoryMutations.createComponent.mutate(undefined, { onError: (error) => handleCategoryMutationError(error, "Komponentenkategorie existiert bereits", "Komponentenkategorie konnte nicht angelegt werden") });
            }, (row) => { clearActionError(); setConfirmTarget({ kind: "component-category", category: row }); }, "master-data-component-categories", "input-new-component-category", "button-create-component-category")}
          </div>
        </div>
      )}
      />
      {confirmDialogContent ? (
        <ConfirmDialogBase
          open={confirmTarget !== null}
          onOpenChange={(open) => {
            if (!open && !isConfirmPending) {
              setConfirmTarget(null);
            }
          }}
          title={confirmDialogContent.title}
          description={confirmDialogContent.description}
          confirmLabel={confirmDialogContent.confirmLabel}
          icon={confirmDialogContent.icon}
          isPending={isConfirmPending}
          pendingLabel="Lösche..."
          variant="destructive"
          testId={confirmDialogContent.testId}
          onConfirm={handleConfirmTarget}
        />
      ) : null}
    </>
  );
}
