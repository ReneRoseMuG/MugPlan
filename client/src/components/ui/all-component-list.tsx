import { useEffect, useMemo, useState } from "react";
import { Boxes } from "lucide-react";
import type { Component, ComponentCategory } from "@shared/schema";
import { ComponentCreateDialog, type ComponentCreateInput } from "@/components/ui/component-create-dialog";
import { ComponentDetails, type ComponentDetailsDraft } from "@/components/ui/component-details";
import { ConfirmDialogBase } from "@/components/ui/dialog-base";
import { EntitySelectionRow } from "@/components/ui/entity-selection-row";

function formatComponentLabel(component: Component): string {
  const shortCode = component.shortCode?.trim();
  return shortCode ? `${component.name} - ${shortCode}` : component.name;
}

export type ComponentEditorInput = {
  name: string;
  shortCode: string;
  categoryId: number;
  description: string | null;
  isActive: boolean;
};

interface AllComponentListProps {
  components: Component[];
  categories: ComponentCategory[];
  isAdmin: boolean;
  onCreateComponent: (input: ComponentEditorInput) => Promise<Component>;
  onUpdateComponent: (component: Component, input: ComponentEditorInput) => Promise<Component>;
  onDeleteComponent: (component: Component) => Promise<void>;
  onDeleteAllComponentsInCategory?: (categoryId: string) => void;
}

function toDraft(component: Component | null): ComponentDetailsDraft {
  if (!component) {
    return { name: "", shortCode: "", description: "", isActive: true };
  }
  return {
    name: component.name,
    shortCode: component.shortCode ?? "",
    description: component.description ?? "",
    isActive: component.isActive,
  };
}

export function AllComponentList({
  components,
  categories,
  isAdmin,
  onCreateComponent,
  onUpdateComponent,
  onDeleteComponent,
  onDeleteAllComponentsInCategory,
}: AllComponentListProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [draft, setDraft] = useState<ComponentDetailsDraft>(toDraft(null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Component | null>(null);

  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(String(categories[0].id));
    }
  }, [categories, selectedCategoryId]);

  const filteredComponents = useMemo(() => {
    if (!selectedCategoryId) return components;
    const categoryId = Number(selectedCategoryId);
    if (!Number.isFinite(categoryId) || categoryId <= 0) return components;
    return components
      .filter((c) => c.categoryId === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [components, selectedCategoryId]);

  const selectedComponent = useMemo(
    () => components.find((c) => String(c.id) === selectedComponentId) ?? null,
    [components, selectedComponentId],
  );

  useEffect(() => {
    if (selectedComponent) {
      setSelectedCategoryId(String(selectedComponent.categoryId));
      setDraft(toDraft(selectedComponent));
      setError(null);
    }
  }, [selectedComponent]);

  useEffect(() => {
    if (!selectedComponentId) return;
    if (filteredComponents.some((c) => String(c.id) === selectedComponentId)) return;
    setSelectedComponentId("");
    setDraft(toDraft(null));
    setError(null);
  }, [filteredComponents, selectedComponentId]);

  const componentOptions = filteredComponents.map((c) => ({
    value: String(c.id),
    label: formatComponentLabel(c),
  }));
  const categoryOptions = categories.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const handleComponentSelect = (value: string) => {
    setSelectedComponentId(value);
    const component = components.find((c) => String(c.id) === value);
    if (component) {
      setSelectedCategoryId(String(component.categoryId));
      setDraft(toDraft(component));
      setError(null);
    }
  };

  const handleCategorySelect = (value: string) => {
    setSelectedCategoryId(value);
    const selected = components.find((c) => String(c.id) === selectedComponentId);
    if (selected && String(selected.categoryId) !== value) {
      setSelectedComponentId("");
      setDraft(toDraft(null));
      setError(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedComponent || !draft.name.trim()) return;
    setSubmitting(true);
    setError(null);
    const payload: ComponentEditorInput = {
      name: draft.name.trim(),
      shortCode: draft.shortCode,
      categoryId: selectedComponent.categoryId,
      description: draft.description.trim() || null,
      isActive: draft.isActive,
    };
    try {
      const updated = await onUpdateComponent(selectedComponent, payload);
      setSelectedComponentId(String(updated.id));
      setDraft(toDraft(updated));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Komponente konnte nicht gespeichert werden.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const currentComponent = components.find((component) => component.id === deleteTarget.id) ?? deleteTarget;
    setSubmitting(true);
    setError(null);
    try {
      await onDeleteComponent(currentComponent);
      setSelectedComponentId("");
      setDraft(toDraft(null));
      setDeleteTarget(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Komponente konnte nicht gelöscht werden.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateConfirm = async (input: ComponentCreateInput): Promise<Component> => {
    const payload: ComponentEditorInput = {
      name: input.name,
      shortCode: input.shortCode ?? "",
      categoryId: input.categoryId,
      description: input.description,
      isActive: true,
    };
    const created = await onCreateComponent(payload);
    setSelectedComponentId(String(created.id));
    setSelectedCategoryId(String(created.categoryId));
    setDraft(toDraft(created));
    return created;
  };

  return (
    <section className="flex min-h-0 flex-col gap-4" data-testid="all-component-list">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <EntitySelectionRow
          itemLabel="Komponente"
          itemValue={selectedComponentId}
          itemOptions={componentOptions}
          itemPlaceholder="Komponente auswählen"
          categoryLabel="Komponentenkategorie"
          categoryValue={selectedCategoryId}
          categoryOptions={categoryOptions}
          categoryPlaceholder="Kategorie auswählen"
          onItemSelect={handleComponentSelect}
          onCategorySelect={handleCategorySelect}
          showRemove={isAdmin}
          showAdd={isAdmin}
          showDeleteAll={isAdmin}
          onRemove={selectedComponent ? () => setDeleteTarget(selectedComponent) : undefined}
          onAdd={() => setCreateDialogOpen(true)}
          onDeleteAll={selectedCategoryId ? () => onDeleteAllComponentsInCategory?.(selectedCategoryId) : undefined}
          removeDisabled={!selectedComponent || submitting}
          addDisabled={submitting}
          deleteAllDisabled={!selectedCategoryId || submitting}
          selectDisabled={submitting}
          itemTestId="select-component-record"
          categoryTestId="select-component-category-record"
        />
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <ComponentDetails
          draft={draft}
          disabled={submitting || !selectedComponent}
          isAdmin={isAdmin}
          error={error}
          onDraftChange={setDraft}
          onSubmit={isAdmin ? () => void handleUpdate() : undefined}
          submitLabel="Aktualisieren"
        />
      </div>

      {createDialogOpen && selectedCategoryId ? (
        <ComponentCreateDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          categoryId={Number(selectedCategoryId)}
          categoryName={categories.find((c) => String(c.id) === selectedCategoryId)?.name}
          onConfirm={handleCreateConfirm}
        />
      ) : null}
      <ConfirmDialogBase
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setDeleteTarget(null);
          }
        }}
        title="Komponente wirklich löschen?"
        description={deleteTarget ? `Komponente "${deleteTarget.name}" wird gelöscht.` : undefined}
        confirmLabel="Komponente löschen"
        icon={<Boxes className="h-5 w-5 text-primary" />}
        isPending={submitting}
        pendingLabel="Lösche..."
        variant="destructive"
        testId="dialog-confirm-delete-component"
        onConfirm={() => void handleConfirmDelete()}
      />
    </section>
  );
}
