import { useEffect, useMemo, useState } from "react";
import type { Product, ProductCategory } from "@shared/schema";
import { EntitySelectionRow } from "@/components/ui/entity-selection-row";
import { ProductCreateDialog } from "@/components/ui/product-create-dialog";

function formatProductLabel(product: Product): string {
  const shortCode = product.shortCode?.trim();
  return shortCode ? `${product.name} - ${shortCode}` : product.name;
}

interface ProductListProps {
  products: Product[];
  categories: ProductCategory[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
  onCreateProduct: (input: { name: string; shortCode: string | null; description: string | null; categoryId: number }) => Promise<Product>;
  onDeleteProduct?: () => void;
  onDeleteAllInCategory?: (categoryId: string) => void;
  isAdmin: boolean;
}

export function ProductList({
  products,
  categories,
  selectedProductId,
  onSelectProduct,
  onCreateProduct,
  onDeleteProduct,
  onDeleteAllInCategory,
  isAdmin,
}: ProductListProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => (categories.length > 0 ? String(categories[0].id) : ""));
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(String(categories[0].id));
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId) return;
    if (categories.some((category) => String(category.id) === selectedCategoryId)) return;
    setSelectedCategoryId(categories.length > 0 ? String(categories[0].id) : "");
  }, [categories, selectedCategoryId]);

  const filteredProducts = useMemo(() => {
    const base = selectedCategoryId
      ? products.filter((p) => String(p.categoryId) === selectedCategoryId)
      : products;
    return base.slice().sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [products, selectedCategoryId]);

  const productOptions = filteredProducts.map((p) => ({ value: String(p.id), label: formatProductLabel(p) }));
  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));

  const handleProductSelect = (id: string) => {
    onSelectProduct(id);
    if (id) {
      const product = products.find((p) => String(p.id) === id);
      if (product) setSelectedCategoryId(String(product.categoryId));
    }
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCategoryId(id);
    if (selectedProduct && String(selectedProduct.categoryId) !== id) {
      onSelectProduct("");
    }
  };

  const handleCreate = async (input: Parameters<ProductListProps["onCreateProduct"]>[0]) => {
    const created = await onCreateProduct(input);
    onSelectProduct(String(created.id));
    setSelectedCategoryId(String(created.categoryId));
    return created;
  };

  return (
    <>
      <section className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="product-drop-down-panel">
        <EntitySelectionRow
          itemLabel="Produktliste"
          itemValue={selectedProductId}
          itemOptions={productOptions}
          itemPlaceholder="Produkt auswählen"
          categoryLabel="Produktkategorie"
          categoryValue={selectedCategoryId}
          categoryOptions={categoryOptions}
          categoryPlaceholder="Alle Kategorien"
          onItemSelect={handleProductSelect}
          onCategorySelect={handleCategorySelect}
          showRemove={isAdmin}
          showAdd={isAdmin}
          showDeleteAll={isAdmin}
          onRemove={onDeleteProduct}
          onAdd={() => setCreateDialogOpen(true)}
          onDeleteAll={selectedCategoryId ? () => onDeleteAllInCategory?.(selectedCategoryId) : undefined}
          removeDisabled={!selectedProductId}
          addDisabled={!selectedCategoryId}
          deleteAllDisabled={!selectedCategoryId}
          itemTestId="select-product-record"
          categoryTestId="select-product-category-filter"
        />
      </section>

      {createDialogOpen && selectedCategoryId ? (
        <ProductCreateDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          categoryId={Number(selectedCategoryId)}
          categoryName={categories.find((c) => String(c.id) === selectedCategoryId)?.name}
          onConfirm={handleCreate}
        />
      ) : null}
    </>
  );
}

// Backward-compat alias used by ProductManagementPage
export { ProductList as ProductDropDown };
