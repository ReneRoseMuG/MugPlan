import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  PROJECT_PRODUCT_FIELDS,
  type DynamicProjectCategorySlot,
  type DynamicProjectProductSelections,
  type ProjectProductFieldKey,
  type ProjectProductSelections,
} from "@/lib/project-product-form";

interface ProjectOrderFormProps {
  name: string;
  orderNumber: string;
  amount: string;
  plannedDateText: string;
  plannedWeek: string;
  isEditing: boolean;
  onNameChange: (value: string) => void;
  onOrderNumberChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onPlannedDateTextChange: (value: string) => void;
  onPlannedWeekChange: (value: string) => void;
}

interface ProjectProductFieldsProps {
  productSelections: ProjectProductSelections;
  dynamicSlots: DynamicProjectCategorySlot[];
  dynamicSelections: DynamicProjectProductSelections;
  onOpenComponentDialog: (fieldKey: ProjectProductFieldKey) => void;
  onOpenDynamicDialog: (slotId: string) => void;
}

export function ProjectOrderForm({
  name,
  orderNumber,
  amount,
  plannedDateText,
  plannedWeek,
  isEditing,
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
            readOnly={isEditing}
            data-testid="input-project-order-number"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectName" data-testid="label-project-name">Projektname *</Label>
          <Input
            id="projectName"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
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
            data-testid="input-project-planned-date-text"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectPlannedWeek" data-testid="label-project-planned-week">Geplante Kalenderwoche</Label>
          <Input
            id="projectPlannedWeek"
            value={plannedWeek}
            onChange={(e) => onPlannedWeekChange(e.target.value)}
            placeholder="z. B. KW 14"
            data-testid="input-project-planned-week"
          />
        </div>
      </div>
    </div>
  );
}

export function ProjectProductFields({
  productSelections,
  dynamicSlots,
  dynamicSelections,
  onOpenComponentDialog,
  onOpenDynamicDialog,
}: ProjectProductFieldsProps) {
  const leftColumnFields: ProjectProductFieldKey[] = ["saunaModel", "oven", "control", "roof", "door"];
  const rightColumnFields: ProjectProductFieldKey[] = ["window", "frontWall", "rearWallWindow", "interior"];
  const dynamicProductSlots = dynamicSlots.filter((slot) => slot.source === "product");
  const dynamicComponentSlots = dynamicSlots.filter((slot) => slot.source === "component");

  const renderField = (fieldKey: ProjectProductFieldKey) => {
    const field = PROJECT_PRODUCT_FIELDS.find((entry) => entry.key === fieldKey)!;
    return (
      <div
        key={field.key}
        className="grid grid-cols-[minmax(0,1fr),auto] items-end gap-2"
        data-testid={`project-product-field-${field.key}`}
      >
        <div className="space-y-2">
          <Label htmlFor={`project-product-${field.key}`}>{field.label}</Label>
          <Input
            id={`project-product-${field.key}`}
            value={productSelections[field.key].componentName}
            readOnly
            placeholder={`${field.label} auswählen`}
            data-testid={`input-project-product-${field.key}`}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenComponentDialog(field.key)}
          data-testid={`button-project-product-${field.key}`}
        >
          Auswählen
        </Button>
      </div>
    );
  };

  const renderDynamicField = (slot: DynamicProjectCategorySlot) => (
    <div
      key={slot.slotId}
      className="grid grid-cols-[minmax(0,1fr),auto] items-end gap-2"
      data-testid={`project-product-field-${slot.slotId}`}
    >
      <div className="space-y-2">
        <Label htmlFor={`project-product-${slot.slotId}`}>{slot.label}</Label>
        <Input
          id={`project-product-${slot.slotId}`}
          value={dynamicSelections[slot.slotId]?.componentName ?? ""}
          readOnly
          placeholder={`${slot.label} auswaehlen`}
          data-testid={`input-project-product-${slot.slotId}`}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenDynamicDialog(slot.slotId)}
        data-testid={`button-project-product-${slot.slotId}`}
      >
        Auswaehlen
      </Button>
    </div>
  );

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
    </div>
  );
}
