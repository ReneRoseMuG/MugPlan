import type { ProductCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ProductDataDraft = {
  name: string;
  shortCode: string;
  description: string;
  categoryId: string;
  isActive: boolean;
};

interface ProductDataProps {
  draft: ProductDataDraft;
  categories: ProductCategory[];
  disabled: boolean;
  isAdmin: boolean;
  onDraftChange: (draft: ProductDataDraft) => void;
  onSubmit: () => void;
}

export function ProductData({
  draft,
  categories,
  disabled,
  isAdmin,
  onDraftChange,
  onSubmit,
}: ProductDataProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <h5 className="font-semibold text-slate-900">Produkt Stammdaten</h5>
      <div className="mt-3 grid grid-cols-1 gap-3">
        <div className={`grid grid-cols-1 gap-3 ${isAdmin ? "md:grid-cols-[140px_minmax(0,1fr)_140px_220px]" : "md:grid-cols-[minmax(0,1fr)_140px_220px]"} md:items-end`}>
          {isAdmin ? (
            <div className="space-y-2">
              <Label htmlFor="product-data-active">Status</Label>
              <label className="flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700">
                <input
                  id="product-data-active"
                  type="checkbox"
                  checked={draft.isActive}
                  disabled={disabled}
                  onChange={(event) => onDraftChange({ ...draft, isActive: event.target.checked })}
                />
                <span>Is Active</span>
              </label>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="product-data-name">Name</Label>
            <Input
              id="product-data-name"
              value={draft.name}
              disabled={disabled}
              onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-data-short-code">ShortCode</Label>
            <Input
              id="product-data-short-code"
              value={draft.shortCode}
              disabled={disabled}
              onChange={(event) => onDraftChange({ ...draft, shortCode: event.target.value })}
              placeholder="Kurzcode"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-data-category" className="block">Kategorie</Label>
            <select
              id="product-data-category"
              value={draft.categoryId}
              disabled={disabled}
              onChange={(event) => onDraftChange({ ...draft, categoryId: event.target.value })}
              className="block h-10 w-full rounded border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-50"
            >
              <option value="">Kategorie wählen</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-data-description">Beschreibung</Label>
          <Textarea
            id="product-data-description"
            value={draft.description}
            disabled={disabled}
            onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
            rows={2}
            className="min-h-0"
          />
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={onSubmit}
            disabled={disabled || !draft.name.trim() || !draft.categoryId}
          >
            Aktualisieren
          </Button>
        </div>
      </div>
    </section>
  );
}
