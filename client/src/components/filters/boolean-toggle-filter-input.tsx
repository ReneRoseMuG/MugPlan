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
    <div className={cn("flex min-w-[10rem] flex-col gap-1", className)}>
      <div className="flex h-5 items-center gap-1">
        {labelAdornment}
        <Label htmlFor={id} className="text-xs tracking-wide text-slate-500">
          {label}
        </Label>
      </div>
      <div className="flex h-9 items-center">
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}
