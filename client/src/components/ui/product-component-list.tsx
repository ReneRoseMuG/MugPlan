import { useEffect, useMemo, useState } from "react";
import type { Component } from "@shared/schema";
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

interface ProductComponentListProps {
  components: Component[];
  categoryNameById: Map<number, string>;
  isAdmin: boolean;
  onCreateComponent: (input: ComponentEditorInput) => Promise<void>;
  onUpdateComponent: (component: Component, input: ComponentEditorInput) => Promise<void>;
  onRemoveComponent: (component: Component) => Promise<void>;
}

function toEditorDraft(component: Component | null) {
  return {
    name: component?.name ?? "",
    categoryId: component ? String(component.categoryId) : "",
    description: component?.description ?? "",
    isActive: component?.isActive ?? true,
  };
}

export function ProductComponentList({
  components,
  categoryNameById,
  isAdmin,
  onCreateComponent,
  onUpdateComponent,
  onRemoveComponent,
}: ProductComponentListProps) {
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [draft, setDraft] = useState(toEditorDraft(null));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedComponent = useMemo(
    () => components.find((component) => String(component.id) === selectedComponentId) ?? null,
    [components, selectedComponentId],
  );

  useEffect(() => {
    if (selectedComponent && !components.some((component) => component.id === selectedComponent.id)) {
      setSelectedComponentId("");
    }
  }, [components, selectedComponent]);

  const resetDraft = (component: Component | null) => {
    setDraft(toEditorDraft(component));
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
      resetDraft(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Komponente konnte nicht angelegt werden.");
      setSubmitting(false);
    }
  };

  const submitEdit = async () => {
    if (!selectedComponent || !draft.name.trim() || !draft.categoryId) return;
    setSubmitting(true);
    setError(null);
    try {
      await onUpdateComponent(selectedComponent, {
        name: draft.name.trim(),
        categoryId: Number(draft.categoryId),
        description: draft.description.trim() || null,
        isActive: draft.isActive,
      });
      setEditDialogOpen(false);
      resetDraft(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Komponente konnte nicht aktualisiert werden.");
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="product-component-list">
      <div className="flex items-center justify-between gap-3">
        <h5 className="font-semibold text-slate-900">Produkt Komponenten</h5>
      </div>
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
            {components.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  Keine Komponenten zugeordnet.
                </TableCell>
              </TableRow>
            ) : (
              components.map((component) => (
                <TableRow
                  key={component.id}
                  className={selectedComponentId === String(component.id) ? "bg-slate-50" : undefined}
                  onClick={() => setSelectedComponentId(String(component.id))}
                  onDoubleClick={() => {
                    if (!isAdmin) return;
                    setSelectedComponentId(String(component.id));
                    resetDraft(component);
                    setEditDialogOpen(true);
                  }}
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
        <div className="mt-3 flex justify-start gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!selectedComponent) return;
              void onRemoveComponent(selectedComponent);
            }}
            disabled={!selectedComponent}
          >
            Eintrag entfernen
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              resetDraft(null);
              setNewDialogOpen(true);
            }}
          >
            Neue Komponente
          </Button>
        </div>
      ) : null}

      <Dialog open={newDialogOpen} onOpenChange={(open) => {
        setNewDialogOpen(open);
        if (!open) resetDraft(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Komponente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-component-name">Name</Label>
              <Input id="new-component-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-component-category">Komponentenkategorie</Label>
              <select
                id="new-component-category"
                value={draft.categoryId}
                onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
                className="h-10 w-full rounded border border-slate-300 bg-white px-2 text-sm"
              >
                <option value="">Kategorie wählen</option>
                {Array.from(categoryNameById.entries()).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-component-description">Beschreibung</Label>
              <Textarea id="new-component-description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
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

      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) resetDraft(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Komponente bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-component-name">Name</Label>
              <Input id="edit-component-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-component-category">Komponentenkategorie</Label>
              <select
                id="edit-component-category"
                value={draft.categoryId}
                onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
                className="h-10 w-full rounded border border-slate-300 bg-white px-2 text-sm"
              >
                <option value="">Kategorie wählen</option>
                {Array.from(categoryNameById.entries()).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-component-description">Beschreibung</Label>
              <Textarea id="edit-component-description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </div>
            {isAdmin ? (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />
                <span>Is Active</span>
              </label>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={() => void submitEdit()} disabled={submitting || !draft.name.trim() || !draft.categoryId}>
              {submitting ? "Speichere..." : "Übernehmen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
