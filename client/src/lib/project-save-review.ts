import {
  PROJECT_PRODUCT_FIELDS,
  type DynamicProjectCategorySlot,
  type DynamicProjectProductSelections,
  type ProjectProductSelection,
  type ProjectProductSelections,
} from "@/lib/project-product-form";

type MissingArticleSelectionInput = {
  productSelections: ProjectProductSelections;
  dynamicSelections: DynamicProjectProductSelections;
  dynamicSlots: DynamicProjectCategorySlot[];
  articleListTouched?: boolean;
  extractedArticleListHtml?: string | null;
};

type SaunaTitleSuggestionInput = {
  projectName: string;
  productSelections: ProjectProductSelections;
};

function hasSelectionValue(selection: ProjectProductSelection | undefined): boolean {
  if (!selection) return false;
  return (
    selection.productId != null
    || selection.componentId != null
    || selection.componentName.trim().length > 0
  );
}

function hasRequiredSelectionValue(
  selection: ProjectProductSelection | undefined,
  source: "product" | "component",
): boolean {
  if (!selection) return false;
  return source === "product"
    ? selection.productId != null
    : selection.componentId != null;
}

function hasArticleListContext(input: MissingArticleSelectionInput): boolean {
  if (input.articleListTouched) return true;
  if (input.extractedArticleListHtml?.trim()) return true;
  if (PROJECT_PRODUCT_FIELDS.some((field) => hasSelectionValue(input.productSelections[field.key]))) {
    return true;
  }
  return input.dynamicSlots.some((slot) => hasSelectionValue(input.dynamicSelections[slot.slotId]));
}

export function collectMissingProjectArticleLabels(input: MissingArticleSelectionInput): string[] {
  if (!hasArticleListContext(input)) return [];

  const missingLabels: string[] = [];

  for (const field of PROJECT_PRODUCT_FIELDS) {
    if (field.key === "window") continue;
    const selection = input.productSelections[field.key];
    if (!hasRequiredSelectionValue(selection, field.source)) {
      missingLabels.push(field.label);
    }
  }

  for (const slot of input.dynamicSlots) {
    const selection = input.dynamicSelections[slot.slotId];
    if (!hasRequiredSelectionValue(selection, slot.source)) {
      missingLabels.push(slot.label);
    }
  }

  return missingLabels;
}

export function resolveSaunaTitleSuggestion(input: SaunaTitleSuggestionInput): string | null {
  const saunaModelName = input.productSelections.saunaModel.componentName.trim();
  if (!saunaModelName) return null;
  if (input.projectName.trim() === saunaModelName) return null;
  return saunaModelName;
}
