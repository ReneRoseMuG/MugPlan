import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface BooleanToggleFilterInputProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  labelAdornment?: ReactNode;
  className?: string;
}

export function BooleanToggleFilterInput({
  id,
  label,
  checked,
  onCheckedChange,
  labelAdornment,
  className,
}: BooleanToggleFilterInputProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-md border px-3 py-2", className)}>
      <div className="flex items-center gap-1">
        <Label htmlFor={id} className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </Label>
        {labelAdornment}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
