import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  CategoryLayoutConfig,
  CategoryLayoutColumns,
  CategoryLayoutEntry,
} from "@/lib/produktionsplanung-category-layout";

export type CategoryLayoutCategoryOption = {
  id: number;
  name: string;
  categoryType: "product" | "component";
};

type Props = {
  layoutConfig: CategoryLayoutConfig;
  categories: CategoryLayoutCategoryOption[];
  isSaving: boolean;
  onAddEntries: (entries: CategoryLayoutEntry[]) => Promise<void> | void;
  onRemoveEntry: (index: number) => Promise<void> | void;
  onUpdateEntry: (index: number, patch: Partial<Pick<CategoryLayoutEntry, "block" | "columns">>) => Promise<void> | void;
};

function resolveCategoryTypeLabel(categoryType: CategoryLayoutCategoryOption["categoryType"]): string {
  return categoryType === "product" ? "Produkt" : "Komponente";
}

function resolveNextBlock(layoutConfig: CategoryLayoutConfig): number {
  if (layoutConfig.length === 0) {
    return 1;
  }
  return Math.max(...layoutConfig.map((entry) => entry.block)) + 1;
}

export function ProduktionsplanungCategoryLayoutEditor({
  layoutConfig,
  categories,
  isSaving,
  onAddEntries,
  onRemoveEntry,
  onUpdateEntry,
}: Props) {
  const [isAddingEntries, setIsAddingEntries] = useState(false);
  const [draftBlock, setDraftBlock] = useState(() => resolveNextBlock(layoutConfig));
  const [draftColumns, setDraftColumns] = useState<CategoryLayoutColumns>(2);
  const [draftCategoryIds, setDraftCategoryIds] = useState<number[]>([]);
  const [entryDrafts, setEntryDrafts] = useState<Record<number, { block: string; columns: string }>>({});

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category] as const)),
    [categories],
  );
  const assignedCategoryIds = useMemo(
    () => new Set(layoutConfig.map((entry) => entry.categoryId)),
    [layoutConfig],
  );
  const unassignedCategories = useMemo(
    () => categories.filter((category) => !assignedCategoryIds.has(category.id)),
    [assignedCategoryIds, categories],
  );

  useEffect(() => {
    setEntryDrafts(Object.fromEntries(
      layoutConfig.map((entry) => [
        entry.categoryId,
        {
          block: String(entry.block),
          columns: String(entry.columns),
        },
      ]),
    ));
  }, [layoutConfig]);

  const resetDraft = () => {
    setDraftBlock(resolveNextBlock(layoutConfig));
    setDraftColumns(2);
    setDraftCategoryIds([]);
    setIsAddingEntries(false);
  };

  const updateEntryDraft = (categoryId: number, field: "block" | "columns", value: string) => {
    setEntryDrafts((current) => ({
      ...current,
      [categoryId]: {
        block: current[categoryId]?.block ?? String(layoutConfig.find((entry) => entry.categoryId === categoryId)?.block ?? 1),
        columns: current[categoryId]?.columns ?? String(layoutConfig.find((entry) => entry.categoryId === categoryId)?.columns ?? 1),
        [field]: value,
      },
    }));
  };

  const resetEntryDraft = (entry: CategoryLayoutEntry) => {
    setEntryDrafts((current) => ({
      ...current,
      [entry.categoryId]: {
        block: String(entry.block),
        columns: String(entry.columns),
      },
    }));
  };

  const commitEntryDraft = async (index: number, field: "block" | "columns") => {
    if (isSaving) {
      return;
    }

    const entry = layoutConfig[index];
    if (!entry) {
      return;
    }

    const draft = entryDrafts[entry.categoryId];
    if (!draft) {
      return;
    }

    const rawValue = field === "block" ? draft.block : draft.columns;
    const nextValue = Number.parseInt(rawValue, 10);

    if (field === "block") {
      if (!Number.isInteger(nextValue) || nextValue <= 0) {
        resetEntryDraft(entry);
        return;
      }
      if (nextValue === entry.block) {
        resetEntryDraft(entry);
        return;
      }
      await onUpdateEntry(index, { block: nextValue });
      return;
    }

    if (nextValue !== 1 && nextValue !== 2 && nextValue !== 3) {
      resetEntryDraft(entry);
      return;
    }
    if (nextValue === entry.columns) {
      resetEntryDraft(entry);
      return;
    }
    await onUpdateEntry(index, { columns: nextValue });
  };

  return (
    <section className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-produktionsplanung-category-layout">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h5 className="text-sm font-semibold text-foreground">Kategorie-Layout</h5>
          <p className="mt-1 text-sm text-muted-foreground">
            Jede Kategorie wird einem Block zugeordnet. Die Spaltenzahl steuert die Darstellung des Kategorie-Inhalts innerhalb dieses Blocks.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={isSaving || unassignedCategories.length === 0}
          onClick={() => {
            setDraftBlock(resolveNextBlock(layoutConfig));
            setIsAddingEntries((current) => !current);
          }}
          data-testid="button-reports-produktionsplanung-category-layout-add"
        >
          {isAddingEntries ? "Hinzufügen abbrechen" : "Kategorien zuweisen"}
        </Button>
      </div>

      {layoutConfig.length > 0 ? (
        <div className="mt-4 space-y-3" data-testid="reports-produktionsplanung-category-layout-entries">
          {layoutConfig.map((entry, index) => {
            const category = categoriesById.get(entry.categoryId);
            const draft = entryDrafts[entry.categoryId] ?? {
              block: String(entry.block),
              columns: String(entry.columns),
            };
            return (
              <div
                key={`layout-entry-${entry.categoryId}`}
                className="rounded-md border border-border/60 bg-muted/20 p-3"
                data-testid={`reports-produktionsplanung-category-layout-entry-${index}`}
              >
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {category ? resolveCategoryTypeLabel(category.categoryType) : "Kategorie"}
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {category?.name ?? `Kategorie ${entry.categoryId}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-sm text-foreground">
                      <span>Block</span>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        className="w-20"
                        disabled={isSaving}
                        value={draft.block}
                        onChange={(event) => updateEntryDraft(entry.categoryId, "block", event.target.value)}
                        onBlur={() => {
                          void commitEntryDraft(index, "block");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                        }}
                        data-testid={`input-reports-produktionsplanung-category-layout-block-${index}`}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-foreground">
                      <span>Spalten</span>
                      <Input
                        type="number"
                        min={1}
                        max={3}
                        step={1}
                        className="w-20"
                        disabled={isSaving}
                        value={draft.columns}
                        onChange={(event) => updateEntryDraft(entry.categoryId, "columns", event.target.value)}
                        onBlur={() => {
                          void commitEntryDraft(index, "columns");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                        }}
                        data-testid={`input-reports-produktionsplanung-category-layout-columns-${index}`}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSaving}
                      onClick={() => void onRemoveEntry(index)}
                      data-testid={`button-reports-produktionsplanung-category-layout-remove-${index}`}
                    >
                      Zuordnung entfernen
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground" data-testid="reports-produktionsplanung-category-layout-empty">
          Noch keine Kategoriezuordnungen konfiguriert.
        </p>
      )}

      <div className="mt-4">
        <h6 className="text-sm font-semibold text-foreground">Nicht zugeordnete Kategorien</h6>
        {unassignedCategories.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2" data-testid="reports-produktionsplanung-category-layout-unassigned">
            {unassignedCategories.map((category) => (
              <span
                key={category.id}
                className="rounded-full border border-dashed border-border/70 px-2 py-1 text-xs text-muted-foreground"
              >
                {resolveCategoryTypeLabel(category.categoryType)}: {category.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Alle aktiven Kategorien sind bereits einem Block zugeordnet.</p>
        )}
      </div>

      {isAddingEntries ? (
        <div className="mt-4 rounded-md border border-border/60 bg-muted/20 p-3" data-testid="reports-produktionsplanung-category-layout-add-panel">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-foreground">
              <span>Block</span>
              <Input
                type="number"
                min={1}
                step={1}
                className="w-20"
                value={draftBlock}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  if (Number.isInteger(next) && next > 0) {
                    setDraftBlock(next);
                  }
                }}
                data-testid="input-reports-produktionsplanung-category-layout-draft-block"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-foreground">
              <span>Spalten</span>
              <Input
                type="number"
                min={1}
                max={3}
                step={1}
                className="w-20"
                value={draftColumns}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  if (next === 1 || next === 2 || next === 3) {
                    setDraftColumns(next);
                  }
                }}
                data-testid="input-reports-produktionsplanung-category-layout-draft-columns"
              />
            </label>
            <Button
              type="button"
              disabled={isSaving || draftCategoryIds.length === 0}
              onClick={() => {
                void (async () => {
                  await onAddEntries(
                    draftCategoryIds.map((categoryId) => ({
                      categoryId,
                      block: draftBlock,
                      columns: draftColumns,
                    })),
                  );
                  resetDraft();
                })();
              }}
              data-testid="button-reports-produktionsplanung-category-layout-confirm"
            >
              Zuordnungen übernehmen
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {unassignedCategories.map((category) => {
              const checked = draftCategoryIds.includes(category.id);
              return (
                <label
                  key={category.id}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-1 text-sm text-foreground",
                    checked ? "bg-background/80" : undefined,
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(nextChecked) => {
                      setDraftCategoryIds((current) => (
                        Boolean(nextChecked)
                          ? [...current, category.id]
                          : current.filter((id) => id !== category.id)
                      ));
                    }}
                    data-testid={`checkbox-reports-produktionsplanung-category-layout-draft-${category.id}`}
                  />
                  <span>{resolveCategoryTypeLabel(category.categoryType)}: {category.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
