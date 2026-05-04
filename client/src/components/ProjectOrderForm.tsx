import { useState } from "react";
import type { Component, ComponentCategory, Product, ProductCategory } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ComponentCreateDialog, type ComponentCreateInput } from "@/components/ui/component-create-dialog";
import { ProductCreateDialog } from "@/components/ui/product-create-dialog";
import {
  PROJECT_PRODUCT_FIELDS,
  findProjectProductCategory,
  isProductSelectionField,
  type DynamicProjectCategorySlot,
  type DynamicProjectProductSelections,
  type ProjectProductFieldKey,
  type ProjectProductSelections,
} from "@/lib/project-product-form";

function formatArticleLabel(entry: { name: string; shortCode: string | null }): string {
  const shortCode = entry.shortCode?.trim();
  return shortCode ? `${entry.name} - ${shortCode}` : entry.name;
}

interface ProjectOrderFormProps {
  name: string;
  orderNumber: string;
  amount: string;
  plannedDateText: string;
  plannedWeek: string;
  isEditing: boolean;
  readOnly?: boolean;
  onNameChange: (value: string) => void;
  onOrderNumberChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onPlannedDateTextChange: (value: string) => void;
  onPlannedWeekChange: (value: string) => void;
}

export type ArticleCreateInput = {
  name: string;
  shortCode: string | null;
  description: string | null;
  categoryId: number;
};

interface ProjectProductFieldsProps {
  productSelections: ProjectProductSelections;
  dynamicSlots: DynamicProjectCategorySlot[];
  dynamicSelections: DynamicProjectProductSelections;
  products: Product[];
  components: Component[];
  componentCategories: ComponentCategory[];
  productCategories: ProductCategory[];
  isAdmin: boolean;
  readOnly?: boolean;
  onSelectField: (fieldKey: ProjectProductFieldKey, selectedValue: string) => void;
  onSelectDynamic: (slotId: string, selectedValue: string) => void;
  onCreateForField: (fieldKey: ProjectProductFieldKey, input: ArticleCreateInput) => Promise<void>;
  onCreateForSlot: (slotId: string, input: ArticleCreateInput) => Promise<void>;
}

export function ProjectOrderForm({
  name,
  orderNumber,
  amount,
  plannedDateText,
  plannedWeek,
  isEditing,
  readOnly = false,
  onNameChange,
  onOrderNumberChange,
  onAmountChange,
  onPlannedDateTextChange,
  onPlannedWeekChange,
}: ProjectOrderFormProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4" data-testid="project-order-form">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,10rem),minmax(0,1fr),minmax(0,10rem)]">
        <div className="space-y-2">
          <Label htmlFor="projectOrderNumber" data-testid="label-project-order-number">Auftragsnummer</Label>
          <Input
            id="projectOrderNumber"
            value={orderNumber}
            onChange={(e) => onOrderNumberChange(e.target.value)}
            maxLength={10}
            readOnly={isEditing || readOnly}
            data-testid="input-project-order-number"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectName" data-testid="label-project-name">Projektname *</Label>
          <Input
            id="projectName"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            readOnly={readOnly}
            data-testid="input-project-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectAmount" data-testid="label-project-amount">Auftragswert (EUR)</Label>
          <Input
            id="projectAmount"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            inputMode="decimal"
            maxLength={10}
            placeholder="z. B. 14999.90"
            readOnly={readOnly}
            data-testid="input-project-amount"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="projectPlannedDateText" data-testid="label-project-planned-date-text">Geplanter Termin</Label>
          <Input
            id="projectPlannedDateText"
            value={plannedDateText}
            onChange={(e) => onPlannedDateTextChange(e.target.value)}
            placeholder="Freitext"
            readOnly={readOnly}
            data-testid="input-project-planned-date-text"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectPlannedWeek" data-testid="label-project-planned-week">Geplante Kalenderwoche</Label>
          <Input
            id="projectPlannedWeek"
            value={plannedWeek}
            onChange={(e) => onPlannedWeekChange(e.target.value)}
            maxLength={10}
            placeholder="z. B. KW 14"
            readOnly={readOnly}
            data-testid="input-project-planned-week"
          />
        </div>
      </div>
    </div>
  );
}

