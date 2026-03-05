import { useMemo, useState } from "react";
import { Boxes } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Component, ComponentCategory, Product, ProductCategory } from "@shared/schema";
import { ListLayout } from "@/components/ui/list-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export function MasterDataPage() {
  const { toast } = useToast();
  const [activeScope, setActiveScope] = useState<ActiveScope>("all");

  const [newProductCategoryName, setNewProductCategoryName] = useState("");
  const [editProductCategory, setEditProductCategory] = useState<ProductCategory | null>(null);

  const [newComponentCategoryName, setNewComponentCategoryName] = useState("");
  const [editComponentCategory, setEditComponentCategory] = useState<ComponentCategory | null>(null);

  const [newProduct, setNewProduct] = useState({ name: "", categoryId: "", description: "" });
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const [newComponent, setNewComponent] = useState({ name: "", categoryId: "", description: "" });
  const [editComponent, setEditComponent] = useState<Component | null>(null);

  const productCategoriesUrl = `/api/admin/master-data/product-categories?active=${activeScope}`;
  const componentCategoriesUrl = `/api/admin/master-data/component-categories?active=${activeScope}`;
  const productsUrl = `/api/admin/master-data/products?active=${activeScope}`;
  const componentsUrl = `/api/admin/master-data/components?active=${activeScope}`;

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

  const productCategories = productCategoriesQuery.data ?? [];
  const componentCategories = componentCategoriesQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const components = componentsQuery.data ?? [];

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
        title: code === "BUSINESS_CONFLICT" ? "Komponenten-Kategorie existiert bereits" : "Komponenten-Kategorie konnte nicht angelegt werden",
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
        title: code === "VERSION_CONFLICT" ? "Komponenten-Kategorie wurde zwischenzeitlich geändert" : "Komponenten-Kategorie konnte nicht aktualisiert werden",
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
        title: code === "BUSINESS_CONFLICT" ? "Komponenten-Kategorie wird noch verwendet" : "Komponenten-Kategorie konnte nicht gelöscht werden",
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
    mutationFn: async () =>
      apiRequest("POST", "/api/admin/master-data/components", {
        name: newComponent.name.trim(),
        categoryId: Number(newComponent.categoryId),
        description: newComponent.description.trim() || null,
        isActive: true,
        version: 1,
      }),
    onSuccess: async () => {
      setNewComponent({ name: "", categoryId: "", description: "" });
      await invalidateMasterDataQueries(activeScope);
    },
    onError: (error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "BUSINESS_CONFLICT" ? "Komponente konnte nicht angelegt werden (Name/Kategorie prüfen)" : "Komponente konnte nicht angelegt werden",
        variant: "destructive",
      });
    },
  });

  const updateComponentMutation = useMutation({
    mutationFn: async (input: ProductMutationInput) =>
      apiRequest("PUT", `/api/admin/master-data/components/${input.id}`, {
        version: input.version,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      }),
    onSuccess: async () => {
      setEditComponent(null);
      await invalidateMasterDataQueries(activeScope);
    },
    onError: (error) => {
      const code = extractApiCode(error);
      toast({
        title: code === "VERSION_CONFLICT" ? "Komponente wurde zwischenzeitlich geändert" : "Komponente konnte nicht aktualisiert werden",
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
        title: code === "BUSINESS_CONFLICT" ? "Komponente wird noch verwendet" : "Komponente konnte nicht gelöscht werden",
        variant: "destructive",
      });
    },
  });

  const isLoading = productCategoriesQuery.isLoading
    || componentCategoriesQuery.isLoading
    || productsQuery.isLoading
    || componentsQuery.isLoading;

  return (
    <ListLayout
      title="Stammdaten"
      icon={<Boxes className="w-5 h-5" />}
      helpKey="settings"
      isLoading={isLoading}
      headerActions={(
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Filter:</span>
          <select
            value={activeScope}
            onChange={(event) => setActiveScope(event.target.value as ActiveScope)}
            className="h-9 rounded border border-slate-300 bg-white px-2 text-sm"
            data-testid="master-data-active-filter"
          >
            <option value="all">Alle</option>
            <option value="active">Nur aktiv</option>
            <option value="inactive">Nur inaktiv</option>
          </select>
        </div>
      )}
      contentSlot={(
        <Tabs defaultValue="categories" className="h-full min-h-0 flex flex-col gap-4">
          <TabsList className="w-fit">
            <TabsTrigger value="categories">Kategorien</TabsTrigger>
            <TabsTrigger value="entities">Produkte & Komponenten</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-6">
            <section className="rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-product-categories">
              <h4 className="font-bold text-slate-900">Produktkategorien</h4>
              <div className="mt-3 flex items-end gap-2">
                <Input
                  value={newProductCategoryName}
                  onChange={(event) => setNewProductCategoryName(event.target.value)}
                  placeholder="Neue Produktkategorie"
                  data-testid="input-new-product-category"
                />
                <Button
                  onClick={() => {
                    if (!newProductCategoryName.trim()) return;
                    createProductCategoryMutation.mutate();
                  }}
                  data-testid="button-create-product-category"
                >
                  Anlegen
                </Button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[330px]">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productCategories.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {editProductCategory?.id === row.id ? (
                            <Input
                              value={editProductCategory.name}
                              onChange={(event) => setEditProductCategory({ ...editProductCategory, name: event.target.value })}
                            />
                          ) : row.name}
                        </TableCell>
                        <TableCell>{row.isActive ? "Aktiv" : "Inaktiv"}</TableCell>
                        <TableCell className="space-x-2">
                          {editProductCategory?.id === row.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateProductCategoryMutation.mutate({
                                  id: row.id,
                                  version: row.version,
                                  name: editProductCategory.name.trim(),
                                })}
                              >
                                Speichern
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditProductCategory(null)}>
                                Abbrechen
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setEditProductCategory({ ...row })}>Bearbeiten</Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateProductCategoryMutation.mutate({ id: row.id, version: row.version, isActive: !row.isActive })}
                              >
                                {row.isActive ? "Deaktivieren" : "Aktivieren"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (!window.confirm(`Produktkategorie "${row.name}" löschen?`)) return;
                                  deleteProductCategoryMutation.mutate({ id: row.id, version: row.version });
                                }}
                              >
                                Löschen
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-component-categories">
              <h4 className="font-bold text-slate-900">Komponenten-Kategorien</h4>
              <div className="mt-3 flex items-end gap-2">
                <Input
                  value={newComponentCategoryName}
                  onChange={(event) => setNewComponentCategoryName(event.target.value)}
                  placeholder="Neue Komponenten-Kategorie"
                  data-testid="input-new-component-category"
                />
                <Button
                  onClick={() => {
                    if (!newComponentCategoryName.trim()) return;
                    createComponentCategoryMutation.mutate();
                  }}
                  data-testid="button-create-component-category"
                >
                  Anlegen
                </Button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[330px]">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {componentCategories.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {editComponentCategory?.id === row.id ? (
                            <Input
                              value={editComponentCategory.name}
                              onChange={(event) => setEditComponentCategory({ ...editComponentCategory, name: event.target.value })}
                            />
                          ) : row.name}
                        </TableCell>
                        <TableCell>{row.isActive ? "Aktiv" : "Inaktiv"}</TableCell>
                        <TableCell className="space-x-2">
                          {editComponentCategory?.id === row.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateComponentCategoryMutation.mutate({
                                  id: row.id,
                                  version: row.version,
                                  name: editComponentCategory.name.trim(),
                                })}
                              >
                                Speichern
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditComponentCategory(null)}>
                                Abbrechen
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setEditComponentCategory({ ...row })}>Bearbeiten</Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateComponentCategoryMutation.mutate({ id: row.id, version: row.version, isActive: !row.isActive })}
                              >
                                {row.isActive ? "Deaktivieren" : "Aktivieren"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (!window.confirm(`Komponenten-Kategorie "${row.name}" löschen?`)) return;
                                  deleteComponentCategoryMutation.mutate({ id: row.id, version: row.version });
                                }}
                              >
                                Löschen
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="entities" className="space-y-6">
            <section className="rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-products">
              <h4 className="font-bold text-slate-900">Produkte</h4>
              <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-[1fr_220px_1fr_auto] lg:items-end">
                <Input value={newProduct.name} onChange={(event) => setNewProduct((current) => ({ ...current, name: event.target.value }))} placeholder="Produktname" />
                <select value={newProduct.categoryId} onChange={(event) => setNewProduct((current) => ({ ...current, categoryId: event.target.value }))} className="h-10 rounded border border-slate-300 bg-white px-2 text-sm">
                  <option value="">Kategorie wählen</option>
                  {productCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <Textarea value={newProduct.description} onChange={(event) => setNewProduct((current) => ({ ...current, description: event.target.value }))} placeholder="Beschreibung (optional)" className="min-h-[40px]" />
                <Button onClick={() => {
                  if (!newProduct.name.trim() || !newProduct.categoryId) return;
                  createProductMutation.mutate();
                }}>Anlegen</Button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[360px]">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{editProduct?.id === row.id ? <Input value={editProduct.name} onChange={(event) => setEditProduct({ ...editProduct, name: event.target.value })} /> : row.name}</TableCell>
                        <TableCell>
                          {editProduct?.id === row.id ? (
                            <select value={String(editProduct.categoryId)} onChange={(event) => setEditProduct({ ...editProduct, categoryId: Number(event.target.value) })} className="h-9 rounded border border-slate-300 bg-white px-2 text-sm">
                              {productCategories.map((category) => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                              ))}
                            </select>
                          ) : (productCategoryNameById.get(row.categoryId) ?? `#${row.categoryId}`)}
                        </TableCell>
                        <TableCell>{editProduct?.id === row.id ? <Textarea value={editProduct.description ?? ""} onChange={(event) => setEditProduct({ ...editProduct, description: event.target.value || null })} className="min-h-[40px]" /> : (row.description ?? "-")}</TableCell>
                        <TableCell>{row.isActive ? "Aktiv" : "Inaktiv"}</TableCell>
                        <TableCell className="space-x-2">
                          {editProduct?.id === row.id ? (
                            <>
                              <Button size="sm" onClick={() => updateProductMutation.mutate({ id: row.id, version: row.version, name: editProduct.name.trim(), categoryId: editProduct.categoryId, description: editProduct.description ?? null })}>Speichern</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditProduct(null)}>Abbrechen</Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setEditProduct({ ...row })}>Bearbeiten</Button>
                              <Button size="sm" variant="outline" onClick={() => updateProductMutation.mutate({ id: row.id, version: row.version, isActive: !row.isActive })}>{row.isActive ? "Deaktivieren" : "Aktivieren"}</Button>
                              <Button size="sm" variant="destructive" onClick={() => {
                                if (!window.confirm(`Produkt "${row.name}" löschen?`)) return;
                                deleteProductMutation.mutate({ id: row.id, version: row.version });
                              }}>Löschen</Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-components">
              <h4 className="font-bold text-slate-900">Komponenten</h4>
              <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-[1fr_220px_1fr_auto] lg:items-end">
                <Input value={newComponent.name} onChange={(event) => setNewComponent((current) => ({ ...current, name: event.target.value }))} placeholder="Komponentenname" />
                <select value={newComponent.categoryId} onChange={(event) => setNewComponent((current) => ({ ...current, categoryId: event.target.value }))} className="h-10 rounded border border-slate-300 bg-white px-2 text-sm">
                  <option value="">Kategorie wählen</option>
                  {componentCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <Textarea value={newComponent.description} onChange={(event) => setNewComponent((current) => ({ ...current, description: event.target.value }))} placeholder="Beschreibung (optional)" className="min-h-[40px]" />
                <Button onClick={() => {
                  if (!newComponent.name.trim() || !newComponent.categoryId) return;
                  createComponentMutation.mutate();
                }}>Anlegen</Button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[360px]">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {components.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{editComponent?.id === row.id ? <Input value={editComponent.name} onChange={(event) => setEditComponent({ ...editComponent, name: event.target.value })} /> : row.name}</TableCell>
                        <TableCell>
                          {editComponent?.id === row.id ? (
                            <select value={String(editComponent.categoryId)} onChange={(event) => setEditComponent({ ...editComponent, categoryId: Number(event.target.value) })} className="h-9 rounded border border-slate-300 bg-white px-2 text-sm">
                              {componentCategories.map((category) => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                              ))}
                            </select>
                          ) : (componentCategoryNameById.get(row.categoryId) ?? `#${row.categoryId}`)}
                        </TableCell>
                        <TableCell>{editComponent?.id === row.id ? <Textarea value={editComponent.description ?? ""} onChange={(event) => setEditComponent({ ...editComponent, description: event.target.value || null })} className="min-h-[40px]" /> : (row.description ?? "-")}</TableCell>
                        <TableCell>{row.isActive ? "Aktiv" : "Inaktiv"}</TableCell>
                        <TableCell className="space-x-2">
                          {editComponent?.id === row.id ? (
                            <>
                              <Button size="sm" onClick={() => updateComponentMutation.mutate({ id: row.id, version: row.version, name: editComponent.name.trim(), categoryId: editComponent.categoryId, description: editComponent.description ?? null })}>Speichern</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditComponent(null)}>Abbrechen</Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setEditComponent({ ...row })}>Bearbeiten</Button>
                              <Button size="sm" variant="outline" onClick={() => updateComponentMutation.mutate({ id: row.id, version: row.version, isActive: !row.isActive })}>{row.isActive ? "Deaktivieren" : "Aktivieren"}</Button>
                              <Button size="sm" variant="destructive" onClick={() => {
                                if (!window.confirm(`Komponente "${row.name}" löschen?`)) return;
                                deleteComponentMutation.mutate({ id: row.id, version: row.version });
                              }}>Löschen</Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      )}
    />
  );
}
