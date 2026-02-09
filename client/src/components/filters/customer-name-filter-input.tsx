import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { HelpIcon } from "@/components/ui/help/help-icon";

interface CustomerNameFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
}

export function CustomerNameFilterInput({
  value,
  onChange,
  onClear,
  className,
}: CustomerNameFilterInputProps) {
  return (
    <SearchFilterInput
      id="customer-filter-last-name"
      label="Nachname"
      labelAdornment={<HelpIcon helpKey="customers.filter.name" size="sm" />}
      value={value}
      onChange={onChange}
      onClear={onClear}
      className={className}
    />
  );
}
