import { ReactNode } from "react";
import { EntityEditDialog, EntityEditDialogProps } from "./entity-edit-dialog";
import { ColorPickerButton } from "./color-picker-button";

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
    <EntityEditDialog
      {...props}
      headerExtra={
        <div className="flex items-center gap-2 ml-2">
          <ColorPickerButton
            color={selectedColor}
            onChange={onColorChange}
            testId={colorPickerTestId}
          />
          <div 
            className="w-6 h-6 rounded border border-border"
            style={{ backgroundColor: selectedColor }}
          />
        </div>
      }
    >
      {children}
    </EntityEditDialog>
  );
}
