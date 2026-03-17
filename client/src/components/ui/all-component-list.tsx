import { useEffect, useMemo, useState } from "react";
import type { Component, ComponentCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { CollectionDropDown } from "@/components/ui/collection-drop-down";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

type ComponentDraft = {
  name: string;
  shortCode: string;
  description: string;
  isActive: boolean;
};

function toDraft(component: Component | null): ComponentDraft {
  if (!component) {
    return {
      name: "",
      shortCode: "",
      description: "",
      isActive: true,
    };
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
  const [draft, setDraft] = useState<ComponentDraft>(toDraft(null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      .filter((component) => component.categoryId === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [components, selectedCategoryId]);

  const selectedComponent = useMemo(
    () => components.find((component) => String(component.id) === selectedComponentId) ?? null,
    [components, selectedComponentId],
  );

  useEffect(() => {
    if (selectedComponent) {
      setSelectedCategoryId(String(selectedComponent.categoryId));
      setDraft(toDraft(selectedComponent));
      setError(null);
      return;
    }

    setDraft((current) => ({
      ...current,
      isActive: current.name || current.shortCode || current.description ? current.isActive : true,
    }));
  }, [selectedComponent]);

  useEffect(() => {
    if (!selectedComponentId) return;
    if (filteredComponents.some((component) => String(component.id) === selectedComponentId)) return;
    setSelectedComponentId("");
    setDraft(toDraft(null));
    setError(null);
  }, [filteredComponents, selectedComponentId]);

  const componentOptions = filteredComponents.map((component) => ({
    value: String(component.id),
    label: component.name,
  }));

  const categoryOptions = categories.map((category) => ({
    value: String(category.id),
    label: category.name,
  }));

  const beginCreateMode = () => {
    setSelectedComponentId("");
    setDraft(toDraft(null));
    setError(null);
  };

  const handleComponentSelect = (value: string) => {
    setSelectedComponentId(value);
    const component = components.find((entry) => String(entry.id) === value);
    if (!component) return;
    setSelectedCategoryId(String(component.categoryId));
    setDraft(toDraft(component));
    setError(null);
  };

  const handleCategorySelect = (value: string) => {
    setSelectedCategoryId(value);
    const categoryId = Number(value);
    const selected = components.find((component) => String(component.id) === selectedComponentId);
    if (selected && selected.categoryId === categoryId) {
      return;
    }
    setSelectedComponentId("");
    setDraft(toDraft(null));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedCategoryId || !draft.name.trim()) return;
    setSubmitting(true);
    setError(null);
    const payload: ComponentEditorInput = {
      name: draft.name.trim(),
      shortCode: draft.shortCode,
      categoryId: Number(selectedCategoryId),
      description: draft.description.trim() || null,
      isActive: draft.isActive,
    };

    try {
      if (selectedComponent) {
        const updated = await onUpdateComponent(selectedComponent, payload);
        setSelectedComponentId(String(updated.id));
        setSelectedCategoryId(String(updated.categoryId));
        setDraft(toDraft(updated));
      } else {
        const created = await onCreateComponent(payload);
        setSelectedComponentId(String(created.id));
        setSelectedCategoryId(String(created.categoryId));
        setDraft(toDraft(created));
      }
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
      beginCreateMode();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Komponente konnte nicht gelöscht werden.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="all-component-list">
      <h5 className="font-semibold text-slate-900">Komponenten</h5>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <CollectionDropDown
          label="Komponente"
          value={selectedComponentId}
          options={componentOptions}
          placeholder="Komponente auswählen"
          onSelect={handleComponentSelect}
          showRemove={isAdmin}
          showAdd={isAdmin}
          onRemove={() => void handleDelete()}
          onAdd={beginCreateMode}
          removeDisabled={!selectedComponent || submitting}
          addDisabled={!selectedCategoryId || submitting}
          selectDisabled={submitting}
          testId="select-component-record"
        />

        <CollectionDropDown
          label="Komponentenkategorie"
          value={selectedCategoryId}
          options={categoryOptions}
          placeholder="Kategorie auswählen"
          onSelect={handleCategorySelect}
          selectDisabled={submitting}
          testId="select-component-category-record"
        />
      </div>

      <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
        <h6 className="font-semibold text-slate-900">Komponenten Stammdaten</h6>
        <div className="mt-3 grid grid-cols-1 gap-3">
          {isAdmin ? (
            <div className="space-y-2">
              <Label htmlFor="component-data-active">Status</Label>
              <label className="flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700">
                <input
                  id="component-data-active"
                  type="checkbox"
                  checked={draft.isActive}
                  disabled={submitting}
                  onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
                />
                <span>Is Active</span>
              </label>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
            <div className="space-y-2">
              <Label htmlFor="component-data-name">Name</Label>
              <Input
                id="component-data-name"
                value={draft.name}
                disabled={submitting}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Name eingeben"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="component-data-short-code">ShortCode</Label>
              <Input
                id="component-data-short-code"
                value={draft.shortCode}
                disabled={submitting}
                onChange={(event) => setDraft({ ...draft, shortCode: event.target.value })}
                placeholder="Kurzcode"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="component-data-description">Beschreibung</Label>
            <Textarea
              id="component-data-description"
              value={draft.description}
              disabled={submitting}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              rows={2}
              className="min-h-0"
              placeholder="Beschreibung eingeben"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => void handleSubmit()}
              disabled={submitting || !isAdmin || !selectedCategoryId || !draft.name.trim()}
              data-testid={selectedComponent ? "button-update-component-record" : "button-create-component-record"}
            >
              {selectedComponent ? "Aktualisieren" : "Anlegen"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
