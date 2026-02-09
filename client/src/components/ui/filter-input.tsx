import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FilterInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  numericOnly?: boolean;
  labelAdornment?: ReactNode;
  className?: string;
}

export function FilterInput({
  id,
  label,
  value,
  onChange,
  onClear,
  placeholder,
  numericOnly = false,
  labelAdornment,
  className,
}: FilterInputProps) {
  const hasValue = value.trim().length > 0;

  const handleChange = (nextValue: string) => {
    if (numericOnly) {
      const digitsOnly = nextValue.replace(/\D/g, "");
      onChange(digitsOnly);
      return;
    }

    onChange(nextValue);
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1">
        <Label htmlFor={id} className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </Label>
        {labelAdornment}
      </div>
      <div className="relative">
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(event) => handleChange(event.target.value)}
          className="pr-10"
        />
        {hasValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            aria-label={`${label} zurücksetzen`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
