import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface BooleanToggleFilterInputProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function BooleanToggleFilterInput({
  id,
  label,
  checked,
  onCheckedChange,
  className,
}: BooleanToggleFilterInputProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-md border px-3 py-2", className)}>
      <Label htmlFor={id} className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

