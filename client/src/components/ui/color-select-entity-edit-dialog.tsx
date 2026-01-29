import { EntityEditDialog, EntityEditDialogProps } from "./entity-edit-dialog";
import { ColorSelectButton } from "./color-select-button";

export interface ColorSelectEntityEditDialogProps extends Omit<EntityEditDialogProps, 'headerExtra'> {
  selectedColor: string;
  onColorChange: (color: string) => void;
  colorPickerTestId?: string;
}

export function ColorSelectEntityEditDialog({
  selectedColor,
  onColorChange,
  colorPickerTestId = "button-entity-color-picker",
  children,
  ...props
}: ColorSelectEntityEditDialogProps) {
  return (
    <EntityEditDialog {...props}>
      <div className="space-y-4">
        <ColorSelectButton
          color={selectedColor}
          onChange={onColorChange}
          testId={colorPickerTestId}
        />
        {children}
      </div>
    </EntityEditDialog>
  );
}
