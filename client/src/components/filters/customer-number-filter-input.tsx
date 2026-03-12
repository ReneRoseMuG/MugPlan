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
  id?: string;
  helpKey?: string;
}

export function CustomerNumberFilterInput({
  value,
  onChange,
  onClear,
  className,
  label = "Kunde Nr.",
  placeholderLabel,
  maxLength,
  id = "customer-filter-number",
  helpKey = "customers.filter.customerNumber",
}: CustomerNumberFilterInputProps) {
  return (
    <SearchFilterInput
      id={id}
      label={label}
      placeholderLabel={placeholderLabel}
      labelAdornment={<HelpIcon helpKey={helpKey} size="sm" />}
      value={value}
      onChange={onChange}
      onClear={onClear}
      numericOnly
      maxLength={maxLength}
      className={className}
    />
  );
}
