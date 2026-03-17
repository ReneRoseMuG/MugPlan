import { useEffect, useMemo, useState } from "react";
import type { Component, ComponentCategory } from "@shared/schema";
import { ComponentCreateDialog, type ComponentCreateInput } from "@/components/ui/component-create-dialog";
import { ComponentDetails, type ComponentDetailsDraft } from "@/components/ui/component-details";
import { EntitySelectionRow } from "@/components/ui/entity-selection-row";

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
}: AllComponentListProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [draft, setDraft] = useState<ComponentDetailsDraft>(toDraft(null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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
    label: c.name,
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

  const handleDelete = async () => {
    if (!selectedComponent) return;
    if (!window.confirm(`Komponente "${selectedComponent.name}" löschen?`)) return;
    setSubmitting(true);
    setError(null);
    try {
      await onDeleteComponent(selectedComponent);
      setSelectedComponentId("");
      setDraft(toDraft(null));
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
    <section className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="all-component-list">
      <h5 className="font-semibold text-slate-900">Komponenten</h5>

      <div className="mt-3">
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
          onRemove={() => void handleDelete()}
          onAdd={() => setCreateDialogOpen(true)}
          removeDisabled={!selectedComponent || submitting}
          addDisabled={submitting}
          selectDisabled={submitting}
          itemTestId="select-component-record"
          categoryTestId="select-component-category-record"
        />
      </div>

      {selectedComponent ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
          <h6 className="mb-3 font-semibold text-slate-900">Komponenten Stammdaten</h6>
          <ComponentDetails
            draft={draft}
            disabled={submitting}
            isAdmin={isAdmin}
            error={error}
            onDraftChange={setDraft}
            onSubmit={isAdmin ? () => void handleUpdate() : undefined}
            submitLabel="Aktualisieren"
          />
        </div>
      ) : null}

      {createDialogOpen && selectedCategoryId ? (
        <ComponentCreateDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          categoryId={Number(selectedCategoryId)}
          categoryName={categories.find((c) => String(c.id) === selectedCategoryId)?.name}
          onConfirm={handleCreateConfirm}
        />
      ) : null}
    </section>
  );
}
