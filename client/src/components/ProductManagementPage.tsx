import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Component, ComponentCategory, Product, ProductCategory, ProductComponent } from "@shared/schema";
import { ListLayout } from "@/components/ui/list-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

type ComponentMutationInput = ProductMutationInput & {
  productIds?: number[];
};

const DEFAULT_PRODUCT_CATEGORY_NAME = "Alle Produkte";
const DEFAULT_COMPONENT_CATEGORY_NAME = "Alle Modelle";

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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed for ${url}`);
  }
  return response.json() as Promise<T>;
}

function formatProductNames(productIds: number[] | undefined, productNameById: Map<number, string>): string {
  if (!productIds || productIds.length === 0) return "-";
  return productIds.map((id) => productNameById.get(id) ?? `#${id}`).join(", ");
}

async function invalidateMasterDataQueries(activeScope: ActiveScope): Promise<void> {
  const urls = [
    `/api/admin/master-data/product-categories?active=${activeScope}`,
    `/api/admin/master-data/component-categories?active=${activeScope}`,
    `/api/admin/master-data/products?active=${activeScope}`,
    `/api/admin/master-data/components?active=${activeScope}`,
    "/api/admin/master-data/tags",
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
  const [componentCategoryFilterId, setComponentCategoryFilterId] = useState("");
  const [componentProductFilterId, setComponentProductFilterId] = useState("");

  const [newProductCategoryName, setNewProductCategoryName] = useState("");
  const [editProductCategory, setEditProductCategory] = useState<ProductCategory | null>(null);

  const [newComponentCategoryName, setNewComponentCategoryName] = useState("");
  const [editComponentCategory, setEditComponentCategory] = useState<ComponentCategory | null>(null);

  const [newProduct, setNewProduct] = useState({ name: "", categoryId: "", description: "" });
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const [newComponent, setNewComponent] = useState({ name: "", categoryId: "", description: "", productIds: [] as number[] });
  const [newComponentProductId, setNewComponentProductId] = useState("");
  const [editComponent, setEditComponent] = useState<Component | null>(null);
  const [editComponentProductIds, setEditComponentProductIds] = useState<number[]>([]);
  const [editComponentProductId, setEditComponentProductId] = useState("");

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
  const isDefaultProductCategory = (category: ProductCategory): boolean => category.name === DEFAULT_PRODUCT_CATEGORY_NAME;
  const isDefaultComponentCategory = (category: ComponentCategory): boolean => category.name === DEFAULT_COMPONENT_CATEGORY_NAME;

  const productCategoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of productCategories) map.set(row.id, row.name);
    return map;
  }, [productCategories]);

  const componentCategoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of componentCategories) map.set(row.id, row.name);
    return map;
  }, [componentCategories]);

  const productNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of products) map.set(row.id, row.name);
    return map;
  }, [products]);

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

  const filteredComponents = useMemo(() => {
    let nextRows = components;

    if (componentCategoryFilterId) {
      const categoryId = Number(componentCategoryFilterId);
      if (Number.isFinite(categoryId) && categoryId > 0) {
        nextRows = nextRows.filter((row) => row.categoryId === categoryId);
      }
    }

    if (componentProductFilterId) {
      const productId = Number(componentProductFilterId);
      if (Number.isFinite(productId) && productId > 0) {
        nextRows = nextRows.filter((row) => (productIdsByComponentId.get(row.id) ?? []).includes(productId));
      }
    }

    return nextRows;
  }, [componentCategoryFilterId, componentProductFilterId, components, productIdsByComponentId]);

  function toggleProductCategorySelection(row: ProductCategory) {
    if (isDefaultProductCategory(row)) return;
    if (editProductCategory?.id === row.id) {
      setEditProductCategory(null);
      setProductCategoryFilterId("");
      return;
    }
    setEditProductCategory({ ...row });
    setProductCategoryFilterId(String(row.id));
  }

  function toggleComponentCategorySelection(row: ComponentCategory) {
    if (isDefaultComponentCategory(row)) return;
    if (editComponentCategory?.id === row.id) {
      setEditComponentCategory(null);
      setComponentCategoryFilterId("");
      return;
    }
    setEditComponentCategory({ ...row });
    setComponentCategoryFilterId(String(row.id));
  }

  function toggleProductSelection(row: Product) {
    if (editProduct?.id === row.id) {
      setEditProduct(null);
      setComponentProductFilterId("");
      return;
    }
    setEditProduct({ ...row });
    setComponentProductFilterId(String(row.id));
  }

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
        title: code === "BUSINESS_CONFLICT" ? "Modellkategorie existiert bereits" : "Modellkategorie konnte nicht angelegt werden",
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
        title: code === "VERSION_CONFLICT" ? "Modellkategorie wurde zwischenzeitlich geändert" : "Modellkategorie konnte nicht aktualisiert werden",
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
        title: code === "BUSINESS_CONFLICT" ? "Modellkategorie wird noch verwendet" : "Modellkategorie konnte nicht gelöscht werden",
        variant: "destructive",
      });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/admin/master-data/products", {
        name: newProduct.name.trim(),
        categoryId: Number(newProduct.categoryId),
        description: newProduct.description.trim() || null,
        isActive: true,
        version: 1,
      }),
    onSuccess: async () => {
      setNewProduct({ name: "", categoryId: "", description: "" });
      await invalidateMasterDataQueries(activeScope);
    },
    onError: (error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "BUSINESS_CONFLICT" ? "Produkt konnte nicht angelegt werden (Name/Kategorie prüfen)" : "Produkt konnte nicht angelegt werden",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (input: ProductMutationInput) =>
      apiRequest("PUT", `/api/admin/master-data/products/${input.id}`, {
        version: input.version,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      }),
    onSuccess: async () => {
      setEditProduct(null);
      await invalidateMasterDataQueries(activeScope);
    },
    onError: (error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "VERSION_CONFLICT" ? "Produkt wurde zwischenzeitlich geändert" : "Produkt konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (input: { id: number; version: number }) =>
      apiRequest("DELETE", `/api/admin/master-data/products/${input.id}`, { version: input.version }),
    onSuccess: async () => {
      await invalidateMasterDataQueries(activeScope);
    },
    onError: (error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "BUSINESS_CONFLICT" ? "Produkt wird noch verwendet" : "Produkt konnte nicht gelöscht werden",
        variant: "destructive",
      });
    },
  });

  const createComponentMutation = useMutation({
    mutationFn: async () => {
      const componentResponse = await apiRequest("POST", "/api/admin/master-data/components", {
        name: newComponent.name.trim(),
        categoryId: Number(newComponent.categoryId),
        description: newComponent.description.trim() || null,
        isActive: true,
        version: 1,
      });
      const createdComponent = await componentResponse.json() as Component;
      const relationResponse = await apiRequest(
        "PUT",
        `/api/admin/master-data/components/${createdComponent.id}/products`,
        {
          version: createdComponent.version,
          productIds: Array.from(new Set(newComponent.productIds)),
        },
      );
      return relationResponse.json() as Promise<Component>;
    },
    onSuccess: async () => {
      setNewComponent({ name: "", categoryId: "", description: "", productIds: [] });
      setNewComponentProductId("");
      await invalidateMasterDataQueries(activeScope);
    },
    onError: (error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "BUSINESS_CONFLICT" ? "Modell konnte nicht angelegt werden (Werte prüfen)" : "Modell konnte nicht angelegt werden",
        variant: "destructive",
      });
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
      setEditComponent(null);
      setEditComponentProductIds([]);
      setEditComponentProductId("");
      await invalidateMasterDataQueries(activeScope);
    },
    onError: (error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "VERSION_CONFLICT" ? "Modell wurde zwischenzeitlich geändert" : "Modell konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    },
  });

  const deleteComponentMutation = useMutation({
    mutationFn: async (input: { id: number; version: number }) =>
      apiRequest("DELETE", `/api/admin/master-data/components/${input.id}`, { version: input.version }),
    onSuccess: async () => {
      await invalidateMasterDataQueries(activeScope);
    },
    onError: (error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "BUSINESS_CONFLICT" ? "Modell wird noch verwendet" : "Modell konnte nicht gelöscht werden",
        variant: "destructive",
      });
    },
  });

  const isLoading = productCategoriesQuery.isLoading
    || componentCategoriesQuery.isLoading
    || productsQuery.isLoading
    || componentsQuery.isLoading
    || componentProductsQuery.isLoading;

  return (
    <ListLayout
      title="Produkte"
      icon={null}
      isLoading={isLoading}
      hideHeader
      contentSlot={(
        <div className="flex h-full min-h-0 flex-col gap-4">
          <div className="order-2 min-h-0 basis-1/3 overflow-hidden">
            <div className="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-2">
            <section className="flex min-h-0 flex-col rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-product-categories">
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
                        if (!editProductCategory.name.trim() || isDefaultProductCategory(editProductCategory)) return;
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
                        onClick={() => toggleProductCategorySelection(row)}
                      >
                        <TableCell>{row.name}</TableCell>
                        <TableCell className="space-x-2 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isDefaultProductCategory(row)}
                            title={isDefaultProductCategory(row) ? "Default-Kategorie ist nicht bearbeitbar" : undefined}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleProductCategorySelection(row);
                            }}
                          >
                            {editProductCategory?.id === row.id ? "Ausgewählt" : "Bearbeiten"}
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
                            Löschen
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="flex min-h-0 flex-col rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-component-categories">
              <h4 className="font-bold text-slate-900">Modellkategorien</h4>
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
                  placeholder={editComponentCategory ? "Modellkategorie bearbeiten" : "Neue Modellkategorie"}
                  data-testid="input-new-component-category"
                />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (editComponentCategory) {
                        if (!editComponentCategory.name.trim() || isDefaultComponentCategory(editComponentCategory)) return;
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
                      setComponentCategoryFilterId("");
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
                        onClick={() => toggleComponentCategorySelection(row)}
                      >
                        <TableCell>{row.name}</TableCell>
                        <TableCell className="space-x-2 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isDefaultComponentCategory(row)}
                            title={isDefaultComponentCategory(row) ? "Default-Kategorie ist nicht bearbeitbar" : undefined}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleComponentCategorySelection(row);
                            }}
                          >
                            {editComponentCategory?.id === row.id ? "Ausgewählt" : "Bearbeiten"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!window.confirm(`Modellkategorie "${row.name}" löschen?`)) return;
                              deleteComponentCategoryMutation.mutate({ id: row.id, version: row.version });
                            }}
                          >
                            Löschen
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
            <div className="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-2">
            <section className="flex min-h-0 flex-col rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-products">
              <h4 className="font-bold text-slate-900">Produkte</h4>
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_132px_auto] lg:items-end">
                  <Input
                    value={editProduct ? editProduct.name : newProduct.name}
                    onChange={(event) => {
                      if (editProduct) {
                        setEditProduct({ ...editProduct, name: event.target.value });
                      } else {
                        setNewProduct((current) => ({ ...current, name: event.target.value }));
                      }
                    }}
                    placeholder={editProduct ? "Produkt bearbeiten" : "Produktname"}
                  />
                  <select
                    value={editProduct ? String(editProduct.categoryId) : newProduct.categoryId}
                    onChange={(event) => {
                      setProductCategoryFilterId(event.target.value);
                      if (editProduct) {
                        setEditProduct({ ...editProduct, categoryId: Number(event.target.value) });
                      } else {
                        setNewProduct((current) => ({ ...current, categoryId: event.target.value }));
                      }
                    }}
                    className="h-10 rounded border border-slate-300 bg-white px-2 text-sm"
                  >
                    <option value="">Kategorie</option>
                    {productCategories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  <Button variant="outline" onClick={() => {
                    if (editProduct) {
                      if (!editProduct.name.trim()) return;
                      updateProductMutation.mutate({
                        id: editProduct.id,
                        version: editProduct.version,
                        name: editProduct.name.trim(),
                        categoryId: editProduct.categoryId,
                        description: editProduct.description ?? null,
                      });
                      return;
                    }
                    if (!newProduct.name.trim() || !newProduct.categoryId) return;
                    createProductMutation.mutate();
                  }}>{editProduct ? "Speichern" : "Neu"}</Button>
                  {editProduct ? (
                    <Button variant="outline" onClick={() => {
                      setEditProduct(null);
                      setComponentProductFilterId("");
                    }}>
                      Abbrechen
                    </Button>
                  ) : null}
                </div>
                <Textarea
                  value={editProduct ? (editProduct.description ?? "") : newProduct.description}
                  onChange={(event) => {
                    if (editProduct) {
                      setEditProduct({ ...editProduct, description: event.target.value || null });
                    } else {
                      setNewProduct((current) => ({ ...current, description: event.target.value }));
                    }
                  }}
                  placeholder="Beschreibung (optional)"
                  className="min-h-[40px]"
                />
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead className="w-[360px] text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((row) => (
                      <TableRow
                        key={row.id}
                        className={editProduct?.id === row.id ? "bg-slate-50" : undefined}
                        onClick={() => toggleProductSelection(row)}
                      >
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{productCategoryNameById.get(row.categoryId) ?? `#${row.categoryId}`}</TableCell>
                        <TableCell className="space-x-2 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleProductSelection(row);
                            }}
                          >
                            {editProduct?.id === row.id ? "Ausgewählt" : "Bearbeiten"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              updateProductMutation.mutate({ id: row.id, version: row.version, isActive: !row.isActive });
                            }}
                          >
                            {row.isActive ? "Deaktivieren" : "Aktivieren"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!window.confirm(`Produkt "${row.name}" löschen?`)) return;
                              deleteProductMutation.mutate({ id: row.id, version: row.version });
                            }}
                          >
                            Löschen
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="flex min-h-0 flex-col rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-components">
              <h4 className="font-bold text-slate-900">Modelle</h4>
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_132px_168px_auto] lg:items-end">
                  <Input
                    value={editComponent ? editComponent.name : newComponent.name}
                    onChange={(event) => {
                      if (editComponent) {
                        setEditComponent({ ...editComponent, name: event.target.value });
                      } else {
                        setNewComponent((current) => ({ ...current, name: event.target.value }));
                      }
                    }}
                    placeholder={editComponent ? "Modell bearbeiten" : "Modellname"}
                  />
                  <select
                    value={editComponent ? String(editComponent.categoryId) : newComponent.categoryId}
                    onChange={(event) => {
                      setComponentCategoryFilterId(event.target.value);
                      if (editComponent) {
                        setEditComponent({ ...editComponent, categoryId: Number(event.target.value) });
                      } else {
                        setNewComponent((current) => ({ ...current, categoryId: event.target.value }));
                      }
                    }}
                    className="h-10 rounded border border-slate-300 bg-white px-2 text-sm"
                  >
                    <option value="">Kategorie</option>
                    {componentCategories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <select
                      value={editComponent ? editComponentProductId : newComponentProductId}
                      onChange={(event) => {
                        setComponentProductFilterId(event.target.value);
                        if (editComponent) {
                          setEditComponentProductId(event.target.value);
                        } else {
                          setNewComponentProductId(event.target.value);
                        }
                      }}
                      className="h-10 w-full rounded border border-slate-300 bg-white px-2 text-sm"
                      data-testid="input-new-component-products"
                    >
                      <option value="">Produkt</option>
                      {products
                        .filter((product) => !(editComponent ? editComponentProductIds : newComponent.productIds).includes(product.id))
                        .map((product) => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const selectedId = Number(editComponent ? editComponentProductId : newComponentProductId);
                        if (!Number.isFinite(selectedId) || selectedId <= 0) return;
                        if (editComponent) {
                          setEditComponentProductIds((current) => (
                            current.includes(selectedId) ? current : [...current, selectedId]
                          ));
                          setEditComponentProductId("");
                        } else {
                          setNewComponent((current) => ({
                            ...current,
                            productIds: current.productIds.includes(selectedId)
                              ? current.productIds
                              : [...current.productIds, selectedId],
                          }));
                          setNewComponentProductId("");
                        }
                      }}
                    >
                      +
                    </Button>
                  </div>
                  <Button variant="outline" onClick={() => {
                    if (editComponent) {
                      if (!editComponent.name.trim()) return;
                      updateComponentMutation.mutate({
                        id: editComponent.id,
                        version: editComponent.version,
                        name: editComponent.name.trim(),
                        categoryId: editComponent.categoryId,
                        description: editComponent.description ?? null,
                        productIds: editComponentProductIds,
                      });
                      return;
                    }
                    if (!newComponent.name.trim() || !newComponent.categoryId) return;
                    createComponentMutation.mutate();
                  }}>{editComponent ? "Speichern" : "Neu"}</Button>
                  {editComponent ? (
                    <Button variant="outline" onClick={() => {
                      setEditComponent(null);
                      setEditComponentProductIds([]);
                      setEditComponentProductId("");
                    }}>
                      Abbrechen
                    </Button>
                  ) : null}
                </div>
                <Textarea
                  value={editComponent ? (editComponent.description ?? "") : newComponent.description}
                  onChange={(event) => {
                    if (editComponent) {
                      setEditComponent({ ...editComponent, description: event.target.value || null });
                    } else {
                      setNewComponent((current) => ({ ...current, description: event.target.value }));
                    }
                  }}
                  placeholder="Beschreibung (optional)"
                  className="min-h-[40px]"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(editComponent ? editComponentProductIds : newComponent.productIds).map((productId) => (
                  <button
                    key={productId}
                    type="button"
                    onClick={() => {
                      if (editComponent) {
                        setEditComponentProductIds((current) => current.filter((id) => id !== productId));
                      } else {
                        setNewComponent((current) => ({
                          ...current,
                          productIds: current.productIds.filter((id) => id !== productId),
                        }));
                      }
                    }}
                    className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    data-testid={`selected-new-component-product-${productId}`}
                  >
                    {productNameById.get(productId) ?? `#${productId}`} ×
                  </button>
                ))}
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Produkte</TableHead>
                      <TableHead className="w-[420px] text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComponents.map((row) => (
                      <TableRow
                        key={row.id}
                        className={editComponent?.id === row.id ? "bg-slate-50" : undefined}
                        onClick={() => {
                          setEditComponent({ ...row });
                          setEditComponentProductIds(productIdsByComponentId.get(row.id) ?? []);
                          setEditComponentProductId("");
                        }}
                      >
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{componentCategoryNameById.get(row.categoryId) ?? `#${row.categoryId}`}</TableCell>
                        <TableCell>{formatProductNames(productIdsByComponentId.get(row.id), productNameById)}</TableCell>
                        <TableCell className="space-x-2 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditComponent({ ...row });
                              setEditComponentProductIds(productIdsByComponentId.get(row.id) ?? []);
                              setEditComponentProductId("");
                            }}
                          >
                            {editComponent?.id === row.id ? "Ausgewählt" : "Bearbeiten"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              updateComponentMutation.mutate({ id: row.id, version: row.version, isActive: !row.isActive });
                            }}
                          >
                            {row.isActive ? "Deaktivieren" : "Aktivieren"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!window.confirm(`Modell "${row.name}" löschen?`)) return;
                              deleteComponentMutation.mutate({ id: row.id, version: row.version });
                            }}
                          >
                            Löschen
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
        </div>
      )}
    />
  );
}


