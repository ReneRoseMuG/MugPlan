import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";

interface ColorPickerButtonProps {
  color: string;
  onChange: (color: string) => void;
  testId?: string;
}

export function ColorPickerButton({ 
  color, 
  onChange,
  testId = "button-color-picker"
}: ColorPickerButtonProps) {
  return (
    <label className="relative cursor-pointer">
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <Button
        size="icon"
        variant="outline"
        onClick={(e) => e.preventDefault()}
        className="border-slate-300"
        style={{ backgroundColor: color }}
        data-testid={testId}
      >
        <Palette className="w-4 h-4 text-slate-600" />
      </Button>
    </label>
  );
}