type CreateDialogTarget =
  | { kind: "field"; fieldKey: ProjectProductFieldKey }
  | { kind: "slot"; slotId: string; source: "product" | "component"; categoryId: number };

export function ProjectProductFields({
  productSelections,
  dynamicSlots,
  dynamicSelections,
  products,
  components,
  componentCategories,
  productCategories,
  isAdmin,
  readOnly = false,
  onSelectField,
  onSelectDynamic,
  onCreateForField,
  onCreateForSlot,
}: ProjectProductFieldsProps) {
  const [createTarget, setCreateTarget] = useState<CreateDialogTarget | null>(null);

  const leftColumnFields: ProjectProductFieldKey[] = ["saunaModel", "oven", "control", "roof", "door"];
  const rightColumnFields: ProjectProductFieldKey[] = ["window", "frontWall", "rearWallWindow", "interior"];
  const dynamicProductSlots = dynamicSlots.filter((slot) => slot.source === "product");
  const dynamicComponentSlots = dynamicSlots.filter((slot) => slot.source === "component");

  const getFieldItems = (fieldKey: ProjectProductFieldKey): Array<{ value: string; label: string }> => {
    if (isProductSelectionField(fieldKey)) {
      return products
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "de"))
        .map((p) => ({ value: String(p.id), label: formatArticleLabel(p) }));
    }
    const category = findProjectProductCategory(componentCategories, fieldKey);
    if (!category) return [];
    return components
      .filter((c) => c.categoryId === category.id)
      .sort((a, b) => a.name.localeCompare(b.name, "de"))
      .map((c) => ({ value: String(c.id), label: formatArticleLabel(c) }));
  };

  const getFieldCurrentValue = (fieldKey: ProjectProductFieldKey): string => {
    const sel = productSelections[fieldKey];
    return isProductSelectionField(fieldKey)
      ? String(sel.productId ?? "")
      : String(sel.componentId ?? "");
  };

  const getFieldCategoryId = (fieldKey: ProjectProductFieldKey): number | undefined => {
    if (isProductSelectionField(fieldKey)) return undefined;
    return findProjectProductCategory(componentCategories, fieldKey)?.id;
  };

  const getFieldCategoryName = (fieldKey: ProjectProductFieldKey): string | undefined => {
    return findProjectProductCategory(componentCategories, fieldKey)?.name;
  };

  const renderField = (fieldKey: ProjectProductFieldKey) => {
    const field = PROJECT_PRODUCT_FIELDS.find((entry) => entry.key === fieldKey)!;
    const items = getFieldItems(fieldKey);
    const currentValue = getFieldCurrentValue(fieldKey);
    // For component fields: category from field definition.
    // For product fields (saunaModel): category from the currently selected product.
    const componentCategoryId = getFieldCategoryId(fieldKey);
    const productCategoryId = isProductSelectionField(fieldKey) && currentValue
      ? products.find((p) => String(p.id) === currentValue)?.categoryId
      : undefined;
    const resolvedCategoryId = componentCategoryId ?? productCategoryId;

    return (
      <div
        key={field.key}
        className="space-y-2"
        data-testid={`project-product-field-${field.key}`}
      >
        <Label htmlFor={`project-product-${field.key}`}>{field.label}</Label>
        <div className="flex items-center gap-2">
          <select
            id={`project-product-${field.key}`}
            value={currentValue}
            onChange={(e) => {
              onSelectField(field.key, e.target.value);
            }}
            disabled={readOnly}
            className="h-10 min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 text-sm"
            data-testid={`select-project-product-${field.key}`}
          >
            <option value="">— nicht ausgewählt —</option>
            {items.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          {isAdmin && !readOnly ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateTarget({ kind: "field", fieldKey: field.key })}
              disabled={resolvedCategoryId == null}
              data-testid={`button-create-project-product-${field.key}`}
            >
              +
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderDynamicField = (slot: DynamicProjectCategorySlot) => {
    const sel = dynamicSelections[slot.slotId];
    const currentValue = slot.source === "product"
      ? String(sel?.productId ?? "")
      : String(sel?.componentId ?? "");

    const items = slot.source === "product"
      ? products.filter((p) => p.categoryId === slot.categoryId).sort((a, b) => a.name.localeCompare(b.name, "de")).map((p) => ({ value: String(p.id), label: formatArticleLabel(p) }))
      : components.filter((c) => c.categoryId === slot.categoryId).sort((a, b) => a.name.localeCompare(b.name, "de")).map((c) => ({ value: String(c.id), label: formatArticleLabel(c) }));

    return (
      <div
        key={slot.slotId}
        className="space-y-2"
        data-testid={`project-product-field-${slot.slotId}`}
      >
        <Label htmlFor={`project-product-${slot.slotId}`}>{slot.label}</Label>
        <div className="flex items-center gap-2">
          <select
            id={`project-product-${slot.slotId}`}
            value={currentValue}
            onChange={(e) => {
              onSelectDynamic(slot.slotId, e.target.value);
            }}
            disabled={readOnly}
            className="h-10 min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 text-sm"
            data-testid={`select-project-product-${slot.slotId}`}
          >
            <option value="">— nicht ausgewählt —</option>
            {items.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          {isAdmin && !readOnly ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateTarget({ kind: "slot", slotId: slot.slotId, source: slot.source, categoryId: slot.categoryId })}
              data-testid={`button-create-project-product-${slot.slotId}`}
            >
              +
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  // Determine dialog to show
  const isProductCreate = createTarget?.kind === "field"
    ? isProductSelectionField(createTarget.fieldKey)
    : createTarget?.source === "product";

  const dialogCategoryId = (() => {
    if (!createTarget) return undefined;
    if (createTarget.kind === "slot") return createTarget.categoryId;
    const fromField = getFieldCategoryId(createTarget.fieldKey);
    if (fromField != null) return fromField;
    // Product field (saunaModel): use category of currently selected product
    const currentVal = getFieldCurrentValue(createTarget.fieldKey);
    return currentVal ? products.find((p) => String(p.id) === currentVal)?.categoryId : undefined;
  })();

  const dialogCategoryName = createTarget?.kind === "field"
    ? (getFieldCategoryName(createTarget.fieldKey) ?? productCategories.find((c) => c.id === dialogCategoryId)?.name)
    : (isProductCreate
        ? productCategories.find((c) => c.id === dialogCategoryId)?.name
        : componentCategories.find((c) => c.id === dialogCategoryId)?.name);

  const handleConfirmCreate = async (input: ArticleCreateInput) => {
    if (!createTarget) return;
    if (createTarget.kind === "field") {
      await onCreateForField(createTarget.fieldKey, input);
    } else {
      await onCreateForSlot(createTarget.slotId, input);
    }
    setCreateTarget(null);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-4" data-testid="project-product-fields">
      {dynamicProductSlots.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {dynamicProductSlots.map(renderDynamicField)}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-3">
          {leftColumnFields.map(renderField)}
        </div>
        <div className="space-y-3">
          {rightColumnFields.map(renderField)}
        </div>
      </div>
      {dynamicComponentSlots.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-3">
            {dynamicComponentSlots.filter((_, index) => index % 2 === 0).map(renderDynamicField)}
          </div>
          <div className="space-y-3">
            {dynamicComponentSlots.filter((_, index) => index % 2 === 1).map(renderDynamicField)}
          </div>
        </div>
      ) : null}

      {/* Create dialogs */}
      {createTarget && isProductCreate && dialogCategoryId != null ? (
        <ProductCreateDialog
          open={true}
          onClose={() => setCreateTarget(null)}
          categoryId={dialogCategoryId}
          categoryName={dialogCategoryName}
          onConfirm={handleConfirmCreate}
        />
      ) : null}
      {createTarget && !isProductCreate && dialogCategoryId != null ? (
        <ComponentCreateDialog
          open={true}
          onClose={() => setCreateTarget(null)}
          categoryId={dialogCategoryId}
          categoryName={dialogCategoryName}
          onConfirm={(input: ComponentCreateInput) => handleConfirmCreate(input)}
        />
      ) : null}
    </div>
  );
}
