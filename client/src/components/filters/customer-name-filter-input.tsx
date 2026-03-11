import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { HelpIcon } from "@/components/ui/help/help-icon";

interface CustomerNameFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
  maxLength?: number;
}

export function CustomerNameFilterInput({
  value,
  onChange,
  onClear,
  className,
  maxLength,
}: CustomerNameFilterInputProps) {
  return (
    <SearchFilterInput
      id="customer-filter-last-name"
      label="Nachname"
      labelAdornment={<HelpIcon helpKey="customers.filter.name" size="sm" />}
      value={value}
      onChange={onChange}
      onClear={onClear}
      maxLength={maxLength}
      className={className}
    />
  );
}
