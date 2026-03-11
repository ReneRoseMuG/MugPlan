import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Component, ComponentCategory, Product, ProductCategory, ProductComponent } from "@shared/schema";
import { ListLayout } from "@/components/ui/list-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AllComponentList } from "@/components/ui/all-component-list";
import { ProductData, type ProductDataDraft } from "@/components/ui/product-data";
import { ProductDropDown } from "@/components/ui/product-drop-down";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ActiveScope = "active" | "inactive" | "all";

type ProductMutationInput = {
  id: number;
  version: number;
  name?: string;
  categoryId?: number;
  description?: string | null;
  isActive?: boolean;
};

type ComponentMutationInput = {
  id: number;
  version: number;
  name?: string;
  categoryId?: number;
  description?: string | null;
  isActive?: boolean;
  productIds?: number[];
};

type ComponentEditorInput = {
  name: string;
  categoryId: number;
  description: string | null;
  isActive: boolean;
};

type CategoryImportResponse = {
  summary: {
    totalRows: number;
    createdRows: number;
    updatedRows: number;
    reactivatedRows: number;
    invalidRows: number;
    errorRows: number;
  };
};

const DEFAULT_PRODUCT_CATEGORY_NAME = "Alle Produkte";
const DEFAULT_COMPONENT_CATEGORY_NAME = "Alle Komponenten";

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

function resolveCategoryImportError(code: string | null, entityLabel: "Produkte" | "Komponenten"): { title: string; description?: string } {
  if (code === "INVALID_CSV_HEADER") {
    return {
      title: `CSV-Header fuer ${entityLabel.toLocaleLowerCase("de")} ungueltig`,
      description: 'Erwartet wird mindestens eine Spalte "Name". Optional sind "Beschreibung" und "IsActive".',
    };
  }
  if (code === "INVALID_CSV_FORMAT") {
    return {
      title: `CSV-Datei fuer ${entityLabel.toLocaleLowerCase("de")} ist formal ungueltig`,
      description: "Bitte Trennzeichen, Quotes und Dateiformat pruefen.",
    };
  }
  if (code === "INVALID_CSV_CONTENT") {
    return {
      title: `CSV-Datei fuer ${entityLabel.toLocaleLowerCase("de")} enthaelt keine gueltigen Daten`,
      description: "Nach dem Header muss mindestens eine verwertbare Zeile mit Name vorhanden sein.",
    };
  }
  if (code === "NOT_FOUND") {
    return {
      title: `${entityLabel} konnten nicht importiert werden`,
      description: "Die gewaehlte Kategorie wurde nicht gefunden.",
    };
  }
  if (code === "FORBIDDEN") {
    return {
      title: `${entityLabel} konnten nicht importiert werden`,
      description: "Der Import ist nur fuer Admins erlaubt.",
    };
  }
  return {
    title: `${entityLabel}import fehlgeschlagen`,
    description: code ? `Servercode: ${code}` : "Die genaue Ursache konnte nicht aufgeloest werden.",
  };
}

