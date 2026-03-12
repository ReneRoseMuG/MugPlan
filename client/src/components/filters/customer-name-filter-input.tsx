import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { HelpIcon } from "@/components/ui/help/help-icon";

interface CustomerNameFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
  maxLength?: number;
  id?: string;
  label?: string;
  helpKey?: string;
}

export function CustomerNameFilterInput({
  value,
  onChange,
  onClear,
  className,
  maxLength,
  id = "customer-filter-last-name",
  label = "Nachname Kunde",
  helpKey = "customers.filter.lastName",
}: CustomerNameFilterInputProps) {
  return (
    <SearchFilterInput
      id={id}
      label={label}
      labelAdornment={<HelpIcon helpKey={helpKey} size="sm" />}
      value={value}
      onChange={onChange}
      onClear={onClear}
      maxLength={maxLength}
      className={className}
    />
  );
}
