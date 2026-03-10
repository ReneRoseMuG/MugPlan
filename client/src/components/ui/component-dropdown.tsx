import { useEffect, useMemo, useState } from "react";
import type { Component, ComponentCategory } from "@shared/schema";
import { CollectionDropDown } from "@/components/ui/collection-drop-down";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { findProjectProductCategory, getProjectProductFieldByCategoryName } from "@/lib/project-product-form";

interface ComponentDropdownProps {
  components: Component[];
  categories: ComponentCategory[];
  targetCategory: string;
  selectedComponentId: string;
  onSelect: (componentId: string) => void;
  dialogMode?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
}

function ComponentDropdownPanel({
  components,
  categories,
  targetCategory,
  selectedComponentId,
  onSelect,
  onApply,
}: {
  components: Component[];
  categories: ComponentCategory[];
  targetCategory: string;
  selectedComponentId: string;
  onSelect: (componentId: string) => void;
  onApply: () => void;
}) {
  const [draftSelection, setDraftSelection] = useState(selectedComponentId);

  useEffect(() => {
    setDraftSelection(selectedComponentId);
  }, [selectedComponentId]);

  const fieldKey = getProjectProductFieldByCategoryName(targetCategory);
  const category = fieldKey ? findProjectProductCategory(categories, fieldKey) : null;
  const options = useMemo(() => {
    if (!category) return [];
    return components
      .filter((component) => component.categoryId === category.id)
      .sort((a, b) => a.name.localeCompare(b.name, "de"))
      .map((component) => ({
        value: String(component.id),
        label: component.name,
      }));
  }, [category, components]);

  return (
    <CollectionDropDown
      label={targetCategory}
      value={draftSelection}
      options={options}
      placeholder={`${targetCategory} auswählen`}
      onSelect={setDraftSelection}
      showAdopt
      onAdopt={() => {
        onSelect(draftSelection);
        onApply();
      }}
      adoptDisabled={!draftSelection}
      testId={`select-component-${fieldKey ?? "unknown"}`}
    />
  );
}

export function ComponentDropdown({
  components,
  categories,
  targetCategory,
  selectedComponentId,
  onSelect,
  dialogMode = false,
  open = true,
  onOpenChange,
  title,
}: ComponentDropdownProps) {
  const panel = (
    <ComponentDropdownPanel
      components={components}
      categories={categories}
      targetCategory={targetCategory}
      selectedComponentId={selectedComponentId}
      onSelect={onSelect}
      onApply={() => {
        if (dialogMode) {
          onOpenChange?.(false);
        }
      }}
    />
  );

  if (!dialogMode) {
    return panel;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title ?? `${targetCategory} auswählen`}</DialogTitle>
        </DialogHeader>
        {panel}
      </DialogContent>
    </Dialog>
  );
}
