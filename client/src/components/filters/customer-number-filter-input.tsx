import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { HelpIcon } from "@/components/ui/help/help-icon";

interface CustomerNumberFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
}

export function CustomerNumberFilterInput({
  value,
  onChange,
  onClear,
  className,
}: CustomerNumberFilterInputProps) {
  return (
    <SearchFilterInput
      id="customer-filter-number"
      label="Kundennummer"
      labelAdornment={<HelpIcon helpKey="customers.filter.number" size="sm" />}
      value={value}
      onChange={onChange}
      onClear={onClear}
      numericOnly
      className={className}
    />
  );
}