function toProductDraft(product: Product | null): ProductDataDraft {
  if (!product) {
    return {
      name: "",
      description: "",
      categoryId: "",
      isActive: true,
    };
  }
  return {
    name: product.name,
    description: product.description ?? "",
    categoryId: String(product.categoryId),
    isActive: product.isActive,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed for ${url}`);
  }
  return response.json() as Promise<T>;
}

async function invalidateMasterDataQueries(activeScope: ActiveScope): Promise<void> {
  const urls = [
    `/api/admin/master-data/product-categories?active=${activeScope}`,
    `/api/admin/master-data/component-categories?active=${activeScope}`,
    `/api/admin/master-data/products?active=${activeScope}`,
    `/api/admin/master-data/components?active=${activeScope}`,
    "/api/admin/master-data/component-products",
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
  const [productCategoryFilterId, setProductCategoryFilterId] = useState("");

  const [newProductCategoryName, setNewProductCategoryName] = useState("");
  const [editProductCategory, setEditProductCategory] = useState<ProductCategory | null>(null);

  const [newComponentCategoryName, setNewComponentCategoryName] = useState("");
  const [editComponentCategory, setEditComponentCategory] = useState<ComponentCategory | null>(null);
  const productCategoryImportInputRef = useRef<HTMLInputElement | null>(null);
  const componentCategoryImportInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingProductCategoryImportId, setPendingProductCategoryImportId] = useState<number | null>(null);
  const [pendingComponentCategoryImportId, setPendingComponentCategoryImportId] = useState<number | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productDraft, setProductDraft] = useState<ProductDataDraft>(toProductDraft(null));

  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";

  const productCategoriesUrl = `/api/admin/master-data/product-categories?active=${activeScope}`;
  const componentCategoriesUrl = `/api/admin/master-data/component-categories?active=${activeScope}`;
  const productsUrl = `/api/admin/master-data/products?active=${activeScope}`;
  const componentsUrl = `/api/admin/master-data/components?active=${activeScope}`;
  const componentProductsUrl = "/api/admin/master-data/component-products";

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

  const componentProductsQuery = useQuery<ProductComponent[]>({
    queryKey: [componentProductsUrl],
    queryFn: () => fetchJson(componentProductsUrl),
  });

  const productCategories = productCategoriesQuery.data ?? [];
  const componentCategories = componentCategoriesQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const components = componentsQuery.data ?? [];
  const componentProducts = componentProductsQuery.data ?? [];

  const componentCategoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of componentCategories) map.set(row.id, row.name);
    return map;
  }, [componentCategories]);

  const productIdsByComponentId = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const row of componentProducts) {
      const current = map.get(row.componentId);
      if (current) {
        current.push(row.productId);
      } else {
        map.set(row.componentId, [row.productId]);
      }
    }
    return map;
  }, [componentProducts]);

  const filteredProducts = useMemo(() => {
    if (!productCategoryFilterId) return products;
    const categoryId = Number(productCategoryFilterId);
    if (!Number.isFinite(categoryId) || categoryId <= 0) return products;
    return products.filter((row) => row.categoryId === categoryId);
  }, [productCategoryFilterId, products]);

  const selectedProduct = useMemo(
    () => products.find((row) => String(row.id) === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  useEffect(() => {
    setProductDraft(toProductDraft(selectedProduct));
  }, [selectedProduct]);

  const selectedProductComponents = useMemo(() => {
    if (!selectedProduct) return [];
    return components
      .filter((row) => (productIdsByComponentId.get(row.id) ?? []).includes(selectedProduct.id))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [components, productIdsByComponentId, selectedProduct]);

  const allComponents = useMemo(
    () => components.slice().sort((a, b) => a.name.localeCompare(b.name, "de")),
    [components],
  );

  const createProductCategoryMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/admin/master-data/product-categories", {
        name: newProductCategoryName.trim(),
        isActive: true,
        version: 1,
      }),
    onSuccess: async () => {
      setNewProductCategoryName("");
      await invalidateMasterDataQueries(activeScope);
    },
    onError: (error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "BUSINESS_CONFLICT" ? "Produktkategorie existiert bereits" : "Produktkategorie konnte nicht angelegt werden",
        variant: "destructive",
      });
    },
  });

  const updateProductCategoryMutation = useMutation({
    mutationFn: async (input: { id: number; version: number; name?: string; isActive?: boolean }) =>
      apiRequest("PUT", `/api/admin/master-data/product-categories/${input.id}`, {
        version: input.version,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      }),
    onSuccess: async () => {
      setEditProductCategory(null);
      await invalidateMasterDataQueries(activeScope);
    },
    onError: (error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "VERSION_CONFLICT" ? "Produktkategorie wurde zwischenzeitlich geändert" : "Produktkategorie konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    },
  });

  const deleteProductCategoryMutation = useMutation({
    mutationFn: async (input: { id: number; version: number }) =>
      apiRequest("DELETE", `/api/admin/master-data/product-categories/${input.id}`, { version: input.version }),
    onSuccess: async () => {
      await invalidateMasterDataQueries(activeScope);
    },
    onError: (error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "BUSINESS_CONFLICT" ? "Produktkategorie wird noch verwendet" : "Produktkategorie konnte nicht gelöscht werden",
        variant: "destructive",
      });
    },
  });

  const createComponentCategoryMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/admin/master-data/component-categories", {
        name: newComponentCategoryName.trim(),
        isActive: true,
        version: 1,
      }),
    onSuccess: async () => {
      setNewComponentCategoryName("");
      await invalidateMasterDataQueries(activeScope);
    },
    onError: (error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "BUSINESS_CONFLICT" ? "Komponentenkategorie existiert bereits" : "Komponentenkategorie konnte nicht angelegt werden",
        variant: "destructive",
      });
    },
  });

  const updateComponentCategoryMutation = useMutation({
    mutationFn: async (input: { id: number; version: number; name?: string; isActive?: boolean }) =>
      apiRequest("PUT", `/api/admin/master-data/component-categories/${input.id}`, {
        version: input.version,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      }),
    onSuccess: async () => {
      setEditComponentCategory(null);
      await invalidateMasterDataQueries(activeScope);
    },
    onError: (error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "VERSION_CONFLICT" ? "Komponentenkategorie wurde zwischenzeitlich geändert" : "Komponentenkategorie konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    },
  });

  const deleteComponentCategoryMutation = useMutation({
    mutationFn: async (input: { id: number; version: number }) =>
      apiRequest("DELETE", `/api/admin/master-data/component-categories/${input.id}`, { version: input.version }),
    onSuccess: async () => {
      await invalidateMasterDataQueries(activeScope);
    },
    onError: (error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "BUSINESS_CONFLICT" ? "Komponentenkategorie wird noch verwendet" : "Komponentenkategorie konnte nicht gelöscht werden",
        variant: "destructive",
      });
    },
  });

  const productCategoryImportMutation = useMutation({
    mutationFn: async (input: { categoryId: number; file: File }) => {
      const body = new FormData();
      body.append("file", input.file);
      const response = await fetch(`/api/admin/master-data/product-categories/${input.categoryId}/import-csv`, {
        method: "POST",
        body,
        credentials: "include",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Produktimport fehlgeschlagen");
      }
      return response.json() as Promise<CategoryImportResponse>;
    },
    onSuccess: async (result) => {
      await invalidateMasterDataQueries(activeScope);
      toast({
        title: `Produktimport: ${result.summary.createdRows} neu, ${result.summary.updatedRows} aktualisiert, ${result.summary.reactivatedRows} reaktiviert`,
      });
    },
    onError: (error) => {
      const code = extractApiCode(error);
      const message = resolveCategoryImportError(code, "Produkte");
      toast({
        title: message.title,
        description: message.description,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setPendingProductCategoryImportId(null);
      if (productCategoryImportInputRef.current) {
        productCategoryImportInputRef.current.value = "";
      }
    },
  });

  const componentCategoryImportMutation = useMutation({
    mutationFn: async (input: { categoryId: number; file: File }) => {
      const body = new FormData();
      body.append("file", input.file);
      const response = await fetch(`/api/admin/master-data/component-categories/${input.categoryId}/import-csv`, {
        method: "POST",
        body,
        credentials: "include",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Komponentenimport fehlgeschlagen");
      }
      return response.json() as Promise<CategoryImportResponse>;
    },
    onSuccess: async (result) => {
      await invalidateMasterDataQueries(activeScope);
      toast({
        title: `Komponentenimport: ${result.summary.createdRows} neu, ${result.summary.updatedRows} aktualisiert, ${result.summary.reactivatedRows} reaktiviert`,
      });
    },
    onError: (error) => {
      const code = extractApiCode(error);
      const message = resolveCategoryImportError(code, "Komponenten");
      toast({
        title: message.title,
        description: message.description,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setPendingComponentCategoryImportId(null);
      if (componentCategoryImportInputRef.current) {
        componentCategoryImportInputRef.current.value = "";
      }
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (input: { name: string; categoryId: number }) => {
      const response = await apiRequest("POST", "/api/admin/master-data/products", {
        name: input.name.trim(),
        categoryId: input.categoryId,
        description: null,
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
    mutationFn: async (input: ProductMutationInput) => {
      const response = await apiRequest("PUT", `/api/admin/master-data/products/${input.id}`, {
        version: input.version,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      });
      return response.json() as Promise<Product>;
    },
    onSuccess: async () => {
      await invalidateMasterDataQueries(activeScope);
    },
  });

  const createComponentMutation = useMutation({
    mutationFn: async (input: ComponentEditorInput & { productId: number }) => {
      const componentResponse = await apiRequest("POST", "/api/admin/master-data/components", {
        name: input.name.trim(),
        categoryId: input.categoryId,
        description: input.description,
        isActive: true,
        version: 1,
      });
      const createdComponent = await componentResponse.json() as Component;
      const relationResponse = await apiRequest(
        "PUT",
        `/api/admin/master-data/components/${createdComponent.id}/products`,
        {
          version: createdComponent.version,
          productIds: [input.productId],
        },
      );
      return relationResponse.json() as Promise<Component>;
    },
    onSuccess: async () => {
      await invalidateMasterDataQueries(activeScope);
    },
  });

  const updateComponentMutation = useMutation({
    mutationFn: async (input: ComponentMutationInput) => {
      const componentResponse = await apiRequest("PUT", `/api/admin/master-data/components/${input.id}`, {
        version: input.version,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      });
      let updatedComponent = await componentResponse.json() as Component;
      if (input.productIds !== undefined) {
        const relationResponse = await apiRequest("PUT", `/api/admin/master-data/components/${input.id}/products`, {
          version: updatedComponent.version,
          productIds: Array.from(new Set(input.productIds)),
        });
        updatedComponent = await relationResponse.json() as Component;
      }
      return updatedComponent;
    },
    onSuccess: async () => {
      await invalidateMasterDataQueries(activeScope);
    },
  });

  const isLoading = productCategoriesQuery.isLoading
    || componentCategoriesQuery.isLoading
    || productsQuery.isLoading
    || componentsQuery.isLoading
    || componentProductsQuery.isLoading;

  async function createProductFromDropDown(input: { name: string; categoryId: number }): Promise<Product> {
    try {
      return await createProductMutation.mutateAsync(input);
    } catch (error) {
      const code = extractApiCode(error);
      throw new Error(code === "BUSINESS_CONFLICT" ? "Produktname existiert bereits." : "Produkt konnte nicht angelegt werden.");
    }
  }

  async function updateSelectedProduct(): Promise<void> {
    if (!selectedProduct || !productDraft.name.trim() || !productDraft.categoryId) return;
    try {
      await updateProductMutation.mutateAsync({
        id: selectedProduct.id,
        version: selectedProduct.version,
        name: productDraft.name.trim(),
        categoryId: Number(productDraft.categoryId),
        description: productDraft.description.trim() || null,
        isActive: productDraft.isActive,
      });
      toast({ title: "Produkt aktualisiert" });
    } catch (error) {
      const code = extractApiCode(error);
      toast({
        title: code === "BUSINESS_CONFLICT" ? "Produktname existiert bereits" : "Produkt konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    }
  }

  async function createComponentForProduct(input: ComponentEditorInput): Promise<void> {
    if (!selectedProduct) {
      throw new Error("Kein Produkt ausgewählt.");
    }
    try {
      await createComponentMutation.mutateAsync({
        ...input,
        productId: selectedProduct.id,
      });
      toast({ title: "Komponente angelegt" });
    } catch (error) {
      const code = extractApiCode(error);
      throw new Error(code === "BUSINESS_CONFLICT" ? "Komponentenname existiert bereits." : "Komponente konnte nicht angelegt werden.");
    }
  }

  async function createStandaloneComponent(input: ComponentEditorInput): Promise<void> {
    try {
      await apiRequest("POST", "/api/admin/master-data/components", {
        name: input.name.trim(),
        categoryId: input.categoryId,
        description: input.description,
        isActive: true,
        version: 1,
      });
      await invalidateMasterDataQueries(activeScope);
      toast({ title: "Komponente angelegt" });
    } catch (error) {
      const code = extractApiCode(error);
      throw new Error(code === "BUSINESS_CONFLICT" ? "Komponentenname existiert bereits." : "Komponente konnte nicht angelegt werden.");
    }
  }

  async function updateComponentData(component: Component, input: ComponentEditorInput): Promise<void> {
    try {
      await updateComponentMutation.mutateAsync({
        id: component.id,
        version: component.version,
        name: input.name.trim(),
        categoryId: input.categoryId,
        description: input.description,
        isActive: input.isActive,
      });
      toast({ title: "Komponente aktualisiert" });
    } catch (error) {
      const code = extractApiCode(error);
      throw new Error(code === "BUSINESS_CONFLICT" ? "Komponentenname existiert bereits." : "Komponente konnte nicht aktualisiert werden.");
    }
  }

  async function removeComponentFromProduct(component: Component): Promise<void> {
    if (!selectedProduct) return;
    try {
      await updateComponentMutation.mutateAsync({
        id: component.id,
        version: component.version,
        productIds: (productIdsByComponentId.get(component.id) ?? []).filter((id) => id !== selectedProduct.id),
      });
      toast({ title: "Komponente entfernt" });
    } catch {
      toast({ title: "Komponente konnte nicht entfernt werden", variant: "destructive" });
    }
  }

  async function insertComponentIntoProduct(component: Component): Promise<void> {
    if (!selectedProduct) return;
    try {
      await updateComponentMutation.mutateAsync({
        id: component.id,
        version: component.version,
        productIds: [...(productIdsByComponentId.get(component.id) ?? []), selectedProduct.id],
      });
      toast({ title: "Komponente eingefügt" });
    } catch {
      toast({ title: "Komponente konnte nicht eingefügt werden", variant: "destructive" });
    }
  }

  void selectedProductComponents;
  void createComponentForProduct;
  void updateComponentData;
  void removeComponentFromProduct;
  void insertComponentIntoProduct;

  const triggerProductCategoryImport = (categoryId: number) => {
    setPendingProductCategoryImportId(categoryId);
    productCategoryImportInputRef.current?.click();
  };

  const triggerComponentCategoryImport = (categoryId: number) => {
    setPendingComponentCategoryImportId(categoryId);
    componentCategoryImportInputRef.current?.click();
  };

  return (
    <ListLayout
      title="Produkte"
      icon={null}
      isLoading={isLoading}
      hideHeader
      contentSlot={(
        <div className="flex h-full min-h-0 flex-col gap-4">
          <input
            ref={productCategoryImportInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            data-testid="input-product-category-import-file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file || !pendingProductCategoryImportId) return;
              productCategoryImportMutation.mutate({ categoryId: pendingProductCategoryImportId, file });
            }}
          />
          <input
            ref={componentCategoryImportInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            data-testid="input-component-category-import-file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file || !pendingComponentCategoryImportId) return;
              componentCategoryImportMutation.mutate({ categoryId: pendingComponentCategoryImportId, file });
            }}
          />
          <div className="order-2 min-h-0 basis-1/3 overflow-hidden">
            <div className="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-2">
              <section className="flex min-h-0 flex-col rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="master-data-product-categories">
                <h4 className="font-bold text-slate-900">Produktkategorien</h4>
                <div className="mt-3 flex items-end gap-2">
                  <Input
                    value={editProductCategory ? editProductCategory.name : newProductCategoryName}
                    onChange={(event) => {
                      if (editProductCategory) {
                        setEditProductCategory({ ...editProductCategory, name: event.target.value });
                      } else {
                        setNewProductCategoryName(event.target.value);
                      }
                    }}
                    placeholder={editProductCategory ? "Produktkategorie bearbeiten" : "Neue Produktkategorie"}
                    data-testid="input-new-product-category"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (editProductCategory) {
                        if (!editProductCategory.name.trim() || editProductCategory.name === DEFAULT_PRODUCT_CATEGORY_NAME) return;
                        updateProductCategoryMutation.mutate({
                          id: editProductCategory.id,
                          version: editProductCategory.version,
                          name: editProductCategory.name.trim(),
                        });
                        return;
                      }
                      if (!newProductCategoryName.trim()) return;
                      createProductCategoryMutation.mutate();
                    }}
                    data-testid="button-create-product-category"
                  >
                    {editProductCategory ? "Speichern" : "Neu"}
                  </Button>
                  {editProductCategory ? (
                    <Button variant="outline" onClick={() => {
                      setEditProductCategory(null);
                      setProductCategoryFilterId("");
                    }}>
                      Abbrechen
                    </Button>
                  ) : null}
                </div>
                <div className="mt-4 min-h-0 flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[330px] text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productCategories.map((row) => (
                        <TableRow
                          key={row.id}
                          className={editProductCategory?.id === row.id ? "bg-slate-50" : undefined}
                          onClick={() => {
                            if (row.name === DEFAULT_PRODUCT_CATEGORY_NAME) return;
                            setEditProductCategory(editProductCategory?.id === row.id ? null : { ...row });
                            setProductCategoryFilterId(editProductCategory?.id === row.id ? "" : String(row.id));
                          }}
                        >
                          <TableCell>{row.name}</TableCell>
                          <TableCell className="space-x-2 text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={row.name === DEFAULT_PRODUCT_CATEGORY_NAME}
                            >
                              {editProductCategory?.id === row.id ? "Ausgewählt" : "Bearbeiten"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                triggerProductCategoryImport(row.id);
                              }}
                              data-testid={`button-product-category-import-${row.id}`}
                            >
                              Daten importieren
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!window.confirm(`Produktkategorie "${row.name}" löschen?`)) return;
                                deleteProductCategoryMutation.mutate({ id: row.id, version: row.version });
                              }}
                            >
                              -
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>

              <section className="flex min-h-0 flex-col rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="master-data-component-categories">
                <h4 className="font-bold text-slate-900">Komponentenkategorien</h4>
                <div className="mt-3 flex items-end gap-2">
                  <Input
                    value={editComponentCategory ? editComponentCategory.name : newComponentCategoryName}
                    onChange={(event) => {
                      if (editComponentCategory) {
                        setEditComponentCategory({ ...editComponentCategory, name: event.target.value });
                      } else {
                        setNewComponentCategoryName(event.target.value);
                      }
                    }}
                    placeholder={editComponentCategory ? "Komponentenkategorie bearbeiten" : "Neue Komponentenkategorie"}
                    data-testid="input-new-component-category"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (editComponentCategory) {
                        if (!editComponentCategory.name.trim() || editComponentCategory.name === DEFAULT_COMPONENT_CATEGORY_NAME) return;
                        updateComponentCategoryMutation.mutate({
                          id: editComponentCategory.id,
                          version: editComponentCategory.version,
                          name: editComponentCategory.name.trim(),
                        });
                        return;
                      }
                      if (!newComponentCategoryName.trim()) return;
                      createComponentCategoryMutation.mutate();
                    }}
                    data-testid="button-create-component-category"
                  >
                    {editComponentCategory ? "Speichern" : "Neu"}
                  </Button>
                  {editComponentCategory ? (
                    <Button variant="outline" onClick={() => {
                      setEditComponentCategory(null);
                    }}>
                      Abbrechen
                    </Button>
                  ) : null}
                </div>
                <div className="mt-4 min-h-0 flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[330px] text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {componentCategories.map((row) => (
                        <TableRow
                          key={row.id}
                          className={editComponentCategory?.id === row.id ? "bg-slate-50" : undefined}
                          onClick={() => {
                            if (row.name === DEFAULT_COMPONENT_CATEGORY_NAME) return;
                            setEditComponentCategory(editComponentCategory?.id === row.id ? null : { ...row });
                          }}
                        >
                          <TableCell>{row.name}</TableCell>
                          <TableCell className="space-x-2 text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={row.name === DEFAULT_COMPONENT_CATEGORY_NAME}
                            >
                              {editComponentCategory?.id === row.id ? "Ausgewählt" : "Bearbeiten"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                triggerComponentCategoryImport(row.id);
                              }}
                              data-testid={`button-component-category-import-${row.id}`}
                            >
                              Daten importieren
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!window.confirm(`Komponentenkategorie "${row.name}" löschen?`)) return;
                                deleteComponentCategoryMutation.mutate({ id: row.id, version: row.version });
                              }}
                            >
                              -
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </div>
          </div>

          <div className="order-1 min-h-0 basis-2/3 overflow-hidden">
            <section className="flex h-full min-h-0 flex-col rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-products">
              <h4 className="font-bold text-slate-900">Produkte</h4>
              <div className="mt-3 flex min-h-0 flex-1 flex-col gap-4">
                <ProductDropDown
                  products={filteredProducts}
                  categories={productCategories}
                  selectedProductId={selectedProductId}
                  onSelectProduct={setSelectedProductId}
                  onCreateProduct={createProductFromDropDown}
                  isAdmin={isAdmin}
                />

                <ProductData
                  draft={productDraft}
                  categories={productCategories}
                  disabled={!selectedProduct}
                  isAdmin={isAdmin}
                  onDraftChange={setProductDraft}
                  onSubmit={() => void updateSelectedProduct()}
                />

                <AllComponentList
                  components={allComponents}
                  categories={componentCategories}
                  categoryNameById={componentCategoryNameById}
                  isAdmin={isAdmin}
                  onCreateComponent={createStandaloneComponent}
                />
              </div>
            </section>
          </div>
        </div>
      )}
    />
  );
}
