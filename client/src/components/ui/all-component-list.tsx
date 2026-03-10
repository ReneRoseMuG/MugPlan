import { useMemo, useState } from "react";
import type { Component, ComponentCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AllComponentListProps {
  components: Component[];
  categories: ComponentCategory[];
  categoryNameById: Map<number, string>;
  isAdmin: boolean;
  onInsertComponent: (component: Component) => Promise<void>;
}

export function AllComponentList({
  components,
  categories,
  categoryNameById,
  isAdmin,
  onInsertComponent,
}: AllComponentListProps) {
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");
  const [categoryFilterId, setCategoryFilterId] = useState<string>("");

  const filteredComponents = useMemo(() => {
    if (!categoryFilterId) return components;
    const categoryId = Number(categoryFilterId);
    if (!Number.isFinite(categoryId) || categoryId <= 0) return components;
    return components.filter((component) => component.categoryId === categoryId);
  }, [categoryFilterId, components]);

  const selectedComponent = useMemo(
    () => filteredComponents.find((component) => String(component.id) === selectedComponentId) ?? null,
    [filteredComponents, selectedComponentId],
  );

  return (
    <section className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="all-component-list">
      <h5 className="font-semibold text-slate-900">Alle Komponenten</h5>
      <div className="mt-3 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Is Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredComponents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  Keine weiteren Komponenten verfuegbar.
                </TableCell>
              </TableRow>
            ) : (
              filteredComponents.map((component) => (
                <TableRow
                  key={component.id}
                  className={selectedComponentId === String(component.id) ? "bg-slate-100" : undefined}
                  onClick={() => setSelectedComponentId(String(component.id))}
                >
                  <TableCell>{component.name}</TableCell>
                  <TableCell>{categoryNameById.get(component.categoryId) ?? `#${component.categoryId}`}</TableCell>
                  <TableCell>{component.isActive ? "Aktiv" : "Inaktiv"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {isAdmin ? (
        <div className="mt-3 flex items-end justify-start gap-2">
          <div className="min-w-[220px] space-y-2">
            <div className="text-sm font-medium text-slate-900">Kategorie</div>
            <select
              value={categoryFilterId}
              onChange={(event) => {
                setCategoryFilterId(event.target.value);
                setSelectedComponentId("");
              }}
              className="h-10 w-full rounded border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="">Alle Kategorien</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (!selectedComponent) return;
              void onInsertComponent(selectedComponent);
            }}
            disabled={!selectedComponent}
          >
            Einfuegen
          </Button>
        </div>
      ) : null}
    </section>
  );
}
