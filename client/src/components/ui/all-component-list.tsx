import { useMemo, useState } from "react";
import type { Component, ComponentCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ComponentEditorInput = {
  name: string;
  categoryId: number;
  description: string | null;
  isActive: boolean;
};

interface AllComponentListProps {
  components: Component[];
  categories: ComponentCategory[];
  categoryNameById: Map<number, string>;
  isAdmin: boolean;
  onCreateComponent: (input: ComponentEditorInput) => Promise<void>;
}

export function AllComponentList({
  components,
  categories,
  categoryNameById,
  isAdmin,
  onCreateComponent,
}: AllComponentListProps) {
  const [categoryFilterId, setCategoryFilterId] = useState<string>("");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", categoryId: "", description: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredComponents = useMemo(() => {
    if (!categoryFilterId) return components;
    const categoryId = Number(categoryFilterId);
    if (!Number.isFinite(categoryId) || categoryId <= 0) return components;
    return components.filter((component) => component.categoryId === categoryId);
  }, [categoryFilterId, components]);

  const resetDraft = () => {
    setDraft({ name: "", categoryId: "", description: "" });
    setError(null);
    setSubmitting(false);
  };

  const submitNew = async () => {
    if (!draft.name.trim() || !draft.categoryId) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreateComponent({
        name: draft.name.trim(),
        categoryId: Number(draft.categoryId),
        description: draft.description.trim() || null,
        isActive: true,
      });
      setNewDialogOpen(false);
      resetDraft();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Komponente konnte nicht angelegt werden.");
      setSubmitting(false);
    }
  };

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
                <TableRow key={component.id}>
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
              resetDraft();
              setNewDialogOpen(true);
            }}
            data-testid="button-open-new-component-from-all-components"
          >
            Neue Komponente
          </Button>
        </div>
      ) : null}

      <Dialog open={newDialogOpen} onOpenChange={(open) => {
        setNewDialogOpen(open);
        if (!open) resetDraft();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Komponente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="all-components-new-name">Name</Label>
              <Input
                id="all-components-new-name"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="all-components-new-category">Komponentenkategorie</Label>
              <select
                id="all-components-new-category"
                value={draft.categoryId}
                onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
                className="h-10 w-full rounded border border-slate-300 bg-white px-2 text-sm"
              >
                <option value="">Kategorie wählen</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="all-components-new-description">Beschreibung</Label>
              <Textarea
                id="all-components-new-description"
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={() => void submitNew()} disabled={submitting || !draft.name.trim() || !draft.categoryId}>
              {submitting ? "Speichere..." : "Übernehmen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
