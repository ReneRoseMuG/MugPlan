import { useMemo, useState } from "react";
import { ListFilter, Search, X } from "lucide-react";
import type { Component, ComponentCategory, Product } from "@shared/schema";
import { PROJECT_ARTICLE_FIELDS, getProjectArticleFieldByCategoryName } from "@shared/projectArticleList";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ProjectArticleFilterSelection = {
  productIds: number[];
  componentIds: number[];
};

interface ProjectArticleFilterInputProps {
  products: Product[];
  components: Component[];
  componentCategories: ComponentCategory[];
  selectedProductIds: number[];
  selectedComponentIds: number[];
  onChange: (selection: ProjectArticleFilterSelection) => void;
  onReset: () => void;
  className?: string;
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("de-DE");
}

function sortByName<TItem extends { name: string; id: number }>(items: TItem[]): TItem[] {
  return items.slice().sort((left, right) => {
    const byName = left.name.localeCompare(right.name, "de-DE");
    return byName !== 0 ? byName : left.id - right.id;
  });
}

function toSortedIds(ids: Set<number>): number[] {
  return Array.from(ids).sort((left, right) => left - right);
}

function matchesSearch(item: { name: string; shortCode?: string | null }, search: string): boolean {
  if (search.length === 0) return true;
  return `${item.name} ${item.shortCode ?? ""}`.toLocaleLowerCase("de-DE").includes(search);
}

export function ProjectArticleFilterInput({
  products,
  components,
  componentCategories,
  selectedProductIds,
  selectedComponentIds,
  onChange,
  onReset,
  className,
}: ProjectArticleFilterInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [stagedProductIds, setStagedProductIds] = useState<Set<number>>(() => new Set(selectedProductIds));
  const [stagedComponentIds, setStagedComponentIds] = useState<Set<number>>(() => new Set(selectedComponentIds));

  const selectedCount = selectedProductIds.length + selectedComponentIds.length;
  const hasActiveFilter = selectedCount > 0;
  const normalizedSearch = normalizeSearch(search);

  const categoryNameById = useMemo(
    () => new Map(componentCategories.map((category) => [category.id, category.name] as const)),
    [componentCategories],
  );

  const componentsByFieldKey = useMemo(() => {
    const grouped = new Map<string, Component[]>();
    for (const component of components) {
      const categoryName = categoryNameById.get(component.categoryId);
      if (!categoryName) continue;
      const fieldKey = getProjectArticleFieldByCategoryName(categoryName);
      if (!fieldKey) continue;
      const items = grouped.get(fieldKey) ?? [];
      items.push(component);
      grouped.set(fieldKey, items);
    }
    for (const [fieldKey, items] of Array.from(grouped.entries())) {
      grouped.set(fieldKey, sortByName(items));
    }
    return grouped;
  }, [categoryNameById, components]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setStagedProductIds(new Set(selectedProductIds));
      setStagedComponentIds(new Set(selectedComponentIds));
      setSearch("");
    }
    setOpen(nextOpen);
  };

  const toggleProduct = (productId: number) => {
    setStagedProductIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleComponent = (componentId: number) => {
    setStagedComponentIds((current) => {
      const next = new Set(current);
      if (next.has(componentId)) next.delete(componentId);
      else next.add(componentId);
      return next;
    });
  };

  const applySelection = () => {
    onChange({
      productIds: toSortedIds(stagedProductIds),
      componentIds: toSortedIds(stagedComponentIds),
    });
    setOpen(false);
  };

  const renderOption = (
    item: Product | Component,
    checked: boolean,
    onToggle: () => void,
    testId: string,
  ) => (
    <label
      key={item.id}
      className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
      data-testid={testId}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      {item.shortCode ? <span className="shrink-0 text-xs text-slate-500">{item.shortCode}</span> : null}
    </label>
  );

  const filteredProducts = sortByName(products).filter((product) => matchesSearch(product, normalizedSearch));

  return (
    <div className={cn("flex flex-col gap-1 sm:min-w-[96px] sm:w-[96px]", className)}>
      <div className="flex h-5 items-center gap-1">
        <span className="text-xs text-slate-500">Artikelliste</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("relative h-7 w-7", hasActiveFilter ? "bg-primary/10 text-primary" : "")}
          onClick={() => handleOpenChange(true)}
          aria-label="Artikellistenfilter öffnen"
          data-testid="button-open-project-article-filter"
        >
          <ListFilter className="h-3.5 w-3.5" />
          {hasActiveFilter ? (
            <span className="absolute ml-5 mt-[-1.2rem] rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
              {selectedCount}
            </span>
          ) : null}
        </Button>
        {hasActiveFilter ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onReset}
            aria-label="Artikellistenfilter zurücksetzen"
            data-testid="button-reset-project-article-filter"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl" data-testid="dialog-project-article-filter">
          <DialogHeader>
            <DialogTitle>Artikelliste filtern</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Suche"
              data-testid="input-project-article-filter-search"
            />
          </div>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            <section className="space-y-2" data-testid="project-article-filter-group-sauna">
              <h3 className="text-sm font-semibold text-slate-700">Sauna</h3>
              <div className="grid gap-1 md:grid-cols-2">
                {filteredProducts.length > 0 ? filteredProducts.map((product) => renderOption(
                  product,
                  stagedProductIds.has(product.id),
                  () => toggleProduct(product.id),
                  `project-article-filter-option-product-${product.id}`,
                )) : <div className="text-sm text-slate-500">Keine Einträge</div>}
              </div>
            </section>

            {PROJECT_ARTICLE_FIELDS.filter((field) => field.source === "component").map((field) => {
              const filteredComponents = (componentsByFieldKey.get(field.key) ?? [])
                .filter((component) => matchesSearch(component, normalizedSearch));
              return (
                <section key={field.key} className="space-y-2" data-testid={`project-article-filter-group-${field.key}`}>
                  <h3 className="text-sm font-semibold text-slate-700">{field.label}</h3>
                  <div className="grid gap-1 md:grid-cols-2">
                    {filteredComponents.length > 0 ? filteredComponents.map((component) => renderOption(
                      component,
                      stagedComponentIds.has(component.id),
                      () => toggleComponent(component.id),
                      `project-article-filter-option-component-${component.id}`,
                    )) : <div className="text-sm text-slate-500">Keine Einträge</div>}
                  </div>
                </section>
              );
            })}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} data-testid="button-cancel-project-article-filter">
              Abbrechen
            </Button>
            <Button type="button" onClick={applySelection} data-testid="button-apply-project-article-filter">
              Anwenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
