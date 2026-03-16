import { useEffect, useMemo, useState } from "react";
import type { Component, ComponentCategory } from "@shared/schema";
import { CollectionDropDown } from "@/components/ui/collection-drop-down";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { findProjectProductCategory, getProjectProductFieldByCategoryName } from "@/lib/project-product-form";

interface ComponentDropdownProps {
  components: Component[];
  categories: ComponentCategory[];
  targetCategory: string;
  targetCategoryId?: number;
  selectedComponentId: string;
  onSelect: (componentId: string) => void;
  dialogMode?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  testId?: string;
}

function ComponentDropdownPanel({
  components,
  categories,
  targetCategory,
  targetCategoryId,
  selectedComponentId,
  onSelect,
  onApply,
  testId,
}: {
  components: Component[];
  categories: ComponentCategory[];
  targetCategory: string;
  targetCategoryId?: number;
  selectedComponentId: string;
  onSelect: (componentId: string) => void;
  onApply: () => void;
  testId?: string;
}) {
  const [draftSelection, setDraftSelection] = useState(selectedComponentId);

  useEffect(() => {
    setDraftSelection(selectedComponentId);
  }, [selectedComponentId]);

  const fieldKey = getProjectProductFieldByCategoryName(targetCategory);
  const category = useMemo(() => {
    if (targetCategoryId != null) {
      return categories.find((entry) => entry.id === targetCategoryId) ?? null;
    }
    return fieldKey ? findProjectProductCategory(categories, fieldKey) : null;
  }, [categories, fieldKey, targetCategoryId]);

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
      placeholder={`${targetCategory} auswaehlen`}
      onSelect={setDraftSelection}
      showAdopt
      onAdopt={() => {
        onSelect(draftSelection);
        onApply();
      }}
      adoptDisabled={!draftSelection}
      testId={testId ?? `select-component-${fieldKey ?? targetCategoryId ?? "unknown"}`}
    />
  );
}

export function ComponentDropdown({
  components,
  categories,
  targetCategory,
  targetCategoryId,
  selectedComponentId,
  onSelect,
  dialogMode = false,
  open = true,
  onOpenChange,
  title,
  testId,
}: ComponentDropdownProps) {
  const panel = (
    <ComponentDropdownPanel
      components={components}
      categories={categories}
      targetCategory={targetCategory}
      targetCategoryId={targetCategoryId}
      selectedComponentId={selectedComponentId}
      onSelect={onSelect}
      testId={testId}
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
          <DialogTitle>{title ?? `${targetCategory} auswaehlen`}</DialogTitle>
        </DialogHeader>
        {panel}
      </DialogContent>
    </Dialog>
  );
}
