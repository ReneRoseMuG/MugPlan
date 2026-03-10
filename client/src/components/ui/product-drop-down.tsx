import { useState } from "react";
import type { Product, ProductCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { CollectionDropDown } from "@/components/ui/collection-drop-down";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProductDropDownProps {
  products: Product[];
  categories: ProductCategory[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
  onCreateProduct: (input: { name: string; categoryId: number }) => Promise<Product>;
  isAdmin: boolean;
}

export function ProductDropDown({
  products,
  categories,
  selectedProductId,
  onSelectProduct,
  onCreateProduct,
  isAdmin,
}: ProductDropDownProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const options = products.map((product) => {
    const categoryName = categories.find((category) => category.id === product.categoryId)?.name ?? `#${product.categoryId}`;
    const status = product.isActive ? "Aktiv" : "Inaktiv";
    return {
      value: String(product.id),
      label: `${product.name} | ${categoryName} | ${status}`,
    };
  });

  const resetDialog = () => {
    setName("");
    setCategoryId("");
    setError(null);
    setSubmitting(false);
  };

  const submit = async () => {
    if (!name.trim() || !categoryId) return;
    setSubmitting(true);
    setError(null);
    try {
      const product = await onCreateProduct({
        name: name.trim(),
        categoryId: Number(categoryId),
      });
      onSelectProduct(String(product.id));
      setDialogOpen(false);
      resetDialog();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Produkt konnte nicht angelegt werden.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="product-drop-down-panel">
        <CollectionDropDown
          label="Produktliste"
          value={selectedProductId}
          options={options}
          placeholder="Produkt auswählen"
          onSelect={onSelectProduct}
          showAdd={isAdmin}
          onAdd={() => {
            resetDialog();
            setDialogOpen(true);
          }}
          testId="select-product-record"
        />
      </section>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetDialog();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Produkt</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="product-dropdown-name">Produktname</Label>
              <Input id="product-dropdown-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-dropdown-category">Produkt Kategorie</Label>
              <select
                id="product-dropdown-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-10 w-full rounded border border-slate-300 bg-white px-2 text-sm"
              >
                <option value="">Kategorie wählen</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={() => void submit()} disabled={submitting || !name.trim() || !categoryId}>
              {submitting ? "Speichere..." : "Übernehmen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
