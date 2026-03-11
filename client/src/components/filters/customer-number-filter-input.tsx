import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { HelpIcon } from "@/components/ui/help/help-icon";

interface CustomerNumberFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
  label?: string;
  placeholderLabel?: string;
  maxLength?: number;
}

export function CustomerNumberFilterInput({
  value,
  onChange,
  onClear,
  className,
  label = "Kundennummer",
  placeholderLabel,
  maxLength,
}: CustomerNumberFilterInputProps) {
  return (
    <SearchFilterInput
      id="customer-filter-number"
      label={label}
      placeholderLabel={placeholderLabel}
      labelAdornment={<HelpIcon helpKey="customers.filter.number" size="sm" />}
      value={value}
      onChange={onChange}
      onClear={onClear}
      numericOnly
      maxLength={maxLength}
      className={className}
    />
  );
}
